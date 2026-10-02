// How the site is used: a readable summary of the anonymous usage database (worker/usage.sql).
//   node scripts/usage.mjs            last 30 days
//   node scripts/usage.mjs 7          last 7 days
//   node scripts/usage.mjs 30 --json  the numbers as JSON (for a dashboard)
// Needs `npx wrangler@3 login` once (the Cloudflare account that hosts the site).
import { execFileSync } from 'node:child_process';

const DB = 'open-mouthpiece-usage';
const args = process.argv.slice(2);
const days = Number(args.find((a) => /^\d+$/.test(a)) ?? 30);
const asJson = args.includes('--json');
const since = Date.now() - days * 864e5;

function q(sql) {
  const out = execFileSync(
    'npx',
    ['--yes', 'wrangler@3', 'd1', 'execute', DB, '--remote', '--json', '--command', sql],
    {
      encoding: 'utf8',
      shell: process.platform === 'win32',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  const parsed = JSON.parse(out.slice(out.indexOf('[')));
  return parsed[0]?.results ?? [];
}

const W = `ts >= ${since}`;
const report = {
  days,
  visits: q(`SELECT count(DISTINCT visit) AS n FROM events WHERE ${W} AND kind = 'visit'`)[0]?.n ?? 0,
  perDay: q(
    `SELECT date(ts / 1000, 'unixepoch') AS day, count(DISTINCT visit) AS visits FROM events WHERE ${W} GROUP BY day ORDER BY day`,
  ),
  devices: q(
    `SELECT device, count(DISTINCT visit) AS visits FROM events WHERE ${W} GROUP BY device ORDER BY visits DESC`,
  ),
  countries: q(
    `SELECT country, count(DISTINCT visit) AS visits FROM events WHERE ${W} GROUP BY country ORDER BY visits DESC LIMIT 15`,
  ),
  referrers: q(
    `SELECT json_extract(data, '$.ref') AS site, count(*) AS visits FROM events WHERE ${W} AND kind = 'visit' AND json_extract(data, '$.ref') != '' GROUP BY site ORDER BY visits DESC LIMIT 10`,
  ),
  designs: q(
    `SELECT design, count(DISTINCT visit) AS visits FROM events WHERE ${W} AND kind = 'design' GROUP BY design ORDER BY visits DESC`,
  ),
  settings: q(
    `SELECT name, count(*) AS touches, count(DISTINCT visit) AS visits FROM events WHERE ${W} AND kind = 'setting' GROUP BY name ORDER BY visits DESC LIMIT 40`,
  ),
  sections: q(
    `SELECT name, count(DISTINCT visit) AS visits FROM events WHERE ${W} AND kind = 'section' GROUP BY name ORDER BY visits DESC`,
  ),
  features: q(
    `SELECT name, count(*) AS uses, count(DISTINCT visit) AS visits FROM events WHERE ${W} AND kind = 'feature' GROUP BY name ORDER BY visits DESC`,
  ),
  quality: q(
    `SELECT name, count(DISTINCT visit) AS visits FROM events WHERE ${W} AND kind = 'quality' GROUP BY name ORDER BY visits DESC`,
  ),
  downloads: q(
    `SELECT name, design, count(*) AS n FROM events WHERE ${W} AND kind = 'download' GROUP BY name, design ORDER BY n DESC`,
  ),
  // what gets printed: the mouthpiece downloads and print kits, with their numbers
  prints:
    q(`SELECT design, json_extract(data, '$.tip') AS tip, json_extract(data, '$.facing') AS facing, json_extract(data, '$.air') AS air,
               json_extract(data, '$.settings.baffle_type') AS baffle, json_extract(data, '$.settings.chamber_width') AS chamber,
               json_extract(data, '$.settings.chamber_shape') AS chamber_shape
             FROM events WHERE ${W} AND kind = 'download' AND name IN ('mouthpiece', 'print_kit') ORDER BY ts DESC LIMIT 200`),
  errors: q(
    `SELECT name, json_extract(data, '$.message') AS message, count(*) AS n FROM events WHERE ${W} AND kind = 'error' GROUP BY name, message ORDER BY n DESC LIMIT 15`,
  ),
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const table = (title, rows) => {
  console.log(`\n${title}`);
  if (!rows.length) return console.log('  (none)');
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
