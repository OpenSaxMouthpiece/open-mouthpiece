// Draws docs/images/glossary-*.svg, the labelled pictures in docs/GLOSSARY.md, from the alto
// preset: a side view (outline, the cut down the middle, the reed) and the view onto the table.
// The geometry comes from OpenSCAD (2D SVG exports of a projection / cut); the labels point at
// fixed spots on the alto (mm, design frame), so re-check them after a big alto retune.
//   node scripts/glossary_diagram.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runOpenscad, parseLog } from './openscad.mjs';
import { readAssignments } from './voice_file.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCAD = path.join(ROOT, 'scad');
const WORK = path.join(ROOT, 'test', 'out', 'glossary');
const OUT = path.join(ROOT, 'docs', 'images');
fs.mkdirSync(WORK, { recursive: true });
const fwd = (p) => p.replace(/\\/g, '/');

async function scad(args, cwd = SCAD) {
  const r = await runOpenscad(['--backend=manifold', ...args], { cwd });
  if (r.code !== 0 || parseLog(r.log).errors.length || !fs.existsSync(args[1]))
    throw new Error(`OpenSCAD failed: ${r.log.slice(-400)}`);
  return r.log;
}

// The alto and its reed in the design frame (Z = bore axis, tip at z = L; Y up, table at y = 0).
const mp = path.join(WORK, 'mp.stl');
const reed = path.join(WORK, 'reed.stl');
await Promise.all([
  scad(['-o', mp, '-D', 'print_orientation=false', 'alto.scad']),
  scad(['-o', reed, '-D', 'print_orientation=false', '-D', 'part="reed_model"', 'alto.scad']),
]);

// 2D shapes as polygons in model mm: side views are (z, y), the table view (z, x).
const SHAPES = {
  outline: `projection() rotate([0, -90, 0]) import("${fwd(mp)}");`,
  cut: `projection(cut = true) rotate([0, -90, 0]) import("${fwd(mp)}");`,
  reed: `projection(cut = true) rotate([0, -90, 0]) import("${fwd(reed)}");`,
  plan: `projection() rotate([0, 0, -90]) rotate([90, 0, 0]) import("${fwd(mp)}");`,
  // the reed side: what lies within a few mm of the table (the rails, tip rail and table)
  table: `projection() rotate([0, 0, -90]) rotate([90, 0, 0]) intersection() { import("${fwd(mp)}"); translate([-50, -5, -10]) cube([100, 5 + TABLE_SLAB, 200]); }`,
};
const TABLE_SLAB = 2.4;
async function shape(name) {
  const f = path.join(WORK, `${name}.scad`);
  fs.writeFileSync(f, `TABLE_SLAB = ${TABLE_SLAB};\n${SHAPES[name]}\n`);
  const svg = path.join(WORK, `${name}.svg`);
  await scad(['-o', svg, f], WORK);
  // OpenSCAD writes "M x,y L x,y ... z" with y negated; side views come out as (-z, y)
  const d = [...fs.readFileSync(svg, 'utf8').matchAll(/d="([^"]*)"/g)].map((m) => m[1]).join(' ');
  return d
    .split(/z/i)
    .map((s) => [...s.matchAll(/(-?[\d.e+-]+),(-?[\d.e+-]+)/g)].map((m) => [-Number(m[1]), -Number(m[2])]))
    .filter((p) => p.length > 2);
}
const shapes = Object.fromEntries(await Promise.all(Object.keys(SHAPES).map(async (k) => [k, await shape(k)])));
if (process.argv.includes('--bbox')) {
  for (const [k, polys] of Object.entries(shapes))
    for (const p of polys) {
      const xs = p.map((q) => q[0]),
        ys = p.map((q) => q[1]);
      console.log(
        k,
        p.length,
        Math.min(...xs).toFixed(1),
        Math.max(...xs).toFixed(1),
        Math.min(...ys).toFixed(1),
        Math.max(...ys).toFixed(1),
      );
    }
  process.exit(0);
}

// ---- drawing ---------------------------------------------------------------------------------
const L = Math.max(...shapes.outline.flat().map((q) => q[0])); // the tip
const S = 8; // px per mm
const PAD = 16;
const INK = '#1f2328',
  MUTED = '#59636e',
  ACCENT = '#cf4a1a';
const FILL = { outline: '#d5d9df', cut: '#8b95a3', reed: '#d9b56a', plan: '#e3e6ea', table: '#8b95a3' };

// y extent of a shape's polygons where they cross the station z: [min, max] over all crossings
function at(polys, z, pick) {
  const ys = [];
  for (const p of polys)
    for (let i = 0; i < p.length; i++) {
      const [a, b] = [p[i], p[(i + 1) % p.length]];
      if ((a[0] - z) * (b[0] - z) <= 0 && a[0] !== b[0]) ys.push(a[1] + ((z - a[0]) / (b[0] - a[0])) * (b[1] - a[1]));
    }
  return pick === 'min' ? Math.min(...ys) : Math.max(...ys);
}
const inner = (z) =>
  at(
    shapes.cut.filter((p) => Math.max(...p.map((q) => q[1])) > 20),
    z,
    'min',
  ); // roof / baffle
const floorY = (z) =>
  at(
    shapes.cut.filter((p) => Math.max(...p.map((q) => q[1])) < 20),
    z,
    'max',
  );
const top = (z) => at(shapes.outline, z, 'max');

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
function picture(name, title, polys, [y0, y1], labels, brackets = []) {
  const W = Math.round((L + 2) * S + 2 * PAD + 190),
    X0 = PAD + 190 - 2 * S; // room on the left for the tip's labels
  const px = (z) => +(X0 + (L - z) * S + 2 * S).toFixed(1);
  const py = (y) => +(PAD + 26 + (y1 - y) * S).toFixed(1);
  const H = Math.round(py(y0) + PAD);
  const path_ = (p) => 'M' + p.map(([z, y]) => `${px(z).toFixed(1)},${py(y).toFixed(1)}`).join('L') + 'Z';
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="14">`,
    `<rect width="${W}" height="${H}" rx="10" fill="#ffffff"/>`,
    `<text x="${PAD}" y="${PAD + 10}" font-size="15" font-weight="600" fill="${INK}">${esc(title)}</text>`,
  ];
  for (const [k, ps] of polys)
    out.push(
      `<path d="${ps.map(path_).join('')}" fill="${FILL[k]}" fill-rule="evenodd" stroke="${k === 'outline' || k === 'plan' ? '#aab1ba' : 'none'}" stroke-width="1"/>`,
    );
  for (const b of brackets) {
    // a dimension line from z0 to z1 at height y, its name under it
    const [a, c, y] = [px(b.z0), px(b.z1), py(b.y)];
    out.push(
      `<path d="M${a},${y - 5}V${y + 5}M${a},${y}H${c}M${c},${y - 5}V${y + 5}" stroke="${ACCENT}" stroke-width="1.5" fill="none"/>`,
      `<text x="${((a + c) / 2).toFixed(1)}" y="${y + 18}" text-anchor="middle" fill="${INK}">${esc(b.text)}</text>`,
    );
  }
  for (const l of labels) {
    // a leader from the spot (z, y) to the text at (tz, ty), both in model mm
    const [ax, ay, tx, ty] = [px(l.z), py(l.y), px(l.tz), py(l.ty)];
    const anchor = l.anchor ?? (tx < ax - 4 ? 'end' : tx > ax + 4 ? 'start' : 'middle');
    const gap = anchor === 'end' ? 4 : anchor === 'start' ? -4 : 0;
    if (!l.inside)
      out.push(
        `<path d="M${ax},${ay}L${tx + gap},${ty - 4}" stroke="${MUTED}" stroke-width="1" fill="none"/>`,
        `<circle cx="${ax}" cy="${ay}" r="2.5" fill="${ACCENT}"/>`,
      );
    out.push(
      `<text x="${tx - gap}" y="${ty}" text-anchor="${anchor}" fill="${INK}"${l.italic ? ' font-style="italic"' : ''}>${esc(l.text)}</text>`,
    );
  }
  out.push('</svg>');
  fs.writeFileSync(path.join(OUT, `glossary-${name}.svg`), out.join('\n') + '\n');
  console.log(`docs/images/glossary-${name}.svg`);
}

// Spots on the alto (design frame, mm), from its settings and the cut.
const alto = readAssignments(fs.readFileSync(path.join(SCAD, 'alto.scad'), 'utf8'));
const num = (k) => Number(alto[k]);
const zt = L - num('facing_length'); // the break point
const zw0 = Math.max(
    ...shapes.cut
      .filter((p) => Math.max(...p.map((q) => q[1])) < 20)
      .flat()
      .map((q) => q[0]),
  ), // window: back edge
  zw1 = L - num('tip_rail_thickness'); // to the tip rail
const zTable = L - num('reed_length'); // the table's rear
const ztr = num('throat_position');
picture(
  'side',
  'Side view, cut down the middle (alto preset, reed in place)',
  [
    ['outline', shapes.outline],
    ['cut', shapes.cut],
    ['reed', shapes.reed],
  ],
  [-15, 31],
  [
    { text: 'Tip rail', z: L - 0.6, y: inner(L - 0.6) + 0.3, tz: L + 4, ty: 8 },
    { text: 'Tip opening', z: L, y: 1, tz: L + 4, ty: 1 },
    { text: 'Beak', z: 76, y: top(76), tz: 84, ty: 26 },
    { text: 'Baffle', z: 80, y: inner(80), tz: 72, ty: 4.5, anchor: 'middle' },
    { text: 'Chamber', z: 56, y: 9, tz: 58, ty: 9.5, inside: true, anchor: 'middle' },
    { text: 'Throat', z: ztr, y: inner(ztr), tz: ztr, ty: 15.5, anchor: 'middle' },
    { text: 'Floor', z: 47, y: floorY(47), tz: 46, ty: 3.6, inside: false, anchor: 'middle' },
    { text: 'Bore', z: 30, y: 12, tz: 30, ty: 12.5, inside: true, anchor: 'middle' },
    { text: 'Socket (the cork goes in)', z: 11, y: 12, tz: 10.5, ty: 12.5, inside: true, anchor: 'middle' },
    { text: 'Body', z: 40, y: top(40), tz: 40, ty: 30.5, anchor: 'middle' },
    { text: 'Shank', z: 4, y: top(4), tz: 4, ty: 30.5, anchor: 'middle' },
    { text: 'Reed', z: 30, y: -1.5, tz: 30, ty: -5, anchor: 'middle' },
    { text: 'Side rail', z: 84, y: at(shapes.outline, 84, 'min'), tz: L + 4, ty: -3 },
    { text: 'Break point', z: zt, y: 0, tz: zt - 4, ty: -4.2, anchor: 'start' },
  ],
  [
    { z0: zt, z1: L, y: -7, text: 'Facing curve' },
    { z0: zTable, z1: zw0, y: -11.5, text: 'Table (reed seat)' },
    { z0: zw0, z1: zw1, y: -11.5, text: 'Window' },
  ],
);
picture(
  'table',
  'Seen from the reed side (reed off)',
  [
    ['plan', shapes.plan],
    ['table', shapes.table],
  ],
  [-16, 18],
  [
    { text: 'Tip rail', z: L - 0.8, y: 0, tz: L + 4, ty: 3 },
    { text: 'Side rails', z: 72, y: at(shapes.table, 72, 'max') - 0.4, tz: 72, ty: 16.5, anchor: 'middle' },
    { text: 'Window', z: 68, y: 0, tz: 68, ty: -0.5, inside: true, anchor: 'middle' },
    { text: 'Table', z: 35, y: 0, tz: 35, ty: -0.5, inside: true, anchor: 'middle' },
    { text: 'Shank', z: 4, y: at(shapes.plan, 4, 'max'), tz: 4, ty: 16.5, anchor: 'middle' },
  ],
);
