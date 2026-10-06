// "Edit shape": the outline and inside lines the side and top views draw, dragged by a few handles.
// A drag doesn't move a stored point of the built-in shape: it adds an offset in mm (the generator's
// *_adjust lists, [[fraction of the length, mm], ...]) after every slider, so the sliders keep
// working and Reset is an empty list. The lines come with every full render (shape_edit_lines()).
import { pchip, type Pt } from "./curves";

export const SHAPE_ECHO = "\necho(SHAPE_EDIT = shape_edit_lines());\n";

export type LineName = "top" | "underside" | "width" | "baffle" | "floor" | "chamber_width";
export interface ShapeLines {
  lines: Partial<Record<LineName, Pt[]>>; // design frame: z from the shank end; height above the table, or full width
  landmarks: [string, number][];
  L: number;
  frame: { print: boolean; tilt: number; lift: number };
}

export function parseShapeEcho(log: string): ShapeLines | null {
  const m = /ECHO: SHAPE_EDIT = (.*)$/m.exec(log);
  if (!m) return null;
  try {
    const raw = JSON.parse(m[1].replace(/\bundef\b|-?\binf\b|\bnan\b/g, "null")) as [string, unknown][];
    const out: ShapeLines = { lines: {}, landmarks: [], L: 0, frame: { print: false, tilt: 0, lift: 0 } };
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
}
export const LINES: Record<LineName, LineSpec> = {
  top: { param: "top_adjust", label: "top", points: 7 },
  underside: { param: "underside_adjust", label: "underside", points: 3, pin: "end" }, // meets the table
  width: { param: "width_adjust", label: "width", points: 7 },
  baffle: { param: "baffle_adjust", label: "baffle", points: 5, pin: "start" }, // leaves the chamber's roof
  floor: { param: "floor_adjust", label: "floor", points: 3, pin: "both" }, // throat to window
  chamber_width: { param: "chamber_width_adjust", label: "inside width", points: 6, pin: "start" }, // the bore
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

// Where a line's handles are (fractions of the length): its own points once edited, else evenly
// along the line.
export function handleFs(line: Pt[], adj: Pt[] | undefined, L: number, n: number): number[] {
  if (adj?.length) return adj.map((p) => p[0]);
  if (line.length < 2 || L <= 0) return [];
  const f0 = line[0][0] / L,
    f1 = line[line.length - 1][0] / L;
  return Array.from({ length: n }, (_, i) => f0 + ((f1 - f0) * i) / (n - 1));
}

// The offsets after moving handle i by d mm (the other handles keep theirs).
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const r2 = (x: number) => Math.round(x * 100) / 100;
export function moved(adj: Pt[] | undefined, fs: number[], i: number, d: number): Pt[] {
  return fs.map((f, j) => [r3(f), r2(offsetAt(adj, f) + (j === i ? d : 0))] as Pt);
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
