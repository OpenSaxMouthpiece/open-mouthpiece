// The settings panel's sections, in sax terms: the settings a player or maker starts with, most useful
// first, and the rest of each section under its More. A longer section comes in small groups (one
// part each: Baffle, Chamber, Throat, ...), each with its own rows and its own More. Ranges and descriptions come from the rendered file's own Customizer export (so they follow
// scad/lib/mouthpiece_base.scad); a name the file doesn't declare is simply skipped.

export type DesignUnit = "thou" | "turn"; // thou: in thousandths of an inch next to the mm value; turn: four buttons (0/90/180/270)

// The settings come in tabs, one per part: the mouthpiece, and what is made from it.
export type PartTab = "mouthpiece" | "ligature" | "cap";
// Each part tab's group in the file (the mouthpiece tab has every other group).
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

// A group within a section: one part of it, its rows, then its own More (a group with no rows
// shows only its More, named after the group).
export interface DesignGroup {
  title: string;
  items: DesignItem[];
  more?: string[];
  chart?: boolean; // the section's chart follows this group
}

export interface DesignSection {
  title: string;
  plain?: string; // what it is, in plain words, under the title (the desktop's one-section panel)
  items: DesignItem[]; // with groups: every group's rows, in order (derived, see grouped())
  more?: string[]; // the rest of the section's settings, under its "More" (the small, nuanced ones)
  groups?: DesignGroup[];
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
const TEXTURES: Record<string, string> = {
  none: "None",
  along: "Grooves along",
  across: "Grooves across",
  dimples: "Dimples",
};
const PARTS: Record<string, string> = {
  mouthpiece: "Mouthpiece",
  shank_test_ring: "Shank test ring",
  ligature: "Ligature",
  cap: "Cap",
};
const SIDE_TEXT = "Several lines OK; {tip} puts in the tip size (more under Variables ▾).";
const num = (v: unknown, unit: string) => (typeof v === "number" ? `${+v.toFixed(2)} ${unit}` : null);
const join = (parts: unknown[]) => parts.filter((p) => typeof p === "string" && p).join(" · ");

// A section made of groups: its items and more are the groups', in order.
type GroupedSection = Omit<DesignSection, "items" | "more" | "groups"> & { groups: DesignGroup[] };
const grouped = (s: GroupedSection): DesignSection => ({
  ...s,
  items: s.groups.flatMap((g) => g.items),
  more: s.groups.flatMap((g) => g.more ?? []),
});
const TEXTURED = ["along", "across", "dimples"];

export const DESIGN_SECTIONS: DesignSection[] = [
  grouped({
    title: "Tip & facing",
    plain: "The opening at the tip, and the curve the reed closes against",
    groups: [
      {
        title: "Tip opening & facing",
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
        more: ["facing_model", "facing_exponent"],
        chart: true,
      },
      {
        title: "Rails",
        items: [
          { name: "tip_rail_thickness", label: "Tip rail thickness" },
          { name: "side_rail_width", label: "Side rail width" },
        ],
        more: ["tip_curve"],
      },
      { title: "Table", items: [], more: ["table_length", "table_width_tip", "table_width_rear", "table_concavity"] },
    ],
  }),
  {
    title: "Fit on the horn",
    plain: "How it fits your neck cork",
    summary: (get) => join([num(get("neck_cork_diameter"), "mm cork"), num(get("shank_clearance"), "squeeze")]),
    items: [
      { name: "neck_cork_diameter", label: "Neck cork diameter" },
      { name: "shank_clearance", label: "Cork squeeze" },
      {
        name: "shank_depth",
        label: "How far the cork goes in",
        caption: "In mm, from the shank end. Other settings give way to keep it.",
      },
    ],
    more: ["shank_bevel", "shank_bevel_depth", "bore_diameter", "bore_tilt"],
  },
  grouped({
    title: "Chamber & baffle",
    plain: "The space inside, from the reed to the shank",
    groups: [
      {
        title: "Baffle",
        items: [
          { name: "baffle_type", label: "Baffle shape", optionLabels: BAFFLES },
          { name: "baffle_height", label: "Baffle height" },
          { name: "baffle_hump", label: "Baffle hump" },
          { name: "baffle_texture", label: "Baffle texture", optionLabels: TEXTURES },
          {
            name: "baffle_texture_style",
            label: "Texture style",
            when: ["baffle_texture", TEXTURED],
            optionLabels: { engraved: "Engraved (cut in)", raised: "Raised (stands out)" },
          },
          { name: "baffle_texture_depth", label: "Texture depth", when: ["baffle_texture", TEXTURED] },
          { name: "baffle_texture_spacing", label: "Texture spacing", when: ["baffle_texture", TEXTURED] },
        ],
        more: ["baffle_start", "baffle_curve"],
      },
      {
        title: "Chamber",
        items: [
          { name: "chamber_shape", label: "Chamber shape" },
          {
            name: "chamber_width_extra",
            label: "Chamber width",
            caption: "In mm, against the throat's width: 0 = as wide, minus = narrower, plus = wider.",
          },
        ],
        more: ["chamber_height", "chamber_flare", "chamber_full_length", "floor_shape", "sidewall_angle"],
        chart: true,
      },
      {
        title: "Throat",
        items: [{ name: "throat_width", label: "Throat width" }],
        more: ["throat_position", "throat_taper", "throat_shape"],
      },
      {
        title: "Window",
        items: [{ name: "window_width", label: "Window width" }],
        more: ["window_length", "window_taper", "window_rear_radius"],
      },
    ],
  }),
  grouped({
    title: "Body & beak",
    plain: "The outside: what you see and bite on",
    groups: [
      {
        title: "Size",
        items: [
          { name: "overall_length", label: "Length" },
          { name: "body_width", label: "Body width" },
          { name: "body_height", label: "Body height" },
        ],
        more: ["shank_diameter", "bore_axis_height"],
      },
      {
        title: "Beak",
        items: [
          { name: "beak_tip_height", label: "Beak height at the tip" },
          { name: "beak_curve", label: "Beak curve" },
          { name: "beak_length", label: "Beak length" },
          { name: "beak_squareness", label: "Beak top" },
          { name: "beak_top_width", label: "Beak top width" },
        ],
        chart: true,
      },
      {
        title: "Shoulder & sides",
        items: [
          { name: "shoulder_smoothness", label: "Shoulder smoothness" },
          { name: "underside_squareness", label: "Sides near the table" },
        ],
        more: ["shoulder_sweep", "body_squareness"],
      },
    ],
  }),
  grouped({
    title: "Personalize",
    plain: "Lettering and pictures",
    groups: [
      {
        title: "On top",
        items: [
          { name: "top_text", label: "Text on top" },
          { name: "top_text_size", label: "Text size", showIf: ["top_text"] },
          { name: "top_text_angle", label: "Text direction", unit: "turn", showIf: ["top_text"] },
          { name: "top_text_position", label: "Text position", showIf: ["top_text"] },
          { name: "top_image", label: "Picture on top" },
          { name: "top_image_width", label: "Picture size", showIf: ["top_image"] },
          { name: "top_image_angle", label: "Picture rotation", showIf: ["top_image"] },
          { name: "top_image_position", label: "Picture position", showIf: ["top_image"] },
          { name: "top_image_wrap", label: "Wrap picture around to the table", showIf: ["top_image"] },
        ],
        more: ["top_text_font", "top_image_aspect"],
      },
      {
        title: "Sides",
        items: [
          { name: "side_text_right", label: "Text, right side", side: "right", caption: SIDE_TEXT },
          { name: "side_text_left", label: "Text, left side", side: "left", caption: SIDE_TEXT },
          { name: "side_text_size", label: "Side text size", showIf: ["side_text_right", "side_text_left"] },
          {
            name: "side_text_position",
            label: "Side text position",
            showIf: ["side_text_right", "side_text_left"],
          },
        ],
        more: ["side_text_font", "side_text_vertical"],
      },
      {
        title: "Shank band",
        items: [
          {
            name: "shank_text",
            label: "Text around the shank",
            caption: "Runs around the round band at the neck end; {tip} puts in the tip size.",
          },
          { name: "shank_text_size", label: "Shank text size", showIf: ["shank_text"] },
          {
            name: "shank_detail",
            label: "Shank decoration",
            optionLabels: {
              none: "None",
              rings: "Rings",
              flutes: "Flutes (V lines along it)",
              spiral: "Spiral",
              knurled: "Knurled (diamonds)",
            },
          },
          {
            name: "shank_detail_style",
            label: "Cut in or raised",
            when: ["shank_detail", ["rings", "flutes", "spiral", "knurled"]],
            optionLabels: { engraved: "Cut in (engraved)", raised: "Standing out (raised)" },
          },
          {
            name: "shank_detail_count",
            label: "How many",
            when: ["shank_detail", ["rings", "flutes", "spiral", "knurled"]],
          },
          { name: "shank_detail_position", label: "Ring position", when: ["shank_detail", "rings"] },
        ],
        more: ["shank_text_font", "shank_text_around", "shank_detail_depth"],
      },
      {
        title: "All lettering",
        items: [
          {
            name: "lettering_font",
            label: "Font",
            showIf: ["top_text", "side_text_right", "side_text_left", "shank_text", "ligature_text", "cap_text"],
            caption: "For all the lettering. Each text can have its own font under its More.",
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
        more: ["lettering_depth", "lettering_tip_clearance"],
      },
    ],
  }),
  grouped({
    title: "Ligature",
    plain: "A printed ring that holds the reed",
    ligature: true,
    tab: "ligature",
    groups: [
      {
        title: "Band",
        items: [
          {
            name: "ligature_shape",
            label: "Shape",
            optionLabels: { d: "D: round top, hugs the reed", round: "Round", conform: "Follows the mouthpiece" },
          },
          { name: "ligature_length", label: "Band length" },
          { name: "ligature_position", label: "Position" },
          { name: "ligature_tongue", label: "Tail toward the shank" },
          {
            name: "ligature_tongue_side",
            label: "Tail side",
            optionLabels: { top: "On top", reed: "Under the reed" },
          },
        ],
      },
      {
        title: "Fit",
        items: [
          { name: "ligature_reed_grip", label: "Reed grip" },
          { name: "ligature_wall", label: "Thickness" },
        ],
        more: ["ligature_fit"],
      },
      {
        title: "Text & picture",
        items: [
          {
            name: "ligature_text",
            label: "Text on the ligature",
            caption:
              "Text on the band's top (empty = none); several lines OK; {tip} puts in the tip size. Font, style and depth are set in Personalize.",
          },
          { name: "ligature_text_size", label: "Text size", showIf: ["ligature_text"] },
          { name: "ligature_text_angle", label: "Text direction", unit: "turn", showIf: ["ligature_text"] },
          { name: "ligature_image", label: "Picture on the ligature" },
          { name: "ligature_image_width", label: "Picture size", showIf: ["ligature_image"] },
          { name: "ligature_image_angle", label: "Picture rotation", showIf: ["ligature_image"] },
          {
            name: "ligature_lettering_position",
            label: "Text and picture position",
            showIf: ["ligature_text", "ligature_image"],
          },
        ],
        more: ["ligature_text_font", "ligature_image_aspect"],
      },
    ],
  }),
  grouped({
    title: "Cap",
    plain: "A printed cap that covers the tip and reed",
    cap: true,
    tab: "cap",
    summary: (get) =>
      join([
        get("cap_ligature") === "metal" && "Over a metal ligature",
        Number(get("cap_end_vents")) > 0 && `${get("cap_end_vents")} air holes`,
        get("cap_side_vents") === "slots" && "side slots",
        get("cap_side_vents") === "holes" && "side holes",
      ]),
    groups: [
      {
        title: "Goes over",
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
        ],
      },
      {
        title: "Fit & slot",
        items: [
          { name: "cap_grip", label: "Grip squeeze" },
          {
            name: "cap_slot_side",
            label: "Slot side",
            optionLabels: {
              reed: "Under the reed (a standard ligature's screws)",
              top: "On top (an inverted ligature's screws)",
            },
          },
        ],
        more: ["cap_slot_length", "cap_slot_width", "cap_end_gap"],
      },
      {
        title: "Shape",
        items: [
          { name: "cap_shape", label: "Shape", optionLabels: { conform: "Follows the mouthpiece", round: "Round" } },
          { name: "cap_end_dome", label: "End shape" },
          { name: "cap_rim_bead", label: "Rim bead" },
          { name: "cap_extend", label: "Extra length (toward the shank)" },
        ],
        more: ["cap_wall"],
      },
      {
        title: "Air holes & vents",
        items: [
          { name: "cap_end_vents", label: "Air holes in the end" },
          {
            name: "cap_side_vents",
            label: "Side vents",
            optionLabels: { none: "None", slots: "Slots", holes: "Round holes" },
          },
          {
            name: "cap_side_vent_count",
            label: "Vents on each side",
            when: ["cap_side_vents", ["slots", "holes"]],
          },
          { name: "cap_side_vent_size", label: "Vent size", when: ["cap_side_vents", ["slots", "holes"]] },
          {
            name: "cap_side_vent_gap",
            label: "Space between vents",
            when: ["cap_side_vents", ["slots", "holes"]],
          },
        ],
        more: ["cap_end_vent_size"],
      },
      {
        title: "Text & picture",
        items: [
          {
            name: "cap_text",
            label: "Text on the cap",
            caption:
              "Text on the cap's top (empty = none); several lines OK; {tip} puts in the tip size. Font, style and depth are set in Personalize.",
          },
          { name: "cap_text_size", label: "Text size", showIf: ["cap_text"] },
          { name: "cap_text_angle", label: "Text direction", unit: "turn", showIf: ["cap_text"] },
          { name: "cap_image", label: "Picture on the cap" },
          { name: "cap_image_width", label: "Picture size", showIf: ["cap_image"] },
          { name: "cap_image_angle", label: "Picture rotation", showIf: ["cap_image"] },
          {
            name: "cap_lettering_position",
            label: "Text and picture position",
            showIf: ["cap_text", "cap_image"],
          },
        ],
        more: ["cap_text_font", "cap_image_aspect"],
      },
    ],
  }),
  {
    title: "Printing",
    plain: "What to print, and how",
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
          "The mouthpiece, or a shank test ring (print it first to check the fit on your cork). The ligature and the cap download from their own sections.",
        optionLabels: PARTS,
      },
      { name: "print_stock", label: "Extra to sand off" },
    ],
    more: ["min_wall", "render_fn", "print_orientation"],
  },
];
// Set by the part tabs' heads (make the ligature / the cap), so they have no row.
export const DESIGN_ELSEWHERE = ["ligature_made", "cap_made"];
// Whether a setting has a place in the sections (curated or under a More); the others show by the
// file's own groups (a file that isn't the generator's).
export const PLACED = new Set([
  ...DESIGN_SECTIONS.flatMap((s) => [...s.items.map((i) => i.name), ...(s.more ?? [])]),
  ...DESIGN_ELSEWHERE,
]);
export const isPlaced = (name: string) => PLACED.has(name);

// Hidden from the sections' More unless the code is open: point lists (the Curves section edits them).
export const DESIGN_HIDDEN_GROUPS = ["Profile overrides"];
// Dropdown values offered in the settings panel (every value while the code is open, for debugging).
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

// One name per parameter: the section's label where there is one, then LABELS, else the
// parameter's own name in words ("bore_diameter" -> "Bore d").
const DESIGN_ITEMS = new Map(DESIGN_SECTIONS.flatMap((s) => s.items).map((i) => [i.name, i]));
// Names for settings under More whose own name reads poorly.
const LABELS: Record<string, string> = {
  facing_model: "Facing curve",
  facing_exponent: "Where the curve opens",
  tip_curve: "Tip roundness",
  table_width_tip: "Table width at the tip",
  table_width_rear: "Table width at the back",
  table_concavity: "Table hollow",
  chamber_height: "Chamber height",
  chamber_flare: "Widening after the throat",
  chamber_full_length: "How far the full width runs",
  floor_shape: "Chamber floor",
  throat_taper: "Narrowing into the throat",
  baffle_start: "Where the baffle begins",
  baffle_texture_style: "Texture style",
  baffle_texture_depth: "Texture depth",
  baffle_texture_spacing: "Texture spacing",
  window_taper: "Window narrows at the back",
  sidewall_angle: "Chamber side walls",
  window_rear_radius: "Window corner rounding",
  shank_bevel: "Lead-in at the opening",
  shank_bevel_depth: "Lead-in length",
  bore_diameter: "Bore (behind the cork)",
  bore_tilt: "Table angle to the neck",
  shank_diameter: "Shank outside diameter",
  shoulder_sweep: "Shoulder sweep",
  body_squareness: "Body cross-section",
  side_text_vertical: "Side text up / down",
  top_text_font: "Top text font",
  side_text_font: "Side text font",
  shank_text_font: "Shank text font",
  shank_text_around: "Shank text around",
  shank_detail_depth: "Shank decoration depth",
  ligature_text_font: "Ligature text font",
  cap_text_font: "Cap text font",
  lettering_tip_clearance: "Lettering distance from the tip",
  top_image_aspect: "Picture height / width",
  ligature_fit: "Gap to the body",
  ligature_wall: "Wall thickness",
  ligature_image_aspect: "Picture height / width",
  cap_end_vent_size: "End hole size",
  cap_slot_length: "Slot length",
  cap_slot_width: "Slot width",
  cap_end_gap: "Space at the end",
  cap_wall: "Wall thickness",
  cap_image_aspect: "Picture height / width",
  min_wall: "Thinnest wall",
  render_fn: "Smoothness",
  print_orientation: "Download standing on its neck end",
};
export const paramLabel = (name: string) => {
  const words = name.replace(/_/g, " ");
  return DESIGN_ITEMS.get(name)?.label ?? LABELS[name] ?? words.charAt(0).toUpperCase() + words.slice(1);
};
export const paramUnit = (name: string) => DESIGN_ITEMS.get(name)?.unit;
// What each end of a slider does, in words under it (low end, high end), so the direction is clear
// before touching it. Only for settings with a direction; measurements (a cork diameter) have none.
const SHORT_LONG: [string, string] = ["Short", "Long"],
  NARROW_WIDE: [string, string] = ["Narrow", "Wide"],
  THIN_THICK: [string, string] = ["Thin", "Thick"],
  SMALL_LARGE: [string, string] = ["Small", "Large"],
  SHALLOW_DEEP: [string, string] = ["Shallow", "Deep"],
  ALONG: [string, string] = ["Toward the shank", "Toward the tip"];
const ENDS: Record<string, [string, string]> = {
  // Tip & facing
  tip_opening: ["Closed", "Open"],
  facing_length: SHORT_LONG,
  tip_rail_thickness: THIN_THICK,
  side_rail_width: NARROW_WIDE,
  facing_exponent: ["Opens early", "Opens late"],
  tip_curve: ["Flat", "Round"],
  table_length: SHORT_LONG,
  table_width_tip: NARROW_WIDE,
  table_width_rear: NARROW_WIDE,
  table_concavity: ["Flat", "Hollow"],
  // Fit on the horn
  shank_clearance: ["Loose", "Tight"],
  shank_depth: SHALLOW_DEEP,
  shank_bevel: ["None", "Wide"],
  shank_bevel_depth: SHORT_LONG,
  bore_diameter: NARROW_WIDE,
  bore_tilt: ["Flatter", "Steeper"],
  // Chamber & baffle
  chamber_width_extra: ["Narrower", "Wider"],
  throat_width: NARROW_WIDE,
  baffle_height: ["Away from the reed", "Toward the reed"],
  baffle_hump: ["None", "Big"],
  window_width: NARROW_WIDE,
  chamber_height: ["Low (0 = round)", "Tall"],
  chamber_flare: ["Quickly", "Slowly"],
  chamber_full_length: SHORT_LONG,
  floor_shape: ["Drops early (deeper)", "Stays high (ramp)"],
  throat_position: ALONG,
  throat_taper: ["Abrupt", "Gradual"],
  baffle_start: ALONG,
  baffle_curve: ["Drops early", "Drops late"],
  baffle_texture_depth: ["Subtle", "Pronounced"],
  baffle_texture_spacing: ["Close together", "Far apart"],
  window_length: SHORT_LONG,
  window_taper: ["Straight", "Tapered"],
  window_rear_radius: ["Square", "Round"],
  sidewall_angle: ["Lean in", "Lean out (scooped)"],
  // Body & beak
  overall_length: SHORT_LONG,
  beak_tip_height: ["Low", "High"],
  beak_curve: ["Full", "Scooped"],
  beak_length: ["Short beak", "Long beak"],
  shoulder_smoothness: ["Crisp", "Smooth"],
  beak_squareness: ["Ridged", "Flat"],
  beak_top_width: NARROW_WIDE,
  underside_squareness: ["Tucked in", "Straight"],
  body_width: NARROW_WIDE,
  body_height: ["Low", "Tall"],
  body_squareness: ["Pointed", "Boxy"],
  shoulder_sweep: ["Straight across", "Swept"],
  shank_diameter: ["Slim", "Thick"],
  // Personalize
  top_text_size: SMALL_LARGE,
  top_text_position: ALONG,
  top_image_width: SMALL_LARGE,
  top_image_position: ALONG,
  side_text_size: SMALL_LARGE,
  side_text_position: ALONG,
  side_text_vertical: ["Down", "Up"],
  shank_text_size: SMALL_LARGE,
  shank_text_around: ["Left side", "Right side"],
  shank_detail_count: ["Few", "Many"],
  shank_detail_position: ["By the neck end", "By the flare"],
  shank_detail_depth: SHALLOW_DEEP,
  lettering_depth: SHALLOW_DEEP,
  lettering_tip_clearance: ["Near the tip", "Far back"],
  // Ligature
  ligature_reed_grip: ["Light", "Tight"],
  ligature_length: SHORT_LONG,
  ligature_position: ["Toward the tip", "Toward the shank"],
  ligature_tongue: ["None", "Long"],
  ligature_fit: ["Snug", "Loose"],
  ligature_wall: THIN_THICK,
  ligature_text_size: SMALL_LARGE,
  ligature_image_width: SMALL_LARGE,
  ligature_lettering_position: ALONG,
  // Cap
  cap_grip: ["None", "Tight"],
  cap_end_dome: ["Low dome", "Full dome"],
  cap_rim_bead: ["None", "Big"],
  cap_extend: ["None", "Whole mouthpiece"],
  cap_slot_length: ["None", "Long"],
  cap_slot_width: NARROW_WIDE,
  cap_end_vent_size: SMALL_LARGE,
  cap_side_vent_count: ["Fewer", "More"],
  cap_side_vent_size: SMALL_LARGE,
  cap_side_vent_gap: ["Close together", "Far apart"],
  cap_end_gap: ["Close", "Roomy"],
  cap_wall: THIN_THICK,
  cap_metal_length: SHORT_LONG,
  cap_metal_position: ["Toward the tip", "Toward the shank"],
  cap_metal_proud: THIN_THICK,
  cap_metal_screw_width: NARROW_WIDE,
  cap_metal_screw_length: SHORT_LONG,
  cap_text_size: SMALL_LARGE,
  cap_image_width: SMALL_LARGE,
  cap_lettering_position: ALONG,
  // Printing
  print_stock: ["None", "More"],
  min_wall: THIN_THICK,
  render_fn: ["Faster", "Smoother"],
};
export const paramEnds = (name: string) => ENDS[name];
// Dropdown values in words, the same everywhere: the curated rows' labels, then these for the
// settings under More, else the value itself, capitalised ("shank_test_ring" -> "Shank test ring").
const OPTION_LABELS: Record<string, Record<string, string>> = {
  facing_model: { power: "Power curve", arc: "Radius", gauge: "Gauge points" },
  throat_shape: { chamber: "Same as the chamber" },
  ...Object.fromEntries(
    ["top_text_font", "side_text_font", "shank_text_font", "ligature_text_font", "cap_text_font"].map((n) => [
      n,
      { same: "Same as Font" },
    ]),
  ),
};
export const optionLabel = (name: string, value: string, fileName = value) => {
  const words = fileName.replace(/_/g, " ");
  return (
    DESIGN_ITEMS.get(name)?.optionLabels?.[value] ??
    OPTION_LABELS[name]?.[value] ??
    words.charAt(0).toUpperCase() + words.slice(1)
  );
};
// How many settings a design changes, as Reset counts them: a dragged facing curve sets its points
// and the facing model that goes with them, one change.
export const changedCount = (values: Record<string, unknown>) =>
  Object.keys(values).filter((k) => !(k === "facing_model" && "facing_gauge_points" in values)).length;
// Parameters that do nothing with the current settings, and why (shown dimmed).
// get(name) = the parameter's current value (undefined if the file doesn't declare it).
type Getter = (name: string) => unknown;
const filled = (v: unknown) => (typeof v === "string" && v !== "") || (Array.isArray(v) && v.length > 0);
// A picture set to "same" (the ligature's and cap's) counts when the mouthpiece has a top picture.
const anyText = (get: Getter, names: string[]) =>
  names.some((n) => filled(get(n) === "same" ? get("top_image") : get(n)));
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
  baffle_texture_style: (get) => (get("baffle_texture") === "none" ? "no baffle texture" : null),
  baffle_texture_depth: (get) => (get("baffle_texture") === "none" ? "no baffle texture" : null),
  baffle_texture_spacing: (get) => (get("baffle_texture") === "none" ? "no baffle texture" : null),
  floor_shape: (get) => (filled(get("floor_points")) ? "your own floor (floor_points) sets it" : null),
  // it shapes the stretch between the throat and the window (as the generator's chamber_weight)
  chamber_height: (get) =>
    Number(get("overall_length")) - Number(get("window_length")) - Number(get("throat_position")) < 3
      ? "the window starts right after the throat: Baffle height sets the height there"
      : null,
  baffle_type: (get) => (filled(get("baffle_points_custom")) ? "your own baffle (baffle_points_custom) wins" : null),
  shank_bevel_depth: (get) =>
    Number(get("shank_bevel")) > 0 ? null : "the opening has no lead-in (Lead-in at the opening is 0)",
};
// The lettering settings do nothing without something to letter (same rule as the sections' showIf).
for (const i of DESIGN_SECTIONS.flatMap((s) => s.items)) {
  if (i.showIf && !INACTIVE[i.name])
    INACTIVE[i.name] = (get) => (anyText(get, i.showIf!) ? null : "no text or picture to apply it to");
}
for (const n of ["lettering_depth", "lettering_tip_clearance", "side_text_vertical", "top_image_aspect"]) {
  const on = ["top_text", "top_image", "side_text_right", "side_text_left"];
  if (n === "lettering_depth") on.push("shank_text", "ligature_text", "ligature_image", "cap_text", "cap_image");
  INACTIVE[n] = (get) => (anyText(get, on) ? null : "no text or picture to apply it to");
}
INACTIVE.ligature_image_aspect = (get) =>
  get("ligature_image") === "same"
    ? "follows the mouthpiece's picture"
    : anyText(get, ["ligature_image"])
      ? null
      : "no picture on the ligature";
// Each text's own font only counts with that text.
for (const [n, texts] of [
  ["top_text_font", ["top_text"]],
  ["side_text_font", ["side_text_right", "side_text_left"]],
  ["shank_text_font", ["shank_text"]],
  ["shank_text_around", ["shank_text"]],
  ["ligature_text_font", ["ligature_text"]],
  ["cap_text_font", ["cap_text"]],
] as [string, string[]][])
  INACTIVE[n] = (get) => (anyText(get, texts) ? null : "no text to apply it to");
INACTIVE.shank_detail_position = (get) => (Number(get("shank_detail_count")) === 1 ? null : "only with one ring");
INACTIVE.shank_detail_depth = (get) =>
  get("shank_detail") && get("shank_detail") !== "none" ? null : "no shank decoration";
INACTIVE.cap_image_aspect = (get) =>
  get("cap_image") === "same"
    ? "follows the mouthpiece's picture"
    : anyText(get, ["cap_image"])
      ? null
      : "no picture on the cap";
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
// A variant's one-line description, from its file's header ('// Alto "Flamma": a variant of alto.scad ...'
// then "// Flamma: closer tip, ..."): "Flamma, compared with the Alto preset: closer tip, ...".
export const fileAbout = (source: string) => {
  const m = /^\/\/ (\w+) "(\w+)": a variant of [^\n]*\n\/\/ \w+: ([^\n]+)/.exec(source);
  return m ? `${m[2]}, compared with the ${m[1]} preset: ${m[3].trim()}` : undefined;
};
// A description where the control differs from the file's (tip in thousandths).
export const paramCaption = (name: string) => DESIGN_ITEMS.get(name)?.caption;
// Whether a file has any of the curated parameters (a mouthpiece file, not a scratch file).
export const hasDesignParams = (names: string[]) => names.some((n) => DESIGN_ITEMS.has(n));
