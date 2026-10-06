// The curated settings: the handful of parameters a player or maker starts with, in sax terms. Ranges and
// descriptions come from the rendered file's own Customizer export (so they follow
// scad/lib/mouthpiece_base.scad); a name the file doesn't declare is simply skipped.

export type DesignUnit = "thou"; // shown in thousandths of an inch next to the mm value

// The settings come in tabs, one per part: the mouthpiece, and what is made from it.
export type PartTab = "mouthpiece" | "ligature" | "cap";
// Each part tab's group in All parameters (the mouthpiece tab has every other group).
export const PART_GROUPS: Record<Exclude<PartTab, "mouthpiece">, string> = { ligature: "Ligature", cap: "Cap" };

export interface DesignItem {
  name: string;
  label: string;
  unit?: DesignUnit;
  options?: string[]; // only offer these of the parameter's dropdown values
  showIf?: string[]; // only shown once one of these (text / picture) parameters is filled in
  when?: [string, string | string[]]; // only shown while that parameter has this value (or one of these)
  caption?: string; // instead of the file's description (when the control differs from the file's unit/options)
  optionLabels?: Record<string, string>; // dropdown values in words
  side?: "left" | "right"; // drawn by the label: that side on a small top view (tip away)
}

export interface DesignSection {
  title: string;
  items: DesignItem[];
  summary?: (get: (name: string) => unknown) => string; // one line on the section's header: only what the panel doesn't show elsewhere
  ligature?: boolean; // the ligature's section: its controls show once a ligature is made (App's slot heads it)
  cap?: boolean; // the cap's section: App's slot heads it (show it / back to the mouthpiece)
  tab?: PartTab; // the part tab it is on (default: the mouthpiece)
}

// Facing curves to pick from (under the facing chart; the facing curve is chosen there, not in
// the list). "As designed" = the file's own facing; the curve can also be dragged.
export interface FacingChoice {
  id: string;
  label: string;
  hint: string;
  model?: string;
  exponent?: number;
}
export const FACING_CHOICES: FacingChoice[] = [
  { id: "file", label: "As designed", hint: "The facing this mouthpiece comes with" },
  {
    id: "free",
    label: "Opens early",
    model: "power",
    exponent: 1.6,
    hint: "Power curve, exponent 1.6: the gap grows soon after the break",
  },
  { id: "even", label: "Even", model: "power", exponent: 2, hint: "Power curve, exponent 2" },
  {
    id: "focused",
    label: "Opens late",
    model: "power",
    exponent: 2.6,
    hint: "Power curve, exponent 2.6: the gap stays small until near the tip",
  },
  { id: "radius", label: "Radius", model: "arc", hint: "A true radius: a section of a circle" },
];

const BAFFLES: Record<string, string> = {
  measured: "Original",
  flat: "Flat",
  rollover: "Rollover",
  step: "Step",
  concave: "Concave",
};
const PARTS: Record<string, string> = {
  mouthpiece: "Mouthpiece",
  shank_test_ring: "Shank test ring",
  ligature: "Ligature",
  cap: "Cap",
};
const SIDE_TEXT = "Several lines OK; {tip} etc. are variables (as on top).";
const num = (v: unknown, unit: string) => (typeof v === "number" ? `${+v.toFixed(2)} ${unit}` : null);
const join = (parts: unknown[]) => parts.filter((p) => typeof p === "string" && p).join(" · ");

export const DESIGN_SECTIONS: DesignSection[] = [
  {
    title: "Tip & facing",
    items: [
      {
        name: "tip_opening",
        label: "Tip opening",
        unit: "thou",
        caption:
          'Gap at the tip, from the tip rail to a straightedge on the table, in thousandths (76 = .076"; mm works too).',
      },
      { name: "facing_length", label: "Facing length" },
    ],
  },
  {
    title: "Chamber & baffle",
    items: [
      { name: "chamber_width_extra", label: "Chamber width vs throat" },
      { name: "baffle_type", label: "Baffle shape", optionLabels: BAFFLES },
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
      { name: "shoulder_sweep", label: "Shoulder sweep" },
      { name: "beak_tip_height", label: "Beak height at the tip" },
      { name: "beak_squareness", label: "Beak top" },
      { name: "body_width", label: "Body width" },
      { name: "body_height", label: "Body height" },
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
      { name: "side_text_right", label: "Text, right side", side: "right", caption: SIDE_TEXT },
      { name: "side_text_left", label: "Text, left side", side: "left", caption: SIDE_TEXT },
      { name: "side_text_size", label: "Side text size", showIf: ["side_text_right", "side_text_left"] },
      { name: "side_text_position", label: "Side text position", showIf: ["side_text_right", "side_text_left"] },
      {
        name: "lettering_font",
        label: "Font",
        showIf: ["top_text", "side_text_right", "side_text_left", "ligature_text", "cap_text"],
      },
      {
        name: "lettering_style",
        label: "Lettering style",
        showIf: [
          "top_text",
          "top_image",
          "side_text_right",
          "side_text_left",
          "ligature_text",
          "ligature_image",
          "cap_text",
          "cap_image",
        ],
      },
    ],
  },
  {
    title: "Ligature",
    ligature: true,
    tab: "ligature",
    items: [
      { name: "ligature_length", label: "Band length" },
      { name: "ligature_position", label: "Position" },
      { name: "ligature_tongue", label: "Tongue" },
      { name: "ligature_tongue_side", label: "Tongue side", optionLabels: { top: "On top", reed: "Under the reed" } },
      {
        name: "ligature_shape",
        label: "Shape",
        optionLabels: { d: "D: round top, hugs the reed", round: "Round", conform: "Follows the mouthpiece" },
      },
      { name: "ligature_reed_grip", label: "Reed grip" },
      { name: "ligature_fit", label: "Gap to the body" },
      { name: "ligature_wall", label: "Wall" },
      {
        name: "ligature_text",
        label: "Text on the ligature",
        caption:
          "Text on the band's top (empty = none); several lines OK; {tip} etc. are variables. Font, style and depth are set in Personalise.",
      },
      { name: "ligature_text_size", label: "Text size", showIf: ["ligature_text"] },
      { name: "ligature_text_angle", label: "Text direction", showIf: ["ligature_text"] },
      { name: "ligature_image", label: "Picture on the ligature" },
      { name: "ligature_image_width", label: "Picture size", showIf: ["ligature_image"] },
      { name: "ligature_image_angle", label: "Picture rotation", showIf: ["ligature_image"] },
      {
        name: "ligature_lettering_position",
        label: "Text and picture position",
        showIf: ["ligature_text", "ligature_image"],
      },
    ],
  },
  {
    title: "Cap",
    cap: true,
    tab: "cap",
    summary: (get) =>
      join([
        get("cap_ligature") === "metal" ? "Over a metal ligature" : "Over the printed ligature",
        Number(get("cap_end_vents")) > 0 && `${get("cap_end_vents")} air holes`,
      ]),
    items: [
      {
        name: "cap_ligature",
        label: "Goes over",
        optionLabels: { printed: "The printed ligature", metal: "A metal ligature" },
      },
      { name: "cap_metal_length", label: "Band length", when: ["cap_ligature", "metal"] },
      { name: "cap_metal_position", label: "Band position", when: ["cap_ligature", "metal"] },
      { name: "cap_metal_proud", label: "Band thickness", when: ["cap_ligature", "metal"] },
      { name: "cap_metal_screw_width", label: "Screws, width across", when: ["cap_ligature", "metal"] },
      { name: "cap_metal_screw_length", label: "Screws, length along", when: ["cap_ligature", "metal"] },
      {
        name: "cap_slot_side",
        label: "Screws and slot",
        optionLabels: { reed: "Under the reed (standard ligature)", top: "On top (inverted ligature)" },
      },
      { name: "cap_grip", label: "Grip squeeze" },
      { name: "cap_slot_length", label: "Slot length" },
      { name: "cap_slot_width", label: "Slot width" },
      { name: "cap_end_vents", label: "Air holes in the end" },
      { name: "cap_end_vent_size", label: "End hole size" },
      { name: "cap_wall", label: "Wall" },
      { name: "cap_shape", label: "Shape", optionLabels: { conform: "Follows the mouthpiece", round: "Round" } },
      { name: "cap_extend", label: "Extra length (toward the shank)" },
      { name: "cap_end_gap", label: "Space at the end" },
      { name: "cap_end_dome", label: "End shape" },
      {
        name: "cap_text",
        label: "Text on the cap",
        caption:
          "Text on the cap's top (empty = none); several lines OK; {tip} etc. are variables. Font, style and depth are set in Personalise.",
      },
      { name: "cap_text_size", label: "Text size", showIf: ["cap_text"] },
      { name: "cap_text_angle", label: "Text direction", showIf: ["cap_text"] },
      { name: "cap_image", label: "Picture on the cap" },
      { name: "cap_image_width", label: "Picture size", showIf: ["cap_image"] },
      { name: "cap_image_angle", label: "Picture rotation", showIf: ["cap_image"] },
      { name: "cap_lettering_position", label: "Text and picture position", showIf: ["cap_text", "cap_image"] },
    ],
  },
  {
    title: "Printing",
    summary: (get) =>
      join([
        get("part") !== "mouthpiece" && (PARTS[String(get("part"))] ?? get("part")),
        Number(get("print_stock")) > 0 && `+${get("print_stock")} mm stock`,
      ]),
    items: [
      {
        name: "part",
        label: "What to print",
        options: ["mouthpiece", "shank_test_ring"],
        caption:
          "The mouthpiece, or a shank test ring (print it first to check the fit on your cork). The ligature and the cap download from their tabs.",
        optionLabels: PARTS,
      },
      { name: "print_stock", label: "Extra stock for finishing" },
    ],
  },
];

// Hidden from All parameters unless the code is open: point lists (the Curves section edits them).
export const DESIGN_HIDDEN_GROUPS = ["Profile overrides"];
// Dropdown values offered in the settings panel, where a parameter's full list is for debugging.
export const DESIGN_OPTIONS: Record<string, string[]> = Object.fromEntries(
  DESIGN_SECTIONS.flatMap((s) => s.items)
    .filter((i) => i.options)
    .map((i) => [i.name, i.options!]),
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
// Dropdown values in words, the same on both screens: the curated rows' labels, then these for the
// settings only All parameters shows, else the value itself, capitalised ("shank_test_ring" -> "Shank test ring").
const OPTION_LABELS: Record<string, Record<string, string>> = {
  facing_model: { power: "Power curve", arc: "Radius", gauge: "Gauge points" },
  throat_shape: { chamber: "Same as the chamber" },
};
export const optionLabel = (name: string, value: string, fileName = value) => {
  const words = fileName.replace(/_/g, " ");
  return (
    DESIGN_ITEMS.get(name)?.optionLabels?.[value] ??
    OPTION_LABELS[name]?.[value] ??
    words.charAt(0).toUpperCase() + words.slice(1)
  );
};
// Parameters that do nothing with the current settings, and why (All parameters shows them dimmed).
// get(name) = the parameter's current value (undefined if the file doesn't declare it).
type Getter = (name: string) => unknown;
const filled = (v: unknown) => (typeof v === "string" && v !== "") || (Array.isArray(v) && v.length > 0);
const anyText = (get: Getter, names: string[]) => names.some((n) => filled(get(n)));
const noWidening = (get: Getter) =>
  (
    typeof get("chamber_width") === "number"
      ? Number(get("chamber_width")) <= Number(get("throat_width"))
      : Number(get("chamber_width_extra")) <= 0
  )
    ? "the chamber is no wider than the throat: no widening to shape"
    : null;
const INACTIVE: Record<string, (get: Getter) => string | null> = {
  // Gauge without points falls back to Power, so the exponent still counts then
  facing_exponent: (get) =>
    get("facing_model") === "arc" || (get("facing_model") === "gauge" && filled(get("facing_gauge_points")))
      ? "only the Power facing uses it"
      : null,
  facing_gauge_points: (get) => (get("facing_model") === "gauge" ? null : "only the Gauge facing uses them"),
  // they shape the chamber's widening after the throat (an older link's chamber_width is in mm)
  chamber_flare: (get) => noWidening(get),
  chamber_full_length: (get) => noWidening(get),
  body_width: (get) => (filled(get("ext_width_points")) ? "your own width outline (ext_width_points) sets it" : null),
  body_height: (get) => (filled(get("ext_top_points")) ? "your own top outline (ext_top_points) sets it" : null),
  bore_axis_height: (get) => (filled(get("ext_top_points")) ? null : "only with your own top outline (ext_top_points)"),
  // the size knobs of the built-in outline: your own curves replace what they act on
  shank_diameter: (get) =>
    filled(get("ext_width_points")) && filled(get("ext_top_points"))
      ? "your own width and top outlines (ext_width_points, ext_top_points) set it"
      : null,
  beak_tip_height: (get) => (filled(get("ext_top_points")) ? "your own top outline (ext_top_points) sets it" : null),
  beak_curve: (get) => (filled(get("ext_top_points")) ? "your own top outline (ext_top_points) sets it" : null),
  beak_length: (get) =>
    filled(get("ext_top_points")) && filled(get("ext_top_squareness_points"))
      ? "your own top outline and squareness (ext_top_points, ext_top_squareness_points) set it"
      : null,
  body_squareness: (get) =>
    filled(get("ext_top_squareness_points")) && filled(get("ext_bottom_squareness_points"))
      ? "your own squareness curves (ext_top/bottom_squareness_points) set it"
      : null,
  beak_squareness: (get) =>
    filled(get("ext_top_squareness_points")) ? "your own squareness curve (ext_top_squareness_points) sets it" : null,
  underside_squareness: (get) =>
    filled(get("ext_bottom_squareness_points"))
      ? "your own squareness curve (ext_bottom_squareness_points) sets it"
      : null,
  table_width_tip: (get) =>
    filled(get("table_width_points")) ? "your own reed seat (table_width_points) sets it" : null,
  table_width_rear: (get) =>
    filled(get("table_width_points")) ? "your own reed seat (table_width_points) sets it" : null,
  floor_shape: (get) => (filled(get("floor_points")) ? "your own floor (floor_points) sets it" : null),
  baffle_type: (get) => (filled(get("baffle_points_custom")) ? "your own baffle (baffle_points_custom) wins" : null),
  shank_bevel_depth: (get) => (Number(get("shank_bevel")) > 0 ? null : "the socket has no bevel (Shank bevel is 0)"),
};
// The lettering settings do nothing without something to letter (same rule as the sections' showIf).
for (const i of DESIGN_SECTIONS.flatMap((s) => s.items)) {
  if (i.showIf && !INACTIVE[i.name])
    INACTIVE[i.name] = (get) => (anyText(get, i.showIf!) ? null : "no text or picture to apply it to");
}
for (const n of ["lettering_depth", "lettering_tip_clearance", "side_text_vertical", "top_image_aspect"]) {
  const on = ["top_text", "top_image", "side_text_right", "side_text_left"];
  if (n === "lettering_depth") on.push("ligature_text", "ligature_image", "cap_text", "cap_image");
  INACTIVE[n] = (get) => (anyText(get, on) ? null : "no text or picture to apply it to");
}
INACTIVE.ligature_image_aspect = (get) => (anyText(get, ["ligature_image"]) ? null : "no picture on the ligature");
INACTIVE.cap_image_aspect = (get) => (anyText(get, ["cap_image"]) ? null : "no picture on the cap");
// The metal ligature's numbers only count for a cap over a metal ligature.
for (const n of [
  "cap_metal_length",
  "cap_metal_position",
  "cap_metal_proud",
  "cap_metal_screw_width",
  "cap_metal_screw_length",
])
  INACTIVE[n] = (get) => (get("cap_ligature") === "metal" ? null : "only for a cap over a metal ligature");
INACTIVE.cap_slot_width = (get) => (Number(get("cap_slot_length")) > 0 ? null : "the cap has no slot");
INACTIVE.cap_end_vent_size = (get) => (Number(get("cap_end_vents")) > 0 ? null : "the cap's end has no holes");
export const paramInactive = (name: string, get: Getter) => INACTIVE[name]?.(get) ?? null;
// A variant's one-line description, from its file's header ('// Alto "Ash": a variant of alto.scad ...'
// then "// Ash: closer tip, ..."): "Ash, compared with the Alto preset: closer tip, ...".
export const fileAbout = (source: string) => {
  const m = /^\/\/ (\w+) "(\w+)": a variant of [^\n]*\n\/\/ \w+: ([^\n]+)/.exec(source);
  return m ? `${m[2]}, compared with the ${m[1]} preset: ${m[3].trim()}` : undefined;
};
// A description for both screens where the control differs from the file's (tip in thousandths).
export const paramCaption = (name: string) => DESIGN_ITEMS.get(name)?.caption;
// Whether a file has any of the Design screen's parameters (a mouthpiece file, not a scratch file).
export const hasDesignParams = (names: string[]) => names.some((n) => DESIGN_ITEMS.has(n));
