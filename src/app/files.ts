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

// The Ash/Birch/Cedar variants of the presets (scad/variants/<voice>_<family>.scad).
export const isVariant = (p: string) => /^variants\/[^/]+\.scad$/.test(p);
const titleCase = (s: string) => s.replace(/^./, (c) => c.toUpperCase());
// "alto.scad" -> "Alto", "variants/alto_ash.scad" -> "Alto Ash", "my_alto.scad" -> "my alto".
export const voiceLabel = (p: string) =>
  PRESETS.includes(p)
    ? titleCase(baseName(p))
    : isVariant(p)
      ? baseName(p).split("_").map(titleCase).join(" ")
      : baseName(p).replace(/_/g, " ");
// The generator every design includes: the geometry, with default values its settings files override.
export const GENERATOR = "lib/mouthpiece_base.scad";
export const includesGenerator = (source: string) => /include\s*<[^>]*mouthpiece_base\.scad>/.test(source);
// A tab's name in the code column: "Generator", or the design's name ("Tenor", "Alto Ash").
export const tabLabel = (t: Tab) =>
  t.path === GENERATOR ? "Generator" : isLibrary(t) ? t.path! : voiceLabel(t.path ?? t.name);
// For error reports: a preset's or variant's path, or just "own design" (never the user's file name).
export const reportDesign = (p: string | null) => (p && (PRESETS.includes(p) || isVariant(p)) ? p : "own design");

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
