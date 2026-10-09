// The Ash / Birch / Cedar variants of each preset: writes scad/variants/<voice>_<family>.scad from
// scad/<voice>.scad with the family's interior recipe and looks. The files are generated: change
// values here and re-run, then npm run check.
//   node scripts/make_variants.mjs alto tenor baritone soprano
// Every difference from the preset is a setting the app shows (sliders, choices, text): the hidden
// outline tables stay the preset's, so a variant can be rebuilt (or taken further) in the app.
// Guardrails: tips within ~.010" of the preset, facing follows the tip, inside air within ~±8% of
// the preset (baffle height is the main lever: ~±10% per mm), genus 1, thinnest wall >= ~1.2mm.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inch = (x) => +(x * 0.0254).toFixed(2);
const r1 = (x) => Math.round(x * 10) / 10,
  r05 = (x) => Math.round(x * 2) / 2; // the sliders' 0.5mm steps

// Per voice: the interior values per family (absolute).
// Each family's interior follows one design tradition, so the settings belong together:
//   ash    the big-chamber recipe: round chamber and throat, concave (scooped) baffle, sidewalls
//          scooped out over the window, a circle (arc) facing as a hand refacer would cut.
//   birch  the small-chamber recipe: square chamber and throat, a short abrupt throat, rollover baffle
//          (not a high step: that made the first tenor hard to sound), sidewalls leaning in, a
//          squarer window end.
//   cedar  the all-round recipe: horseshoe chamber, flat (even) baffle, wider side rails that seal
//          more easily on an imperfect print or reed.
// The Ozdemir study found little effect from chamber cross-section: the shapes follow the tradition
// and show the options; tip, facing, baffle and air volume carry most of the difference.
// The classic baffle shapes run straight between the measured baffle's ends, higher than the
// measured ones (which sag toward the reed), so on the smaller voices they add a lot of air
// (soprano flat +21%, concave +28%): a negative baffle_curve brings them down early, and the
// chamber/throat stay the preset's where air is tight. The bari keeps its conical bore
// (throat_taper 55): Birch's abrupt throat would turn it into a much bigger cylinder.
const VOICES = {
  alto: {
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
  },
  tenor: {
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
      baffle_height: 0.6,
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
    ash: {
      tip_opening: inch(62),
      facing_length: 20.5,
      facing_model: 'arc',
      chamber_shape: 'round',
      throat_shape: 'round',
      baffle_type: 'concave',
      baffle_height: 0.7,
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

// Looks, from the preset's own values (p: a number from the voice file, L: the variant's length).
// Sizes as a fraction of the preset's and beak_length as a fraction of L, so all four voices match.
//   ash    slim and round, scooped sidewalls inside, a full (bulging) beak with no shoulder,
//          classic rings on the shank.
//   birch  boxy and flat-sided, a crisp shoulder set back, a wide flat-topped straight beak,
//          raised knurling all round the shank.
//   cedar  wider and soft, an early gentle shoulder into a scooped (ski-slope) beak, a spiral shank.
const LOOKS = {
  ash: (p, L) => ({
    sidewall_angle: 8,
    body_width: r1(p('body_width') * 0.95),
    body_height: r1(p('body_height') * 0.98),
    beak_tip_height: r1(p('beak_tip_height') + 0.3),
    body_squareness: 1.7,
    beak_squareness: 1.4,
    beak_curve: -0.3,
    beak_length: r05(0.08 * L),
    shoulder_smoothness: 1,
    beak_top_width: 0,
    shank_diameter: r1(p('shank_diameter') * 0.96),
    lettering_font: 'Marcellus SC',
    side_text_right: 'Ash',
    shank_detail: 'rings',
    shank_detail_count: 2,
    shank_detail_depth: 0.5,
  }),
  birch: (p, L) => ({
    body_height: r1(p('body_height') * 0.96),
    beak_tip_height: r1(p('beak_tip_height') - 0.3),
    body_squareness: 3.2,
    underside_squareness: 2.2,
    beak_squareness: 3.0,
    beak_length: r05(-0.03 * L),
    beak_top_width: 0.5,
    shoulder_sweep: r05(0.07 * L),
    shank_diameter: r1(p('shank_diameter') * 1.03),
    lettering_font: 'Bebas Neue',
    side_text_right: 'BIRCH',
    shank_detail: 'knurled',
    shank_detail_style: 'raised',
    shank_detail_count: 16,
    shank_detail_depth: 0.6,
  }),
  cedar: (p, L) => ({
    body_width: r1(p('body_width') * 1.03),
    body_squareness: 2.2,
    beak_squareness: 2.0,
    beak_curve: 0.7,
    beak_length: r05(0.02 * L),
    shoulder_smoothness: 0.5,
    lettering_font: 'Pacifico',
    lettering_depth: 0.6,
    side_text_right: 'Cedar',
    shank_detail: 'spiral',
    shank_detail_count: 2,
    shank_detail_depth: 0.5,
  }),
};
// Per voice: the soprano's shank band is short, so its decorations differ a little.
const VOICE_LOOKS = {
  soprano: {
    ash: { sidewall_angle: 6 }, // less scoop: its small chamber gains air fast
    birch: { shank_diameter: 17.8 }, // the preset's
    cedar: { shank_detail_count: 3, shank_detail_depth: 0.7 },
  },
};
// Side text size per voice (mm).
const TEXT = { alto: 5, tenor: 5.5, baritone: 6.5, soprano: 4 };
// Overall length (shank end to tip) per family, as a fraction of the voice's: length adds or removes
// inside air (~5% per 3mm on the alto), so each family's goes against its recipe's air: Ash (big
// chamber, more air) shorter, Birch (small chamber, less air) longer. Both then sit nearer the
// preset on the cork.
// The bari's Birch stays the preset's length: its long bore makes length add air there.
const LENGTH = { ash: -0.034, birch: 0.034, cedar: 0 };
const VOICE_LENGTH = { baritone: { birch: 0 } };
// Neutral names on purpose: the headers state the design; tone is only a tendency.
const BLURB = {
  ash: 'Ash: closer tip, radius facing, round chamber with scooped sidewalls, concave baffle; slim round body, full beak, ringed shank.',
  birch:
    'Birch: more open tip, square chamber, rollover baffle, thin tip rail; boxy body, set-back shoulder, flat straight beak, knurled shank.',
  cedar:
    'Cedar: close tip, short facing, horseshoe chamber, flat baffle, wide rails; soft body, scooped beak, spiral shank.',
};

// "{" as {: OpenSCAD's parameter export stops at a string with a brace in it ("{tip}").
const fmt = (v) =>
  typeof v === 'string' || Array.isArray(v)
    ? JSON.stringify(v).replace(/,/g, ', ').replace(/{/g, '\\u007B')
    : String(v);

for (const voice of process.argv.slice(2)) {
  const src = fs.readFileSync(path.join(ROOT, 'scad', `${voice}.scad`), 'utf8').replace(/\r\n/g, '\n');
  const num = (k) => +new RegExp(`^${k} = (-?[0-9.]+);`, 'm').exec(src)[1];
  for (const fam of ['ash', 'birch', 'cedar']) {
    // Shorter: never below what the reed needs (the table starts at >= 0.16 L: tenon + table ramp),
    // and the throat moves with the window (both are in mm from the tip end) so it stays before it.
    const L0 = num('overall_length'),
      Lmin = Math.min(L0, Math.ceil((num('table_length') / 0.84 + 0.3) * 10) / 10);
    const L1 = r1(Math.max(L0 * (1 + (VOICE_LENGTH[voice]?.[fam] ?? LENGTH[fam])), Lmin));
    const vals = {
      ...VOICES[voice][fam],
      ...LOOKS[fam](num, L1),
      ...VOICE_LOOKS[voice]?.[fam],
      side_text_left: '{tip}',
      side_text_size: TEXT[voice],
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
    out = out.replace(/include <lib\/mouthpiece_base\.scad>/, 'include <../lib/mouthpiece_base.scad>');
    // Header: replace the leading comment block.
    const body = out.replace(/^(\/\/[^\n]*\n)+/, '');
    const Voice = voice[0].toUpperCase() + voice.slice(1);
    out =
      `// ${Voice} "${fam[0].toUpperCase() + fam.slice(1)}": a variant of ${voice}.scad (its outline, changed by settings only).\n// ${BLURB[fam]}\n// Geometry: lib/mouthpiece_base.scad.\n` +
      body;
    const dst = path.join(ROOT, 'scad', 'variants', `${voice}_${fam}.scad`);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, out);
    console.log('wrote', dst);
  }
}
