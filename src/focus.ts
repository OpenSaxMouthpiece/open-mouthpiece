// "Zoom to parameter": where each parameter acts, from the generator's param_focus() (echoed
// through the .echo export), mapped into the print orientation the viewer shows.

type V3 = [number, number, number];

export interface FocusItem {
  box: [V3, V3]; // design frame
  view: string; // "table" | "top" | "side" | "side_right" | "end" | "tip" | "iso"
  cut: boolean; // inside the part: show a lengthwise section
}

export interface FocusData {
  frame: { print: boolean; tilt: number; lift: number };
  items: Record<string, FocusItem>;
}

// What the viewer gets: a box in its own (print) frame, the direction to look from, and whether
// to cut the model open. nonce makes a repeat of the same parameter fly again.
export interface FocusRequest {
  key: string;
  nonce: number;
  box: [V3, V3];
  dir: V3;
  cut: boolean;
}

export const FOCUS_ECHO = "\necho(PARAM_FOCUS = param_focus());\n";

// Print frame: Z up the bore from the shank end on the plate; the reed table faces -Y.
const VIEW_DIRS: Record<string, V3> = {
  table: [0.3, -1, 0.35],
  top: [0.35, 1, 0.5],
  side: [1, -0.2, 0.15], // from +X: the left side (side_text_left)
  side_right: [-1, -0.2, 0.15], // from -X: the right side (side_text_right)
  end: [0.5, -0.6, -1], // from the shank end, below
  tip: [0.45, 0.6, 1], // from the tip end, a little above and to the side: the beak's cross-section
  iso: [1, -1.2, 0.9],
};

export function parseFocusEcho(log: string): FocusData | null {
  const m = /ECHO: PARAM_FOCUS = (.*)$/m.exec(log);
  if (!m) return null;
  try {
    const raw = JSON.parse(m[1].replace(/\bundef\b|-?\binf\b|\bnan\b/g, "null")) as unknown[][];
    const data: FocusData = { frame: { print: true, tilt: 0, lift: 0 }, items: {} };
    for (const e of raw) {
      if (e[0] === "frame") {
        const [print, tilt, lift] = e[1] as [boolean, number, number];
        data.frame = { print, tilt, lift };
      } else if (typeof e[0] === "string" && Array.isArray(e[1])) {
        data.items[e[0]] = { box: e[1] as [V3, V3], view: String(e[2]), cut: e[3] === true };
      }
    }
    return data;
  } catch {
    return null;
  }
}

// The generator's print transform: translate([0, 0, lift]) rotate([-tilt, 0, 0]).
export function toRequest(key: string, nonce: number, item: FocusItem, frame: FocusData["frame"]): FocusRequest {
  const a = (-frame.tilt * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  const map = ([x, y, z]: V3): V3 => (frame.print ? [x, y * c - z * s, y * s + z * c + frame.lift] : [x, y, z]);
  const [p, q] = item.box;
  const corners = [0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
    map([i & 1 ? q[0] : p[0], i & 2 ? q[1] : p[1], i & 4 ? q[2] : p[2]]),
  );
  const lo = [0, 1, 2].map((k) => Math.min(...corners.map((v) => v[k]))) as V3;
  const hi = [0, 1, 2].map((k) => Math.max(...corners.map((v) => v[k]))) as V3;
  return { key, nonce, box: [lo, hi], dir: VIEW_DIRS[item.view] ?? VIEW_DIRS.iso, cut: item.cut };
}
