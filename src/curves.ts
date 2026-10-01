// Point lists ([[z, value], ...] assignments) in an OpenSCAD source, for the curve editor: find
// them, write one back, and evaluate them the way scad/lib/mouthpiece_base.scad does (PCHIP).

export type Pt = [number, number];

export interface PointList {
  name: string;
  line: number;       // 0-based line of the (last) assignment
  pts: Pt[];
  caption?: string;   // the comment line right above, as the Customizer shows it
}

const NUM = String.raw`-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?`;
const PAIR = String.raw`\[\s*${NUM}\s*,\s*${NUM}\s*\]`;
const ASSIGN = new RegExp(String.raw`^(\s*)([A-Za-z_]\w*)(\s*=\s*)(\[\s*(?:${PAIR}\s*(?:,\s*${PAIR}\s*)*)?\])(\s*;.*)$`);

// Top-level single-line assignments whose value is a list of number pairs (possibly empty). The
// last assignment of a name wins, as in OpenSCAD.
export function findPointLists(source: string): PointList[] {
  const lines = source.split("\n");
  const found = new Map<string, PointList>();
  let depth = 0; // brace depth: skip assignments inside modules/functions
  lines.forEach((raw, i) => {
    const text = raw.replace(/\r$/, "");
    const m = depth === 0 ? ASSIGN.exec(text) : null;
    if (m && m[1] === "") {
      const prev = i > 0 ? lines[i - 1].replace(/\r$/, "").trim() : "";
      const caption = prev.startsWith("//") ? prev.replace(/^\/\/\s*/, "") : undefined;
      found.delete(m[2]); // keep file order of the last assignment
      found.set(m[2], { name: m[2], line: i, pts: JSON.parse(m[4]) as Pt[], caption });
    }
    for (const ch of text.replace(/\/\/.*$/, "")) depth += ch === "{" ? 1 : ch === "}" ? -1 : 0;
    depth = Math.max(0, depth);
  });
  return [...found.values()];
}

// shape_* tables are indexed by fraction of the overall length; everything else by mm.
export const isFractionList = (name: string) => name.startsWith("shape_");

export function axisLabel(name: string): string {
  if (isFractionList(name)) return "fraction of length";
  if (name === "facing_gauge_points") return "mm back from the tip";
  return "mm from the shank end";
}

export function valueLabel(name: string): string {
  if (name.includes("squareness")) return "squareness (2 = round, higher = boxier)";
  if (name === "facing_gauge_points") return "gap above the table (mm)";
  if (name.includes("width")) return "width (mm)";
  return "height above the table (mm)";
}

// PCHIP exactly as the generator evaluates it (pchip_prep / pchip_at): monotone cubic, C1, no
// overshoot; holds the end values beyond the first/last point.
export function pchip(x: number, pts: Pt[]): number {
  const n = pts.length;
  if (n === 0) return NaN;
  if (n === 1 || x <= pts[0][0]) return pts[0][1];
  if (x >= pts[n - 1][0]) return pts[n - 1][1];
  const d = (i: number) => (pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0]);
  const m = (i: number) => {
    if (i === 0) return d(0);
    if (i === n - 1) return d(n - 2);
    const d0 = d(i - 1), d1 = d(i), h0 = pts[i][0] - pts[i - 1][0], h1 = pts[i + 1][0] - pts[i][0];
    if (d0 * d1 <= 0) return 0;
    const w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
    return (w1 + w2) / (w1 / d0 + w2 / d1);
  };
  let i = 0;
  while (i < n - 2 && x > pts[i + 1][0]) i++;
  const h = pts[i + 1][0] - pts[i][0], t = (x - pts[i][0]) / h, t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * pts[i][1] + (t3 - 2 * t2 + t) * h * m(i) + (-2 * t3 + 3 * t2) * pts[i + 1][1] + (t3 - t2) * h * m(i + 1);
}

// Few knots whose PCHIP curve stays within tol of a densely sampled curve (as the fitter does it:
// Douglas-Peucker, then add the worst sample until it fits).
function simplify(pts: Pt[], tol: number): Pt[] {
  if (pts.length < 3) return pts;
  const a = pts[0], b = pts[pts.length - 1];
  let worst = 0, wi = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const t = (pts[i][0] - a[0]) / (b[0] - a[0]), e = Math.abs(pts[i][1] - (a[1] + t * (b[1] - a[1])));
    if (e > worst) { worst = e; wi = i; }
  }
  if (worst <= tol) return [a, b];
  return [...simplify(pts.slice(0, wi + 1), tol).slice(0, -1), ...simplify(pts.slice(wi), tol)];
}
export function knots(samples: Pt[], tol: number): Pt[] {
  let k = simplify(samples, tol);
  for (let it = 0; it < samples.length; it++) {
    let worst = tol, wi = -1;
    samples.forEach((p, i) => { const e = Math.abs(pchip(p[0], k) - p[1]); if (e > worst) { worst = e; wi = i; } });
    if (wi < 0) break;
    k = [...k, samples[wi]].sort((a, b) => a[0] - b[0]);
  }
  return k;
}

// The generator's curve_editor_curves(), echoed through the .echo export: the overall length and
// each override's curve as the model has it now.
export const CURVES_ECHO = "\necho(CURVE_EDITOR = curve_editor_curves());\n";

export interface ModelCurves {
  L?: number;
  curves: Record<string, Pt[]>;
}

export function parseCurvesEcho(log: string): ModelCurves | null {
  const m = /ECHO: CURVE_EDITOR = (.*)$/m.exec(log);
  if (!m) return null;
  try {
    const raw = JSON.parse(m[1].replace(/\bundef\b|-?\binf\b|\bnan\b/g, "null")) as [string, unknown][] | null;
    if (!Array.isArray(raw)) return null;
    const out: ModelCurves = { curves: {} };
    for (const [name, v] of raw) {
      if (name === "L" && typeof v === "number") out.L = v;
      else if (Array.isArray(v)) out.curves[name] = (v as Pt[]).filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]));
    }
    return out;
  } catch {
    return null;
  }
}
