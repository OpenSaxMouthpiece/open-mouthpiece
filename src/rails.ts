// Window width and Window taper: two more ways to set the side rails. The generator keeps the rails
// (side_rail_width, side_rail_widening) and makes the window what they leave, so the rails keep
// their width to the tip; these two controls show that window and, moved, set the rails that give
// it. They work from the rails' outer edge the last render reported (REPORT "rails"), which the
// rails themselves don't move, so the conversion is exact.
import type { ParamValue, ScadParam } from "./api";
import type { RailsReport } from "./readouts";

export const WINDOW_WIDTH = "window_width";
export const WINDOW_TAPER = "window_taper";
// The settings panel's window controls (not the generator's settings).
export const WINDOW_CONTROLS = [WINDOW_WIDTH, WINDOW_TAPER];
// An older design's window settings: kept in its values until legacyRails has turned them into rails.
export const LEGACY_WINDOW = WINDOW_CONTROLS;
const RAIL = "side_rail_width";
const WIDEN = "side_rail_widening";
type Values = Record<string, ParamValue>;

const r2 = (x: number) => Math.round(x * 100) / 100 + 0; // + 0: never -0 in a setting
const num = (v: ParamValue | undefined, d: number) => (typeof v === "number" ? v : d);
const clampTo = (p: ScadParam, x: number) => Math.min(p.max ?? Infinity, Math.max(p.min ?? -Infinity, x));

// window = edge - 2 x rail (at the front); taper = front window - back window.
const widthOf = (r: RailsReport, rail: number) => r2(r.edgeFront - 2 * rail);
const taperOf = (r: RailsReport, widen: number) => r2(r.edgeFront - r.edgeRear + 2 * widen);

// The settings list with the two window controls next to the rails (an older file's own
// window_width / window_taper rows are replaced: the rails stand for them now).
export function withWindowParams(params: ScadParam[], r: RailsReport | null | undefined): ScadParam[] {
  const rest = params.filter((p) => p.name !== WINDOW_WIDTH && p.name !== WINDOW_TAPER);
  const rail = params.find((p) => p.name === RAIL);
  const widen = params.find((p) => p.name === WIDEN);
  if (!r || !rail || !widen) return rest;
  const n = (p: ScadParam) => num(p.initial, 0);
  const width: ScadParam = {
    name: WINDOW_WIDTH,
    caption: "Across the window just behind the tip (mm); the side rails narrow as it widens.",
    group: rail.group,
    type: "number",
    initial: widthOf(r, n(rail)),
    min: widthOf(r, rail.max ?? 2.5),
    max: widthOf(r, rail.min ?? 0.5),
    step: 0.1,
  };
  const taper: ScadParam = {
    name: WINDOW_TAPER,
    caption: "How much narrower the window is at the back (mm); sets how the side rails widen.",
    group: widen.group,
    type: "number",
    initial: taperOf(r, n(widen)),
    min: taperOf(r, widen.min ?? -1),
    max: taperOf(r, widen.max ?? 2),
    step: 0.1,
  };
  return [...rest, width, taper];
}

// The changed values with the window controls' values (shown changed when their rails are). An
// older design's window_width / window_taper are its own business (see legacyRails).
export function withWindowValues(values: Values, r: RailsReport | null | undefined): Values {
  const { [WINDOW_WIDTH]: _w, [WINDOW_TAPER]: _t, ...rest } = values;
  if (!r) return rest;
  const out: Values = { ...rest };
  if (values[RAIL] !== undefined) out[WINDOW_WIDTH] = widthOf(r, num(values[RAIL], r.rail));
  if (values[WIDEN] !== undefined) out[WINDOW_TAPER] = taperOf(r, num(values[WIDEN], r.widen));
  return out;
}

// A window control moved: the rail setting that gives it ([name, value]; undefined = back to the
// file's value). Anything else passes through.
export function windowChange(
  name: string,
  v: ParamValue | undefined,
  params: ScadParam[],
  r: RailsReport | null | undefined,
): [string, ParamValue | undefined] {
  if ((name !== WINDOW_WIDTH && name !== WINDOW_TAPER) || !r) return [name, v];
  const target = name === WINDOW_WIDTH ? RAIL : WIDEN;
  const p = params.find((q) => q.name === target);
  if (v === undefined || !p) return [target, undefined];
  const x = Number(v);
  const raw = name === WINDOW_WIDTH ? (r.edgeFront - x) / 2 : (x - (r.edgeFront - r.edgeRear)) / 2;
  return [target, r2(clampTo(p, raw))];
}

// An older design (its link's values or its file's text set window_width / window_taper): the rails
// the generator worked out from them (rounded as the sliders are), and which of the two has them
// (a file's lines are rewritten by railsInText, a link's values become rails settings). Its window
// stays as it was. Null when neither has them: the report may be from a design shown before.
export function legacyRails(
  r: RailsReport | null | undefined,
  values: Values,
  source: string,
): { rail: number; widen: number; inFile: boolean } | null {
  if (!r?.legacy) return null;
  const inValues = LEGACY_WINDOW.some((k) => k in values);
  const inFile = !inValues && /^window_(?:width|taper)\s*=/m.test(source);
  return inValues || inFile ? { rail: r2(r.rail), widen: r2(r.widen), inFile } : null;
}

// An older file's text with its window lines (and the comment above each) replaced by its rails:
// the file then opens as it is, not as edited. Null when it has no window lines.
export function railsInText(text: string, rail: number, widen: number): string | null {
  const windowLine = /^(?:\/\/[^\n]*\n)?window_(?:width|taper)\s*=[^\n]*(?:\n|$)/gm;
  if (!windowLine.test(text)) return null;
  let t = text.replace(windowLine, "");
  const set = (name: string, v: number) => {
    const re = new RegExp(`^(${name}\\s*=\\s*)[^;\\n]*;`, "m");
    if (re.test(t)) t = t.replace(re, `$1${v};`);
    else return false;
    return true;
  };
  if (!set(RAIL, rail)) t += `\n${RAIL} = ${rail};\n`;
  if (!set(WIDEN, widen)) {
    const line =
      "// How much wider the side rails get toward the back of the window (mm); 0 = even.\n" +
      `${WIDEN} = ${widen}; // [-1:0.05:2]`;
    const after = new RegExp(`^${RAIL}\\s*=[^\\n]*$`, "m");
    t = after.test(t) ? t.replace(after, (m) => `${m}\n${line}`) : `${t}\n${line}\n`;
  }
  return t;
}
