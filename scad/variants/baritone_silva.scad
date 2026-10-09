// Baritone "Silva": a variant of baritone.scad (its outline, changed by settings only).
// Silva: more open tip, square chamber, rollover baffle, thin tip rail; boxy body, set-back shoulder, flat straight beak, knurled shank.
// Geometry: lib/mouthpiece_base.scad.

include <../lib/mouthpiece_base.scad>  // geometry + defaults; everything below overrides it (keep this line first)

/* [Shank] */
// Your neck cork's diameter (mm), measured with calipers.
neck_cork_diameter = 18.0; // [10:0.05:27]
// How much smaller than your cork the socket is (mm): bigger = tighter. Try 0.1-0.3.
shank_clearance = 0.2; // [0:0.01:0.6]
// How much wider the socket's mouth is, per side (mm), to ease it onto the cork.
shank_bevel = 1.0; // [0:0.1:3]
// How far in the socket's lead-in goes (mm).
shank_bevel_depth = 1.0; // [0.2:0.1:20]
// How far the cork goes in (mm). Other settings give way to keep it.
shank_depth = 30.0; // [10:0.5:70]
// Diameter of the tube behind the socket (mm), about your neck tip's inside diameter.
bore_diameter = 16.9; // [8:0.1:24]
// Angle between the neck's line and the reed table (degrees); about 4 is typical.
bore_tilt = 4.8; // [-3:0.1:8]
// Outside diameter of the shank at the neck end (mm); grows if the wall gets too thin.
shank_diameter = 24.8; // [14:0.1:32]

/* [Chamber] */
// Cross-section of the chamber after the throat.
chamber_shape = "square"; // [round, square, horseshoe]
// Chamber width vs the throat's (mm): 0 = as wide, + wider (a larger chamber), - narrower.
chamber_width_extra = 0.6; // [-1:0.1:12]
// How gradually the chamber widens after the throat: low = quickly, high = slowly.
chamber_flare = 0.4; // [0.1:0.05:0.9]
// How far the full width runs toward the tip (mm); 40 = as far as it can.
chamber_full_length = 40; // [0:0.5:40]
// Chamber height before the window (mm); 0 = round. More lowers the floor, less raises it.
chamber_height = 17.6; // [0:0.1:30]
// Floor from throat to window: - drops early (deeper), + stays high (a ramp).
floor_shape = 0; // [-1:0.05:1]
// Where the throat (the narrowest point inside) sits, from the neck end (mm).
throat_position = 86.5; // [20:0.5:90]
// Width of the throat, the narrowest point inside (mm).
throat_width = 14.8; // [5:0.1:24]
// Length of the bore's narrowing into the throat (mm). Short = an abrupt step.
throat_taper = 55; // [1:0.5:80]
// Throat cross-section; "chamber" = the same as the chamber.
throat_shape = "square"; // [chamber, round, square, horseshoe]

/* [Baffle] */
// The roof's shape over the reed (see the picture); Original = the preset's own.
baffle_type = "rollover"; // [measured, flat, rollover, step, concave]
// Moves the baffle toward the reed (+) or away from it (-) (mm).
baffle_height = 0.6; // [-3:0.1:4]
// Moves where the baffle begins, toward the tip (+) or the neck (-) (mm).
baffle_start = 0; // [-15:0.5:15]
// Bends the baffle: - comes down early, + stays up and drops late.
baffle_curve = -0.7; // [-1:0.05:1]
// Height of a smooth hump on the baffle just behind the tip (mm).
baffle_hump = 0.4; // [0:0.1:3]

/* [Window] */
// Length of the opening under the reed (mm).
window_length = 54.3; // [8:0.5:70]
// Width of the opening under the reed (mm); kept inside the rails automatically.
window_width = 17.2; // [6:0.1:22]
// How much narrower the window is at the back (mm).
window_taper = 4.3; // [0:0.1:12]
// Rounding of the window's back corners (mm).
window_rear_radius = 3; // [0:0.1:10]
// Chamber side walls over the window (degrees): + lean out (scooped), - lean in.
sidewall_angle = -4; // [-20:1:30]
// Width of the side rails the reed seals on (mm).
side_rail_width = 1.0; // [0.8:0.05:2.5]
// Thickness of the tip rail (mm).
tip_rail_thickness = 1.5; // [0.3:0.02:3]
// How round the tip is, seen from above: how far back its curve reaches (mm).
tip_curve = 4.3; // [0.5:0.1:12]

/* [Table] */
// Width of the reed seat at the tip (mm). Match your reed.
table_width_tip = 19.5; // [8:0.1:30]
// Width of the reed seat at the back (mm). Match your reed's heel.
table_width_rear = 13.9; // [8:0.1:30]
// From the tip to the table's back end (mm), facing included; longer than the reed is normal.
table_length = 101.5; // [50:0.5:120]
// A slight hollow along the reed seat (mm) so the reed seals at both ends.
table_concavity = 0; // [0:0.005:0.1]

/* [Facing] */
// Gap at the tip, from the tip rail to a straightedge on the table (mm).
tip_opening = 2.92; // [0.5:0.01:4.5]
// From the tip back to the break, where the rails leave the flat table (mm).
facing_length = 29.5; // [10:0.1:45]
// How the facing curves (the chart's buttons set it too): Power curve, Radius or Gauge points.
facing_model = "power"; // [power, arc, gauge]
// For the Power curve: 2 opens evenly; lower opens sooner, higher later.
facing_exponent = 1.8; // [1.5:0.05:3]

/* [Exterior] */
// Total length, neck end to tip (mm). Also changes the inside volume.
overall_length = 142; // [55:0.1:160]
// Widest outside width of the body, side to side (mm).
body_width = 31.7; // [18:0.1:40]
// Height of the body's top above the reed table, at its tallest (mm).
body_height = 29.3; // [18:0.1:40]
// Height of the beak at the tip (mm).
beak_tip_height = 4.5; // [2:0.1:8]
// Body cross-section: 2 = round, higher = boxier, lower = pointed sides.
body_squareness = 3.2; // [1.2:0.1:8]
// The beak's top, seen from the tip: ridged (a peak along it) or flat.
beak_squareness = 3; // [1.2:0.1:8]
// The beak's line from the side: full (bulging) or scooped (hollowed).
beak_curve = 0; // [-1:0.05:1]
// Moves the shoulder (the chart's shoulder dot) back for a longer beak, forward for shorter (mm).
beak_length = -4.5; // [-15:0.5:15]
// 0 = a crisp step (as designed), 1 = a smooth, gradual drop into the beak.
shoulder_smoothness = 0; // [0:0.05:1]
// How wide the beak's top is: - narrower, rounder top; + wider, fuller top. 0 = as designed.
beak_top_width = 0.5; // [-1:0.05:1]
// How far the shoulder line runs down the sides toward the tip (mm); 0 = straight across.
shoulder_sweep = 10; // [0:0.5:20]
// The lower sides near the tip, seen from the tip: tucked in (curved) or straight down.
underside_squareness = 2.2; // [1.2:0.1:8]

/* [Lettering] */
// Text on top (empty = none), several lines OK; {tip} puts in the tip size.
top_text = "";
// Letter height (mm).
top_text_size = 5; // [2:0.5:20]
// Which way the text reads: along the mouthpiece or across it (flipped = upside down).
top_text_angle = 90; // [0:90:270]
// Moves the top text toward the tip (+) or the shank (-) (mm).
top_text_position = 0; // [-50:0.5:50]
// A picture (SVG file) on top; solid shapes work, thin line drawings don't.
top_image = "element_leaf.svg";
// Picture width (mm).
top_image_width = 14; // [4:0.5:90]
// Picture height / width, for spacing (the app fills it in).
top_image_aspect = 1; // [0.1:0.01:10]
// Picture rotation (degrees).
top_image_angle = 0; // [0:15:345]
// Moves the picture toward the tip (+) or the shank (-) (mm).
top_image_position = -9; // [-50:0.5:50]
// Wrap the picture around the body like a label.
top_image_wrap = false;
// Text on the right side (seen from above, tip away). Lines, variables as on top.
side_text_right = "SILVA";
// Text on the left side.
side_text_left = "\u007Btip} \u007Bvoice_letter}";
// Side letter height (mm).
side_text_size = 6.5; // [1.5:0.5:10]
// Side text from just behind the ligature: + toward the tip, - toward the shank (mm).
side_text_position = 0; // [-50:0.5:50]
// Moves the side text up (+) or down (-) (mm).
side_text_vertical = 0; // [-10:0.5:10]
// Ligature and cap lettering; the mouthpiece's is always engraved (the ligature slides over it).
lettering_style = "engraved"; // [engraved, raised]
// How deep the letters go, or how far they stand out (mm).
lettering_depth = 0.5; // [0.2:0.05:1.5]
// Typeface. Keep script faces 5mm or taller.
lettering_font = "Bebas Neue"; // [Sans Bold, Sans, Serif Bold, Serif, Serif Italic, Mono Bold, Bebas Neue, Marcellus SC, Rozha One, Alfa Slab One, Audiowide, Black Ops One, Lobster, Pacifico, Kaushan Script]
// Keeps lettering this far back from the tip (mm).
lettering_tip_clearance = 22; // [5:0.5:60]
// The top text's own typeface; same = the Font above.
top_text_font = "same"; // [same, Sans Bold, Sans, Serif Bold, Serif, Serif Italic, Mono Bold, Bebas Neue, Marcellus SC, Rozha One, Alfa Slab One, Audiowide, Black Ops One, Lobster, Pacifico, Kaushan Script]
// The side texts' own typeface; same = the Font above.
side_text_font = "same"; // [same, Sans Bold, Sans, Serif Bold, Serif, Serif Italic, Mono Bold, Bebas Neue, Marcellus SC, Rozha One, Alfa Slab One, Audiowide, Black Ops One, Lobster, Pacifico, Kaushan Script]
// Text around the shank's round band at the neck end (empty = none); variables as on top.
shank_text = "";
// Shank letter height (mm); the band is short, so keep it small.
shank_text_size = 3; // [1.5:0.5:8]
// Where around the shank the text is centred (degrees): 0 = top, 90 = right, -90 = left.
shank_text_around = 0; // [-180:15:180]
// The shank text's own typeface; same = the Font above.
shank_text_font = "same"; // [same, Sans Bold, Sans, Serif Bold, Serif, Serif Italic, Mono Bold, Bebas Neue, Marcellus SC, Rozha One, Alfa Slab One, Audiowide, Black Ops One, Lobster, Pacifico, Kaushan Script]
// Decoration on the shank's band: rounded rings, V flutes along it, a spiral or knurling.
shank_detail = "knurled"; // [none, rings, flutes, spiral, knurled]
// Shank decoration cut in (engraved) or standing out (raised).
shank_detail_style = "raised"; // [engraved, raised]
// How many rings (as many as fit), flutes, spiral starts (up to 4) or knurl lines each way.
shank_detail_count = 16; // [1:1:40]
// Where a single ring sits: 0 = by the neck end, 1 = by the flare.
shank_detail_position = 0.25; // [0:0.05:1]
// How deep the rings or flutes go, or how far they stand out (mm); 1.2mm of wall stays.
shank_detail_depth = 0.6; // [0.3:0.05:1.2]

/* [Profile overrides] */
// Only with your own top outline: bore height at the neck end (mm).
bore_axis_height = 14.5; // [4:0.1:30]
// Advanced: outside width along the length, [[distance, width], ...]; [] = built-in.
ext_width_points = [];
// Advanced: top outline along the length, [[distance, height], ...].
ext_top_points = [];
// Advanced: underside behind the table, [[distance, height], ...].
ext_bottom_points = [];
// Advanced: height of each section's widest point, [[distance, height], ...].
ext_widest_points = [];
// Advanced: squareness of the upper outside, [[distance, squareness], ...].
ext_top_squareness_points = [];
// Advanced: squareness of the lower outside, [[distance, squareness], ...].
ext_bottom_squareness_points = [];
// Advanced: reed seat width along the length, [[distance, width], ...].
table_width_points = [];
// Advanced: inside width along the length, [[distance, width], ...].
interior_width_points = [];
// Advanced: squareness of the upper inside, [[distance, squareness], ...].
interior_top_squareness_points = [];
// Advanced: squareness of the lower inside, [[distance, squareness], ...].
interior_bottom_squareness_points = [];
// Advanced: floor to the window (can start before the throat), [[distance, height], ...].
floor_points = [];
// Advanced: your own baffle, [[distance, height above the table], ...]; wins over the shape.
baffle_points_custom = [];
// Advanced: your own facing (Gauge), [[mm from the tip, gap], ...].
facing_gauge_points = [];
// Shape edits (the app's "Edit shape"): mm added to the outline after the sliders, so the sliders
// keep working, [[fraction of the length, mm], ...]; 0 at both ends unless given there.
top_adjust = [];
underside_adjust = [];
width_adjust = [];
baffle_adjust = [];
floor_adjust = [];
chamber_width_adjust = [];

/* [Manufacturing] */
// Thinnest wall allowed (mm). The inside shrinks to keep it.
min_wall = 2.0; // [1.2:0.1:4]
// Extra on the table and facing to sand flat after printing (mm); try 0.1-0.2.
print_stock = 0; // [0:0.01:0.5]

/* [Ligature] */
// A ligature is made for this design (the app shows it and offers its download).
ligature_made = false;
// Length of the ligature band along the mouthpiece (mm), on its short side.
ligature_length = 12; // [6:0.5:30]
// Band's front edge (mm): 0 = just behind the window, minus = over the window.
ligature_position = 2; // [-10:0.5:40]
// Band thickness (mm): thinner flexes onto it more easily, thicker grips harder.
ligature_wall = 2.0; // [1.2:0.1:5]
// D hugs the reed flat underneath; Round is a plain ring; Follows takes the body's shape.
ligature_shape = "d"; // [d, round, conform]
// A tail on one side, running toward the shank (mm); 0 = a straight band.
ligature_tongue = 7; // [0:0.5:15]
// Which side the tail runs along: the top, or under the reed.
ligature_tongue_side = "top"; // [top, reed]
// Gap between the band and the mouthpiece's body (mm); the reed is squeezed instead.
ligature_fit = 0.1; // [-0.4:0.05:0.5]
// How hard the band presses the reed onto the table (mm): bigger = tighter.
ligature_reed_grip = 0.2; // [0:0.05:0.6]
// Text on the ligature's top (empty = none). Lines, variables as on the top text.
ligature_text = "";
// The ligature text's own typeface; same = the Font in Personalize.
ligature_text_font = "same"; // [same, Sans Bold, Sans, Serif Bold, Serif, Serif Italic, Mono Bold, Bebas Neue, Marcellus SC, Rozha One, Alfa Slab One, Audiowide, Black Ops One, Lobster, Pacifico, Kaushan Script]
// Ligature letter height (mm).
ligature_text_size = 4; // [2:0.5:12]
// Which way the ligature's text reads: along or across (flipped = upside down).
ligature_text_angle = 90; // [0:90:270]
// A picture (SVG file) on the ligature; same = the mouthpiece's top picture; empty = none.
ligature_image = "same";
// Ligature picture width (mm).
ligature_image_width = 8; // [3:0.5:30]
// Picture height / width, for spacing (the app fills it in).
ligature_image_aspect = 1; // [0.1:0.01:10]
// Ligature picture rotation (degrees).
ligature_image_angle = 0; // [0:15:345]
// Moves the ligature's text and picture toward the tip (+) or the shank (-) (mm).
ligature_lettering_position = 0; // [-15:0.5:15]

/* [Cap] */
// A cap is made for this design (the app shows it and offers its download).
cap_made = false;
// What the cap goes over: the ligature made for this design, or a metal one.
cap_ligature = "printed"; // [printed, metal]
// How hard the rim squeezes the ligature (mm): bigger = tighter; 0 = no squeeze.
cap_grip = 0.15; // [0:0.05:0.5]
// Side of the slot up from the rim, and of a metal ligature's screws: under the reed or on top.
cap_slot_side = "reed"; // [reed, top]
// Slot up from the rim, for air and so the rim clips on: length (mm); 0 = none.
cap_slot_length = 30; // [0:1:80]
// Slot width (mm).
cap_slot_width = 3; // [1:0.5:8]
// Air holes through the closed end, in a row (0 = none).
cap_end_vents = 3; // [0:1:7]
// End hole diameter (mm).
cap_end_vent_size = 2; // [1:0.5:4]
// Air vents on both sides, between the rim and the tip: slots along the cap, round holes, or none.
cap_side_vents = "slots"; // [none, slots, holes]
// How many vents on each side (slots stack up the side, holes run along it).
cap_side_vent_count = 2; // [1:1:5]
// Vent width, or a hole's diameter (mm).
cap_side_vent_size = 2.5; // [1.5:0.5:5]
// Wall thickness (mm).
cap_wall = 1.6; // [1.2:0.1:4]
// Follows the mouthpiece (smoothed), or round.
cap_shape = "conform"; // [conform, round]
// Lengthens the cap toward the shank (mm); the most covers the whole mouthpiece.
cap_extend = 0; // [0:1:120]
// Space between the tip and the inside of the closed end (mm).
cap_end_gap = 4; // [1:0.5:20]
// Closed end's shape: 0 = flat, 1 = a full dome as tall as the end gap.
cap_end_dome = 1; // [0:0.1:1]
// Text on the cap's top (empty = none). Lines, variables as on the top text.
cap_text = "";
// The cap text's own typeface; same = the Font in Personalize.
cap_text_font = "same"; // [same, Sans Bold, Sans, Serif Bold, Serif, Serif Italic, Mono Bold, Bebas Neue, Marcellus SC, Rozha One, Alfa Slab One, Audiowide, Black Ops One, Lobster, Pacifico, Kaushan Script]
// Cap letter height (mm).
cap_text_size = 5; // [2:0.5:14]
// Which way the cap's text reads: along or across (flipped = upside down).
cap_text_angle = 0; // [0:90:270]
// A picture (SVG file) on the cap; same = the mouthpiece's top picture; empty = none.
cap_image = "same";
// Cap picture width (mm).
cap_image_width = 10; // [3:0.5:40]
// Picture height / width, for spacing (the app fills it in).
cap_image_aspect = 1; // [0.1:0.01:10]
// Cap picture rotation (degrees).
cap_image_angle = 0; // [0:15:345]
// Moves the cap's text and picture toward the tip (+) or the shank (-) (mm).
cap_lettering_position = 0; // [-30:0.5:30]
// Metal ligature: band length along the mouthpiece (mm).
cap_metal_length = 16; // [6:0.5:30]
// Metal ligature: front edge, mm behind the window's back end.
cap_metal_position = 2; // [-10:0.5:25]
// Metal ligature: how far the band stands out of the body all round (mm).
cap_metal_proud = 1.2; // [0:0.1:4]
// Metal ligature: width of its screws and their posts, across (mm); the slot widens to clear it.
cap_metal_screw_width = 14; // [4:0.5:30]
// Metal ligature: length of the screw block along the mouthpiece (mm).
cap_metal_screw_length = 12; // [4:0.5:30]

/* [Output] */
// What to make: the mouthpiece, a shank test ring, a ligature, a cap, or debug pieces.
part = "mouthpiece"; // [mouthpiece, shank_test_ring, ligature, cap, ligature_seated, cap_seated, reed_model, ligature_clash, cap_clash, metal_ligature_model, interior_only, debug_exterior, debug_interior, debug_window_cutter, debug_window_only, debug_window_planform, debug_facing_cutter, debug_facing_only, debug_ext_minus_interior, debug_ext_minus_window, debug_ext_minus_facing, clearance_report, facing_report]
// Overrides the Quality menu once changed: higher is smoother but slower; 64 prints fine.
render_fn = 64; // [16:8:128]
// Stand it on its neck end, as printed. Off: lie it on the reed table.
print_orientation = true;

/* [Hidden] */

// The design's name and its voice, for the lettering variables {title}, {voice} and
// {voice_letter} (the app fills design_title in from the design's name).
design_title = "";
voice = "Baritone";

// Built-in outline, [[fraction of L, value], ...] joined by PCHIP (rounded, hand-smoothed caliper-
// style stations measured from a real mouthpiece; the base file's are the alto's): full width,
// top, underside behind the table (the table cut takes over after it), height of the section's
// widest point, top and underside squareness, and the "medium" baffle. Shape: short tenon, quick
// flare to the widest body, near-flat top, a steep shoulder at ~60% of the length (where the
// section gets boxier), then a straight beak to a thin, WIDE tip. Any ext_*_points override
// replaces the matching curve.
shape_width = [[0, 24.1], [0.125, 24.2], [0.149, 24.34], [0.173, 25.09], [0.198, 26.61], [0.222, 28.7], [0.246, 30.73], [0.27, 31.7], [0.35, 30.8], [0.51, 29.2], [0.86, 25.3], [1, 21.4]];
shape_top = [[0, 29.2], [0.185, 28.3], [0.199, 28.34], [0.213, 28.56], [0.228, 29.01], [0.242, 29.62], [0.256, 30.22], [0.27, 30.5], [0.315, 29.7], [0.375, 28.6], [0.465, 27.0], [0.535, 25.7], [0.61, 24.3], [0.655, 23.5], [0.69, 20.1], [0.75, 16.6], [0.825, 12.9], [1, 4.8]];
shape_bottom = [[0, 6.4], [0.185, 3.2], [0.255, 1.3], [0.285, 0]];
shape_widest = [[0, 17.5], [0.17, 15.8], [0.24, 15.6], [0.253, 15.55], [0.267, 15.28], [0.28, 14.84], [0.293, 14.39], [0.307, 14.12], [0.32, 14.07], [0.4, 13.2], [0.47, 12.1], [0.57, 11.1], [0.755, 8.8], [0.85, 7.8], [0.875, 7.25], [0.9, 6.46], [0.925, 5.54], [0.95, 4.61], [0.965, 4.1]];
shape_top_squareness = [[0, 1.9], [0.66, 1.9], [0.72, 2.5], [0.866, 1.6], [1, 1.4]];
shape_bottom_squareness = [[0, 1.9], [0.52, 1.8], [0.958, 1.2], [1, 1.2]];
shape_baffle = [[0.609, 17.6], [0.683, 14.2], [0.736, 9.9], [0.75, 8.7], [0.824, 6.8], [0.901, 4.8], [0.982, 3.1]];
// Commercial tip-opening range for this instrument — only used for a validate() warning (mm).
tip_opening_range = [1.80, 3.90];
// Smallest baffle-to-reed gap near the throat (mm); only warns.
min_airgap = 0.5;
