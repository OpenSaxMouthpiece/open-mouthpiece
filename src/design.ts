// Design mode: the handful of parameters a player or maker starts with, in sax terms. Ranges and
// descriptions come from the rendered file's own Customizer export (so they follow
// scad/lib/mouthpiece_base.scad); a name the file doesn't declare is simply skipped.

export type DesignUnit = "thou"; // shown in thousandths of an inch next to the mm value

export interface DesignItem {
  name: string;
  label: string;
  unit?: DesignUnit;
  options?: string[]; // only offer these of the parameter's dropdown values
  showIf?: string[];  // only shown once one of these (text / picture) parameters is filled in
  caption?: string;   // instead of the file's description (when the control differs from the file's unit/options)
  optionLabels?: Record<string, string>; // dropdown values in words
}

export interface DesignSection {
  title: string;
  items: DesignItem[];
  summary?: (get: (name: string) => unknown) => string; // one line on the section's header: only what the panel doesn't show elsewhere
  ligature?: boolean; // the ligature's section: its controls show once a ligature is made (App's slot heads it)
}

// Facing curves to pick from (under the facing chart; the facing curve is chosen there, not in
// the list). "As designed" = the file's own facing; the curve can also be dragged.
export interface FacingChoice { id: string; label: string; hint: string; model?: string; exponent?: number }
export const FACING_CHOICES: FacingChoice[] = [
  { id: "file", label: "As designed", hint: "The facing this mouthpiece comes with" },
  { id: "free", label: "Free", model: "power", exponent: 1.6, hint: "Opens up soon after the flat part" },
  { id: "even", label: "Even", model: "power", exponent: 2, hint: "An even curve" },
  { id: "focused", label: "Focused", model: "power", exponent: 2.6, hint: "Keeps the reed close until near the tip" },
  { id: "radius", label: "Radius", model: "arc", hint: "A section of a circle" },
];

const BAFFLES: Record<string, string> = { measured: "As measured", flat: "Flat", rollover: "Rollover", step: "Step", concave: "Concave" };
const PARTS: Record<string, string> = { mouthpiece: "Mouthpiece", shank_test_ring: "Shank test ring", ligature: "Ligature" };
const num = (v: unknown, unit: string) => (typeof v === "number" ? `${+v.toFixed(2)} ${unit}` : null);
const join = (parts: unknown[]) => parts.filter((p) => typeof p === "string" && p).join(" · ");

export const DESIGN_SECTIONS: DesignSection[] = [
  {
    title: "Tip & facing",
    items: [
      { name: "tip_opening", label: "Tip opening", unit: "thou",
        caption: "Gap between the reed and the tip, in thousandths of an inch (76 = .076\"; typing mm works too)." },
      { name: "facing_length", label: "Facing length" },
    ],
  },
  {
    title: "Chamber & baffle",
    items: [
      { name: "chamber_width", label: "Chamber width" },
      { name: "baffle_type", label: "Baffle shape",
        optionLabels: BAFFLES },
      { name: "baffle_height", label: "Baffle height" },
      { name: "baffle_hump", label: "Baffle hump" },
      { name: "window_width", label: "Window width" },
    ],
  },
  {
    title: "Fit on the horn",
    summary: (get) => join([num(get("neck_cork_diameter"), "mm cork"), num(get("shank_clearance"), "squeeze")]),
    items: [
      { name: "neck_cork_diameter", label: "Neck cork diameter" },
      { name: "shank_clearance", label: "Cork squeeze" },
      { name: "shank_bevel", label: "Shank entry bevel width" },
      { name: "shank_bevel_depth", label: "Bevel depth" },
    ],
  },
  {
    title: "Body & beak",
    items: [
      { name: "overall_length", label: "Length" },
      { name: "beak_curve", label: "Beak curve" },
      { name: "beak_length", label: "Beak length" },
      { name: "beak_tip_height", label: "Beak height at the tip" },
      { name: "beak_squareness", label: "Beak top" },
      { name: "body_width_scale", label: "Body width" },
      { name: "body_height_scale", label: "Body height" },
    ],
  },
  {
    title: "Personalise",
    items: [
      { name: "top_text", label: "Text on top" },
      { name: "top_text_size", label: "Text size", showIf: ["top_text"] },
      { name: "top_text_angle", label: "Text direction", showIf: ["top_text"] },
      { name: "top_text_position", label: "Text position", showIf: ["top_text"] },
      { name: "top_image", label: "Picture on top" },
      { name: "top_image_width", label: "Picture size", showIf: ["top_image"] },
      { name: "top_image_angle", label: "Picture rotation", showIf: ["top_image"] },
      { name: "top_image_position", label: "Picture position", showIf: ["top_image"] },
      { name: "top_image_wrap", label: "Wrap picture around to the table", showIf: ["top_image"] },
      { name: "side_text_right", label: "Text, right side" },
      { name: "side_text_left", label: "Text, left side" },
      { name: "side_text_size", label: "Side text size", showIf: ["side_text_right", "side_text_left"] },
      { name: "side_text_position", label: "Side text position", showIf: ["side_text_right", "side_text_left"] },
      { name: "lettering_font", label: "Font", showIf: ["top_text", "side_text_right", "side_text_left"] },
      { name: "lettering_style", label: "Lettering style", showIf: ["top_text", "top_image", "side_text_right", "side_text_left"] },
    ],
  },
  {
    title: "Ligature",
    ligature: true,
    items: [
      { name: "ligature_length", label: "Band length" },
      { name: "ligature_position", label: "Position" },
      { name: "ligature_tongue", label: "Tongue" },
      { name: "ligature_tongue_side", label: "Tongue side", optionLabels: { top: "On top", reed: "Under the reed" } },
      { name: "ligature_shape", label: "Shape", optionLabels: { d: "D: round top, hugs the reed", round: "Round", conform: "Follows the mouthpiece" } },
      { name: "ligature_reed_grip", label: "Reed grip" },
      { name: "ligature_fit", label: "Gap to the body" },
      { name: "ligature_wall", label: "Wall" },
      { name: "ligature_reed_thickness", label: "Reed thickness" },
      { name: "ligature_reed_width", label: "Reed width" },
    ],
  },
  {
    title: "Printing",
    summary: (get) => join([get("part") !== "mouthpiece" && (PARTS[String(get("part"))] ?? get("part")), Number(get("print_stock")) > 0 && `+${get("print_stock")} mm stock`]),
    items: [
      { name: "part", label: "What to print", options: ["mouthpiece", "shank_test_ring", "ligature"],
        caption: "The mouthpiece, a shank test ring (print it first to check the fit on your cork), or the ligature.",
        optionLabels: PARTS },
      { name: "print_stock", label: "Extra stock for finishing" },
    ],
  },
];

// Customizer groups never shown (the parameters still work from the file or the code editor).
export const HIDDEN_GROUPS = ["Not yet implemented"];
// Also hidden from All parameters unless the code is open: point lists (the Curves section edits them).
export const DESIGN_HIDDEN_GROUPS = [...HIDDEN_GROUPS, "Profile overrides"];
// Dropdown values offered in Design mode, where a parameter's full list is for debugging.
export const DESIGN_OPTIONS: Record<string, string[]> = Object.fromEntries(
  DESIGN_SECTIONS.flatMap((s) => s.items).filter((i) => i.options).map((i) => [i.name, i.options!]),
);

export const MM_PER_THOU = 0.0254;
export const mmToThou = (mm: number) => mm / MM_PER_THOU;
export const thouToMm = (thou: number) => thou * MM_PER_THOU;
// 1.93 -> '.076"' (players quote tip openings in thousandths of an inch)
export const formatThou = (mm: number) => `.${String(Math.round(mmToThou(mm))).padStart(3, "0")}"`;

// One name per parameter on both screens: the Design label where there is one, else the
// parameter's own name in words ("bore_diameter" -> "Bore d").
const DESIGN_ITEMS = new Map(DESIGN_SECTIONS.flatMap((s) => s.items).map((i) => [i.name, i]));
export const paramLabel = (name: string) => {
  const words = name.replace(/_/g, " ");
  return DESIGN_ITEMS.get(name)?.label ?? words.charAt(0).toUpperCase() + words.slice(1);
};
export const paramUnit = (name: string) => DESIGN_ITEMS.get(name)?.unit;
// Parameters that do nothing with the current settings, and why (All parameters shows them dimmed).
// get(name) = the parameter's current value (undefined if the file doesn't declare it).
type Getter = (name: string) => unknown;
const filled = (v: unknown) => (typeof v === "string" && v !== "") || (Array.isArray(v) && v.length > 0);
const anyText = (get: Getter, names: string[]) => names.some((n) => filled(get(n)));
const INACTIVE: Record<string, (get: Getter) => string | null> = {
  // Gauge without points falls back to Power, so the exponent still counts then
  facing_exponent: (get) => (get("facing_model") === "arc" || (get("facing_model") === "gauge" && filled(get("facing_gauge_points")))
    ? "only the Power facing uses it" : null),
  facing_gauge_points: (get) => (get("facing_model") === "gauge" ? null : "only the Gauge facing uses them"),
  bore_axis_height: (get) => (filled(get("ext_top_points")) ? null : "only with your own top outline (ext_top_points)"),
  tooth_plate_length: (get) => (Number(get("tooth_plate_recess")) > 0 ? null : "the tooth-patch pocket is off (depth 0)"),
};
// The lettering settings do nothing without something to letter (same rule as the sections' showIf).
for (const i of DESIGN_SECTIONS.flatMap((s) => s.items)) {
  if (i.showIf && !INACTIVE[i.name]) INACTIVE[i.name] = (get) => (anyText(get, i.showIf!) ? null : "no text or picture to apply it to");
}
for (const n of ["lettering_depth", "lettering_tip_clearance", "side_text_vertical", "top_image_aspect"]) {
  INACTIVE[n] = (get) => (anyText(get, ["top_text", "top_image", "side_text_right", "side_text_left"]) ? null : "no text or picture to apply it to");
}
export const paramInactive = (name: string, get: Getter) => INACTIVE[name]?.(get) ?? null;
// A description for both screens where the control differs from the file's (tip in thousandths).
export const paramCaption = (name: string) => DESIGN_ITEMS.get(name)?.caption;
// Whether a file has any of the Design screen's parameters (a mouthpiece file, not a scratch file).
export const hasDesignParams = (names: string[]) => names.some((n) => DESIGN_ITEMS.has(n));
