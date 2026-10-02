// Pictures the user uploads for *_image parameters live only in this browser (localStorage):
// nothing is written into the project, and
// share links leave them out. Each render sends them along as art/<name> beside the project's own
// example pictures (a user's picture of the same name wins).
const KEY = "open-mouthpiece-art-v1";

interface Stored {
  text: string;
  aspect: number | null;
}

function load(): Record<string, Stored> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

export const userArtNames = () => Object.keys(load()).sort();
export const isUserArt = (name: string) => name in load();
export const userArtAspect = (name: string) => load()[name]?.aspect ?? null;

// {"art/<name>": svg text} for a render's files.
export function userArtFiles(): Record<string, string> {
  return Object.fromEntries(Object.entries(load()).map(([n, s]) => [`art/${n}`, s.text]));
}

// A data: URL in an <img> can't run script, so an uploaded SVG is safe to show.
export function userArtUrl(name: string): string | null {
  const s = load()[name];
  return s ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s.text)}` : null;
}

export function saveUserArt(name: string, text: string, aspect: number | null) {
  const s = load();
  s[name] = { text, aspect };
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    throw new Error("This browser's storage is full or blocked, so the picture can't be kept here.");
  }
}

// Checks shared by both APIs; returns the file name the generator will import.
export function checkArt(name: string, svg: string): string {
  const n =
    String(name)
      .split(/[\\/]/)
      .pop()!
      .replace(/\.svg$/i, "")
      .replace(/[^\w.-]/g, "_") + ".svg";
  if (!/^\w[\w.-]*\.svg$/i.test(n)) throw new Error("need an .svg file name");
  if (svg.length > 2_000_000) throw new Error("SVG is larger than 2 MB");
  if (!/<svg[\s>]/i.test(svg)) throw new Error("that file is not an SVG drawing");
  return n;
}
// Picture parameters (*_image) of a design and the picture each uses: its changed values, and for
// a user's own file, the assignments in its text (the values win).
export function imageRefs(values: Record<string, unknown>, source?: string): Record<string, string> {
  const refs: Record<string, string> = {};
  if (source) for (const [, k, v] of source.matchAll(/^\s*(\w+_image)\s*=\s*"([^"]*)"/gm)) refs[k] = v;
  for (const [k, v] of Object.entries(values)) if (k.endsWith("_image") && typeof v === "string") refs[k] = v;
  return refs;
}

// The user's own pictures a design uses, {name: svg text}, for a share link that includes them.
export function sharedArt(values: Record<string, unknown>, source?: string): Record<string, string> {
  const s = load();
  return Object.fromEntries(
    Object.values(imageRefs(values, source))
      .filter((n) => n in s)
      .map((n) => [n, s[n].text]),
  );
}

// Pictures that came in a share link: kept like an upload (under a new name if this browser has a
// different picture by that name). Returns the design's values, pointed at the names used.
export function receiveArt(art: Record<string, string>, values: Record<string, unknown>, source?: string) {
  const out = { ...values };
  const refs = imageRefs(values, source);
  for (const [name, text] of Object.entries(art)) {
    if (typeof text !== "string") continue;
    let n: string;
    try {
      n = checkArt(name, text);
    } catch {
      continue;
    }
    const s = load();
    for (let i = 2; n in s && s[n].text !== text; i++) n = checkArt(`${name.replace(/\.svg$/i, "")}_${i}`, text);
    const keys = Object.keys(refs).filter((k) => refs[k] === name);
    const aspect = keys.map((k) => out[`${k}_aspect`]).find((a) => typeof a === "number") as number | undefined;
    saveUserArt(n, text, aspect ?? null);
    for (const k of keys) out[k] = n;
  }
  return out;
}

export const NO_SHAPES =
  "OpenSCAD found no filled shapes in that SVG (outlines only?): fill the shapes, or convert strokes to paths";
