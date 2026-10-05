// Writes docs/PARAMETERS.md: every Customizer parameter of the generator (what it does, its range,
// each preset's value), from scad/lib/mouthpiece_base.scad and the voice files, with pictures in
// docs/images/params/. A shape parameter's picture is the alto at a lower and a higher value,
// overlaid in the view the app zooms to for it (param_focus(); a section where it acts inside):
// gray = in both, blue = added going to the higher value, orange = taken away.
//   node scripts/param_docs.mjs                    # the page and every picture (~3 min)
//   node scripts/param_docs.mjs tip_opening ...    # the page, and only these pictures
//   node scripts/param_docs.mjs --no-images        # the page only
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';
import { runOpenscad, parseLog, pool } from './openscad.mjs';
import { loadTris } from './mesh_frame.mjs';
import { readAssignments } from './voice_file.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCAD = path.join(ROOT, 'scad');
const DOC = path.join(ROOT, 'docs', 'PARAMETERS.md');
const IMG_DIR = path.join(ROOT, 'docs', 'images', 'params');
const WORK = path.join(ROOT, 'test', 'out', 'param_docs');
const args = process.argv.slice(2);
const ONLY = args.filter((a) => !a.startsWith('--'));
const IMAGES = !args.includes('--no-images');
const VOICES = [
  ['alto', 'Alto'],
  ['tenor', 'Tenor'],
  ['baritone', 'Bari'],
  ['soprano', 'Soprano'],
];
const BASE_TEXT = fs.readFileSync(path.join(SCAD, 'lib', 'mouthpiece_base.scad'), 'utf8');
const COLORS = { both: '#c3c7cf', added: '#2f6fd6', removed: '#e8742a' };

// The app's labels (src/design.ts, TypeScript: through esbuild, as scripts/check.mjs does).
const { paramLabel } = await import(
  'data:text/javascript;base64,' +
    Buffer.from(
      transformSync(fs.readFileSync(path.join(ROOT, 'src', 'design.ts'), 'utf8'), { loader: 'ts', format: 'esm' }).code,
    ).toString('base64')
);

// The base's Customizer parameters, in order: {group, name, value, range, desc}.
function readParams(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let group = null,
    desc = [];
  for (const l of lines.slice(lines.findIndex((x) => x.startsWith('/* [')))) {
    if (l.startsWith('/* [Hidden] */')) break;
    let m;
    if ((m = /^\/\* \[(.+)\] \*\/$/.exec(l))) [group, desc] = [m[1], []];
    else if ((m = /^\/\/ ?(.*)$/.exec(l))) desc.push(m[1]);
    else if ((m = /^([a-z_]\w*) = (.*?);(?:\s*\/\/\s*\[(.*)\])?\s*$/.exec(l))) {
      out.push({ group, name: m[1], value: m[2], range: m[3] ?? null, desc: desc.join(' ') });
      desc = [];
    } else desc = [];
  }
  return out;
}
// "0.5:0.01:4.5" -> {min, step, max}; "a, b, c" -> {options}
function parseRange(r) {
  if (!r) return null;
  const n = r.split(':').map(Number);
  if (n.length === 3 && n.every(Number.isFinite)) return { min: n[0], step: n[1], max: n[2] };
  if (n.length === 2 && n.every(Number.isFinite)) return { min: n[0], step: 1, max: n[1] };
  return { options: r.split(',').map((s) => s.trim()) };
}

// ---- pictures -----------------------------------------------------------------------------------

// What each picture shows. view: side (silhouette from the side, tip right), side_cut (lengthwise
// section on the centreline), top (silhouette from above), plan (section parallel to the table at
// height y), xsec (cross-section at z, seen from the tip end), facing (the side silhouette's lowest
// few mm, heights stretched 6x: a facing differs by tenths of a mm). box: [z0, z1] to frame (else the
// focus box, or the whole length). context: other values for both renders.
const L_ALTO = Number(readAssignments(fs.readFileSync(path.join(SCAD, 'alto.scad'), 'utf8')).overall_length);
const PICS = {
  neck_cork_diameter: { view: 'xsec', z: 8, values: [15, 17.5] },
  shank_clearance: { view: 'xsec', z: 8, values: [0, 0.5] },
  shank_bevel: { view: 'side_cut' },
  shank_bevel_depth: { view: 'side_cut' },
  shank_depth: { view: 'side_cut' },
  bore_diameter: { view: 'side_cut' },
  bore_tilt: { view: 'side_cut', whole: true },
  shank_diameter: { view: 'side', values: [19, 25] },
  chamber_shape: { view: 'xsec', zFrom: 'chamber' },
  chamber_width_extra: { view: 'plan', y: 6, values: [-1, 4] },
  chamber_flare: { view: 'plan', y: 6, values: [0.15, 0.8], context: { chamber_width_extra: 4 } },
  chamber_full_length: { view: 'plan', y: 6, values: [5, 40], context: { chamber_width_extra: 4 } },
  chamber_height: { view: 'side_cut', values: [0, 18] },
  floor_shape: { view: 'side_cut', values: [-0.8, 0.8] },
  throat_position: { view: 'side_cut' },
  throat_width: { view: 'side_cut' },
  throat_taper: { view: 'side_cut', values: [2, 16] },
  throat_shape: { view: 'xsec', zFrom: 'throat' },
  baffle_type: { view: 'side_cut' },
  baffle_height: { view: 'side_cut', values: [-1, 1.5] },
  baffle_start: { view: 'side_cut', values: [-6, 6] },
  baffle_curve: { view: 'side_cut', values: [-0.6, 0.6] },
  baffle_hump: { view: 'side_cut', values: [0, 1.5] },
  window_length: { view: 'plan', y: 0.3 },
  window_width: { view: 'plan', y: 0.3 },
  window_taper: { view: 'plan', y: 0.3 },
  window_rear_radius: { view: 'plan', y: 0.3, values: [1, 8] },
  sidewall_angle: { view: 'xsec', zFrom: 'window', values: [-10, 15] },
  side_rail_width: { view: 'plan', y: 0.3, values: [0.8, 1.8] },
  // near the tip the rails are up at the tip opening: cut just above them
  tip_rail_thickness: { view: 'plan', y: 2.4, values: [1, 3] },
  tip_curve: { view: 'plan', y: 2.4, values: [2, 6] },
  table_width_tip: { view: 'plan', y: 2.4 },
  table_width_rear: { view: 'plan', y: 0.3 },
  table_length: { view: 'plan', y: 0.3, whole: true, values: [66, 76] },
  tip_opening: { view: 'facing', values: [1.5, 2.6] },
  facing_length: { view: 'facing', values: [20, 28] },
  facing_model: { view: 'facing', skipOptions: ['gauge'] },
  facing_exponent: { view: 'facing', values: [1.5, 3] },
  overall_length: { view: 'side', whole: true, values: [82, 96] },
  body_width: { view: 'top', whole: true, values: [26, 32] },
  body_height: { view: 'side', whole: true, values: [25, 30] },
  beak_tip_height: { view: 'side', values: [2.8, 5] },
  body_squareness: { view: 'xsec', z: 0.35 * L_ALTO, values: [1.5, 4] },
  beak_squareness: { view: 'xsec', z: 0.8 * L_ALTO, values: [1.2, 4] },
  beak_curve: { view: 'side', values: [-0.8, 0.8] },
  beak_length: { view: 'side', values: [-8, 8] },
  shoulder_sweep: { view: 'xsec', z: 0.68 * L_ALTO, values: [0, 12] },
  underside_squareness: { view: 'xsec', z: 0.88 * L_ALTO, values: [1.2, 4] },
  print_stock: { view: 'facing', values: [0, 0.3] },
};

const stretched = (pic) => (pic.view === 'facing' ? ' (heights stretched 6x)' : '');
const scadValue = (v) => (typeof v === 'string' ? JSON.stringify(v) : String(v));
const fmtNum = (v) => String(+Number(v).toFixed(3));
const winPath = (f) => f.split(path.sep).join('/');

// A render of the alto with these values (design frame), cached by its settings.
const stlCache = new Map();
function renderAlto(values) {
  const key = JSON.stringify(Object.entries(values).sort());
  if (!stlCache.has(key))
    stlCache.set(
      key,
      (async () => {
        const out = path.join(WORK, `m${stlCache.size}.stl`);
        const defs = Object.entries(values).flatMap(([k, v]) => ['-D', `${k}=${scadValue(v)}`]);
        const r = await runOpenscad(
          ['--backend=manifold', '-o', out, '-D', 'print_orientation=false', ...defs, 'alto.scad'],
          { cwd: SCAD },
        );
        const log = parseLog(r.log);
        if (r.code !== 0 || !log.ok) throw new Error(`render failed (${key}): ${log.errors[0] ?? ''}`);
        return out;
      })(),
    );
  return stlCache.get(key);
}

// The view's mapping (model -> picture: X' right, Y' up, Z' toward the viewer) and its cut.
const MAPS = {
  side: [
    [0, 0, 1],
    [0, 1, 0],
    [-1, 0, 0],
  ], // from -x: tip right, top up
  top: [
    [0, 0, 1],
    [1, 0, 0],
    [0, 1, 0],
  ], // from above: tip right
};
function viewOf(pic) {
  if (pic.view === 'side') return { map: MAPS.side, cut: null };
  if (pic.view === 'facing') return { map: MAPS.side, cut: null, y: [-0.5, 3.5], stretch: 6 };
  if (pic.view === 'side_cut') return { map: MAPS.side, cut: 0 };
  if (pic.view === 'top') return { map: MAPS.top, cut: null };
  if (pic.view === 'plan') return { map: MAPS.top, cut: pic.y };
  return { map: null, cut: pic.z, xsec: true }; // as OpenSCAD looks down z: seen from the tip
}
const apply = (M, p) => M.map((r) => r[0] * p[0] + r[1] * p[1] + r[2] * p[2]);

async function picture(name, pic, lo, hi, focus, outPng) {
  const [a, b] = await Promise.all([
    renderAlto({ ...pic.context, [name]: lo }),
    renderAlto({ ...pic.context, [name]: hi }),
  ]);
  const v = viewOf(pic);
  // the stretch of the length to show
  let [z0, z1] =
    pic.whole || v.xsec ? [-5, 400] : (pic.box ?? (focus ? [focus[0][2] - 2, focus[1][2] + 2] : [-5, 400]));
  const [cy0, cy1] = v.y ?? [-100, 100];
  const crop = `translate([-100, ${cy0}, ${z0}]) cube([200, ${cy1 - cy0}, ${z1 - z0}]);`;
  const mm = (M) => `multmatrix([${M.map((r) => `[${r.join(', ')}, 0]`).join(', ')}, [0, 0, 0, 1]])`;
  const shape = (f) =>
    v.xsec
      ? `projection(cut = true) translate([0, 0, ${-v.cut}]) import("${winPath(f)}");`
      : `scale([1, ${v.stretch ?? 1}]) projection(cut = ${v.cut !== null}) translate([0, 0, ${-(v.cut ?? 0)}]) ${mm(v.map)} intersection() { import("${winPath(f)}"); ${crop} }`;
  const scene = [
    `module a() ${shape(a)}`,
    `module b() ${shape(b)}`,
    `color("${COLORS.both}") render() intersection() { a(); b(); }`,
    `color("${COLORS.added}") render() difference() { b(); a(); }`,
    `color("${COLORS.removed}") render() difference() { a(); b(); }`,
  ].join('\n');
  const sceneFile = path.join(WORK, `${path.basename(outPng, '.png')}.scad`);
  fs.writeFileSync(sceneFile, scene);
  // picture size from the shapes' extent in the view
  let [x0, x1, y0, y1] = [1e9, -1e9, 1e9, -1e9];
  for (const f of [a, b])
    for (const t of loadTris(f))
      for (const p of t) {
        if (!v.xsec && (p[2] < z0 || p[2] > z1 || p[1] < cy0 || p[1] > cy1)) continue;
        const q = v.xsec ? [p[0], p[1]] : apply(v.map, p);
        q[1] *= v.stretch ?? 1;
        [x0, x1, y0, y1] = [Math.min(x0, q[0]), Math.max(x1, q[0]), Math.min(y0, q[1]), Math.max(y1, q[1])];
      }
  const W = 1000,
    H = Math.round(Math.max(220, Math.min(700, (W * (y1 - y0)) / Math.max(1, x1 - x0) + 80)));
  const r = await runOpenscad([
    '--backend=manifold',
    '-o',
    outPng,
    `--imgsize=${W},${H}`,
    '--viewall',
    '--autocenter',
    '--projection=o',
    '--camera=0,0,0,0,0,0,100',
    '--colorscheme=Tomorrow',
    sceneFile,
  ]);
  if (r.code !== 0 || !fs.existsSync(outPng)) throw new Error(`picture failed (${name}): ${r.log.slice(-400)}`);
}

// ---- the page -----------------------------------------------------------------------------------

function rangeText(p, R) {
  if (!R) return p.value === 'true' || p.value === 'false' ? 'on / off' : 'text';
  if (R.options) return R.options.map((o) => `\`${o}\``).join(', ');
  return `${fmtNum(R.min)} to ${fmtNum(R.max)}, step ${fmtNum(R.step)}`;
}
const cell = (v) => (v === undefined ? '-' : `\`${v.replace(/^"(.*)"$/, '$1') || '(empty)'}\``);

async function main() {
  fs.mkdirSync(WORK, { recursive: true });
  fs.mkdirSync(IMG_DIR, { recursive: true });
  const params = readParams(BASE_TEXT);
  const voiceVals = Object.fromEntries(
    VOICES.map(([v]) => [v, readAssignments(fs.readFileSync(path.join(SCAD, `${v}.scad`), 'utf8'))]),
  );
  // the app's focus boxes for the alto
  fs.writeFileSync(
    path.join(SCAD, '_param_docs_focus.scad'),
    'include <alto.scad>\necho(PARAM_FOCUS = param_focus());\n',
  );
  const fr = await runOpenscad(['-o', path.join(WORK, 'focus.echo'), '_param_docs_focus.scad'], { cwd: SCAD });
  fs.rmSync(path.join(SCAD, '_param_docs_focus.scad'));
  const fm = /PARAM_FOCUS = (.*)$/m.exec(fs.readFileSync(path.join(WORK, 'focus.echo'), 'utf8') + fr.log);
  const FOCUS = Object.fromEntries(
    JSON.parse(fm[1])
      .filter((e) => e[0] !== 'frame')
      .map((e) => [e[0], e[1]]),
  );
  const zMid = (n) => (FOCUS[n][0][2] + FOCUS[n][1][2]) / 2;
  const zFrom = { chamber: zMid('chamber_width_extra'), throat: zMid('throat_position'), window: zMid('window_width') };

  // the pictures to make: [file, param, lo, hi, caption]
  const jobs = [];
  for (const p of params) {
    const pic = PICS[p.name];
    if (!pic) continue;
    if (pic.zFrom) pic.z = zFrom[pic.zFrom];
    const R = parseRange(p.range);
    const alto = voiceVals.alto[p.name] ?? p.value;
    if (R?.options) {
      const def = alto.replace(/^"(.*)"$/, '$1');
      for (const o of R.options.filter((o) => o !== def && !(pic.skipOptions ?? []).includes(o)))
        jobs.push({
          file: `${p.name}-${o}.png`,
          p,
          pic,
          lo: def,
          hi: o,
          caption: `\`${def}\` (the alto's) → \`${o}\`${stretched(pic)}`,
        });
    } else if (R) {
      const d = Number(alto),
        span = R.max - R.min,
        snap = (x) => +(Math.round(Math.max(R.min, Math.min(R.max, x)) / R.step) * R.step).toFixed(4);
      const [lo, hi] = pic.values ?? [snap(d - span / 4), snap(d + span / 4)];
      jobs.push({ file: `${p.name}.png`, p, pic, lo, hi, caption: `${fmtNum(lo)} → ${fmtNum(hi)}${stretched(pic)}` });
    }
  }
  if (IMAGES) {
    const todo = jobs.filter((j) => !ONLY.length || ONLY.includes(j.p.name));
    let done = 0;
    await pool(todo, Math.max(2, os.cpus().length - 2), async (j) => {
      await picture(j.p.name, j.pic, j.lo, j.hi, FOCUS[j.p.name], path.join(IMG_DIR, j.file));
      process.stdout.write(`\r${++done}/${todo.length} pictures`);
    });
    process.stdout.write('\n');
  }

  // the page
  const out = [];
  out.push(
    '# Parameters',
    '',
    "Every setting of the generator, as the app lists them under **All parameters** (and OpenSCAD's",
    "Customizer shows them). The app's main panel shows a handful of these under friendlier names;",
    'the name in brackets is the one in the `.scad` file. Lengths are in mm, angles in degrees.',
    '',
    'Each picture is the alto preset at two values of one setting, the rest unchanged, seen where the',
    'setting acts (a section when it acts inside):',
    '',
    '- **gray**: in both',
    '- **blue**: added going from the first value to the second',
    '- **orange**: taken away going from the first value to the second',
    '',
    'This page is made by `node scripts/param_docs.mjs` from `scad/lib/mouthpiece_base.scad`.',
    '',
  );
  const groups = [...new Set(params.map((p) => p.group))];
  out.push('Sections: ' + groups.map((g) => `[${g}](#${g.toLowerCase().replace(/[^a-z0-9]+/g, '-')})`).join(' · '), '');
  const NOTES = {
    Lettering: "Text and pictures on the outside. The app's **Personalise** section has the main ones.",
    'Profile overrides':
      'Point lists that replace a built-in curve: `[[distance from the shank end, value], ...]`, `[]` = the built-in one. ' +
      "Edit them in the app's **Curves** panel (OpenSCAD's Customizer can't edit lists).",
    Ligature:
      "A ligature made to fit this mouthpiece (the app's **Ligature** section). See [the printing guide](PRINTING.md).",
    Output: 'What the file makes. The debug parts show the pieces the mouthpiece is built from.',
  };
  for (const g of groups) {
    out.push(`## ${g}`, '');
    if (NOTES[g]) out.push(NOTES[g], '');
    if (g === 'Ligature') out.push('![A ligature on the alto](images/ligature.png)', '');
    for (const p of params.filter((x) => x.group === g)) {
      const R = parseRange(p.range);
      const label = paramLabel(p.name);
      out.push(`### ${label} (\`${p.name}\`)`, '');
      if (p.desc) out.push(p.desc, '');
      out.push(`Range: ${rangeText(p, R)}.`, '');
      out.push('Presets: ' + VOICES.map(([v, n]) => `${n} ${cell(voiceVals[v][p.name])}`).join(' · ') + '.', '');
      for (const j of jobs.filter((x) => x.p === p))
        if (fs.existsSync(path.join(IMG_DIR, j.file)))
          out.push(`![${p.name}: ${j.caption.replace(/`/g, '')}](images/params/${j.file})`, '', `*${j.caption}*`, '');
    }
  }
  fs.writeFileSync(DOC, out.join('\n').replace(/\n{3,}/g, '\n\n'));
  console.log(`wrote ${path.relative(ROOT, DOC)} (${params.length} parameters, ${jobs.length} pictures)`);
}

await main();
