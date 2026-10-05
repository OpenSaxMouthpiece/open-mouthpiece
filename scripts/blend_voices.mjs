// Blend the alto and tenor presets into scad/extras/c_melody.scad by pitch. Fitted values as args:
//   node scripts/blend_voices.mjs neck_cork_diameter:16.3 bore_diameter:16.1 table_width_tip:16.0
//     table_width_rear:13.6 ligature_reed_thickness:3.2 chamber_width_extra:0.8
// Sounding pitch of written C: alto Eb (9 semitones down), C-melody C (12), tenor Bb (14).
// t = (12 - 9) / (14 - 9) = 0.6 in log-frequency; sizes blend geometrically: a * (b/a)^t.
import fs from 'fs';

const dir = new URL('../scad/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const T = 0.6;
const norm = (s) => s.replace(/\r\n/g, '\n');
const alto = norm(fs.readFileSync(dir + 'alto.scad', 'utf8'));
const tenor = norm(fs.readFileSync(dir + 'tenor.scad', 'utf8'));
const argv = process.argv.slice(2);
const overrides = Object.fromEntries(argv.map((a) => a.split(':')));

const params = (src) => {
  const m = {};
  for (const line of src.split('\n')) {
    const r = line.match(/^([a-z_]+) *= *(.+?);(.*)$/);
    if (r) m[r[1]] = { value: r[2], rest: r[3] };
  }
  return m;
};
const B = params(tenor);

const geo = (a, b) => (a > 0 && b > 0 ? a * Math.pow(b / a, T) : a + T * (b - a));
const LINEAR = new Set(['bore_tilt', 'chamber_width_extra', 'baffle_height', 'baffle_start', 'baffle_curve']);
const roundStep = (v, rest) => {
  const s = rest.match(/\[\s*-?[\d.]+\s*:\s*([\d.]+)\s*:/);
  if (!s) return +v.toFixed(2);
  const step = +s[1],
    dec = (s[1].split('.')[1] || '').length;
  return +(Math.round(v / step) * step).toFixed(dec);
};

// Tables [[x, y], ...]: map each onto u in [0, 1] over its own x range, resample both at the
// union of u, blend x linearly and y geometrically.
const parseTable = (s) => JSON.parse(s);
const lerpAt = (pts, u) => {
  const x0 = pts[0][0],
    x1 = pts[pts.length - 1][0];
  const x = x0 + u * (x1 - x0);
  for (let i = 1; i < pts.length; i++)
    if (x <= pts[i][0] + 1e-9) {
      const [xa, ya] = pts[i - 1],
        [xb, yb] = pts[i];
      const f = xb === xa ? 0 : (x - xa) / (xb - xa);
      return [x, ya + f * (yb - ya)];
    }
  return pts[pts.length - 1];
};
const uOf = (pts) => {
  const x0 = pts[0][0],
    x1 = pts[pts.length - 1][0];
  return pts.map((p) => (p[0] - x0) / (x1 - x0));
};
const blendTable = (sa, sb) => {
  const pa = parseTable(sa),
    pb = parseTable(sb);
  const all = [...uOf(pa), ...uOf(pb)].sort((a, b) => a - b);
  const us = all.filter((u, i) => i === 0 || u === 1 || u - all[i - 1] > 0.005);
  if (us.length > 1 && 1 - us[us.length - 2] <= 0.005) us.splice(us.length - 2, 1);
  const out = us.map((u) => {
    const [xa, ya] = lerpAt(pa, u),
      [xb, yb] = lerpAt(pb, u);
    return [+(xa + T * (xb - xa)).toFixed(3), +geo(ya, yb).toFixed(2)];
  });
  return '[' + out.map((p) => `[${p[0]}, ${p[1]}]`).join(', ') + ']';
};

const report = [];
const lines = alto.split('\n').map((line) => {
  const r = line.match(/^([a-z_]+)( *= *)(.+?);(.*)$/);
  if (!r) return line;
  const [, name, eq, va, rest] = r;
  let v = va;
  if (name in overrides) v = overrides[name];
  else if (!B[name] || B[name].value === va) return line;
  else {
    const vb = B[name].value;
    if (/^-?[\d.]+$/.test(va) && /^-?[\d.]+$/.test(vb)) {
      const x = LINEAR.has(name) ? +va + T * (vb - va) : geo(+va, +vb);
      v = String(roundStep(x, rest));
    } else if (va.startsWith('[[') && vb.startsWith('[[')) v = blendTable(va, vb);
    else if (va.startsWith('[') && vb.startsWith('[')) {
      const a = JSON.parse(va),
        b = JSON.parse(vb);
      v = '[' + a.map((x, i) => geo(x, b[i]).toFixed(2)).join(', ') + ']';
    } else v = T >= 0.5 ? vb : va; // strings: the nearer voice
  }
  if (!va.startsWith('[['))
    report.push(
      `${name.padEnd(26)} ${va.padStart(10)} ${(B[name]?.value ?? '').padStart(10)} ${v.padStart(10)}${name in overrides ? '  (set)' : ''}`,
    );
  return `${name}${eq}${v};${rest}`;
});
lines[0] = '// C-melody saxophone mouthpiece (draft): the alto and tenor presets blended by pitch';
lines[1] = '// (C sits 3/5 of the way from Eb down to Bb); shank and reed seat fitted to a 1920s horn.';
fs.writeFileSync(dir + 'extras/c_melody.scad', lines.join('\n').replace('include <lib/', 'include <../lib/'));
console.log('name                             alto      tenor     c-mel');
console.log(report.join('\n'));
