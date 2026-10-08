// "Edit shape": the outline and inside lines the side and top views draw, dragged by a few handles.
// A drag doesn't move a stored point of the built-in shape: it adds an offset in mm (the generator's
// *_adjust lists, [[fraction of the length, mm], ...]) after every slider, so the sliders keep
// working and Reset is an empty list. The lines come with every full render (shape_edit_lines()).
import { pchip, type Pt } from "./curves";

export const SHAPE_ECHO = "\necho(SHAPE_EDIT = shape_edit_lines());\n";

export type LineName = "top" | "underside" | "width" | "baffle" | "floor" | "chamber_width";
export interface ShapeLines {
  lines: Partial<Record<LineName | "rails", Pt[]>>; // design frame: z from the shank end; height above the table, or full width
  landmarks: [string, number][];
  L: number;
  frame: { print: boolean; tilt: number; lift: number };
  values: Record<string, unknown>; // the settings these lines were rendered with (their offsets)
}

export function parseShapeEcho(log: string, values: Record<string, unknown> = {}): ShapeLines | null {
  const m = /ECHO: SHAPE_EDIT = (.*)$/m.exec(log);
  if (!m) return null;
  try {
    const raw = JSON.parse(m[1].replace(/\bundef\b|-?\binf\b|\bnan\b/g, "null")) as [string, unknown][];
    const out: ShapeLines = { lines: {}, landmarks: [], L: 0, frame: { print: false, tilt: 0, lift: 0 }, values };
    for (const [name, v] of raw) {
      if (name === "L") out.L = Number(v);
      else if (name === "frame") {
        const [print, tilt, lift] = v as [boolean, number, number];
        out.frame = { print, tilt, lift };
      } else if (name === "landmarks") out.landmarks = v as [string, number][];
      else if (Array.isArray(v)) out.lines[name as LineName] = (v as Pt[]).filter((p) => p && p.every(Number.isFinite));
    }
    return out.L > 0 ? out : null;
  } catch {
    return null;
  }
}

// Each line's offsets, how many points it gets until it has its own, and which ends stay put (where
// the line meets another part: a step there would be a ledge). A pinned end is a point at 0 with no
// handle.
interface LineSpec {
  param: string;
  label: string;
  points: number;
  pin?: "start" | "end" | "both";
  // the landmark where the last handle sits (the line runs on, rounding over to the tip); an edit
  // there holds on to the end of the length
  end?: string;
  limit: number; // the most an edit may move the line at a handle (mm, either way)
}
export const LINES: Record<LineName, LineSpec> = {
  top: { param: "top_adjust", label: "top", points: 7, end: "top_end", limit: 6 },
  underside: { param: "underside_adjust", label: "underside", points: 3, pin: "end", limit: 4 }, // meets the table
  width: { param: "width_adjust", label: "width", points: 7, end: "width_end", limit: 6 },
  baffle: { param: "baffle_adjust", label: "baffle", points: 5, pin: "start", limit: 3 }, // leaves the chamber's roof
  floor: { param: "floor_adjust", label: "floor", points: 3, pin: "both", limit: 3 }, // throat to window
  chamber_width: { param: "chamber_width_adjust", label: "inside width", points: 6, pin: "start", limit: 4 }, // the bore
};
// Whether point i of n has a handle (pinned ends don't).
export const draggable = (n: LineName, i: number, count: number) => {
  const pin = LINES[n].pin;
  return !((i === 0 && (pin === "start" || pin === "both")) || (i === count - 1 && (pin === "end" || pin === "both")));
};
// The lines each section edits: the side view's, then the top view's.
export const SECTION_LINES = {
  body: { side: ["top", "underside"], top: ["width"] },
  chamber: { side: ["baffle", "floor"], top: ["chamber_width"] },
} satisfies Record<string, { side: LineName[]; top: LineName[] }>;
export type ShapeSection = keyof typeof SECTION_LINES;

// The offset curve as the generator reads it: 0 at both ends of the length unless given there.
export function offsetAt(adj: Pt[] | undefined, f: number): number {
  if (!adj?.length) return 0;
  const a = [...(adj[0][0] > 0 ? [[0, 0] as Pt] : []), ...adj, ...(adj[adj.length - 1][0] < 1 ? [[1, 0] as Pt] : [])];
  return pchip(f, a);
}

// Where a line's handles are (fractions of the length): its own points once edited, else on the
// outline's corners (where the shank flares into the body, the shoulder) with the stretches between
// shared out evenly; the inside's lines evenly along themselves.
export function handleFs(n: LineName, shape: ShapeLines, adj: Pt[] | undefined): number[] {
  const line = shape.lines[n] ?? [],
    L = shape.L;
  const mark = (name: string) => {
    const z = shape.landmarks.find(([m]) => m === name)?.[1];
    return z !== undefined && z > 0 && z < L ? z / L : undefined;
  };
  const endMark = LINES[n].end,
    end = endMark ? mark(endMark) : undefined;
  if (adj?.length) return adj.map((p) => p[0]).filter((f) => end === undefined || f <= end + 1e-3);
  if (line.length < 2 || L <= 0) return [];
  const f0 = line[0][0] / L,
    f1 = Math.min(line[line.length - 1][0] / L, end ?? 1);
  const between = (a: number, b: number, k: number) =>
    Array.from({ length: k }, (_, i) => a + ((b - a) * (i + 1)) / (k + 1));
  const [w0, w1, h0, h1, sh, ke] = ["flare_w0", "flare_w1", "flare_h0", "flare_h1", "shoulder", "shoulder_end"].map(
    mark,
  );
  let fs: (number | undefined)[];
  if (n === "top" && h1 !== undefined && sh !== undefined && ke !== undefined && h1 < sh && sh < ke)
    fs = [0, h0, h1, ...between(h1, sh, 1), sh, ke, ...between(ke, f1, 2), f1];
  else if (n === "width" && w1 !== undefined) fs = [0, w0, w1, ...between(w1, f1, 3), f1];
  else if (n === "underside" && (w0 ?? h0) !== undefined && (w0 ?? h0)! < f1)
    fs = [f0, w0 ?? h0, ...between((w0 ?? h0)!, f1, 1), f1];
  else {
    const count = LINES[n].points;
    return Array.from({ length: count }, (_, i) => f0 + ((f1 - f0) * i) / (count - 1));
  }
  // in order, inside the line, without near-repeats (a flare starting at the shank end, say)
  const out: number[] = [];
  for (const f of fs
    .filter((x): x is number => x !== undefined && x >= f0 - 1e-6 && x <= f1 + 1e-6)
    .sort((a, b) => a - b))
    if (!out.length || f - out[out.length - 1] > 0.02) out.push(f);
    else if (f === fs[fs.length - 1]) out[out.length - 1] = f; // the line's end wins (it may be pinned)
  return out;
}

// The offsets after moving handle i by d mm (the other handles keep theirs); on a line with an
// `end`, the last handle's offset holds on to the end of the length.
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const r2 = (x: number) => Math.round(x * 100) / 100;
export function moved(adj: Pt[] | undefined, fs: number[], i: number, d: number, hold = false, limit = Infinity): Pt[] {
  const out = fs.map(
    (f, j) => [r3(f), r2(Math.max(-limit, Math.min(limit, offsetAt(adj, f) + (j === i ? d : 0))))] as Pt,
  );
  const last = out[out.length - 1];
  return hold && last && last[0] < 1 ? [...out, [1, last[1]] as Pt] : out;
}
// No edit left (every offset 0): the empty list, so the design shows unchanged.
export const tidy = (adj: Pt[]) => (adj.every((p) => Math.abs(p[1]) < 0.005) ? [] : adj);

// A line as it will look with other offsets, before the model catches up (exact for the outline;
// the inside's clamps may hold it back a little).
export function previewLine(line: Pt[], before: Pt[] | undefined, after: Pt[], L: number): Pt[] {
  return line.map(([z, v]) => [z, v + offsetAt(after, z / L) - offsetAt(before, z / L)] as Pt);
}
// The value on a line at z (between its samples).
export function lineAt(line: Pt[], z: number): number {
  if (!line.length) return NaN;
  if (z <= line[0][0]) return line[0][1];
  for (let i = 1; i < line.length; i++)
    if (z <= line[i][0]) {
      const [z0, v0] = line[i - 1],
        [z1, v1] = line[i];
      return v0 + ((v1 - v0) * (z - z0)) / (z1 - z0 || 1);
    }
  return line[line.length - 1][1];
}

// Design frame (z, y) -> the printed model's frame as the side section draws it (z', y').
export function toPrint(frame: ShapeLines["frame"], z: number, y: number): [number, number] {
  if (!frame.print) return [z, y];
  const a = (-frame.tilt * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  return [y * s + z * c + frame.lift, y * c - z * s];
}
