// Local, sequential render benchmarks. Uses the exact web WASM shipped by the app, in Node;
// excludes browser networking, worker messaging, GPU drawing and React. Native is optional.
// node scripts/benchmark.mjs --engine wasm --runs 3 --voices alto,baritone
// Outputs go to the gitignored test/out/performance/ directory.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { EdgesGeometry } from 'three';
import { listProjectFiles, SCAD_DIR } from './project_files.mjs';
import { OPENSCAD, runOpenscad } from './openscad.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'test/out/performance');
const options = process.argv.slice(2);
function option(name, fallback) {
  const i = options.indexOf(`--${name}`);
  return i < 0 ? fallback : options[i + 1];
}
const engine = option('engine', 'wasm');
const runs = Number(option('runs', '3'));
const voices = option('voices', 'alto,baritone').split(',');
if (!['wasm', 'native'].includes(engine) || !Number.isInteger(runs) || runs < 1)
  throw new Error('Expected --engine wasm|native and --runs <positive integer>');
if (!voices.every((v) => /^[a-z_]+$/.test(v) && fs.existsSync(path.join(SCAD_DIR, `${v}.scad`))))
  throw new Error('Expected --voices <comma-separated preset names>');
fs.mkdirSync(OUT, { recursive: true });

const reports = '\nfacing_report();\nclearance_report();\necho(SHAPE_EDIT = shape_edit_lines());\n';
const focus = '\necho(PARAM_FOCUS = param_focus());\n';
const air = '\necho(AIR_SOLID = air_view_rings());\n';
const cases = [
  { name: 'draft', fn: 32 },
  { name: 'normal', fn: 64 },
  { name: 'fine', fn: 96 },
  { name: 'evaluation', fn: 64, format: 'csg' },
  { name: 'reports-no-air', fn: 64, suffix: reports + focus },
  { name: 'app-render', fn: 64, suffix: reports + focus + air },
  { name: 'readouts', fn: 64, part: 'clearance_report', format: 'echo', suffix: '\nfacing_report();\n' },
  ...['reed_model', 'ligature_seated', 'cap_seated', 'shank_test_ring'].map((part) => ({ name: part, fn: 64, part })),
];
const filter = option('cases', '').split(',').filter(Boolean);
const selected = filter.length ? cases.filter((c) => filter.includes(c.name)) : cases;
if (!selected.length || filter.some((name) => !cases.some((c) => c.name === name)))
  throw new Error(`Expected --cases from: ${cases.map((c) => c.name).join(',')}`);

const project = Object.fromEntries(listProjectFiles().map((rel) => [rel, fs.readFileSync(path.join(SCAD_DIR, rel))]));
let factory, module;
const compileStart = performance.now();
if (engine === 'wasm') {
  ({ default: factory } = await import(pathToFileURL(path.join(ROOT, 'public/openscad/openscad.js')).href));
  module = await WebAssembly.compile(fs.readFileSync(path.join(ROOT, 'public/openscad/openscad.wasm')));
}
const compileMs = performance.now() - compileStart;

async function execute(voice, c) {
  const format = c.format ?? 'stl';
  const output = engine === 'wasm' ? `/tmp/result.${format}` : path.join(OUT, `result.${format}`);
  const args = ['--backend=manifold'];
  if (format === 'stl') args.push('--export-format=binstl');
  args.push('-o', output, '-D', `render_fn=${c.fn}`);
  if (c.part) args.push('-D', `part="${c.part}"`);
  const source = project[`${voice}.scad`].toString() + (c.suffix ?? '');
  let bytes, log, code;
  const start = performance.now();
  let initialized = start,
    populated = start;
  if (engine === 'wasm') {
    const lines = [];
    const inst = await factory({
      noInitialRun: true,
      print: (s) => lines.push(s),
      printErr: (s) => lines.push(s),
      instantiateWasm: (imports, done) => {
        WebAssembly.instantiate(module, imports).then(done);
        return {};
      },
    });
    initialized = performance.now();
    for (const [rel, data] of Object.entries(project)) {
      const p = `/scad/${rel}`;
      inst.FS.mkdirTree(path.posix.dirname(p));
      inst.FS.writeFile(p, data);
    }
    inst.FS.writeFile(`/scad/${voice}.scad`, source);
    inst.FS.chdir('/scad');
    populated = performance.now();
    code = inst.callMain([...args, `/scad/${voice}.scad`]);
    log = lines.join('\n');
    if (!code) bytes = inst.FS.readFile(output);
  } else {
    // Absolute include keeps the wrapper self-contained without modifying the presets.
    const main = path.join(OUT, `${voice}.scad`);
    fs.writeFileSync(
      main,
      `include <${path.join(SCAD_DIR, `${voice}.scad`).replaceAll('\\', '/')}>\n${c.suffix ?? ''}`,
    );
    ({ code, log } = await runOpenscad([...args, main]));
    if (!code) bytes = fs.readFileSync(output);
  }
  const end = performance.now();
  if (code || /^ERROR:/m.test(log)) throw new Error(`${voice}/${c.name}: exit ${code}\n${log}`);
  fs.writeFileSync(path.join(OUT, `${engine}-${voice}-${c.name}.log`), log);
  let parseMs = 0,
    edgesMs = 0,
    triangles = null;
  if (format === 'stl') {
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    triangles = new DataView(buffer).getUint32(80, true);
    const t0 = performance.now();
    const geometry = new STLLoader().parse(buffer);
    const t1 = performance.now();
    const edges = new EdgesGeometry(geometry, 25);
    const t2 = performance.now();
    parseMs = t1 - t0;
    edgesMs = t2 - t1;
    edges.dispose();
    geometry.dispose();
  }
  return {
    totalMs: end - start,
    initMs: initialized - start,
    filesMs: populated - initialized,
    executeMs: end - populated,
    parseMs,
    edgesMs,
    triangles,
    bytes: bytes.length,
    logBytes: Buffer.byteLength(log),
  };
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return (s[Math.floor((s.length - 1) / 2)] + s[Math.ceil((s.length - 1) / 2)]) / 2;
};
console.log(
  `${engine}: ${runs} measured runs after one warm-up per case; ${Object.keys(project).length} project files`,
);
console.log(
  `Runtime: ${engine === 'native' ? OPENSCAD : fs.readFileSync(path.join(ROOT, 'public/openscad/VERSION'), 'utf8').trim()}, compile/import ${compileMs.toFixed(0)} ms`,
);
const rows = [];
const output = path.join(OUT, `${engine}.json`);
const result = {
  engine,
  runtime: engine === 'native' ? OPENSCAD : fs.readFileSync(path.join(ROOT, 'public/openscad/VERSION'), 'utf8').trim(),
  node: process.version,
  cpu: os.cpus()[0]?.model,
  platform: `${process.platform}/${process.arch}`,
  startedAt: new Date().toISOString(),
  runs,
  compileMs,
  projectBytes: Object.values(project).reduce((n, b) => n + b.length, 0),
  projectHash: crypto
    .createHash('sha256')
    .update(JSON.stringify(Object.entries(project)))
    .digest('hex'),
  rows,
};
for (const voice of voices) {
  for (const c of selected) {
    await execute(voice, c);
    const samples = [];
    for (let i = 0; i < runs; i++) samples.push(await execute(voice, c));
    const row = { voice, case: c.name };
    for (const key of Object.keys(samples[0]))
      row[key] = samples[0][key] === null ? null : median(samples.map((s) => s[key]));
    rows.push({ ...row, samples });
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
    console.log(
      `${voice.padEnd(9)} ${c.name.padEnd(17)} ${row.totalMs.toFixed(0).padStart(5)} ms; init ${row.initMs.toFixed(0)}, files ${row.filesMs.toFixed(0)}, run ${row.executeMs.toFixed(0)}, STL parse ${row.parseMs.toFixed(1)}, edges ${row.edgesMs.toFixed(1)}`,
    );
  }
}
console.log(`Saved ${output}`);
