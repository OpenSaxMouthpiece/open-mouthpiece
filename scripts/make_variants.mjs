// The Ash / Birch / Cedar variants of each preset: writes scad/variants/<voice>_<family>.scad from
// scad/<voice>.scad (its measured shape tables) with the family's sound and look values. The files
// are generated: change values here and re-run, then npm run check.
//   node scripts/make_variants.mjs alto tenor baritone soprano
//   node scripts/make_variants.mjs --derive alto    # print the alto's derived outline (to compare)
// Guardrails: tips within ~.010" of the preset, facing follows the tip, inside air within ~±8% of
// the preset (baffle height is the main lever: ~±10% per mm), beak height ±0.4mm, the body's size
// set by the outline tables, genus 1, thinnest wall >= ~1.2mm.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// src/migrate.ts's outlineSizes (TypeScript, so through esbuild, as scripts/check.mjs does)
const { outlineSizes } = await import(
  'data:text/javascript;base64,' +
    Buffer.from(
      transformSync(fs.readFileSync(path.join(ROOT, 'src', 'migrate.ts'), 'utf8'), { loader: 'ts', format: 'esm' })
        .code,
    ).toString('base64')
);
const inch = (x) => +(x * 0.0254).toFixed(2);

// Per voice: sound values per family (absolute), plus base beak height for the look offsets.
// Each family's interior follows one design tradition, so the settings belong together:
//   ash    the big-chamber recipe: round chamber and throat, concave (scooped) baffle, a circle
//          (arc) facing as a hand refacer would cut.
//   birch  the small-chamber recipe: square chamber and throat, a short abrupt throat, rollover baffle
//          (not a high step: that made the first tenor hard to sound), sidewalls leaning in, a
//          squarer window end.
//   cedar  the all-round recipe: horseshoe chamber, flat (even) baffle, wider side rails that seal
//          more easily on an imperfect print or reed.
// The Ozdemir study found little effect from chamber cross-section: the shapes follow the tradition
// and show the options; tip, facing, baffle and air volume carry most of the difference.
const VOICES = {
  alto: {
    beak: 3.6,
    text: 5,
    ash: {
      tip_opening: inch(70),
      facing_length: 24.5,
      facing_model: 'arc',
      chamber_shape: 'round',
      throat_shape: 'round',
      chamber_width: 14.2,
      baffle_type: 'concave',
      baffle_height: 0,
      throat_width: 14.4,
      tip_rail_thickness: 2.2,
    },
    birch: {
      tip_opening: inch(80),
      facing_length: 24.5,
      chamber_shape: 'square',
      throat_shape: 'square',
      throat_taper: 3,
      baffle_type: 'rollover',
      baffle_height: 0.1,
      baffle_hump: 0.4,
      baffle_curve: -0.3,
      chamber_height: 16,
      throat_width: 14.8,
      sidewall_angle: -4,
      window_rear_radius: 3,
      tip_rail_thickness: 1.6,
    },
    cedar: {
      tip_opening: inch(68),
      facing_length: 22.5,
      baffle_type: 'flat',
      side_rail_width: 1.2,
      throat_width: 14.8,
      tip_rail_thickness: 2.2,
    },
    shape: {
      // Ash: slim, a long smooth convex beak with no shoulder.
      ash: {
        shape_top: [
          [0, 25.5],
          [0.125, 25.4],
          [0.138, 25.43],
          [0.152, 25.59],
          [0.165, 25.92],
          [0.178, 26.36],
          [0.192, 26.79],
          [0.205, 27.0],
          [0.3, 25.8],
          [0.42, 24.2],
          [0.52, 22.3],
          [0.62, 19.4],
          [0.72, 15.6],
          [0.82, 11.6],
          [0.91, 7.6],
          [1, 3.6],
        ],
        shape_width: [
          [0, 22.0],
          [0.085, 22.0],
          [0.105, 22.09],
          [0.125, 22.59],
          [0.145, 23.61],
          [0.165, 25.0],
          [0.185, 26.35],
          [0.205, 27.0],
          [0.29, 26.0],
          [0.46, 24.5],
          [0.83, 21.2],
          [1, 16.9],
        ],
        shape_top_squareness: [
          [0, 2.0],
          [0.5, 2.0],
          [0.8, 1.7],
          [1, 1.6],
        ],
      },
      // Birch: lower body, a crisp shoulder set back, then a long straight ramp.
      birch: {
        shape_top: [
          [0, 25.5],
          [0.125, 25.4],
          [0.138, 25.42],
          [0.152, 25.49],
          [0.165, 25.66],
          [0.178, 25.88],
          [0.192, 26.1],
          [0.205, 26.2],
          [0.3, 25.0],
          [0.42, 23.6],
          [0.5, 22.4],
          [0.56, 19.5],
          [0.66, 15.2],
          [0.83, 9.7],
          [1, 3.2],
        ],
        shape_width: [
          [0, 22.0],
          [0.085, 22.0],
          [0.105, 22.1],
          [0.125, 22.62],
          [0.145, 23.67],
          [0.165, 25.12],
          [0.185, 26.53],
          [0.205, 27.2],
          [0.29, 26.0],
          [0.46, 24.6],
          [0.83, 21.8],
          [1, 16.9],
        ],
        shape_top_squareness: [
          [0, 2.0],
          [0.48, 2.0],
          [0.55, 2.7],
          [0.8, 1.8],
          [1, 1.6],
        ],
      },
      // Cedar: a soft early shoulder, then a concave ski-slope beak.
      cedar: {
        shape_top: [
          [0, 25.5],
          [0.125, 25.4],
          [0.138, 25.43],
          [0.152, 25.61],
          [0.165, 25.98],
          [0.178, 26.48],
          [0.192, 26.97],
          [0.205, 27.2],
          [0.3, 26.0],
          [0.4, 24.6],
          [0.48, 22.6],
          [0.56, 18.8],
          [0.65, 15.2],
          [0.76, 11.4],
          [0.88, 7.4],
          [1, 3.6],
        ],
        shape_width: [
          [0, 22.0],
          [0.085, 22.0],
          [0.105, 22.11],
          [0.125, 22.71],
          [0.145, 23.93],
          [0.165, 25.6],
          [0.185, 27.22],
          [0.205, 28.0],
          [0.29, 27.2],
          [0.46, 25.6],
          [0.83, 21.8],
          [1, 16.9],
        ],
        shape_top_squareness: [
          [0, 2.0],
          [0.46, 2.0],
          [0.56, 2.3],
          [0.8, 1.7],
          [1, 1.6],
        ],
      },
    },
  },
  // The other voices: tips and facings from the plan, the same family recipes; the outlines are
  // derived from the alto's (see deriveShapes). The classic baffle shapes run straight between the
  // measured baffle's ends, higher than the measured ones (which sag toward the reed), so on the
  // smaller voices they add a lot of air (soprano flat +21%, concave +28%): a negative baffle_curve
  // brings them down early, and the chamber/throat stay the preset's where air is tight. The bari keeps its conical bore (throat_taper 55):
  // Birch's abrupt throat would turn it into a much bigger cylinder.
  tenor: {
    beak: 4.3,
    text: 5.5,
    landmarks: [0, 0.13, 0.2, 0.585, 1],
    ash: {
      tip_opening: inch(90),
      facing_length: 26.0,
      facing_model: 'arc',
      chamber_shape: 'round',
      throat_shape: 'round',
      baffle_type: 'concave',
      baffle_height: 0.3,
      baffle_curve: -0.5,
      tip_rail_thickness: 1.7,
    },
    birch: {
      tip_opening: inch(100),
      facing_length: 26.5,
      chamber_shape: 'square',
      throat_shape: 'square',
      throat_taper: 3,
      baffle_type: 'rollover',
      baffle_height: 0.1,
      baffle_hump: 0.4,
      baffle_curve: -0.3,
      chamber_height: 17.0,
      throat_width: 15.5,
      sidewall_angle: -4,
      window_rear_radius: 3,
      tip_rail_thickness: 1.3,
    },
    cedar: {
      tip_opening: inch(85),
      facing_length: 24.3,
      baffle_type: 'flat',
      side_rail_width: 1.2,
      throat_width: 15.5,
      tip_rail_thickness: 1.8,
    },
  },
  baritone: {
    beak: 4.8,
    text: 6.5,
    landmarks: [0, 0.185, 0.27, 0.655, 1],
    ash: {
      tip_opening: inch(105),
      facing_length: 29.0,
      facing_model: 'arc',
      chamber_shape: 'round',
      throat_shape: 'round',
      baffle_type: 'concave',
      baffle_height: 0,
      baffle_curve: -0.7,
      tip_rail_thickness: 2.0,
    },
    birch: {
      tip_opening: inch(115),
      facing_length: 29.5,
      chamber_shape: 'square',
      throat_shape: 'square',
      baffle_type: 'rollover',
      baffle_height: 0.1,
      baffle_hump: 0.4,
      baffle_curve: -0.7,
      chamber_height: 17.6,
      sidewall_angle: -4,
      window_rear_radius: 3,
      tip_rail_thickness: 1.5,
    },
    cedar: {
      tip_opening: inch(100),
      facing_length: 27.3,
      baffle_type: 'flat',
      baffle_curve: -0.3,
      side_rail_width: 1.2,
      tip_rail_thickness: 2.0,
    },
  },
  soprano: {
    beak: 3.0,
    text: 4,
    landmarks: [0, 0.07, 0.145, 0.57, 1],
    ash: {
      tip_opening: inch(62),
      facing_length: 20.5,
      facing_model: 'arc',
      chamber_shape: 'round',
      throat_shape: 'round',
      baffle_type: 'concave',
      baffle_height: 0.5,
      baffle_curve: -0.8,
      tip_rail_thickness: 1.9,
    },
    birch: {
      tip_opening: inch(70),
      facing_length: 20.5,
      chamber_shape: 'square',
      throat_shape: 'square',
      baffle_type: 'rollover',
      baffle_height: 0.1,
      baffle_hump: 0.4,
      baffle_curve: -0.3,
      chamber_height: 11.7,
      throat_width: 9.9,
      sidewall_angle: -4,
      window_rear_radius: 3,
      tip_rail_thickness: 1.5,
    },
    cedar: {
      tip_opening: inch(59),
      facing_length: 19.3,
      chamber_shape: 'horseshoe',
      baffle_type: 'flat',
      baffle_curve: -0.4,
      side_rail_width: 1.2,
      tip_rail_thickness: 2.0,
    },
  },
};
VOICES.alto.landmarks = [0, 0.125, 0.205, 0.575, 1];

// Deriving a family's outline for another voice from the alto's, landmark to landmark ([0, tenon
// end, body peak, shoulder, 1] as fractions of L):
//   body (up to the family's beak start BEAK_START): the voice's own measured top and width, scaled
//     by the family's alto ratio (family / preset) at the mapped fraction;
//   beak: the family's own curve, normalised from its height at the beak start down to the tip, laid
//     from the mapped beak start to the voice's tip height;
//   squareness: the family's table with the same fraction mapping (its bump stays on the shoulder).
const BEAK_START = { ash: 0.42, birch: 0.42, cedar: 0.4 };

// Body height and beak length per family, on top of any family outline (hand-made or derived):
// height scales the body behind the beak (fading in over the flare, so the tenon keeps its size);
// beakShift moves where the beak starts (fraction of L; - = a longer, gentler beak). The tip end
// stays put, so the tip, facing, rails and beak_tip_height don't change: feel and looks only
// (the interior roof is clamped under the exterior, so check air and walls after a change).
const RESHAPE = {
  ash: { height: 1, beakShift: -0.03 },
  birch: { height: 1, beakShift: 0.02 },
  cedar: { height: 1, beakShift: 0 },
};
// Overall length (shank end to tip) per family, as a fraction of the voice's: length adds or removes
// inside air (~5% per 3mm on the alto), so each family's goes against its recipe's air: Ash (big
// chamber, more air) shorter, Birch (small chamber, less air) longer. Both then sit nearer the
// preset on the cork.
const LENGTH = { ash: -0.034, birch: 0.034, cedar: 0 };
const smooth = (t) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * t * (t * (6 * t - 15) + 10);
};
function reshape(shape, fs, lm, { height: k, beakShift }) {
  const top = shape.shape_top,
    T = top[top.length - 1][1],
    fs2 = fs + beakShift;
  const body = top.filter(([f]) => f <= fs + 0.002),
    beak = top.filter(([f]) => f > fs + 0.002); // derived tables round fs
  const H = lin(top, fs);
  // Height at the new beak start: on the body, or the body's last slope carried on.
  const [p, q] = body.slice(-2);
  const H2 = fs2 <= fs ? lin(top, fs2) : q[1] + ((q[1] - p[1]) / (q[0] - p[0])) * (fs2 - q[0]);
  const kAt = (f) => 1 + (k - 1) * smooth((f - lm[1]) / (lm[2] - lm[1]));
  // Over the flare (tenon end to body peak) the top never drops below the tenon's top: a lowered
  // body left a dip there. (+0.3mm here flattened the start of a gentle flare into a step.)
  const tenonTop = lin(top, lm[1]),
    sc = (f, y) => (f > lm[1] && f <= lm[2] ? Math.max(y * kAt(f), tenonTop) : y * kAt(f));
  const beakAt = (f) => fs2 + ((f - fs) / (1 - fs)) * (1 - fs2);
  return {
    ...shape,
    shape_top: [
      ...body.filter(([f]) => f < fs2 - 0.01).map(([f, y]) => [f, r2(sc(f, y))]),
      [r3(fs2), r1(sc(fs2, H2))],
      ...beak.map(([f, y]) => [r3(beakAt(f)), r1(T + ((sc(fs2, H2) - T) * (y - T)) / (H - T))]),
    ],
    shape_top_squareness: shape.shape_top_squareness.map(([f, n]) => [r3(f <= fs ? (f * fs2) / fs : beakAt(f)), n]),
  };
}
const table = (src, name) => JSON.parse(new RegExp(`^${name} = (\\[.*\\]);`, 'm').exec(src)[1]);
const lin = (t, f) => {
  if (f <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++)
    if (f <= t[i][0]) {
      const [a, b] = [t[i - 1], t[i]];
      return a[1] + ((b[1] - a[1]) * (f - a[0])) / (b[0] - a[0]);
    }
  return t[t.length - 1][1];
};
const pw = (x, from, to) =>
  lin(
    from.map((f, i) => [f, to[i]]),
    x,
  ); // piecewise-linear landmark map
const r1 = (x) => Math.round(x * 10) / 10,
  r2 = (x) => Math.round(x * 100) / 100,
  r3 = (x) => Math.round(x * 1000) / 1000;
// A voice's table times a family ratio (a function of the fraction), but the flare (from where it
// starts rising to the crest, as the generator's flare_window) as a whole: its rise is stretched to
// the scaled crest, so the voice's smooth S stays one (point-wise ratios added kinks and dips).
function flareScaled(t, ratioAt) {
  const ic0 = t.map((p, i) => i).filter((i) => t[i][0] <= 0.4),
    ic = ic0.reduce((a, i) => (t[i][1] > t[a][1] ? i : a), ic0[0]),
    lo = Math.min(...t.slice(0, ic + 1).map((p) => p[1])),
    is = Math.max(...t.slice(0, ic + 1).map((p, i) => (p[1] <= lo + 1e-9 ? i : -1)));
  const plain = t.map(([f, y]) => [f, r2(y * ratioAt(f))]);
  if (is >= ic || t[ic][1] - t[is][1] < 0.5) return plain;
  const [fs, ys] = t[is],
    [fc, yc] = t[ic],
    ys2 = ys * ratioAt(fs),
    yc2 = yc * ratioAt(fc);
  return t.map(([f, y], i) => (i > is && i < ic ? [f, r2(ys2 + ((y - ys) * (yc2 - ys2)) / (yc - ys))] : plain[i]));
}
function deriveShapes(voice, src, altoSrc) {
  const A = VOICES.alto.landmarks,
    V = VOICES[voice].landmarks;
  const toV = (fa) => pw(fa, A, V),
    toA = (fv) => pw(fv, V, A);
  const pre = { shape_top: table(src, 'shape_top'), shape_width: table(src, 'shape_width') };
  const preA = { shape_top: table(altoSrc, 'shape_top'), shape_width: table(altoSrc, 'shape_width') };
  const out = {};
  for (const fam of ['ash', 'birch', 'cedar']) {
    const F = VOICES.alto.shape[fam],
      fs = BEAK_START[fam],
      fsV = toV(fs);
    const ratio = (t, fa) => lin(F[t], fa) / lin(preA[t], fa);
    const famV = (fa) => (fa <= fs ? toV(fa) : fsV + ((fa - fs) / (1 - fs)) * (1 - fsV));
    const H = lin(pre.shape_top, fsV) * ratio('shape_top', fs),
      T = pre.shape_top[pre.shape_top.length - 1][1];
    const HA = lin(F.shape_top, fs),
      TA = F.shape_top[F.shape_top.length - 1][1];
    const topV = flareScaled(pre.shape_top, (f) => (f <= V[1] ? 1 : ratio('shape_top', toA(f))));
    const body = topV.filter(([f]) => f < fsV - 0.01);
    const beak = F.shape_top
      .filter(([fa]) => fa > fs)
      .map(([fa, y]) => [r3(famV(fa)), r1(T + ((H - T) * (y - TA)) / (HA - TA))]);
    out[fam] = {
      shape_top: [...body, [r3(fsV), r1(H)], ...beak],
      shape_width: flareScaled(pre.shape_width, (f) => ratio('shape_width', toA(f))),
      shape_top_squareness: F.shape_top_squareness.map(([fa, n]) => [r3(famV(fa)), n]),
    };
  }
  return out;
}

// Looks: each family has its own outline (the hidden shape tables, [fraction of L, mm]) so the beak
// curve and the planform differ, not just the size. shape_top_squareness's bump (the section boxing
// up) must sit at the family's own shoulder, or it shows as a band. Voice-specific tables live in VOICES[v].shape.
const LOOKS = {
  ash: (v) => ({
    ...v.shape.ash,
    body_squareness: 1.7,
    beak_squareness: 1.3,
    beak_tip_height: +(v.beak + 0.3).toFixed(1),
    shank: 0.95, // the shank's outside, times the preset's
    lettering_style: 'engraved',
    lettering_depth: 0.5,
    lettering_font: 'Marcellus SC',
    side_text_right: 'Ash',
  }),
  birch: (v) => ({
    ...v.shape.birch,
    body_squareness: 3.2,
    underside_squareness: 2.2,
    beak_squareness: 3.0,
    beak_tip_height: +(v.beak - 0.4).toFixed(1),
    shank: 1.04,
    lettering_style: 'engraved',
    lettering_depth: 0.5,
    lettering_font: 'Bebas Neue',
    side_text_right: 'BIRCH',
  }),
  cedar: (v) => ({
    ...v.shape.cedar,
    body_squareness: 2.2,
    beak_squareness: 2.0,
    lettering_style: 'engraved',
    lettering_depth: 0.6,
    lettering_font: 'Pacifico',
    side_text_right: 'Cedar',
  }),
};
// Neutral names on purpose: the headers state the design; tone is only a tendency.
const BLURB = {
  ash: 'Ash: closer tip, arc facing, round chamber, concave baffle; slim round body, smooth convex beak.',
  birch:
    'Birch: more open tip, square chamber, rollover baffle, thin tip rail; boxy body, set-back shoulder, straight beak.',
  cedar: 'Cedar: close tip, short facing, horseshoe chamber, flat baffle, wide rails; soft body, concave beak.',
};

// "{" as \u007B: OpenSCAD's parameter export stops at a string with a brace in it ("{tip}").
const fmt = (v) =>
  typeof v === 'string' || Array.isArray(v)
    ? JSON.stringify(v).replace(/,/g, ', ').replace(/{/g, '\\u007B')
    : String(v);

if (process.argv[2] === '--derive') {
  const v = process.argv[3],
    src = fs.readFileSync(path.join(ROOT, 'scad', `${v}.scad`), 'utf8');
  console.log(JSON.stringify(deriveShapes(v, src, src), null, 0).replace(/\],"/g, '],\n"'));
  process.exit(0);
}
for (const voice of process.argv.slice(2)) {
  const src = fs.readFileSync(path.join(ROOT, 'scad', `${voice}.scad`), 'utf8').replace(/\r\n/g, '\n');
  // A copy: the alto's hand-made outlines must stay as they are, the other voices derive from them.
  const v = { ...VOICES[voice] };
  if (!v.shape) v.shape = deriveShapes(voice, src, fs.readFileSync(path.join(ROOT, 'scad', 'alto.scad'), 'utf8'));
  // Where each family's beak starts on this voice (the alto's BEAK_START, landmark-mapped).
  const toV = (fa) => pw(fa, VOICES.alto.landmarks, v.landmarks);
  v.shape = Object.fromEntries(
    Object.entries(v.shape).map(([fam, sh]) => [fam, reshape(sh, toV(BEAK_START[fam]), v.landmarks, RESHAPE[fam])]),
  );
  for (const fam of ['ash', 'birch', 'cedar']) {
    // Shorter: never below what the reed needs (the table starts at >= 0.16 L: tenon + table ramp),
    // and the throat moves with the window (both are in mm from the tip end) so it stays before it.
    const num = (k) => +new RegExp(`^${k} = (-?[0-9.]+);`, 'm').exec(src)[1];
    const L0 = num('overall_length'),
      Lmin = Math.min(L0, Math.ceil((num('table_length') / 0.84 + 0.3) * 10) / 10);
    const L1 = r1(Math.max(L0 * (1 + LENGTH[fam]), Lmin));
    const { shank = 1, ...looks } = LOOKS[fam](v);
    const vals = {
      ...v[fam],
      ...looks,
      side_text_left: '{tip}',
      side_text_size: v.text,
      overall_length: L1,
      ...(L1 < L0 ? { throat_position: r1(num('throat_position') + L1 - L0) } : {}),
    };
    // A long bore cone (the bari's) has to fit between the socket and the moved throat.
    if (L1 < L0) {
      const room = vals.throat_position - num('shank_depth') - 1.5;
      if (num('throat_taper') > room) vals.throat_taper = r1(room);
    }
    // The chamber's width (a family's chamber_width, else the preset's) as the width vs the
    // variant's throat, so a family that changes only the throat keeps the preset's chamber.
    const throat = vals.throat_width ?? num('throat_width');
    const width = vals.chamber_width ?? num('throat_width') + num('chamber_width_extra');
    delete vals.chamber_width;
    vals.chamber_width_extra = Math.round((width - throat) * 100) / 100;
    let out = src;
    for (const [k, val] of Object.entries(vals)) {
      const re = new RegExp(`^${k} = [^;]*;`, 'm');
      if (!re.test(out)) throw new Error(`${voice}: ${k} not found`);
      out = out.replace(re, `${k} = ${fmt(val)};`);
    }
    // the sizes in mm its own outline gives (as an older file's scales would, src/migrate.ts)
    const sizes = outlineSizes(`${out}
shank_scale = ${shank};
`);
    for (const k of ['body_width', 'body_height', 'shank_diameter'])
      out = out.replace(new RegExp(`^${k} = [^;]*;`, 'm'), `${k} = ${sizes[k]};`);
    out = out.replace(/include <lib\/mouthpiece_base\.scad>/, 'include <../lib/mouthpiece_base.scad>');
    // Header: replace the leading comment block.
    const body = out.replace(/^(\/\/[^\n]*\n)+/, '');
    const Voice = voice[0].toUpperCase() + voice.slice(1);
    out =
      `// ${Voice} "${fam[0].toUpperCase() + fam.slice(1)}": a variant of ${voice}.scad (its baffle table; its own outline).\n// ${BLURB[fam]}\n// Geometry: lib/mouthpiece_base.scad.\n` +
      body;
    const dst = path.join(ROOT, 'scad', 'variants', `${voice}_${fam}.scad`);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, out);
    console.log('wrote', dst);
  }
}
