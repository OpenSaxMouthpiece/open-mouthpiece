// Fit Shuffle's inside-air formula (src/shuffleAir.json): for each voice, echo-only runs of designs
// drawn as Shuffle draws them (src/shuffle.ts sampleDesign), with the air levers (baffle height, baffle
// curve, throat width) spread over their whole ranges, then a least-squares fit of the air (cm³) on
// the numeric settings, the shape choices and the levers per baffle shape (on its logarithm: the error that matters is relative). Reports the error on
// designs it wasn't fitted on. The app predicts with it (no OpenSCAD run before a shuffle shows);
// the render's own air readout corrects it when it's off. Re-run after a change to the generator's
// interior or to Shuffle's ranges, then npm run shuffle:check.
//   node scripts/shuffle_fit.mjs              1500 designs per voice (~4 min)
//   node scripts/shuffle_fit.mjs --n 300      a quick look
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';
import { runOpenscad, pool } from './openscad.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'test', 'out', 'shuffle');
fs.mkdirSync(OUT, { recursive: true });
const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : dflt;
};
const N = Number(opt('--n', 1500));
const JOBS = Number(opt('--jobs', Math.max(1, os.cpus().length - 2)));

const importTs = (file) =>
  import(
    'data:text/javascript;base64,' +
      Buffer.from(
        transformSync(fs.readFileSync(path.join(ROOT, 'src', file), 'utf8'), { loader: 'ts', format: 'esm' }).code,
      ).toString('base64')
  );
const { SHUFFLE_VOICES, SHUFFLE_DATA, sampleDesign, seeded, airFeatures } = await importTs('shuffle.ts');
const FILE = { Soprano: 'soprano', Alto: 'alto', Tenor: 'tenor', Baritone: 'baritone' };
const literal = (v) => (typeof v === 'string' ? JSON.stringify(v) : String(v));

let counter = 0;
async function air(voice, values) {
  const base = path.join(ROOT, 'scad', `${FILE[voice]}.scad`);
  const out = path.join(OUT, `f${process.pid}_${++counter}.echo`);
  const defs = Object.entries(values).flatMap(([k, v]) => ['-D', `${k}=${literal(v)}`]);
  await runOpenscad(['-o', out, '-D', 'part="facing_report"', ...defs, base], { cwd: path.dirname(base) });
  const text = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
  fs.rmSync(out, { force: true });
  const m = /\["air", ([\d.]+)\]/.exec(text);
  return m ? Number(m[1]) : null;
}

// least squares with a small ridge (some one-hot columns are near-collinear)
function solve(X, y, ridge = 1e-6) {
  const k = X[0].length;
  const A = Array.from({ length: k }, () => new Float64Array(k));
  const b = new Float64Array(k);
  for (let r = 0; r < X.length; r++)
    for (let i = 0; i < k; i++) {
      b[i] += X[r][i] * y[r];
      for (let j = 0; j < k; j++) A[i][j] += X[r][i] * X[r][j];
    }
  for (let i = 0; i < k; i++) A[i][i] += ridge * X.length;
  for (let c = 0; c < k; c++) {
    let p = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < k; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let j = c; j < k; j++) A[r][j] -= f * A[c][j];
      b[r] -= f * b[c];
    }
  }
  return Array.from(b, (v, i) => v / A[i][i]);
}

const model = { fitted: new Date().toISOString().slice(0, 10), voices: {} };
for (const voice of SHUFFLE_VOICES) {
  const d = SHUFFLE_DATA[voice];
  const rand = seeded(9000 + SHUFFLE_VOICES.indexOf(voice));
  const designs = Array.from({ length: N }, () => {
    const v = sampleDesign(voice, rand);
    v.baffle_height = +(-2 + 4.5 * rand()).toFixed(1);
    v.baffle_curve = +(-1 + 1.3 * rand()).toFixed(2);
    v.throat_width = +(d.preset.throat_width * (0.88 + 0.22 * rand())).toFixed(1);
    return v;
  });
  const airs = await pool(designs, JOBS, (v) => air(voice, v));
  const rows = designs.map((v, i) => [airFeatures(v), airs[i]]).filter(([, a]) => a !== null);
  const names = Object.keys(rows[0][0]);
  const X = rows.map(([f]) => [1, ...names.map((n) => f[n])]);
  const y = rows.map(([, a]) => Math.log(a)); // relative error matters (the soprano holds 2.9 cm³)
  // fit on 80%, report on the other 20%, then refit on all
  const cut = Math.floor(rows.length * 0.8);
  const w = solve(X.slice(0, cut), y.slice(0, cut));
  const pred = (x, w) => x.reduce((s, xi, i) => s + xi * w[i], 0);
  const errs = X.slice(cut).map((x, i) => Math.exp(pred(x, w) - y[cut + i]) - 1);
  const sd = Math.sqrt(errs.reduce((s, e) => s + e * e, 0) / errs.length);
  const worst = Math.max(...errs.map(Math.abs));
  const within4 = errs.filter((e) => Math.abs(e) <= 0.04).length / errs.length;
  const wAll = solve(X, y);
  model.voices[voice] = {
    intercept: +wAll[0].toFixed(5),
    weights: Object.fromEntries(names.map((n, i) => [n, +wAll[i + 1].toFixed(5)])),
  };
  console.log(
    `${voice.padEnd(9)} ${rows.length} designs, air ${Math.min(...y.map(Math.exp)).toFixed(1)}–${Math.max(...y.map(Math.exp)).toFixed(1)} cm³ · held-out error: sd ${(sd * 100).toFixed(1)}%, worst ${(worst * 100).toFixed(1)}%, within ±4% ${(within4 * 100).toFixed(0)}%`,
  );
}
fs.writeFileSync(path.join(ROOT, 'src', 'shuffleAir.json'), JSON.stringify(model, null, 2) + '\n');
console.log('wrote src/shuffleAir.json');
