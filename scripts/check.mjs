// Regression check for every param file (scad/*.scad and scad/variants/*.scad that include the base; fits in scad/fits/ are
// local only, check one by naming it):
//   1. renders cleanly: no errors / OpenSCAD warnings, genus 1 (one through-bore, no holes, no
//      loose pieces);
//   2. geometry matches test/baselines.json (vertex-set fingerprint; volume change reported);
//   3. print orientation: the part stands on z = 0 on its shank end ring;
//   4. the bundled single-file version (scripts/bundle_scad.mjs) renders identically, and the
//      app's opening of it (src/migrate.ts, "Open .scad") leaves its text unchanged;
//   5. volume IoU against its reference mesh, where that mesh exists locally (third-party meshes
//      are gitignored), must not drop; needs the local-only fit_mouthpiece.mjs and
//      compare_sections.mjs (not in the repo), skipped without test/references.json;
//   6. the ligature made for it: genus 1, stands on z = 0, never touches the mouthpiece
//      (part = ligature_clash is empty), fingerprinted like the mouthpiece.
//   npm run check                 # compare with the baselines (exit 1 on any failure/change)
//   npm run check -- --update     # accept the current results as the new baselines
//   npm run check -- scad/alto.scad ...   # only these files
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runOpenscad, parseLog, pool, OPENSCAD } from './openscad.mjs';
import { loadTris } from './mesh_frame.mjs';
import { isVoiceFile } from './voice_file.mjs';
import { transformSync } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCAD = path.join(ROOT, 'scad');
const OUT = path.join(ROOT, 'test', 'out');
const BASELINES = path.join(ROOT, 'test', 'baselines.json');
const args = process.argv.slice(2);
const UPDATE = args.includes('--update');
fs.mkdirSync(OUT, { recursive: true });

// Reference meshes for the IoU check: test/references.json (local, gitignored, like the meshes
// themselves) maps a param file to its mesh, e.g. {"alto.scad": "example_models/.../alto.stl"},
// paths relative to the project root. Files without one (or a missing mesh) skip the check.
const REFS_FILE = path.join(ROOT, 'test', 'references.json');
const REFERENCES = Object.fromEntries(
  Object.entries(fs.existsSync(REFS_FILE) ? JSON.parse(fs.readFileSync(REFS_FILE, 'utf8')) : {}).map(([k, v]) => [
    k,
    path.resolve(ROOT, v),
  ]),
);

// The app's migrateScad (TypeScript), compiled on the fly: a downloaded design must open unchanged
// (renaming the generator's own RENAMED_PARAMS block once set real settings to undef: a hang).
const { migrateScad } = await import(
  'data:text/javascript;base64,' +
    Buffer.from(
      transformSync(fs.readFileSync(path.join(ROOT, 'src', 'migrate.ts'), 'utf8'), { loader: 'ts', format: 'esm' })
        .code,
    ).toString('base64')
);

const rel = (f) => path.relative(SCAD, f).split(path.sep).join('/');
const listed = args.filter((a) => !a.startsWith('--'));
const files = (
  listed.length
    ? listed.map((f) => path.resolve(f))
    : [SCAD, path.join(SCAD, 'variants')]
        .flatMap((d) => (fs.existsSync(d) ? fs.readdirSync(d).map((f) => path.join(d, f)) : []))
        .filter((f) => f.endsWith('.scad') && isVoiceFile(fs.readFileSync(f, 'utf8')))
).sort();

function meshInfo(stlPath) {
  const T = loadTris(stlPath);
  let vol = 0;
  const mn = [Infinity, Infinity, Infinity],
    mx = [-Infinity, -Infinity, -Infinity];
  const keys = new Set();
  for (const [a, b, c] of T) {
    vol +=
      (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) /
      6;
    for (const p of [a, b, c]) {
      keys.add(p.map((x) => x.toFixed(3)).join(','));
      p.forEach((x, i) => {
        mn[i] = Math.min(mn[i], x);
        mx[i] = Math.max(mx[i], x);
      });
    }
  }
  const hash = crypto
    .createHash('sha1')
    .update([...keys].sort().join(';'))
    .digest('hex')
    .slice(0, 16);
  return {
    tris: T.length,
    volume: +Math.abs(vol).toFixed(3),
    size: mx.map((x, i) => +(x - mn[i]).toFixed(3)),
    hash,
    T,
    zmin: mn[2],
  };
}

// Area of the faces lying on the lowest z (the print-bed contact).
function plateArea(T, zmin) {
  let area = 0;
  for (const [a, b, c] of T) {
    if (![a, b, c].every((p) => p[2] < zmin + 0.01)) continue;
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
      v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    area += Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) / 2;
  }
  return area;
}

function nodeScript(script, scriptArgs) {
  return execFileSync(process.execPath, [path.join(ROOT, 'scripts', script), ...scriptArgs], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function checkFile(file) {
  const name = rel(file);
  const tag = name.replace(/[/.]/g, '_');
  const r = { file: name, problems: [], notes: [] };
  // 1 + 2: design-frame render
  const stl = path.join(OUT, `${tag}.stl`);
  const run = await runOpenscad(['-o', stl, '-D', 'print_orientation=false', file], { cwd: path.dirname(file) });
  const log = parseLog(run.log);
  if (!log.ok || run.code !== 0) {
    r.problems.push(`render failed${log.errors.length ? `: ${log.errors[0]}` : ''}`);
    return r;
  }
  if (log.genus !== null && log.genus !== 1)
    r.problems.push(
      `genus ${log.genus} (expected 1: ${log.genus > 1 ? 'extra holes' : 'a loose piece or no through-bore'})`,
    );
  for (const w of log.warnings) r.problems.push(w);
  for (const w of log.designWarnings) r.notes.push(w);
  const m = meshInfo(stl);
  Object.assign(r, { genus: log.genus, tris: m.tris, volume: m.volume, size: m.size, hash: m.hash });
  // 3: print orientation
  const pstl = path.join(OUT, `${tag}_print.stl`);
  const prun = await runOpenscad(['-o', pstl, file], { cwd: path.dirname(file) });
  if (prun.code !== 0) r.problems.push('print-orientation render failed');
  else {
    const pm = meshInfo(pstl);
    const area = plateArea(pm.T, pm.zmin);
    r.plate = +area.toFixed(1);
    if (Math.abs(pm.zmin) > 1e-3)
      r.problems.push(`print orientation: lowest point at z=${pm.zmin.toFixed(3)} (expected 0)`);
    if (area < 20) r.problems.push(`print orientation: only ${area.toFixed(1)}mm² on the plate`);
  }
  // 4: bundle
  const bundled = path.join(OUT, `${tag}_bundled.scad`);
  nodeScript('bundle_scad.mjs', [file, '-o', bundled]);
  const btext = fs.readFileSync(bundled, 'utf8');
  if (migrateScad(btext) !== btext)
    r.problems.push('the app would change the bundled file on opening it (src/migrate.ts)');
  const bstl = path.join(OUT, `${tag}_bundled.stl`);
  // A bundle drops the fonts in lib/fonts/ (on purpose): with one of those, compare both in a
  // font that ships with OpenSCAD.
  const font = /^lettering_font = "([^"]*)"/m.exec(fs.readFileSync(file, 'utf8'))?.[1];
  const fontDefs = font && !/^(Sans|Serif|Mono)\b/.test(font) ? ['-D', 'lettering_font="Sans Bold"'] : [];
  let refHash = m.hash;
  if (fontDefs.length) {
    const fstl = path.join(OUT, `${tag}_sansfont.stl`);
    await runOpenscad(['-o', fstl, '-D', 'print_orientation=false', ...fontDefs, file], { cwd: path.dirname(file) });
    refHash = fs.existsSync(fstl) ? meshInfo(fstl).hash : null;
  }
  const brun = await runOpenscad(['-o', bstl, '-D', 'print_orientation=false', ...fontDefs, bundled]);
  const blog = parseLog(brun.log);
  if (brun.code !== 0 || !blog.ok) r.problems.push('bundled file failed to render');
  else {
    if (blog.warnings.length) r.problems.push(`bundled file warns: ${blog.warnings[0]}`);
    if (meshInfo(bstl).hash !== refHash)
      r.problems.push(`bundled file renders different geometry${fontDefs.length ? ' (compared in Sans Bold)' : ''}`);
  }
  // 5: reference IoU
  const ref = REFERENCES[name];
  if (ref && fs.existsSync(ref)) {
    const frame = path.join(OUT, `${tag}_${path.basename(ref).replace(/\.stl$/i, '')}_refframe.stl`); // per reference: the cache follows a change of reference
    if (!fs.existsSync(frame) || fs.statSync(frame).mtimeMs < fs.statSync(ref).mtimeMs)
      nodeScript('fit_mouthpiece.mjs', [ref, '--frame', frame]);
    const iou = /overall volume IoU ([\d.]+)/.exec(nodeScript('compare_sections.mjs', [frame, stl]));
    if (iou) r.iou = Number(iou[1]);
  }
  // 6: ligature
  const lstl = path.join(OUT, `${tag}_ligature.stl`);
  const lrun = await runOpenscad(['-o', lstl, '-D', 'part="ligature"', file], { cwd: path.dirname(file) });
  const llog = parseLog(lrun.log);
  if (lrun.code !== 0 || !llog.ok) r.problems.push('ligature failed to render');
  else {
    if (llog.genus !== null && llog.genus !== 1) r.problems.push(`ligature genus ${llog.genus} (expected 1)`);
    for (const w of llog.designWarnings) r.notes.push(`ligature: ${w}`);
    const lm = meshInfo(lstl);
    Object.assign(r, { ligHash: lm.hash, ligVolume: lm.volume });
    if (Math.abs(lm.zmin) > 1e-3) r.problems.push(`ligature: lowest point at z=${lm.zmin.toFixed(3)} (expected 0)`);
  }
  const crun = await runOpenscad(
    ['-o', path.join(OUT, `${tag}_ligature_clash.stl`), '-D', 'part="ligature_clash"', file],
    { cwd: path.dirname(file) },
  );
  if (!/top level object is empty/i.test(crun.log))
    r.problems.push('ligature touches the mouthpiece (part = ligature_clash is not empty)');
  return r;
}

const t0 = Date.now();
console.log(`OpenSCAD: ${OPENSCAD}\nchecking ${files.length} file(s)…`);
const results = await pool(files, 4, (f) =>
  checkFile(f).catch((e) => ({ file: rel(f), problems: [String(e.message ?? e)], notes: [] })),
);

const baselines = fs.existsSync(BASELINES) ? JSON.parse(fs.readFileSync(BASELINES, 'utf8')) : {};
let failed = 0;
for (const r of results) {
  const b = baselines[r.file];
  if (!UPDATE && r.hash) {
    if (!b) r.problems.push('no baseline yet (run with --update to record one)');
    else if (b.hash !== r.hash) {
      const dv = b.volume ? ((r.volume - b.volume) / b.volume) * 100 : 0;
      r.problems.push(
        `geometry changed: volume ${b.volume} -> ${r.volume} mm³ (${dv >= 0 ? '+' : ''}${dv.toFixed(3)}%), triangles ${b.tris} -> ${r.tris}`,
      );
    }
    if (b && r.ligHash && b.ligHash !== r.ligHash)
      r.problems.push(`ligature changed: volume ${b.ligVolume ?? '?'} -> ${r.ligVolume} mm³`);
    if (b?.iou !== undefined && r.iou !== undefined && r.iou < b.iou - 0.002)
      r.problems.push(`reference IoU dropped ${b.iou} -> ${r.iou}`);
  }
  const status = r.problems.length ? 'FAIL' : 'ok  ';
  if (r.problems.length) failed++;
  const facts = r.hash
    ? `genus ${r.genus}, ${r.tris} tris, ${r.volume} mm³, plate ${r.plate ?? '?'} mm²${r.iou !== undefined ? `, IoU ${r.iou}` : ''}${r.ligVolume !== undefined ? `, ligature ${r.ligVolume} mm³` : ''}`
    : '';
  console.log(`${status} ${r.file.padEnd(32)} ${facts}`);
  for (const p of r.problems) console.log(`       ✗ ${p}`);
  for (const n of r.notes) console.log(`       · ${n}`);
}

if (UPDATE) {
  const next = { ...baselines };
  for (const r of results) {
    if (!r.hash) continue;
    next[r.file] = {
      tris: r.tris,
      volume: r.volume,
      size: r.size,
      hash: r.hash,
      ...(r.iou !== undefined ? { iou: r.iou } : {}),
      ...(r.ligHash ? { ligHash: r.ligHash, ligVolume: r.ligVolume } : {}),
    };
  }
  fs.writeFileSync(BASELINES, JSON.stringify(next, null, 2) + '\n');
  console.log(`baselines updated: ${path.relative(ROOT, BASELINES)}`);
}
console.log(`${results.length - failed}/${results.length} passed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
process.exit(failed && !UPDATE ? 1 : 0);
