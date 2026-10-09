// Open files (tabs), file names and labels, and downloads.
import type { ParamValue } from "../api";

// An open file. Project files (from the site's project/) are read-only; the user's own files
// ("Save as…") are kept in this browser; files from the computer ("local") until saved.
export interface Tab {
  key: string; // the path for project files, "local:<name>" otherwise
  path: string | null;
  name: string;
  source: string;
  saved: string | null; // text on disk (project files), for the modified marker
}

export type Values = Record<string, ParamValue>;
export const NO_VALUES: Values = {};

export const DEFAULT_FILE = "alto.scad";
export const PRESETS = ["alto.scad", "tenor.scad", "baritone.scad", "soprano.scad"];
export const LOCAL = "local:";

export const isDirty = (t: Tab) => t.saved !== null && t.source !== t.saved;
export const isLibrary = (t: Tab) => !!t.path && t.path.startsWith("lib/");
export const fileName = (p: string) => p.split("/").pop()!;
export const baseName = (p: string) => fileName(p).replace(/\.scad$/i, "");
export const projectTab = (path: string, source: string): Tab => ({
  key: path,
  path,
  name: fileName(path),
  source,
  saved: source,
});

// A tab for text that isn't a project file, keyed "local:<name>.scad" ("<name> (2).scad" etc. when taken).
export function localTab(name: string, source: string, taken: (key: string) => boolean): Tab {
  const base = baseName(name);
  let key = `${LOCAL}${base}.scad`;
  for (let i = 2; taken(key); i++) key = `${LOCAL}${base} (${i}).scad`;
  return { key, path: null, name: key.slice(LOCAL.length), source, saved: null };
}

// A name typed for Save as -> a file name the browser store takes: spaces become "_", other odd
// characters go, ".scad" is added. "" when nothing usable is left.
export function scadFileName(typed: string) {
  const n = typed
    .trim()
    .replace(/^\/+/, "")
    .replace(/\.scad$/i, "")
    .replace(/\s+/g, "_")
    .replace(/[^\w./-]/g, "")
    .split("/")
    .filter((s) => s && s !== "." && s !== "..")
    .join("/");
  return n ? `${n}.scad` : "";
}

// The Flamma/Silva/Unda variants of the presets (scad/variants/<voice>_<family>.scad).
export const isVariant = (p: string) => /^variants\/[^/]+\.scad$/.test(p);
// What each variant family changes, for the pickers' tooltips (the same lines as the variant files'
// headers: scripts/make_variants.mjs BLURB).
const VARIANT_BLURB: Record<string, string> = {
  flamma:
    "closer tip, radius facing, round chamber with scooped sidewalls, concave baffle; slim round body, full beak, ringed shank",
  silva:
    "more open tip, square chamber, rollover baffle with grooves along, thin tip rail; boxy body, set-back shoulder, flat straight beak, knurled shank",
  unda: "close tip, short facing, horseshoe chamber, flat baffle with dimples, wide rails; soft body, scooped beak, raised spiral shank",
};
export const variantBlurb = (p: string) =>
  isVariant(p) ? VARIANT_BLURB[baseName(p).split("_").pop() ?? ""] : undefined;
// Other voices, less common (scad/extras/: the C-melody).
export const isExtra = (p: string) => /^extras\/[^/]+\.scad$/.test(p);
const titleCase = (s: string) => s.replace(/^./, (c) => c.toUpperCase());
// "alto.scad" -> "Alto", "extras/c_melody.scad" -> "C-melody", "variants/alto_flamma.scad" -> "Alto Flamma",
// "my_alto.scad" -> "my alto".
export const voiceLabel = (p: string) =>
  PRESETS.includes(p) || isExtra(p)
    ? titleCase(baseName(p).replace(/_/g, "-"))
    : isVariant(p)
      ? baseName(p).split("_").map(titleCase).join(" ")
      : baseName(p).replace(/_/g, " ");
// The preset of a design's voice, from the comment line that names it near the top ("// Tenor
// saxophone mouthpiece.", a variant's "// Tenor "Silva": ...", designs saved from them, also after a
// downloaded .scad's own header); the default when it doesn't say.
export const presetFor = (source: string) => {
  const m = /^\s*\/\/\s*(soprano|alto|tenor|baritone|c-melody)\b/im.exec(source.slice(0, 3000));
  if (!m) return DEFAULT_FILE;
  const voice = m[1].toLowerCase();
  return voice === "c-melody" ? "extras/c_melody.scad" : `${voice}.scad`;
};
// The generator every design includes: the geometry, with default values its settings files override.
export const GENERATOR = "lib/mouthpiece_base.scad";
export const includesGenerator = (source: string) => /include\s*<[^>]*mouthpiece_base\.scad>/.test(source);
// A tab's name in the code column: "Generator", or the design's name ("Tenor", "Alto Flamma").
export const tabLabel = (t: Tab) =>
  t.path === GENERATOR ? "Generator" : isLibrary(t) ? t.path! : voiceLabel(t.path ?? t.name);
// For error reports: a preset's or variant's path, or just "own design" (never the user's file name).
export const reportDesign = (p: string | null) =>
  p && (PRESETS.includes(p) || isVariant(p) || isExtra(p)) ? p : "own design";

// The part a design makes (its `part` value), for labels: "Mouthpiece", "Shank test ring".
export const partName = (part: unknown) =>
  typeof part !== "string" || part === "mouthpiece"
    ? "Mouthpiece"
    : (part.charAt(0).toUpperCase() + part.slice(1)).replace(/_/g, " ");

// Another part than the mouthpiece, or null.
export const otherPartOf = (values: Values) =>
  typeof values.part === "string" && values.part !== "mouthpiece" ? values.part : null;

// The name a download of a design gets (no extension): a changed preset becomes "my_<voice>".
export const downloadName = (tab: Tab, values: Values, isPreset: boolean) =>
  `${isPreset && Object.keys(values).some((k) => k !== "part") ? "my_" : ""}${baseName(tab.name)}`;

export function download(data: BlobPart, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
