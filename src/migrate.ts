// Designs saved before the parameter renames of 2026-09-26 (in this browser, in downloaded .scad
// files and in share links) still open as they were: their old parameter names are rewritten to
// the new ones, in the file's text and in the changed values.
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
  if (!OLD.test(text) && !text.includes("/* [Not yet implemented] */")) return text;
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
      // The tooth-patch pocket used to be "not yet implemented" with a 0.3mm default that did
      // nothing: an old file keeps it off.
      .replace(
        /\/\* \[Not yet implemented\] \*\/([\s\S]*?)tooth_plate_recess\s*=\s*[\d.]+/,
        "/* [Tooth patch] */$1tooth_plate_recess = 0",
      )
  );
}
