// Shuffle: a new design for the open voice, inside the usual ranges for that voice. Every setting it
// touches is drawn afresh (the chamber, baffle and throat shapes, the facing, the outside, sometimes a
// shank band or baffle texture), within:
//   - tip opening: the typical range for the voice (classical to jazz, reference spec section 5),
//   - facing length: follows the tip (longer with a more open tip), near the voice's typical range,
//   - inside air: within AIR_AIM of the voice's preset by the fitted formula (fitAir with predictAir:
//     baffle height, then baffle curve, then throat width); the app corrects it after the render,
//   - everything else: around the preset and the Flamma / Silva / Unda variants, a little wider.
// The sides get the voice and the tip opening (shuffleLettering) unless the player has typed their own.
// Never touched: the fit on the horn (shank hole, cork depth), the reed's settings (tip roundness,
// table, window), the voice, top and shank lettering and pictures, the ligature and the cap.
// scripts/shuffle_check.mjs renders hundreds per voice (genus, walls, air) before a change ships.
import type { ParamValue } from "./api";

export type ShuffleVoice = "Soprano" | "Alto" | "Tenor" | "Baritone";
export const SHUFFLE_VOICES: ShuffleVoice[] = ["Soprano", "Alto", "Tenor", "Baritone"];
export const AIR_BAND = 0.08; // accepted: within ±8% of the preset's inside air
export const AIR_AIM = 0.04; // the solver stops once within ±4%; the formula's picks must be this close

interface VoiceData {
  // the preset's values that the ranges are taken around (checked against scad/<voice>.scad by shuffle.test.ts)
  preset: {
    tip_opening: number;
    facing_length: number;
    chamber_width: number;
    throat_width: number;
    throat_position: number;
    throat_taper: number;
    overall_length: number;
    body_width: number;
    body_height: number;
    beak_tip_height: number;
  };
  air: number; // cm³, the preset's inside air (src/corkFit.ts PRESET_AIR)
  tip: [number, number]; // mm: typical, classical to jazz
  facing: [number, number]; // mm: where facing_length may go
  sideRail: [number, number]; // mm: the preset and variants' spread, a little wider
  railWidening: [number, number];
}

export const SHUFFLE_DATA: Record<ShuffleVoice, VoiceData> = {
  Soprano: {
    preset: {
      tip_opening: 1.65,
      facing_length: 20,
      chamber_width: 9.5,
      throat_width: 9.3,
      throat_position: 34.5,
      throat_taper: 3,
      overall_length: 66,
      body_width: 23.6,
      body_height: 22.5,
      beak_tip_height: 3,
    },
    air: 2.9,
    tip: [1.2, 1.9],
    facing: [16, 22],
    sideRail: [1.6, 2.5],
    railWidening: [-0.8, 0],
  },
  Alto: {
    preset: {
      tip_opening: 1.93,
      facing_length: 23.8,
      chamber_width: 13.8,
      throat_width: 14.2,
      throat_position: 43.5,
      throat_taper: 9,
      overall_length: 89.3,
      body_width: 29,
      body_height: 27.6,
      beak_tip_height: 3.6,
    },
    air: 9.2,
    tip: [1.5, 2.5],
    facing: [19, 26],
    sideRail: [0.8, 1.9],
    railWidening: [-0.4, 0.4],
  },
  Tenor: {
    preset: {
      tip_opening: 2.41,
      facing_length: 25.2,
      chamber_width: 14.5,
      throat_width: 14.9,
      throat_position: 53,
      throat_taper: 11,
      overall_length: 96.7,
      body_width: 30.7,
      body_height: 29.3,
      beak_tip_height: 3.6,
    },
    air: 10.2,
    tip: [1.8, 3.2],
    facing: [21, 29],
    sideRail: [1.25, 2.05],
    railWidening: [0, 0.8],
  },
  Baritone: {
    preset: {
      tip_opening: 2.79,
      facing_length: 28,
      chamber_width: 15.4,
      throat_width: 14.8,
      throat_position: 86.5,
      throat_taper: 55,
      overall_length: 142,
      body_width: 31.7,
      body_height: 30.5,
      beak_tip_height: 4.8,
    },
    air: 16.9,
    tip: [2.2, 3.4],
    facing: [24, 32],
    sideRail: [1.6, 2.5],
    railWidening: [-0.75, 0.2],
  },
};

// Every setting Shuffle sets (all of them each time, so nothing of the design before is left over).
export const SHUFFLE_KEYS = [
  "tip_opening",
  "facing_length",
  "facing_model",
  "facing_exponent",
  "tip_rail_thickness",
  "side_rail_width",
  "side_rail_widening",
  "baffle_type",
  "step_size",
  "baffle_height",
  "baffle_length",
  "baffle_hump",
  "baffle_curve",
  "chamber_shape",
  "chamber_width",
  "chamber_height",
  "chamber_flare",
  "floor_shape",
  "sidewall_angle",
  "throat_shape",
  "throat_width",
  "throat_position",
  "throat_taper",
  "overall_length",
  "body_width",
  "body_height",
  "beak_tip_height",
  "beak_curve",
  "beak_length",
  "beak_squareness",
  "beak_top_width",
  "shoulder_smoothness",
  "shoulder_sweep",
  "body_squareness",
  "underside_squareness",
  "shank_detail",
  "shank_detail_style",
  "shank_detail_count",
  "shank_detail_depth",
  "baffle_texture",
] as const;
export type ShuffleKey = (typeof SHUFFLE_KEYS)[number];

// The sliders' steps, so a shuffled value is one the slider can show.
const STEP: Partial<Record<ShuffleKey, number>> = {
  tip_opening: 0.01,
  facing_length: 0.1,
  facing_exponent: 0.05,
  tip_rail_thickness: 0.02,
  side_rail_width: 0.05,
  side_rail_widening: 0.05,
  step_size: 0.05,
  baffle_height: 0.1,
  baffle_length: 0.5,
  baffle_hump: 0.1,
  baffle_curve: 0.05,
  chamber_width: 0.1,
  chamber_flare: 0.05,
  floor_shape: 0.05,
  sidewall_angle: 1,
  throat_width: 0.1,
  overall_length: 0.1,
  body_width: 0.1,
  body_height: 0.1,
  beak_tip_height: 0.1,
  beak_curve: 0.05,
  beak_length: 0.5,
  beak_squareness: 0.1,
  beak_top_width: 0.05,
  shoulder_smoothness: 0.05,
  shoulder_sweep: 0.5,
  body_squareness: 0.1,
  underside_squareness: 0.1,
};
const snap = (k: ShuffleKey, x: number) => {
  const s = STEP[k] ?? 0.01;
  return +(Math.round(x / s) * s).toFixed(4);
};

// A small seeded generator (mulberry32), so a shuffle can be repeated in a test or a check.
export function seeded(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, weighted: [T, number][]): T {
  const total = weighted.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of weighted) if ((r -= w) < 0) return v;
  return weighted[weighted.length - 1][0];
}

// A new design's values for the voice (before fitAir brings its air in line).
export function sampleDesign(voice: ShuffleVoice, rand: () => number): Record<ShuffleKey, ParamValue> {
  const d = SHUFFLE_DATA[voice];
  const p = d.preset;
  const u = (lo: number, hi: number) => lo + (hi - lo) * rand();
  // mostly the presets' look (lo..mid), now and then the other (mid..hi): squareness drawn evenly made
  // most shuffles boxier than any preset
  const mostly = (lo: number, mid: number, hi: number, p: number) => (rand() < p ? u(lo, mid) : u(mid, hi));
  // length: ±3% (the soprano only longer: its table needs all of its body), and the throat moves with
  // the window, as make_variants.mjs does (else the generator has to move it, with a warning)
  const L = snap("overall_length", p.overall_length * (voice === "Soprano" ? u(1, 1.03) : u(0.97, 1.03)));
  const tip = snap("tip_opening", u(...d.tip));
  // facing follows the tip: ~4mm longer per mm more opening, then ±4% either way
  const facingRaw = p.facing_length + 4 * (tip - p.tip_opening) + p.facing_length * u(-0.04, 0.04);
  const facing = snap("facing_length", Math.min(d.facing[1], Math.max(d.facing[0], facingRaw)));
  const facingModel = pick(rand, [
    ["power", 0.7],
    ["arc", 0.3],
  ]);
  const baffle = pick(rand, [
    ["measured", 0.25],
    ["flat", 0.2],
    ["rollover", 0.2],
    ["step", 0.15],
    ["concave", 0.2],
  ]);
  // (no knurling on the soprano: on its small shank, with other outside changes, it broke the mesh)
  const band = pick(rand, [
    ["none", 0.4],
    ["rings", 0.2],
    ["knurled", voice === "Soprano" ? 0 : 0.2],
    ["spiral", 0.2],
  ]);
  const BAND: Record<string, [string, number, number]> = {
    none: ["engraved", 3, 0.6],
    rings: ["engraved", 2, 0.5],
    knurled: ["raised", 16, 0.6],
    spiral: ["raised", voice === "Soprano" ? 3 : 2, voice === "Soprano" ? 0.7 : 0.5],
  };
  const swept = rand() < 0.4;
  return {
    tip_opening: tip,
    facing_length: facing,
    facing_model: facingModel,
    facing_exponent: facingModel === "power" ? snap("facing_exponent", u(1.6, 2.4)) : 1.8,
    tip_rail_thickness: snap("tip_rail_thickness", u(0.7, 1.2)),
    side_rail_width: snap("side_rail_width", u(...d.sideRail)),
    side_rail_widening: snap("side_rail_widening", u(...d.railWidening)),
    baffle_type: baffle,
    step_size: baffle === "step" ? snap("step_size", u(0.4, 1)) : 1,
    baffle_height: snap("baffle_height", u(-0.3, 0.8)),
    baffle_length: snap("baffle_length", u(-8, 4)),
    baffle_hump:
      baffle === "rollover" ? snap("baffle_hump", u(0.2, 0.8)) : rand() < 0.5 ? 0 : snap("baffle_hump", u(0, 0.4)),
    baffle_curve: snap("baffle_curve", u(-0.6, 0.2)),
    chamber_shape: pick(rand, [
      ["round", 1],
      ["square", 1],
      ["horseshoe", 1],
    ]),
    chamber_width: snap("chamber_width", p.chamber_width * u(0.92, 1.1)),
    chamber_height: 0,
    chamber_flare: snap("chamber_flare", u(0.3, 0.5)),
    floor_shape: snap("floor_shape", u(-0.3, 0.3)),
    sidewall_angle: snap("sidewall_angle", u(-4, 8)),
    throat_shape: pick(rand, [
      ["chamber", 1],
      ["round", 1],
      ["square", 1],
      ["horseshoe", 1],
    ]),
    throat_width: snap("throat_width", p.throat_width * u(0.94, 1.08)),
    throat_position: snap("overall_length", p.throat_position + (L - p.overall_length)),
    throat_taper: p.throat_taper + Math.min(0, L - p.overall_length), // the narrowing starts no nearer the socket
    overall_length: L,
    body_width: snap("body_width", p.body_width * u(0.94, 1.04)),
    body_height: snap("body_height", p.body_height * u(0.95, 1.01)),
    beak_tip_height: snap("beak_tip_height", p.beak_tip_height + u(-0.4, 0.4)),
    beak_curve: snap("beak_curve", u(-0.4, 0.8)),
    beak_length: snap("beak_length", L * u(-0.035, 0.085)),
    beak_squareness: snap("beak_squareness", mostly(1.3, 2, 3.2, 0.75)),
    beak_top_width: snap("beak_top_width", u(-0.2, 0.6)),
    shoulder_smoothness: snap("shoulder_smoothness", u(0, 1)),
    shoulder_sweep: swept ? snap("shoulder_sweep", L * u(0.03, 0.08)) : 0,
    body_squareness: snap("body_squareness", mostly(1.6, 2.4, 3.4, 0.75)),
    underside_squareness: snap("underside_squareness", rand() < 0.5 ? 1.2 : u(1.2, 2.2)),
    shank_detail: band,
    shank_detail_style: BAND[band][0],
    shank_detail_count: BAND[band][1],
    shank_detail_depth: BAND[band][2],
    // (none on the soprano: on its small, high baffle a texture cut through, genus 3, ~1 in 60)
    baffle_texture:
      voice === "Soprano"
        ? "none"
        : pick(rand, [
            ["none", 0.6],
            ["along", 0.2],
            ["dimples", 0.2],
          ]),
  };
}

export interface AirFit {
  values: Record<string, ParamValue>;
  air: number | null; // cm³, as measured for the returned values
  ok: boolean; // within AIR_BAND of the preset
  tries: number; // evaluations made
}

// Bring the inside air within the band. Levers, in turn: baffle height (higher, less air), then baffle
// curve (negative brings a classic baffle down early, as make_variants.mjs does), then throat width;
// each by the secant of what was measured, from a first guess of its slope (cm³ per unit, as a
// fraction of the preset's air). The baritone needs the later ones: a square chamber and throat and a
// concave baffle each add 10-15% of its air, baffle height takes away only ~4% per mm there.
// `measure` evaluates a set of values (an echo-only run) and returns its air in cm³, or null.
const LEVERS: {
  key: ShuffleKey;
  range: (d: VoiceData) => [number, number];
  slope: number;
}[] = [
  { key: "baffle_height", range: () => [-2, 2.5], slope: -0.08 },
  { key: "baffle_curve", range: () => [-1, 0.3], slope: 0.1 },
  { key: "throat_width", range: (d) => [d.preset.throat_width * 0.88, d.preset.throat_width * 1.1], slope: 0.05 },
];

export async function fitAir(
  voice: ShuffleVoice,
  values: Record<string, ParamValue>,
  measure: (v: Record<string, ParamValue>) => Promise<number | null>,
  maxTries = 6,
  accept = AIR_BAND,
): Promise<AirFit> {
  const d = SHUFFLE_DATA[voice];
  const target = d.air;
  const off = (a: number) => Math.abs(a / target - 1);
  let v = values;
  let a = await measure(v);
  let tries = 1;
  for (const lever of LEVERS) {
    const [lo, hi] = lever.range(d);
    let prev: [number, number] | null = null;
    while (a !== null && off(a) > AIR_AIM && tries < maxTries) {
      const x = Number(v[lever.key]);
      const guess = lever.slope * target;
      let slope = prev && prev[0] !== x && a !== prev[1] ? (a - prev[1]) / (x - prev[0]) : guess;
      if (Math.sign(slope) !== Math.sign(guess)) slope = guess;
      const next = snap(lever.key, Math.min(hi, Math.max(lo, x + (target - a) / slope)));
      if (next === x) break; // at the end of this lever: the next one
      prev = [x, a];
      v = { ...v, [lever.key]: next };
      a = await measure(v);
      tries++;
    }
    if (a === null || off(a) <= AIR_AIM) break;
  }
  return { values: v, air: a, ok: a !== null && off(a) <= accept, tries };
}

// The inside-air formula: the air's logarithm as a weighted sum of the settings that shape the inside,
// a step for each shape choice, and the levers per baffle shape. scripts/shuffle_fit.mjs fits the weights per voice into src/shuffleAir.json.
const AIR_NUM: ShuffleKey[] = [
  "tip_opening",
  "facing_length",
  "baffle_height",
  "baffle_length",
  "baffle_hump",
  "baffle_curve",
  "step_size",
  "chamber_width",
  "chamber_flare",
  "floor_shape",
  "sidewall_angle",
  "throat_width",
  "throat_position",
  "throat_taper",
  "overall_length",
];
const AIR_CAT: Partial<Record<ShuffleKey, string[]>> = {
  facing_model: ["arc"],
  baffle_type: ["flat", "rollover", "step", "concave"],
  chamber_shape: ["square", "horseshoe"],
  throat_shape: ["round", "square", "horseshoe"],
  baffle_texture: ["along", "dimples"],
};
export function airFeatures(v: Record<string, ParamValue>): Record<string, number> {
  const f: Record<string, number> = {};
  for (const k of AIR_NUM) f[k] = Number(v[k]);
  for (const [k, opts] of Object.entries(AIR_CAT)) for (const o of opts!) f[`${k}=${o}`] = v[k] === o ? 1 : 0;
  // the levers act differently on each baffle shape
  for (const o of ["measured", ...AIR_CAT.baffle_type!]) {
    const on = v.baffle_type === o ? 1 : 0;
    f[`baffle_height*${o}`] = Number(v.baffle_height) * on;
    f[`baffle_curve*${o}`] = Number(v.baffle_curve) * on;
  }
  return f;
}

export interface AirModel {
  voices: Record<string, { intercept: number; weights: Record<string, number> }>;
}
// The formula's air (cm³) for a design, or null when the voice has no fit.
export function predictAir(model: AirModel, voice: ShuffleVoice, v: Record<string, ParamValue>): number | null {
  const m = model.voices[voice];
  if (!m) return null;
  const f = airFeatures(v);
  let a = m.intercept;
  for (const [k, w] of Object.entries(m.weights)) a += w * (f[k] ?? 0);
  return +Math.exp(a).toFixed(2);
}

// What the Shuffle button does: sample a design and fit its air with `measure` (the formula: instant);
// a design it can't bring within `accept` is drawn again (up to `samples` times), so designs at the
// edge of what the levers can reach are never picked. The last try is returned either way.
export async function shuffleDesign(
  voice: ShuffleVoice,
  rand: () => number,
  measure: (v: Record<string, ParamValue>) => Promise<number | null>,
  samples = 10,
  accept = AIR_AIM,
): Promise<AirFit & { samples: number }> {
  let fit: AirFit | null = null;
  let n = 0;
  while (n < samples) {
    n++;
    fit = await fitAir(voice, sampleDesign(voice, rand), measure, 6, accept);
    if (fit.ok) break;
  }
  return { ...fit!, samples: n };
}

// After a render of a shuffled design reports its real air out of the band: the values to try next.
// With two real readings that differ only in baffle height, the straight line through them (the
// formula's slope can be off by half on some shapes, and overshoot); otherwise the formula, scaled
// by how far off it was.
export async function correctAir(
  model: AirModel,
  voice: ShuffleVoice,
  readings: { values: Record<string, ParamValue>; air: number }[],
): Promise<Record<string, ParamValue>> {
  const target = SHUFFLE_DATA[voice].air;
  const last = readings[readings.length - 1];
  const prev = readings[readings.length - 2];
  if (prev) {
    const h0 = Number(prev.values.baffle_height),
      h1 = Number(last.values.baffle_height);
    const onlyBaffle = Object.keys(last.values).every(
      (k) => k === "baffle_height" || JSON.stringify(prev.values[k]) === JSON.stringify(last.values[k]),
    );
    const slope = h1 !== h0 ? (last.air - prev.air) / (h1 - h0) : 0;
    if (onlyBaffle && slope < 0) {
      const h = snap("baffle_height", Math.min(2.5, Math.max(-2, h1 + (target - last.air) / slope)));
      if (h !== h1) return { ...last.values, baffle_height: h };
    }
  }
  const p = predictAir(model, voice, last.values);
  if (!p) return last.values;
  const scale = last.air / p;
  const fit = await fitAir(voice, last.values, (v) => Promise.resolve((predictAir(model, voice, v) ?? 0) * scale));
  return fit.values;
}

// Lettering on one side: the voice's letter and the tip opening in thousandths of an inch ("B .106", as a
// maker marks it), in a shuffled typeface; as the lettering variables, so the number follows the tip
// slider afterwards. Only when both sides are empty or still hold a shuffle's own lettering (also the
// earlier {voice} / {tip} pair): a player's own side text (and its font and size) stays.
export const SHUFFLE_FONTS = [
  "Sans Bold",
  "Sans",
  "Serif Bold",
  "Serif",
  "Serif Italic",
  "Mono Bold",
  "Bebas Neue",
  "Marcellus SC",
  "Rozha One",
  "Alfa Slab One",
  "Audiowide",
  "Black Ops One",
  "Lobster",
  "Pacifico",
  "Kaushan Script",
] as const;
const SIDE_TEXT = "{voice_letter} {tip}";
const SCRIPT_FONTS = new Set(["Lobster", "Pacifico", "Kaushan Script"]); // the generator: 5mm or taller
export function shuffleLettering(
  voice: ShuffleVoice,
  sides: { right: ParamValue | undefined; left: ParamValue | undefined },
  rand: () => number,
  font?: string,
): Record<string, ParamValue> {
  const right = String(sides.right ?? ""),
    left = String(sides.left ?? "");
  if (!["", SIDE_TEXT, "{voice}"].includes(right) || !["", "{tip}"].includes(left)) return {};
  const f = font ?? SHUFFLE_FONTS[Math.floor(rand() * SHUFFLE_FONTS.length)];
  return {
    side_text_right: SIDE_TEXT,
    side_text_left: "",
    side_text_font: f,
    // the soprano's a size smaller, 3mm toward the tip: nearer the shank, wide or script faces broke its
    // mesh (genus 2), with "Soprano" and with "S .073" alike
    side_text_size: (SCRIPT_FONTS.has(f) ? 5 : 3.5) - (voice === "Soprano" ? 0.5 : 0),
    side_text_position: voice === "Soprano" ? 3 : 0,
  };
}

// The voice a design is for, from its report's socket ("Alto", ...): only the four with variants.
export const shuffleVoice = (socketVoice: string | undefined | null): ShuffleVoice | null =>
  SHUFFLE_VOICES.includes(socketVoice as ShuffleVoice) ? (socketVoice as ShuffleVoice) : null;
