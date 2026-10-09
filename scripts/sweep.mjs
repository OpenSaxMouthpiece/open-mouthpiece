// Parameter sweep: does the generator make a sound model for (nearly) ANY parameter set?
// For each voice file it takes the Customizer parameters and their slider ranges from OpenSCAD's
// own .param export, then renders
//   1. extremes — every parameter at its slider min and max, one at a time (clear attribution);
//   2. random mixes — 3..10 parameters changed at once (seeded, reproducible); every failing mix
//      is shrunk to the smallest set of changes that still fails.
// Each sample is checked for: render failure / OpenSCAD errors, OpenSCAD warnings, genus other than the file's (1, or its EXPECTED GENUS echo)
// (holes or loose pieces), and wall clearance below --min-wall (part="clearance_report").
// Failures get a repro param file in scad/_sweep/ (gitignored) — open it from the app.
// Quick by default: extremes on the first voice only (they rarely differ by voice), 15 random mixes
// per voice. --full: extremes on every voice, 50 mixes each (before going live, after clamp work).
// --only <regex>: extremes of the matching parameters only (a targeted check after a narrow change).
//   npm run sweep
//   npm run sweep -- --full
//   npm run sweep -- --only baffle --random 10
//   npm run sweep -- --random 100 --seed 7 --base scad/alto.scad --min-wall 0.6 --jobs 8
//   npm run sweep -- --part cap       # the cap instead of the mouthpiece: extremes of the Cap and
//                                     # Ligature groups, random mixes of 3 of them + up to 5 others;
//                                     # checks the genus it announces, not the wall clearance
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runOpenscad, parseLog, pool } from './openscad.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCAD = path.join(ROOT, 'scad');
const OUT = path.join(ROOT, 'test', 'out', 'sweep');
const REPRO = path.join(SCAD, '_sweep');

const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : dflt;
};
const bases = argv.flatMap((a, i) => (argv[i - 1] === '--base' ? [a] : []));
const BASES = (bases.length ? bases : ['alto', 'tenor', 'baritone', 'soprano'].map((v) => `scad/${v}.scad`)).map((b) =>
  path.resolve(ROOT, b),
);
const FULL = argv.includes('--full');
const RANDOM = Number(opt('--random', FULL ? 50 : 15));
const ONLY = opt('--only', null) ? new RegExp(opt('--only', null)) : null;
const SEED = Number(opt('--seed', 1));
const MIN_WALL = Number(opt('--min-wall', 0.6));
const JOBS = Number(opt('--jobs', Math.max(2, os.cpus().length - 2)));
const SHRINK = Number(opt('--shrink', 12));
const EXTREMES = !argv.includes('--no-extremes');
const PART = opt('--part', null); // sweep this part (the cap) instead of the mouthpiece
const PART_GROUPS = new Set(['Cap', 'Ligature']);

// Not swept: output controls, informational or unimplemented parameters.
const SKIP = new Set(['part', 'render_fn', 'print_orientation', 'shank_clearance', 'min_airgap']);
const SKIP_GROUPS = new Set(['Output']);

fs.rmSync(OUT, { recursive: true, force: true });
fs.rmSync(REPRO, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(REPRO, { recursive: true });

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);

const literal = (v) => (typeof v === 'string' ? JSON.stringify(v) : Array.isArray(v) ? `[${v.join(',')}]` : String(v));
const snap = (p, x) => {
  const st = p.step || 0.01;
  return +(Math.round((x - p.min) / st) * st + p.min).toFixed(6);
};

async function paramsOf(base) {
  const out = path.join(OUT, `${path.basename(base, '.scad')}.param`);
  await runOpenscad(['-o', out, base], { cwd: path.dirname(base) });
  const all = JSON.parse(fs.readFileSync(out, 'utf8')).parameters;
  return all.filter(
    (p) =>
      !SKIP.has(p.name) &&
      !SKIP_GROUPS.has(p.group) &&
      !Array.isArray(p.initial) &&
      (p.options || p.type === 'boolean' || (p.min !== undefined && p.max !== undefined)),
  );
}

// Render one sample: {problems: [...], genus, clearance}.
let counter = 0;
async function evaluate(base, overrides) {
  const id = `s${++counter}`;
  const defs = Object.entries(overrides).flatMap(([k, v]) => ['-D', `${k}=${literal(v)}`]);
  const stl = path.join(OUT, `${id}.stl`);
  const partDef = PART ? ['-D', `part=${JSON.stringify(PART)}`] : [];
  const r = await runOpenscad(['-o', stl, '-D', 'print_orientation=false', ...partDef, ...defs, base], {
    cwd: path.dirname(base),
  });
  fs.rmSync(stl, { force: true });
  const log = parseLog(r.log);
  const problems = [];
  if (r.code !== 0 || !log.ok) problems.push({ kind: 'render', text: log.errors[0] ?? 'render failed' });
  for (const w of log.warnings) problems.push({ kind: 'warning', text: w.replace(/ in file .*$/, '') });
  // the genus the file says it has (an experiment with two windows), else one through-bore
  const genus = Number(/EXPECTED GENUS (\d+)/.exec(r.log)?.[1] ?? 1);
  if (log.ok && log.genus !== null && log.genus !== genus)
    problems.push({
      kind: 'genus',
      text: `genus ${log.genus} (${log.genus > genus ? 'holes' : 'loose piece / no through-bore'})`,
    });
  let clearance = null;
  if (log.ok && !PART) {
    const echo = path.join(OUT, `${id}.echo`);
    await runOpenscad(['-o', echo, '-D', 'part="clearance_report"', ...defs, base], { cwd: path.dirname(base) });
    const m = /CLEARANCE ([-\d.e]+) at z=([-\d.e]+) \(([^)]+)\)/.exec(
      fs.existsSync(echo) ? fs.readFileSync(echo, 'utf8') : '',
    );
    fs.rmSync(echo, { force: true });
    if (m) {
      clearance = { mm: +Number(m[1]).toFixed(2), z: +Number(m[2]).toFixed(1), where: m[3] };
      if (clearance.mm < MIN_WALL)
        problems.push({ kind: 'thin', text: `${clearance.where} ${clearance.mm}mm at z=${clearance.z}` });
    }
  }
  return { problems, genus: log.genus, clearance };
}

const kindsOf = (res) => new Set(res.problems.map((p) => p.kind));

// Smallest subset of `overrides` that still shows one of the same problem kinds.
async function shrink(base, overrides, kinds) {
  let cur = { ...overrides };
  for (const k of Object.keys(overrides)) {
    const trial = { ...cur };
    delete trial[k];
    const res = await evaluate(base, trial);
    if ([...kindsOf(res)].some((x) => kinds.has(x))) cur = trial;
  }
  return cur;
}

function writeRepro(base, overrides, res, label) {
  const name = `${path.basename(base, '.scad')}_${label}.scad`.replace(/[^\w.-]/g, '_');
  const incl = path.relative(REPRO, base).split(path.sep).join('/');
  const text = [
    `// Sweep failure: ${res.problems.map((p) => p.text).join('; ')}`,
    `include <${incl}>`,
    '',
    ...Object.entries(overrides).map(([k, v]) => `${k} = ${literal(v)};`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(REPRO, name), text);
  return `scad/_sweep/${name}`;
}

const t0 = Date.now();
const failures = [];
let total = 0;
for (const [bi, base] of BASES.entries()) {
  const params = await paramsOf(base);
  const vname = path.basename(base);
  const samples = [];
  if (EXTREMES && (FULL || ONLY || bases.length || bi === 0)) {
    for (const p of (PART ? params.filter((q) => PART_GROUPS.has(q.group)) : params).filter(
      (q) => !ONLY || ONLY.test(q.name),
    )) {
      if (p.options)
        for (const o of p.options) {
          if (String(o.value) !== String(p.initial))
            samples.push({ label: `${p.name}=${o.value}`, ov: { [p.name]: o.value } });
        }
      else if (p.type === 'boolean') samples.push({ label: `${p.name}=${!p.initial}`, ov: { [p.name]: !p.initial } });
      else
        for (const x of [p.min, p.max])
          if (x !== p.initial) samples.push({ label: `${p.name}=${x}`, ov: { [p.name]: x } });
    }
  }
  for (let i = 0; i < RANDOM; i++) {
    const k = 3 + Math.floor(rand() * 8),
      ov = {};
    const shuffled = [...params].sort(() => rand() - 0.5);
    const pick = PART
      ? [
          ...shuffled.filter((q) => q.group === 'Cap').slice(0, 3),
          ...shuffled.filter((q) => q.group !== 'Cap').slice(0, Math.floor(rand() * 6)),
        ]
      : shuffled.slice(0, k);
    for (const p of pick) {
      ov[p.name] = p.options
        ? p.options[Math.floor(rand() * p.options.length)].value
        : p.type === 'boolean'
          ? rand() < 0.5
          : snap(p, p.min + rand() * (p.max - p.min));
    }
    samples.push({ label: `random${i + 1}`, ov, random: true });
  }
  process.stdout.write(`${vname}: ${params.length} params, ${samples.length} samples… `);
  const results = await pool(samples, JOBS, async (s) => ({ ...s, res: await evaluate(base, s.ov) }));
  total += results.length;
  const bad = results.filter((r) => r.res.problems.length);
  console.log(`${bad.length} failed`);
  let shrunk = 0;
  for (const r of bad) {
    let ov = r.ov;
    if (r.random && shrunk < SHRINK) {
      shrunk++;
      ov = await shrink(base, r.ov, kindsOf(r.res));
    }
    failures.push({
      base: vname,
      label: r.label,
      overrides: ov,
      problems: r.res.problems,
      clearance: r.res.clearance,
      repro: writeRepro(base, ov, r.res, r.label),
    });
  }
}

// Report, grouped by what went wrong.
console.log(
  `\n${total} samples, ${failures.length} failing, ${((Date.now() - t0) / 1000).toFixed(0)}s  (min wall ${MIN_WALL}mm, seed ${SEED})`,
);
const byKind = {};
for (const f of failures) for (const p of f.problems) (byKind[p.kind] ??= []).push({ f, p });
const kindTitle = {
  genus: 'Holes / loose pieces (unexpected genus)',
  thin: `Walls thinner than ${MIN_WALL}mm`,
  warning: 'OpenSCAD warnings',
  render: 'Render failures',
};
for (const [kind, items] of Object.entries(byKind)) {
  console.log(`\n${kindTitle[kind] ?? kind}: ${items.length}`);
  for (const { f, p } of items.slice(0, 40)) {
    const ov = Object.entries(f.overrides)
      .map(([k, v]) => `${k}=${literal(v)}`)
      .join(' ');
    console.log(`  ${f.base.padEnd(14)} ${ov.padEnd(60)} ${p.text}`);
  }
  if (items.length > 40) console.log(`  … ${items.length - 40} more (see report)`);
}
fs.writeFileSync(
  path.join(OUT, 'report.json'),
  JSON.stringify({ seed: SEED, minWall: MIN_WALL, total, failures }, null, 2),
);
console.log(`\nreport: test/out/sweep/report.json   repro files: scad/_sweep/`);
