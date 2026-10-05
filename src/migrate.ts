// Designs saved before a parameter rename (2026-09-26, 2026-10-05), in this browser, in downloaded
// .scad files and in share links, still open as they were: their old parameter names are rewritten
// to the new ones, in the file's text and in the changed values.
import type { ParamValue } from "./api";

export const RENAMED: Record<string, string> = {
  chamber_d: "chamber_width",
  bore_d: "bore_diameter",
  throat_z: "throat_position",
  throat_length: "throat_taper",
  chamber_position: "chamber_flare",
  chamber_length: "chamber_full_length", // and 0 ("all the way") became 40 (the new maximum)
  tip_thickness: "beak_tip_height",
  tip_round: "tip_curve",
  side_text_height: "side_text_vertical",
  baffle_rollover: "baffle_hump",
  reed_length: "table_length", // 2026-10-05, the same length
};
const OLD = new RegExp(`\\b(${Object.keys(RENAMED).join("|")})\\b`, "g");

// chamber_length: 0 meant "all the way"; chamber_full_length says that with its maximum, 40.
const chamberLength = (v: ParamValue) => (v === 0 ? 40 : v);

export function migrateValues(values: Record<string, ParamValue>): Record<string, ParamValue> {
  if (!Object.keys(values).some((n) => n in RENAMED)) return values;
  return Object.fromEntries(
    Object.entries(values).map(([n, v]) =>
      n in RENAMED ? [RENAMED[n], n === "chamber_length" ? chamberLength(v) : v] : [n, v],
    ),
  );
}

export function migrateScad(text: string): string {
  // A downloaded (self-contained) file carries today's generator, whose RENAMED_PARAMS block
  // declares the old names itself (`chamber_d = undef;`): renaming those would overwrite the
  // real settings with undef (the render then hangs). Such a file is current: leave it alone.
  if (text.includes("RENAMED_PARAMS")) return text;
  return migrateChamber(migrateSizes(migrateNames(text)));
}

function migrateNames(text: string): string {
  if (!OLD.test(text)) return text;
  OLD.lastIndex = 0;
  return (
    text
      // chamber_length = 0; // [0:0.5:30]  ->  chamber_full_length = 40; // [0:0.5:40]
      .replace(
        /^(\s*)chamber_length\s*=\s*0(\.0*)?\s*;\s*\/\/\s*\[0:0\.5:30\]/m,
        "$1chamber_full_length = 40; // [0:0.5:40]",
      )
      .replace(/^(\s*)chamber_length\s*=\s*0(\.0*)?\s*;/m, "$1chamber_full_length = 40;")
      .replace(OLD, (m) => RENAMED[m])
  );
}

// Sizes in mm (2026-10-03): body_width_scale / body_height_scale / shank_scale became body_width /
// body_height / shank_diameter. An older file gets the sizes its own outline (its shape tables)
// had at its scales, worked out as the generator does (BODY_KW, BODY_KH, SHANK_S). A file without
// tables keeps its scale lines: the generator still multiplies by them.
const SIZE_LINES: [string, string, string][] = [
  [
    "body_width_scale",
    "body_width",
    "// Widest outside width of the body, side to side (mm).\nbody_width = $; // [18:0.1:40]",
  ],
  [
    "body_height_scale",
    "body_height",
    "// Height of the body's top above the reed table, at its tallest (mm).\nbody_height = $; // [18:0.1:40]",
  ],
  [
    "shank_scale",
    "shank_diameter",
    "// Outside diameter of the shank at the neck end (mm); grows if the wall gets too thin.\nshank_diameter = $; // [14:0.1:32]",
  ],
];
const OLD_SIZE_NOTES =
  /^[ \t]*\/\/ (Body width|Body height|Outside size of the shank end) \(1 = the preset's own outline\)\.\r?\n/gm;

function assigned(text: string, name: string): string | null {
  return new RegExp(`^\\s*${name}\\s*=\\s*([^;]*);`, "m").exec(text)?.[1].trim() ?? null;
}
const numberIn = (text: string, name: string, dflt: number) => {
  const v = Number(assigned(text, name));
  return assigned(text, name) !== null && Number.isFinite(v) ? v : dflt;
};
function tableIn(text: string, name: string): [number, number][] | null {
  try {
    const t = JSON.parse(assigned(text, name) ?? "null") as unknown;
    return Array.isArray(t) && t.length > 0 && t.every((p) => Array.isArray(p) && p.length === 2)
      ? (t as [number, number][])
      : null;
  } catch {
    return null;
  }
}
const smootherstep = (t: number) => t * t * t * (t * (6 * t - 15) + 10);
const bodyFade = (f: number) => smootherstep(Math.max(0, Math.min(1, (f - 0.09) / 0.12)));

// The body's width and height and the shank's diameter (mm) that a file's tables give at its scales.
export function outlineSizes(text: string) {
  const w = tableIn(text, "shape_width"),
    top = tableIn(text, "shape_top"),
    bottom = tableIn(text, "shape_bottom");
  if (!w || !top || !bottom) return null;
  const S = numberIn(text, "shank_scale", 1),
    kw = numberIn(text, "body_width_scale", 1),
    kh = numberIn(text, "body_height_scale", 1);
  const L = numberIn(text, "overall_length", 89.3),
    tilt = Math.tan((numberIn(text, "bore_tilt", 4.4) * Math.PI) / 180);
  const shankK = (f: number) => S + (1 - S) * bodyFade(f);
  const mid0 = (top[0][1] + bottom[0][1]) / 2;
  const shankY = (f: number, y: number) =>
    S === 1 ? y : mid0 - f * L * tilt + (y - (mid0 - f * L * tilt)) * shankK(f);
  const scaled = (f: number, v: number, k: number) => v * (1 + (k - 1) * bodyFade(f));
  // the body's points only (the tenon's don't scale), as the generator's size_k
  const body = (t: [number, number][]) => t.filter(([f]) => bodyFade(f) > 1e-9);
  const r2 = (x: number) => Math.round(x * 100) / 100;
  return {
    body_width: r2(Math.max(...body(w).map(([f, v]) => scaled(f, v, kw) * shankK(f)))),
    body_height: r2(Math.max(...body(top).map(([f, v]) => shankY(f, scaled(f, v, kh))))),
    shank_diameter: r2(w[0][1] * S),
  };
}

// chamber_width (mm) became chamber_width_extra (2026-10-03): the width vs the throat's, so every
// value does something whatever the throat. An older file's width minus its throat (the
// generator's 14.2 when it doesn't set one). A link's chamber_width still applies as it is.
function migrateChamber(text: string): string {
  const width = assigned(text, "chamber_width");
  if (width === null || assigned(text, "chamber_width_extra") !== null || !Number.isFinite(Number(width))) return text;
  const extra = Math.round((Number(width) - numberIn(text, "throat_width", 14.2)) * 100) / 100;
  return text
    .replace(/^[ \t]*\/\/ Inside width of the chamber \(mm\); never narrower than the window\.\r?\n/m, "")
    .replace(
      /^([ \t]*)chamber_width\s*=[^;]*;[^\r\n]*/m,
      (_m, indent: string) =>
        `${indent}// Chamber width vs the throat's (mm): 0 = as wide, + wider (a larger chamber), - narrower.\n` +
        `${indent}chamber_width_extra = ${extra}; // [-1:0.1:12]`,
    );
}

function migrateSizes(text: string): string {
  if (!SIZE_LINES.some(([old]) => assigned(text, old) !== null) || assigned(text, "body_width") !== null) return text;
  const sizes = outlineSizes(text);
  if (!sizes) return text;
  let out = text.replace(OLD_SIZE_NOTES, "");
  for (const [old, name, line] of SIZE_LINES) {
    const re = new RegExp(`^([ \\t]*)${old}\\s*=[^;]*;[^\\r\\n]*`, "m");
    const value = String(sizes[name as keyof typeof sizes]);
    out = re.test(out) ? out.replace(re, (_m, indent: string) => line.replace("$", value).replace(/^/gm, indent)) : out;
  }
  return out;
}
