// How the site is used: a readable summary of the anonymous usage database (worker/usage.sql).
//   node scripts/usage.mjs            last 30 days
//   node scripts/usage.mjs 7          last 7 days
//   node scripts/usage.mjs 30 --json  the numbers as JSON (for a dashboard)
// Needs `npx wrangler@3 login` once (the Cloudflare account that hosts the site). All the queries
// go in one SELECT (one wrangler run, a few seconds), each table as a JSON array of rows.
import { execFileSync } from 'node:child_process';

const DB = 'open-mouthpiece-usage';
const args = process.argv.slice(2);
const days = Number(args.find((a) => /^\d+$/.test(a)) ?? 30);
const asJson = args.includes('--json');
const W = `ts >= ${Date.now() - days * 864e5}`;
const ref = "json_extract(data, '$.ref')";

// [name, columns, query]: each becomes a list of rows with those columns.
const TABLES = [
  [
    'perDay',
    ['day', 'visits'],
    `SELECT date(ts / 1000, 'unixepoch') AS day, count(DISTINCT visit) AS visits FROM events WHERE ${W} GROUP BY day ORDER BY day`,
  ],
  [
    'devices',
    ['device', 'visits'],
    `SELECT device, count(DISTINCT visit) AS visits FROM events WHERE ${W} AND device IS NOT NULL GROUP BY device ORDER BY visits DESC`,
  ],
  [
    'countries',
    ['country', 'visits'],
    `SELECT country, count(DISTINCT visit) AS visits FROM events WHERE ${W} AND visit IS NOT NULL GROUP BY country ORDER BY visits DESC LIMIT 15`,
  ],
  [
    'referrers',
    ['site', 'visits'],
    `SELECT ${ref} AS site, count(*) AS visits FROM events WHERE ${W} AND kind = 'visit' AND ${ref} != '' GROUP BY site ORDER BY visits DESC LIMIT 10`,
  ],
  [
    'designs',
    ['design', 'visits'],
    `SELECT design, count(DISTINCT visit) AS visits FROM events WHERE ${W} AND kind = 'design' GROUP BY design ORDER BY visits DESC`,
  ],
  [
    'settings',
    ['name', 'visits', 'touches'],
    `SELECT name, count(DISTINCT visit) AS visits, count(*) AS touches FROM events WHERE ${W} AND kind = 'setting' GROUP BY name ORDER BY visits DESC LIMIT 40`,
  ],
  [
    'sections',
    ['name', 'visits'],
    `SELECT name, count(DISTINCT visit) AS visits FROM events WHERE ${W} AND kind = 'section' GROUP BY name ORDER BY visits DESC`,
  ],
  [
    'features',
    ['name', 'visits', 'uses'],
    `SELECT name, count(DISTINCT visit) AS visits, count(*) AS uses FROM events WHERE ${W} AND kind = 'feature' GROUP BY name ORDER BY visits DESC`,
  ],
  [
    'quality',
    ['name', 'visits'],
    `SELECT name, count(DISTINCT visit) AS visits FROM events WHERE ${W} AND kind = 'quality' GROUP BY name ORDER BY visits DESC`,
  ],
  [
    'downloads',
    ['name', 'design', 'n'],
    `SELECT name, design, count(*) AS n FROM events WHERE ${W} AND kind = 'download' GROUP BY name, design ORDER BY n DESC`,
  ],
  // what gets printed: mouthpiece downloads and print kits, with their numbers (latest first)
  [
    'prints',
    ['day', 'design', 'tip', 'facing', 'air', 'baffle', 'chamber', 'shape'],
    `SELECT date(ts / 1000, 'unixepoch') AS day, design, json_extract(data, '$.tip') AS tip, json_extract(data, '$.facing') AS facing,
       json_extract(data, '$.air') AS air, json_extract(data, '$.settings.baffle_type') AS baffle,
       json_extract(data, '$.settings.chamber_width') AS chamber, json_extract(data, '$.settings.chamber_shape') AS shape
     FROM events WHERE ${W} AND kind = 'download' AND name IN ('mouthpiece', 'print_kit') ORDER BY ts DESC LIMIT 200`,
  ],
  [
    'errors',
    ['name', 'message', 'n'],
    `SELECT name, json_extract(data, '$.message') AS message, count(*) AS n FROM events WHERE ${W} AND kind = 'error' GROUP BY name, message ORDER BY n DESC LIMIT 15`,
  ],
];

const sql =
  `SELECT json_object('visits', (SELECT count(DISTINCT visit) FROM events WHERE ${W} AND kind = 'visit'), ${TABLES.map(
    ([name, cols, q]) =>
      `'${name}', (SELECT json_group_array(json_object(${cols.map((c) => `'${c}', ${c}`).join(', ')})) FROM (${q}))`,
  ).join(', ')}) AS report`.replace(/\s+/g, ' ');

// On Windows npx is a .cmd, run through the shell: the SQL goes in double quotes (it has none itself).
const out = execFileSync(
  'npx',
  ['--yes', 'wrangler@3', 'd1', 'execute', DB, '--remote', '--json', '--command', `"${sql}"`],
  {
    encoding: 'utf8',
    shell: true,
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);
const row = JSON.parse(out.slice(out.indexOf('[')))[0].results[0];
const report = { days, ...JSON.parse(row.report) };
for (const [name] of TABLES) if (typeof report[name] === 'string') report[name] = JSON.parse(report[name]);

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const table = (title, rows) => {
  console.log(`\n${title}`);
  if (!rows.length) return console.log('  (none yet)');
  const keys = Object.keys(rows[0]);
  const w = keys.map((k) => Math.max(k.length, ...rows.map((r) => String(r[k] ?? '').length)));
  console.log('  ' + keys.map((k, i) => k.padEnd(w[i])).join('  '));
  for (const r of rows) console.log('  ' + keys.map((k, i) => String(r[k] ?? '').padEnd(w[i])).join('  '));
};

console.log(`Open Mouthpiece usage, last ${days} days: ${report.visits} visits`);
table('Visits per day', report.perDay);
table('Devices', report.devices);
table('Countries', report.countries);
table('Came from', report.referrers);
table('Designs opened', report.designs);
table('Settings touched (most visits first)', report.settings);
table('Sections opened', report.sections);
table('Features used', report.features);
table('Quality', report.quality);
table('Downloads', report.downloads);
table('What gets printed (latest first)', report.prints.slice(0, 30));
table('Errors', report.errors);
