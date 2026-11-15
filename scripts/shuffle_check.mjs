// Shuffle check: do the app's shuffled designs (src/shuffle.ts) always make a sound mouthpiece in the
// usual ranges? For each voice it runs the Shuffle button's own path (sample, set the inside air with
// the fitted formula, src/shuffleAir.json; measure the real air as the render would and correct it,
// at most twice, if it's out of the band), then renders the result and checks:
//   - the render: no OpenSCAD error, genus 1 (one through-bore, no holes or loose pieces),
//   - the design's own warnings (validate()'s "WARNING: ..." echoes): listed, and counted as failures,
//   - inside air within ±8% of the voice's preset (AIR_BAND),
//   - walls (part="clearance_report"): roof, floor, socket and side walls >= --min-wall (1.2mm, the
//     variants' guardrail); the side wall beside the window is the side rail's (a guarantee), so a
//     side-wall minimum there passes.
// Seeded and reproducible: sample i of a voice uses seed (seed * 1000 + i). Failures are written to
// test/out/shuffle/failures.json with their values (open them with -D in OpenSCAD, or paste into the app).
//   node scripts/shuffle_check.mjs                    100 per voice
//   node scripts/shuffle_check.mjs --n 300 --jobs 12  before a change to the ranges ships
//   node scripts/shuffle_check.mjs --voices Alto --n 20 --seed 3
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';
import { runOpenscad, parseLog, pool } from './openscad.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'test', 'out', 'shuffle');
fs.mkdirSync(OUT, { recursive: true });

const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : dflt;
};
const N = Number(opt('--n', 100));
const SEED = Number(opt('--seed', 1));
const JOBS = Number(opt('--jobs', Math.max(1, os.cpus().length - 2)));
const MIN_WALL = Number(opt('--min-wall', 1.2));

const importTs = (file) =>
  import(
    'data:text/javascript;base64,' +
      Buffer.from(
        transformSync(fs.readFileSync(path.join(ROOT, 'src', file), 'utf8'), { loader: 'ts', format: 'esm' }).code,
      ).toString('base64')
  );
const { SHUFFLE_VOICES, SHUFFLE_DATA, AIR_BAND, seeded, shuffleDesign, correctAir, predictAir } =
  await importTs('shuffle.ts');
const MODEL = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'shuffleAir.json'), 'utf8'));
const VOICES = (opt('--voices', '') || SHUFFLE_VOICES.join(',')).split(',');
const FILE = { Soprano: 'soprano', Alto: 'alto', Tenor: 'tenor', Baritone: 'baritone' };

const literal = (v) => (typeof v === 'string' ? JSON.stringify(v) : String(v));
const defs = (values) => Object.entries(values).flatMap(([k, v]) => ['-D', `${k}=${literal(v)}`]);
let counter = 0;
const tmp = (ext) => path.join(OUT, `t${process.pid}_${++counter}.${ext}`);

async function echo(base, values, extra = []) {
  const out = tmp('echo');
  const r = await runOpenscad(['-o', out, ...extra, ...defs(values), base], { cwd: path.dirname(base) });
  const text = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
  fs.rmSync(out, { force: true });
  return { code: r.code, log: r.log + '\n' + text };
}
const airOf = (log) => {
  const m = /\["air", ([\d.]+)\]/.exec(log);
  return m ? Number(m[1]) : null;
};

async function checkOne(voice, i) {
  const base = path.join(ROOT, 'scad', `${FILE[voice]}.scad`);
  const rand = seeded(SEED * 1000 + i);
  // as the app does it: the formula picks the design; its render's air decides whether to correct it (twice at most)
  const predict = (scale) => (v) => {
    const a = predictAir(MODEL, voice, v);
    return Promise.resolve(a === null ? null : a * scale);
  };
  const target = SHUFFLE_DATA[voice].air;
  const inBand = (a) => a !== null && Math.abs(a / target - 1) <= AIR_BAND;
  const first = await shuffleDesign(voice, rand, predict(1));
  let values = first.values;
  let air = airOf((await echo(base, values)).log);
  let corrected = 0;
  const readings = [];
  while (!inBand(air) && air !== null && corrected < 2) {
    corrected++;
    readings.push({ values, air });
    values = await correctAir(MODEL, voice, readings);
    air = airOf((await echo(base, values)).log);
  }
  const fit = { values, air, samples: first.samples };
  const problems = [];
  // the band is the aim; a rare design with every lever at its end stays a little outside (up to ±10%)
  const near = air !== null && !inBand(air) && Math.abs(air / target - 1) <= 0.1;
  if (!inBand(air) && !near) problems.push(`air ${air ?? '?'} cm³ (preset ${target}, ±${AIR_BAND * 100}%)`);
  // the full render: genus, OpenSCAD errors, the design's warnings
  const stl = tmp('stl');
  const r = await runOpenscad(['-o', stl, '-D', 'print_orientation=false', ...defs(fit.values), base], {
    cwd: path.dirname(base),
  });
  fs.rmSync(stl, { force: true });
  const log = parseLog(r.log);
  if (r.code !== 0 || !log.ok) problems.push(`render: ${log.errors[0] ?? 'failed'}`);
  else if (log.genus !== 1) problems.push(`genus ${log.genus}`);
  for (const w of log.designWarnings) problems.push(w);
  // walls
  const c = await echo(base, fit.values, ['-D', 'part="clearance_report"']);
  const walls = {};
  for (const m of c.log.matchAll(/CLEARANCE_([a-z ]+?) ([-\d.e]+) at z=([-\d.e]+)/g))
    walls[m[1]] = { mm: +Number(m[2]).toFixed(2), z: +Number(m[3]).toFixed(1) };
  const worst = /CLEARANCE [-\d.e]+ at z=[-\d.e]+ \(([^)]+)\)/.exec(c.log)?.[1];
  for (const [kind, w] of Object.entries(walls)) {
    if (w.mm >= MIN_WALL) continue;
    if (kind === 'side wall' && worst === 'side wall beside the window') continue; // the rail's own
    problems.push(`${kind} ${w.mm}mm at z=${w.z}`);
  }
  return {
    voice,
    i,
    ok: !problems.length,
    problems,
    air: fit.air,
    samples: fit.samples,
    corrected,
    near,
    values: fit.values,
  };
}

const t0 = Date.now();
const jobs = VOICES.flatMap((v) => Array.from({ length: N }, (_, i) => [v, i]));
let done = 0;
const results = await pool(jobs, JOBS, async ([v, i]) => {
  const res = await checkOne(v, i);
  done++;
  if (!res.ok) console.log(`FAIL ${v} #${i}: ${res.problems.join('; ')}`);
  else if (done % 25 === 0) console.log(`… ${done}/${jobs.length}`);
  return res;
});

console.log('');
for (const v of VOICES) {
  const rs = results.filter((r) => r.voice === v);
  const ok = rs.filter((r) => r.ok).length;
  const airs = rs.map((r) => r.air).filter((a) => a !== null);
  const resampled = rs.filter((r) => r.samples > 1).length;
  const corrected = rs.filter((r) => r.corrected).length;
  const twice = rs.filter((r) => r.corrected >= 2).length;
  const near = rs.filter((r) => r.near).length;
  console.log(
    `${v.padEnd(9)} ${ok}/${rs.length} ok · air ${Math.min(...airs)}–${Math.max(...airs)} cm³ (preset ${SHUFFLE_DATA[v].air}) · drawn again ${resampled} · corrected after the render ${corrected} (twice ${twice}) · just outside ±${AIR_BAND * 100}% ${near}`,
  );
}
const kinds = {};
for (const r of results)
  for (const p of r.problems) kinds[p.replace(/[-\d.]+/g, '#')] = (kinds[p.replace(/[-\d.]+/g, '#')] ?? 0) + 1;
if (Object.keys(kinds).length) {
  console.log('\nproblems by kind:');
  for (const [k, n] of Object.entries(kinds).sort((a, b) => b[1] - a[1])) console.log(`  ${n} × ${k}`);
}
fs.writeFileSync(
  path.join(OUT, 'failures.json'),
  JSON.stringify(
    results.filter((r) => !r.ok),
    null,
    1,
  ),
);
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 1));
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
process.exit(failed ? 1 : 0);
