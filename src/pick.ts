// Click a spot on the model, get the settings that shape it: the inverse of "zoom to parameter".
// The landmarks along the bore (shank band, table, facing break, window, beak) come from the same
// param_focus() boxes the zoom uses, so a file without it simply has no picking.

import { DESIGN_SECTIONS } from "./design";
import type { FocusData } from "./focus";

type V3 = [number, number, number];

export interface PickRegion {
  title: string; // what was clicked, in plain words
  params: string[]; // the settings that shape it, the most direct first
}

// The print frame the viewer shows back to the design frame (Z = bore axis from the shank end,
// Y = up from the table plane): the inverse of translate([0, 0, lift]) rotate([-tilt, 0, 0]).
export function toDesign([x, y, z]: V3, frame: FocusData["frame"], isNormal = false): V3 {
  if (!frame.print) return [x, y, z];
  const a = (frame.tilt * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  const zz = isNormal ? z : z - frame.lift;
  return [x, y * c - zz * s, y * s + zz * c];
}

const R = (title: string, ...params: string[]): PickRegion => ({ title, params });

// p and n: the hit point and the face's outward normal, in the design frame. get: a setting's value.
// inside: the face is one of the air space's (the viewer looks along its normal: it sees the model).
export function pickRegion(
  p: V3,
  n: V3,
  data: FocusData,
  get: (name: string) => unknown,
  inside = false,
): PickRegion | null {
  const it = data.items;
  const z0 = (k: string) => it[k]?.box[0][2];
  const z1 = (k: string) => it[k]?.box[1][2];
  const L = z1("overall_length");
  if (L === undefined) return null;
  const socketEnd = (z1("shank_depth") ?? 0) - 3;
  const bandEnd = (z1("shank_text") ?? socketEnd + 7) - 4;
  const tableStart = z0("table_length") ?? 0;
  const breakZ = (z0("facing_length") ?? L - 25) + 3;
  const winZ0 = (z0("window_length") ?? L - 30) + 3;
  const baffleZ0 = (z0("baffle_height") ?? winZ0) + 3;
  const beakZ0 = (z0("beak_tip_height") ?? breakZ - 8) + 8; // the facing break
  const throatZ = (z0("throat_position") ?? socketEnd + 10) + 8;
  const [x, y, z] = p;
  const [nx, ny, nz] = n;
  const num = (k: string, d: number) => (typeof get(k) === "number" ? (get(k) as number) : d);

  // the shank: its end face, the socket inside it, the band outside
  if (z < 0.6 && nz < -0.6) return R("Shank end", "shank_clearance", "neck_cork_diameter", "shank_bevel");
  if (inside) {
    // the air space, from the shank: socket, bore, throat, then the chamber's roof, floor and walls
    if (z < socketEnd) return R("Socket", "shank_clearance", "neck_cork_diameter", "shank_depth");
    if (Math.abs(z - throatZ) < 4) return R("Throat", "throat_width", "throat_position", "throat_shape");
    if (z < throatZ) return R("Bore", "bore_diameter", "bore_axis_height", "bore_tilt");
    if (ny < -0.5)
      return z > baffleZ0
        ? R("Baffle", "baffle_height", "baffle_length", "baffle_type", "baffle_curve")
        : R("Chamber roof", "chamber_height", "baffle_type", "chamber_shape");
    if (ny > 0.5) return R("Chamber floor", "floor_shape", "chamber_shape", "chamber_width");
    if (Math.abs(nx) > 0.5) return R("Chamber walls", "chamber_width", "sidewall_angle", "chamber_flare");
    return R("Chamber", "chamber_shape", "chamber_width", "chamber_height");
  }
  if (z < socketEnd) {
    const sb = it.shank_depth!.box,
      cy = (sb[0][1] + sb[1][1]) / 2;
    if (nx * x + ny * (y - cy) < 0) return R("Socket", "shank_clearance", "neck_cork_diameter", "shank_depth");
  }
  if (z < bandEnd) return R("Shank band", "shank_diameter", "shank_text", "shank_detail");

  // the tip's end face, then the underside: tip rail, what shows through the window, rails, facing, table
  if (z > L - 1 && nz > 0.6) return R("Tip", "tip_curve", "beak_tip_height", "tip_rail_thickness");
  if (ny < -0.55) {
    if (z > L - num("tip_rail_thickness", 0.8) - 1.2)
      return R("Tip rail", "tip_rail_thickness", "tip_curve", "tip_bevel");
    // the rails follow the facing curve up to the tip opening; a face well above it is inside (the
    // roof, seen through the window or a cut)
    const t = Math.max(0, (z - breakZ) / Math.max(1, L - breakZ));
    const rail = num("tip_opening", 2) * t * t;
    if (z >= tableStart && y > rail + 0.8)
      return z > baffleZ0
        ? R("Baffle", "baffle_height", "baffle_length", "baffle_type")
        : R("Chamber", "chamber_height", "chamber_width", "baffle_type");
    // the rails: curving away from the reed past the facing's start, flat on the table before it
    if (z > breakZ) return R("Facing", "tip_opening", "facing_length", "side_rail_width", "facing_model");
    if (z > winZ0) return R("Side rails", "side_rail_width", "window_width", "window_length");
    if (z >= tableStart) return R("Table", "table_length", "table_width_rear", "table_concavity");
    return R("Underside", "underside_squareness", "body_height");
  }
  // the outside: top, sides, the shoulder (where the top drops to the beak) and the beak past it.
  // The shoulder is a band around its steepest drop, or any face there that leans toward the tip.
  const shoulderZ = (z0("beak_curve") ?? beakZ0 - 14) + 8;
  if (z > shoulderZ - 4 && z < L - 4 && (z < shoulderZ + 8 || (nz > 0.35 && z < beakZ0)))
    return Math.abs(nx) > 0.55
      ? R("Shoulder", "shoulder_sweep", "shoulder_smoothness", "beak_length")
      : R("Shoulder", "beak_curve", "beak_length", "shoulder_smoothness");
  const beak = z > shoulderZ;
  if (ny > 0.55)
    return beak
      ? R("Beak", "beak_tip_height", "beak_curve", "beak_length", "beak_top_width")
      : R("Top", "body_height", "top_text");
  if (Math.abs(nx) > 0.55)
    return beak
      ? R("Beak sides", "beak_squareness", "shoulder_sweep", "beak_top_width")
      : R("Side", "body_width", "body_squareness", nx > 0 ? "side_text_left" : "side_text_right");
  return beak ? R("Beak", "beak_squareness", "beak_tip_height") : R("Body", "body_squareness", "body_width");
}

// Where a setting lives in the panel: its section, and the More it is under (a Fold id), if any.
export function placeOf(name: string): { section: string; more?: string; tab: string } | null {
  for (const s of DESIGN_SECTIONS) {
    const tab = s.tab ?? "mouthpiece";
    for (const g of s.groups ?? []) {
      if (g.items.some((i) => i.name === name)) return { section: s.title, tab };
      if (g.more?.includes(name)) return { section: s.title, more: `m:${s.title}:${g.title}`, tab };
    }
    if (s.items.some((i) => i.name === name)) return { section: s.title, tab };
    if (s.more?.includes(name)) return { section: s.title, more: `m:${s.title}`, tab };
  }
  return null;
}
