// Saxophone mouthpiece generator — BASE FILE: every parameter (with alto defaults), the shape
// math, and all geometry. How it is built: docs/dev/GEOMETRY.md.
//
// Use it through a voice file (scad/alto.scad, tenor.scad, baritone.scad, soprano.scad, or your own
// design): each one does `include <lib/mouthpiece_base.scad>` FIRST and then assigns its own
// values — OpenSCAD uses the last assignment of a variable everywhere, so the voice file's values
// win, and its Customizer shows its own (annotated) parameter block. Rendering this file directly
// gives the alto. scripts/sync_voice_files.mjs regenerates the voice files' parameter blocks from
// the annotations below (keeping each file's values); scripts/bundle_scad.mjs flattens a voice file
// into one self-contained file (for the web app).
//
// Coordinates: Z = bore axis (0 = shank end, L = tip), Y = height (0 = table
// plane, body above), X = width (symmetric about x = 0).
//
// Profile overrides (tab "Profile overrides"): each *_points parameter is a list of [z, value]
// pairs (z from the shank end) joined by a smooth monotone cubic (PCHIP). [] keeps the built-in
// shape. Together they contour the body, table, chamber and baffle to nearly any real mouthpiece.
// The Customizer can't edit nested lists: use the app's Exact points, or set them in the file or
// with -D.
//
// File layout:
//   1. Parameters (Customizer) + shape tables (Hidden)   6. Interior profile
//   2. Curve math (PCHIP etc.)                            7. Validation, readouts, air volume
//   3. Derived dimensions, facing curve                   8. Solids (ring lofts, cutters,
//   4. Exterior profile                                      lettering), 8b. Ligature
//   5. Window planform + baffle                           9. Assembly and part selection

// Lettering fonts (see LETTERING_FONTS); use<> of a font file only registers it. The Liberation
// faces also come with desktop OpenSCAD, but not with its WebAssembly build (where a missing font
// crashes the render), so they're registered from here too.
use <fonts/LiberationSans-Regular.ttf>
use <fonts/LiberationSans-Bold.ttf>
use <fonts/LiberationSerif-Regular.ttf>
use <fonts/LiberationSerif-Bold.ttf>
use <fonts/LiberationSerif-Italic.ttf>
use <fonts/LiberationMono-Bold.ttf>
use <fonts/BebasNeue-Regular.ttf>
use <fonts/MarcellusSC-Regular.ttf>
use <fonts/RozhaOne-Regular.ttf>
use <fonts/AlfaSlabOne-Regular.ttf>
use <fonts/Audiowide-Regular.ttf>
use <fonts/BlackOpsOne-Regular.ttf>
use <fonts/Lobster-Regular.ttf>
use <fonts/Pacifico-Regular.ttf>
use <fonts/KaushanScript-Regular.ttf>

// ===========================================================================================
// 1. Parameters (Customizer)
// ===========================================================================================

/* [Shank] */
// Your neck cork's diameter (mm), measured with calipers.
neck_cork_diameter = 16.2; // [10:0.05:27]
// How much smaller than your cork the socket is (mm): bigger = tighter. Try 0.1-0.3.
shank_clearance = 0.2; // [0:0.01:0.6]
// How much wider the socket's mouth is, per side (mm), to ease it onto the cork.
shank_bevel = 1.0; // [0:0.1:3]
// How far in the socket's lead-in goes (mm).
shank_bevel_depth = 1.0; // [0.2:0.1:20]
// How far the cork goes in (mm). Other settings give way to keep it.
shank_depth = 22.0; // [10:0.5:70]
// Diameter of the tube behind the socket (mm), about your neck tip's inside diameter.
bore_diameter = 15.6; // [8:0.1:24]
// Angle between the neck's line and the reed table (degrees); about 4 is typical.
bore_tilt = 4.4; // [-3:0.1:8]
// Outside diameter of the shank at the neck end (mm); grows if the wall gets too thin.
shank_diameter = 22.0; // [14:0.1:32]

/* [Chamber] */
// Cross-section of the chamber after the throat.
chamber_shape = "horseshoe"; // [round, square, horseshoe]
// Chamber width vs the throat's (mm): 0 = as wide, + wider (a larger chamber), - narrower.
chamber_width_extra = 0.4; // [-1:0.1:12]
// How gradually the chamber widens after the throat: low = quickly, high = slowly.
chamber_flare = 0.4; // [0.1:0.05:0.9]
// How far the full width runs toward the tip (mm); 40 = as far as it can.
chamber_full_length = 40; // [0:0.5:40]
// Chamber height before the window (mm); 0 = round. More lowers the floor, less raises it.
chamber_height = 0; // [0:0.1:30]
// Floor from throat to window: - drops early (deeper), + stays high (a ramp).
floor_shape = 0; // [-1:0.05:1]
// Where the throat (the narrowest point inside) sits, from the neck end (mm).
throat_position = 43.5; // [20:0.5:90]
// Width of the throat, the narrowest point inside (mm).
throat_width = 14.2; // [5:0.1:24]
// Length of the bore's narrowing into the throat (mm). Short = an abrupt step.
throat_taper = 6; // [1:0.5:80]
// Throat cross-section; "chamber" = the same as the chamber.
throat_shape = "chamber"; // [chamber, round, square, horseshoe]

/* [Baffle] */
// The roof's shape over the reed (see the picture); Original = the preset's own.
baffle_type = "measured"; // [measured, flat, rollover, step, concave]
// Moves the baffle toward the reed (+) or away from it (-) (mm).
baffle_height = 0; // [-3:0.1:4]
// Moves where the baffle begins, toward the tip (+) or the neck (-) (mm).
baffle_start = 0; // [-15:0.5:15]
// Bends the baffle: - comes down early, + stays up and drops late.
baffle_curve = 0; // [-1:0.05:1]
// Height of a smooth hump on the baffle just behind the tip (mm).
baffle_hump = 0; // [0:0.1:3]
// A texture cut into the baffle: grooves along it, grooves across it, or dimples.
baffle_texture = "none"; // [none, along, across, dimples]
// How deep the texture cuts (mm); less where the wall over it is thin.
baffle_texture_depth = 0.4; // [0.1:0.05:1]
// Distance between the grooves or dimples (mm).
baffle_texture_spacing = 3; // [1.5:0.1:8]

/* [Window] */
// Length of the opening under the reed (mm).
window_length = 39.0; // [8:0.5:70]
// Width of the opening under the reed (mm); kept inside the rails automatically.
window_width = 15.1; // [6:0.1:22]
// How much narrower the window is at the back (mm).
window_taper = 3.3; // [0:0.1:12]
// Rounding of the window's back corners (mm).
window_rear_radius = 5.5; // [0:0.1:10]
// Chamber side walls over the window (degrees): + lean out (scooped), - lean in.
sidewall_angle = 0; // [-20:1:30]
// Width of the side rails the reed seals on (mm).
side_rail_width = 1.0; // [0.8:0.05:2.5]
// Thickness of the tip rail (mm).
tip_rail_thickness = 2.0; // [0.3:0.02:3]
// How round the tip is, seen from above: how far back its curve reaches (mm).
tip_curve = 3.5; // [0.5:0.1:12]

/* [Table] */
// Width of the reed seat at the tip (mm). Match your reed.
table_width_tip = 16.8; // [8:0.1:30]
// Width of the reed seat at the back (mm). Match your reed's heel.
table_width_rear = 13.2; // [8:0.1:30]
// From the tip to the table's back end (mm), facing included; longer than the reed is normal.
table_length = 71.8; // [50:0.5:120]
// A slight hollow along the reed seat (mm) so the reed seals at both ends.
table_concavity = 0; // [0:0.005:0.1]

/* [Facing] */
// Gap at the tip, from the tip rail to a straightedge on the table (mm).
tip_opening = 1.93; // [0.5:0.01:4.5]
// From the tip back to the break, where the rails leave the flat table (mm).
facing_length = 23.8; // [10:0.1:45]
// How the facing curves (the chart's buttons set it too): Power curve, Radius or Gauge points.
facing_model = "power"; // [power, arc, gauge]
// For the Power curve: 2 opens evenly; lower opens sooner, higher later.
facing_exponent = 1.8; // [1.5:0.05:3]

/* [Exterior] */
// Total length, neck end to tip (mm). Also changes the inside volume.
overall_length = 89.3; // [55:0.1:160]
// Widest outside width of the body, side to side (mm).
body_width = 29.0; // [18:0.1:40]
// Height of the body's top above the reed table, at its tallest (mm).
body_height = 27.6; // [18:0.1:40]
// Height of the beak at the tip (mm).
beak_tip_height = 3.6; // [2:0.1:8]
// Body cross-section: 2 = round, higher = boxier, lower = pointed sides.
body_squareness = 2.0; // [1.2:0.1:8]
// The beak's top, seen from the tip: ridged (a peak along it) or flat.
beak_squareness = 1.6; // [1.2:0.1:8]
// The beak's line from the side: full (bulging) or scooped (hollowed).
beak_curve = 0; // [-1:0.05:1]
// Moves the shoulder (the chart's shoulder dot) back for a longer beak, forward for shorter (mm).
beak_length = 0; // [-15:0.5:15]
// 0 = a crisp step (as designed), 1 = a smooth, gradual drop into the beak.
shoulder_smoothness = 0; // [0:0.05:1]
// How wide the beak's top is: - narrower, rounder top; + wider, fuller top. 0 = as designed.
beak_top_width = 0; // [-1:0.05:1]
// How far the shoulder line runs down the sides toward the tip (mm); 0 = straight across.
shoulder_sweep = 0; // [0:0.5:20]
// The lower sides near the tip, seen from the tip: tucked in (curved) or straight down.
underside_squareness = 1.2; // [1.2:0.1:8]

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
top_image = "";
// Picture width (mm).
top_image_width = 14; // [4:0.5:90]
// Picture height / width, for spacing (the app fills it in).
top_image_aspect = 1; // [0.1:0.01:10]
// Picture rotation (degrees).
top_image_angle = 0; // [0:15:345]
// Moves the picture toward the tip (+) or the shank (-) (mm).
top_image_position = 0; // [-50:0.5:50]
// Wrap the picture around the body like a label.
top_image_wrap = false;
// Text on the right side (seen from above, tip away). Lines, variables as on top.
side_text_right = "";
// Text on the left side.
side_text_left = "";
// Side letter height (mm).
side_text_size = 3.5; // [1.5:0.5:10]
// Side text from just behind the ligature: + toward the tip, - toward the shank (mm).
side_text_position = 0; // [-50:0.5:50]
// Moves the side text up (+) or down (-) (mm).
side_text_vertical = 0; // [-10:0.5:10]
// Ligature and cap lettering; the mouthpiece's is always engraved (the ligature slides over it).
lettering_style = "engraved"; // [engraved, raised]
// How deep the letters go, or how far they stand out (mm).
lettering_depth = 0.5; // [0.2:0.05:1.5]
// Typeface. Keep script faces 5mm or taller.
lettering_font = "Sans Bold"; // [Sans Bold, Sans, Serif Bold, Serif, Serif Italic, Mono Bold, Bebas Neue, Marcellus SC, Rozha One, Alfa Slab One, Audiowide, Black Ops One, Lobster, Pacifico, Kaushan Script]
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
shank_detail = "none"; // [none, rings, flutes, spiral, knurled]
// Shank decoration cut in (engraved) or standing out (raised).
shank_detail_style = "engraved"; // [engraved, raised]
// How many rings (as many as fit), flutes, spiral starts (up to 4) or knurl lines each way.
shank_detail_count = 3; // [1:1:40]
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
cap_side_vents = "none"; // [none, slots, holes]
// How many vents on each side (slots stack up the side, holes run along it).
cap_side_vent_count = 2; // [1:1:5]
// Vent width, or a hole's diameter (mm).
cap_side_vent_size = 2.5; // [1.5:0.5:5]
// Space between neighbouring vents (mm).
cap_side_vent_gap = 3; // [1:0.5:10]
// Wall thickness (mm).
cap_wall = 1.6; // [1.2:0.1:4]
// Follows the mouthpiece (smoothed), or round.
cap_shape = "conform"; // [conform, round]
// Lengthens the cap toward the shank (mm); the most covers the whole mouthpiece.
cap_extend = 0; // [0:1:120]
// Space between the tip and the inside of the closed end (mm).
cap_end_gap = 5; // [1:0.5:20]
// Closed end's shape: 0.6 = a low dome, 1 = a full dome as tall as the end gap (lower needs supports).
cap_end_dome = 1; // [0.6:0.1:1]
// A raised bead around the open end (mm out from the wall); 0 = none.
cap_rim_bead = 0.6; // [0:0.1:1.5]
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
voice = "Alto";

// Built-in outline, [[fraction of L, value], ...] joined by PCHIP (rounded, hand-smoothed caliper-
// style stations measured from a real mouthpiece; the base file's are the alto's): full width,
// top, underside behind the table (the table cut takes over after it), height of the section's
// widest point, top and underside squareness, and the "medium" baffle. Shape: short tenon, quick
// flare to the widest body, near-flat top, a steep shoulder at ~60% of the length (where the
// section gets boxier), then a straight beak to a thin, WIDE tip. Any ext_*_points override
// replaces the matching curve.
shape_width = [[0, 22.0], [0.085, 22.0], [0.105, 22.13], [0.125, 22.83], [0.145, 24.25], [0.165, 26.2], [0.185, 28.09], [0.205, 29.0], [0.29, 28.1], [0.46, 26.4], [0.83, 22.3], [1, 16.9]];
shape_top = [[0, 25.5], [0.125, 25.4], [0.138, 25.44], [0.152, 25.66], [0.165, 26.11], [0.178, 26.72], [0.192, 27.32], [0.205, 27.6], [0.3, 26.3], [0.405, 25.1], [0.495, 24.0], [0.575, 22.85], [0.585, 22.7], [0.6, 20.9], [0.62, 18.9], [0.685, 15.4], [0.775, 11.9], [1, 3.6]];
shape_bottom = [[0, 3.5], [0.115, 2.4], [0.195, 0]];
shape_widest = [[0, 14.5], [0.18, 13.9], [0.27, 12.6], [0.385, 11.4], [0.76, 8.7], [0.8, 8.11], [0.84, 7.1], [0.88, 5.88], [0.92, 4.72], [0.96, 3.85], [1, 3.5]];
shape_top_squareness = [[0, 2.0], [0.58, 2.0], [0.64, 2.7], [0.84, 1.6], [1, 1.6]];
shape_bottom_squareness = [[0, 2.0], [0.74, 2.0], [0.87, 1.2], [1, 1.2]];
shape_baffle = [[0.487, 18.2], [0.555, 15.9], [0.728, 9.6], [0.795, 7.2], [0.924, 3.3], [0.969, 2.4]];
// Commercial tip-opening range for this instrument — only used for a validate() warning (mm).
tip_opening_range = [1.40, 2.80];
// Smallest baffle-to-reed gap near the throat (mm); only warns.
min_airgap = 0.5;

$fn = render_fn;

// (legacy names: begin; the bundlers move this block above the settings, so an old name
// pasted into a single-file download still wins over these and gets its warning)
// Parameters renamed on 2026-09-26: a file that still sets an old name gets a warning (the app
// rewrites old names itself when it opens a file or a link, see src/migrate.ts).
chamber_d = undef;
bore_d = undef;
throat_z = undef;
throat_length = undef;
chamber_position = undef;
chamber_length = undef;
tip_thickness = undef;
tip_round = undef;
side_text_height = undef;
baffle_rollover = undef;
// The size knobs before 2026-10-03 (scales of the outline): an older file or link that sets one
// still renders as it did; each multiplies the scale its size above gives (src/migrate.ts turns
// an old file's into sizes).
body_width_scale = 1;
body_height_scale = 1;
shank_scale = 1;
// chamber_width before 2026-10-03: an older file's or link's chamber width in mm; it wins over
// chamber_width_extra.
chamber_width = undef;
// reed_length before 2026-10-05 (renamed table_length, the same length): an older file's value
// still applies.
reed_length = undef;
// (legacy names: end)
RENAMED_PARAMS = [["chamber_d", chamber_d, "chamber_width_extra (the width vs the throat's)"], ["bore_d", bore_d, "bore_diameter"], ["throat_z", throat_z, "throat_position"], ["throat_length", throat_length, "throat_taper"], ["chamber_position", chamber_position, "chamber_flare"], ["chamber_length", chamber_length, "chamber_full_length (0 = all the way is now 40)"], ["tip_thickness", tip_thickness, "beak_tip_height"], ["tip_round", tip_round, "tip_curve"], ["side_text_height", side_text_height, "side_text_vertical"], ["baffle_rollover", baffle_rollover, "baffle_hump"]];

// ===========================================================================================
// 2. Curve math
// ===========================================================================================

function clamp01(x) = max(0, min(1, x));
function lerp(a, b, t) = a + (b - a) * t;
function ease(t) = t * t * (3 - 2 * t);                          // smoothstep (C1)
function smootherstep(t) = t * t * t * (t * (6 * t - 15) + 10);  // C2: zero slope and curvature at both ends
// Polynomial smooth-min: equals min(a, b) away from the crossover, rounds the corner within k.
function smin(a, b, k) = let(h = max(k - abs(a - b), 0) / k) min(a, b) - h * h * k / 4;
function has_pts(pts) = is_list(pts) && len(pts) > 0;
// Numbers in order (a small list: quicksort), and without near-repeats (closer than eps).
function sort_nums(v) = len(v) <= 1 ? v : let(p = v[floor(len(v) / 2)])
  concat(sort_nums([for (x = v) if (x < p) x]), [for (x = v) if (x == p) x], sort_nums([for (x = v) if (x > p) x]));
function thin_nums(s, eps) = [for (i = [0 : 1 : len(s) - 1]) if (i == 0 || s[i] - s[i - 1] > eps) s[i]];

// Monotone piecewise-cubic (PCHIP, Fritsch-Carlson) interpolation through [[x, y], ...] sorted by
// x — smooth (C1) like a spline, but never overshoots, so a flat run stays flat and a step stays a
// step. Holds the end values outside the range.
// Usage: prepare a curve once with pchip_prep(pts) (computes each knot's slope -> [x, y, slope]),
// then evaluate it with pchip_at(x, curve) — a binary search plus one cubic, no per-call slopes.
function pchip_d(pts, i) = (pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0]);
function pchip_m(pts, i) =
  let(n = len(pts))
  i == 0 ? pchip_d(pts, 0) :
  i == n - 1 ? pchip_d(pts, n - 2) :
  let(d0 = pchip_d(pts, i - 1), d1 = pchip_d(pts, i), h0 = pts[i][0] - pts[i - 1][0], h1 = pts[i + 1][0] - pts[i][0])
  d0 * d1 <= 0 ? 0 : let(w1 = 2 * h1 + h0, w2 = h1 + 2 * h0) (w1 + w2) / (w1 / d0 + w2 / d1);
function pchip_prep(pts) = !has_pts(pts) ? [] : len(pts) == 1 ? [[pts[0][0], pts[0][1], 0]] :
  [for (i = [0 : len(pts) - 1]) [pts[i][0], pts[i][1], pchip_m(pts, i)]];
// Segment index: the first i in [lo, hi] with x <= c[i + 1].x.
function pchip_seg(x, c, lo, hi) =
  lo >= hi ? lo : let(mid = floor((lo + hi) / 2)) x <= c[mid + 1][0] ? pchip_seg(x, c, lo, mid) : pchip_seg(x, c, mid + 1, hi);
function pchip_at(x, c) =
  let(n = len(c))
  n == 0 ? 0 :
  n == 1 || x <= c[0][0] ? c[0][1] :
  x >= c[n - 1][0] ? c[n - 1][1] :
  let(i = pchip_seg(x, c, 0, n - 2), x0 = c[i][0], h = c[i + 1][0] - x0, t = (x - x0) / h, t2 = t * t, t3 = t2 * t)
  (2 * t3 - 3 * t2 + 1) * c[i][1] + (t3 - 2 * t2 + t) * h * c[i][2] +
  (-2 * t3 + 3 * t2) * c[i + 1][1] + (t3 - t2) * h * c[i + 1][2];

// Every profile override, prepared once (the exterior outline curves EXT_WIDTH_C, EXT_TOP_C,
// EXT_BOTTOM_C, EXT_WIDEST_C are set up in section 4: override or built-in shape table).
EXT_TOP_SQ_C     = pchip_prep(ext_top_squareness_points);
EXT_BOTTOM_SQ_C  = pchip_prep(ext_bottom_squareness_points);
TABLE_WIDTH_C    = pchip_prep(table_width_points);
INT_WIDTH_C      = pchip_prep(interior_width_points);
INT_TOP_SQ_C     = pchip_prep(interior_top_squareness_points);
INT_BOTTOM_SQ_C  = pchip_prep(interior_bottom_squareness_points);
FLOOR_C          = pchip_prep(floor_points);

// ===========================================================================================
// 3. Derived dimensions, facing curve
// ===========================================================================================

L = overall_length;
F = facing_length;
T = tip_opening;
break_z = L - F;                          // where the rails leave the flat table
// Gauge facing: the user's points (mm from the tip, gap) between the tip (gap = tip_opening) and
// the break (gap 0 at facing_length). By construction the curve never rises toward the break:
// points outside (0, F) or out of order are dropped, each gap is held within [0, T] and no higher
// than the one before it (PCHIP keeps monotone data monotone). No points: the power curve.
GAUGE_PTS = let(p = facing_gauge_points, n = has_pts(p) ? len(p) : 0,
                q = [for (i = [0 : 1 : n - 1]) if (p[i][0] > 0 && p[i][0] < F && p[i][0] > max([0, for (j = [0 : 1 : i - 1]) p[j][0]])) p[i]])
  [[0, T], for (i = [0 : 1 : len(q) - 1]) [q[i][0], max(0, min([T, for (j = [0 : 1 : i]) q[j][1]]))], [F, 0]];
GAUGE_C = len(GAUGE_PTS) > 2 ? pchip_prep(GAUGE_PTS) : [];
// The socket's inside diameter and its cone down to the bore. Defined before everything that
// keeps clear of the socket: a top-level variable read before its assignment is undef.
socket_d = neck_cork_diameter - shank_clearance;
socket_cone = max(1, (socket_d - bore_diameter) * 1.5);
// The window can't reach back over the socket/bore/throat: it starts at least 30% of the length
// (and 20mm) from the shank end — real windows start at ~45-60%. It also leaves the socket its
// full depth (+ its cone + 6mm), shortening to no less than 15mm first: the socket is the fit on
// the horn, so the tone settings give way before it does. validate() warns.
eff_window_length = min(window_length, L - max(0.3 * L, 20), max(15, L - (shank_depth + socket_cone + 6)));
win_z0 = max(0, L - eff_window_length);   // rear of the window
win_front_z = L - tip_rail_thickness;     // front of the window, on the centerline
// Anatomical order per a labeled reference diagram and Ozdemir et al. (2021): bore -> throat
// (narrowest point) -> chamber (widens again, in the beak region) -> baffle/tip.
// The throat always comes before the window (bore -> throat -> chamber -> window); a throat at or
// behind the window start ran the sequence backwards and holed the chamber. validate() warns.
// It also stays in front of the socket (the fit on the horn wins): a throat behind the socket's
// end moves forward, and the bore's narrowing into it shortens (to 1mm, a step) before the socket
// would have to.
eff_throat_z = max(8, min(max(throat_position, shank_depth + socket_cone + 1), win_z0 - 1));
eff_throat_length = max(1, min(throat_taper, eff_throat_z - (shank_depth + socket_cone)));
chamber_peak_z = eff_throat_z + (break_z - eff_throat_z) * chamber_flare;
// The chamber's width (mm): the throat's plus chamber_width_extra (or an older file's chamber_width).
CHAMBER_W = is_undef(chamber_width) ? throat_width + chamber_width_extra : chamber_width;
// The chamber: widens from the throat to CHAMBER_W at chamber_peak_z, holds that width to
// chamber_end_z, then closes smoothly into the window width by chamber_close_z, just behind the
// tip rounding (the measured references stay ~chamber-wide under the baffle to ~90% of L).
chamber_close_z = L - tip_curve - 1;
chamber_end_z = max(chamber_peak_z, chamber_full_length < 40 ? min(chamber_peak_z + chamber_full_length, chamber_close_z - 4) : chamber_close_z - max(4, 0.12 * L));
function chamber_hw(z) =
  z <= eff_throat_z ? 0 :
  z <= chamber_peak_z ? lerp(throat_width / 2, CHAMBER_W / 2, ease(clamp01((z - eff_throat_z) / max(0.001, chamber_peak_z - eff_throat_z)))) :
  lerp(CHAMBER_W / 2, 0, smootherstep(clamp01((z - chamber_end_z) / max(1, chamber_close_z - chamber_end_z))));
// chamber_height: extra half-height beyond round, applied with chamber_weight (before the window).
chamber_extra = chamber_height > 0 ? (chamber_height - CHAMBER_W) / 2 : 0;

// The socket can't be deeper than the bore: it stops a cone length before the throat transition,
// and 6mm before the window (a deeper socket ran into the chamber and holed it). The window,
// throat and throat narrowing give way first (above), so this only bites on very short bodies.
// validate() warns.
eff_shank_depth = max(5, min(shank_depth, eff_throat_z - eff_throat_length - socket_cone, win_z0 - 6 - socket_cone));
shank_taper_end_z = eff_shank_depth + socket_cone;  // end of the socket-to-bore cone

// Facing curve: rail height above the table plane at s mm from the break toward the tip.
function facing_height(s) =
  s <= 0 ? 0 :
  s >= F ? T :
  facing_model == "arc" ? let(R = (F * F + T * T) / (2 * T)) R - sqrt(max(0, R * R - s * s)) :
  facing_model == "gauge" && len(GAUGE_C) ? pchip_at(F - s, GAUGE_C) :  // indexed by distance from the tip
  T * pow(s / F, facing_exponent);                      // "power"
function facing_at_z(z) = facing_height(max(0, z - break_z));

// ===========================================================================================
// 4. Exterior profile. The built-in outline is the shape tables (shape_width, shape_top,
// shape_bottom, shape_widest: stations along the length, measured from real mouthpieces) joined by
// PCHIP. Any ext_*_points override replaces the matching curve.
// The table is a real reed seat: a flat, full-width face from the reed's heel (table_rear_z, one
// reed length back from the tip) to the facing break. Its width is set directly by solving each
// ring's underside depth so the y=0 cut is exactly that wide. Behind the heel, a short scoop
// (table_ramp) brings the underside down from the tenon onto it.
// Each cross-section is a superellipse ring (sring) with separate upper/lower exponents that
// meet at the ring's widest point.
// ===========================================================================================

tenon_end_z = L * 0.07;
table_ramp = L * 0.09;
TABLE_LEN = is_undef(reed_length) ? table_length : reed_length;
table_rear_z = max(L - TABLE_LEN, tenon_end_z + table_ramp);
table_start_z = table_rear_z - table_ramp;  // where the underside first reaches the table plane (roughly)

// The shape tables ARE the built-in outline (there is nothing behind them): an empty one used to
// hang the render or collapse the outline, so stop with a clear message instead.
EMPTY_SHAPE_TABLES = [for (t = [["shape_width", shape_width], ["shape_top", shape_top], ["shape_bottom", shape_bottom],
  ["shape_widest", shape_widest], ["shape_top_squareness", shape_top_squareness],
  ["shape_bottom_squareness", shape_bottom_squareness], ["shape_baffle", shape_baffle]]) if (!has_pts(t[1])) t[0]];
SHAPE_TABLES_OK = assert(len(EMPTY_SHAPE_TABLES) == 0, str("empty shape table(s) ", EMPTY_SHAPE_TABLES,
  ": the shape tables are the built-in outline and need their points. In the app press Revert to reload the file.")) true;

// The size knobs fade in across the flare, so the tenon keeps its size and stays round. The fade
// follows each table's own flare (0 where it starts rising, 1 at the crest: the progress of its own
// value), so a size change stretches the flare's curve; a fixed window fought it and left a second
// hump. Widths follow shape_width's flare, heights shape_top's. A table without a clear flare (less
// than 0.5 mm of rise before 0.4 L) falls back to the window 0.09-0.21.
function flare_window(t) =
  let(ic0 = [for (i = [0 : len(t) - 1]) if (t[i][0] <= 0.4) i],
      ic = ic0[search(max([for (i = ic0) t[i][1]]), [for (i = ic0) t[i][1]])[0]],
      lo = min([for (i = [0 : ic]) t[i][1]]),
      is = max([for (i = [0 : ic]) if (t[i][1] <= lo + 1e-9) i]))
  t[ic][1] - t[is][1] < 0.5 || is >= ic ? [] : [t[is][0], t[is][1], t[ic][0], t[ic][1]];
FLARE_W = flare_window(shape_width);
FLARE_H = flare_window(shape_top);
FLARE_W_C = pchip_prep(shape_width);
FLARE_H_C = pchip_prep(shape_top);
function flare_fade(f, W, C) = len(W) == 0 ? smootherstep(clamp01((f - 0.09) / 0.12))
  : f <= W[0] ? 0 : f >= W[2] ? 1 : clamp01((pchip_at(f, C) - W[1]) / (W[3] - W[1]));
function fade_w(f) = flare_fade(f, FLARE_W, FLARE_W_C);
function fade_h(f) = flare_fade(f, FLARE_H, FLARE_H_C);
function body_scale(f, k, fade) = lerp(1, k, fade);
// The shank's scale is the other way round: the tenon's outside, fading back to 1 across the flare
// (SHANK_S makes the tables' neck-end width shank_diameter); its heights scale about the bore axis
// (from the tables, before the socket guarantee), so the bore stays centred. At most 1.3x the
// outline's own (the old knob's top; a soprano broke from ~1.4x; validate() warns).
SHANK_S = min(1.3, shank_diameter / shape_width[0][1]) * shank_scale;
function shank_k(fade) = lerp(SHANK_S, 1, fade);
shank_mid0 = (shape_top[0][1] + shape_bottom[0][1]) / 2;
function shank_y(f, y) = SHANK_S == 1 ? y : let(m = shank_mid0 - f * L * tan(bore_tilt)) m + (y - m) * shank_k(fade_h(f));
// body_width / body_height -> the body's scale k: the smallest k that takes one of the body's table
// points to that size. Each point is linear in k ([a, b]: a + b k) and PCHIP doesn't overshoot its
// points, so that point is the widest / tallest. The tenon's points don't scale (b = 0) and don't
// count: the size is the body's, the shank end may be bigger. k stays within 0.5-2 (validate() warns).
function size_k(ab, size) = let(c = [for (p = ab) if (p[1] > 1e-9) (size - p[0]) / p[1]])
  len(c) == 0 ? 1 : let(k = max(0.5, min(2, min(c)))) abs(k - 1) < 1e-6 ? 1 : k;
// the size k gives (the body's points only)
function size_at(ab, k) = max([for (p = ab) if (p[1] > 1e-9) p[0] + p[1] * k]);
BODY_AB_W = [for (p = shape_width) let(s = fade_w(p[0]), w = p[1] * shank_k(s)) [w * (1 - s), w * s]];
BODY_KW = size_k(BODY_AB_W, body_width) * body_width_scale;
def_width = [for (p = shape_width) let(s = fade_w(p[0])) [p[0] * L, p[1] * body_scale(p[0], BODY_KW, s) * shank_k(s)]];
// beak_length: the shoulder (where the top starts its steepest drop, from shape_top) moves along
// the length; the top, widest-point and top-squareness tables are stretched to follow it between
// an anchor 30% of L behind the shoulder and the tip. 0 leaves the tables exactly as they are.
function shoulder_f(t) = let(d = [for (i = [0:len(t) - 2]) t[i][0] < 0.3 ? -1e9 : (t[i][1] - t[i + 1][1]) / max(1e-6, t[i + 1][0] - t[i][0])])
  t[search(max(d), d)[0]][0];
SHOULDER_F = shoulder_f(shape_top);
BEAK_ANCHOR_F = SHOULDER_F - 0.3;
SHOULDER_F2 = beak_length == 0 ? SHOULDER_F : max(BEAK_ANCHOR_F + 0.05, min(0.9, SHOULDER_F - beak_length / L));
function beak_remap(f) = beak_length == 0 || f <= BEAK_ANCHOR_F ? f
  : f <= SHOULDER_F ? lerp(BEAK_ANCHOR_F, SHOULDER_F2, (f - BEAK_ANCHOR_F) / (SHOULDER_F - BEAK_ANCHOR_F))
  : lerp(SHOULDER_F2, 1, (f - SHOULDER_F) / (1 - SHOULDER_F));
function beak_remapped(t) = beak_length == 0 ? t : [for (p = t) [beak_remap(p[0]), p[1]]];
// shoulder_smoothness: around the shoulder the top table (and the top-squareness table, whose boxier
// band behind the shoulder is the rest of the ledge) is replaced by a cubic matching the table's
// value and slope at both ends of a window that grows with the setting (from 10% of L behind the
// shoulder to 22% in front at 1), so the step becomes a long, even drop with nothing left on the
// sides. Kept between its end values (no overshoot); 0 leaves the tables exactly as they are.
// A shape edit pushing the shoulder's corner down (top_adjust) smooths it by as much (the share of
// the drop it takes away), so the shoulder gets lower and softer: a smooth pull on a sharp step
// would leave a double edge.
function shoulder_win(sm) = [SHOULDER_F2 - 0.10 * sm, min(0.9, SHOULDER_F2 + 0.22 * sm)];
function shoulder_smoothed(t, sm = shoulder_smoothness) = sm <= 0 ? t :
  let(C = pchip_prep(t), w = shoulder_win(sm), fa = w[0], fb = w[1], h = fb - fa, e = 0.002)
  let(va = pchip_at(fa, C), vb = pchip_at(fb, C),
      ma = (pchip_at(fa, C) - pchip_at(fa - e, C)) / e, mb = (pchip_at(fb + e, C) - pchip_at(fb, C)) / e)
  concat([for (p = t) if (p[0] < fa - 1e-4) p],
         [for (k = [0 : 12]) let(u = k / 12, u2 = u * u, u3 = u2 * u)
           [fa + h * u, max(min(va, vb), min(max(va, vb),
             (2 * u3 - 3 * u2 + 1) * va + (u3 - 2 * u2 + u) * h * ma + (-2 * u3 + 3 * u2) * vb + (u3 - u2) * h * mb))]],
         [for (p = t) if (p[0] > fb + 1e-4) p]);
SHOULDER_DROP = let(C = pchip_prep(beak_remapped(shape_top)))
  max(0.5, pchip_at(SHOULDER_F2, C) - pchip_at(min(0.95, SHOULDER_F2 + 0.12), C));
SHOULDER_SMOOTH = has_pts(ext_top_points) ? shoulder_smoothness
  : max(shoulder_smoothness, clamp01(-adjust_at(SHOULDER_F2 * L, adjust_prep(top_adjust)) / SHOULDER_DROP));
shape_top_b = shoulder_smoothed(beak_remapped(shape_top), SHOULDER_SMOOTH);
// shank_y(f, h (1 - s + s k)) is a + b k too
BODY_AB_H = [for (p = shape_top_b) let(s = fade_h(p[0]), c = shank_k(s), m = shank_mid0 - p[0] * L * tan(bore_tilt))
    SHANK_S == 1 ? [p[1] * (1 - s), p[1] * s] : [m * (1 - c) + p[1] * (1 - s) * c, p[1] * s * c]];
BODY_KH = size_k(BODY_AB_H, body_height) * body_height_scale;
def_top0 = [for (p = shape_top_b) [p[0] * L, shank_y(p[0], p[1] * body_scale(p[0], BODY_KH, fade_h(p[0])))]];
// The beak eases onto beak_tip_height over the last 40% (voice files set it to the table's own end).
def_top = [for (p = def_top0) [p[0], p[1] + (beak_tip_height - def_top0[len(def_top0) - 1][1]) * smootherstep(clamp01((p[0] / L - 0.6) / 0.4))]];
// beak_curve: from the shoulder to the tip the top dips below (+) or bulges above (-) its own line,
// most in the middle (a half sine, so it meets the shoulder and the tip unchanged), by up to 12% of
// the beak's drop. The beak is resampled for it; 0 leaves the table exactly as it is.
def_top_c = beak_curve == 0 ? def_top : let(C = pchip_prep(def_top), z0 = SHOULDER_F2 * L,
    A = beak_curve * 0.12 * (pchip_at(z0, C) - pchip_at(L, C)), n = 16)
  concat([for (p = def_top) if (p[0] < z0 - 1e-6) p],
         [for (i = [0:n]) let(z = z0 + (L - z0) * i / n) [z, pchip_at(z, C) - A * sin(180 * i / n)]]);
def_bottom = [for (p = shape_bottom) [p[0] * L, shank_y(p[0], p[1])]];
// beak_top_width: the height where the beak's sides are fullest, scaled (x0.55 at -1, x1.2 at +1):
// lower pulls the upper flanks in (a narrower, rounder top), higher fills them out. Faded in across
// the shoulder, so the barrel keeps its shape.
BEAK_TOP_K = beak_top_width < 0 ? 1 + 0.45 * beak_top_width : 1 + 0.2 * beak_top_width;
function beak_top_k(f) = beak_top_width == 0 ? 1 : lerp(1, BEAK_TOP_K, smootherstep(clamp01((f - SHOULDER_F2 + 0.04) / 0.08)));
def_widest = [for (p = beak_remapped(shape_widest))
  [p[0] * L, shank_y(p[0], p[1] * body_scale(p[0], BODY_KH, fade_h(p[0])) * beak_top_k(p[0]))]];

// Effective outline curves. With a custom top but no underside/widest points, those follow the
// top (mirrored about the bore axis / halfway) rather than the built-in table.
// The shape edits (*_adjust): a curve of mm by z (0 at both ends unless given there), added to the
// built-in outline (resampled where either has a point) or to the inside's own lines.
function adjust_prep(adj) = !has_pts(adj) ? [] :
  let(a = concat(adj[0][0] > 0 ? [[0, 0]] : [], adj, adj[len(adj) - 1][0] < 1 ? [[1, 0]] : []))
  pchip_prep([for (p = a) [p[0] * L, p[1]]]);
function adjust_at(z, A) = has_pts(A) ? pchip_at(z, A) : 0;
function adjusted(t, adj, lo = -1e9) = !has_pts(adj) || !has_pts(t) ? t :
  let(A = adjust_prep(adj), C = pchip_prep(t), z0 = t[0][0], z1 = t[len(t) - 1][0],
      zs = thin_nums(sort_nums(concat([for (p = t) p[0]], [for (p = A) if (p[0] > z0 && p[0] < z1) p[0]])), 0.05))
  [for (z = zs) [z, max(lo, pchip_at(z, C) + pchip_at(z, A))]];
USER_TOP = has_pts(ext_top_points);
EXT_WIDTH_C  = pchip_prep(has_pts(ext_width_points) ? ext_width_points : adjusted(def_width, width_adjust, 8));
EXT_TOP_C    = pchip_prep(USER_TOP ? ext_top_points : adjusted(def_top_c, top_adjust, 1));
EXT_BOTTOM_C = pchip_prep(has_pts(ext_bottom_points) ? ext_bottom_points : USER_TOP ? [] : adjusted(def_bottom, underside_adjust, 0));
// A top edit (top_adjust) or underside edit stretches the whole cross-section between them, so the
// widest point (the sides' fullest line) moves in proportion and the flanks follow the crest: moving
// the crest alone squashed the section's top into a flat channel with ridges left on the sides.
function widest_followed(t) = !has_pts(top_adjust) && !has_pts(underside_adjust) ? t :
  let(T0 = pchip_prep(def_top_c), T1 = EXT_TOP_C, B0 = pchip_prep(def_bottom), B1 = EXT_BOTTOM_C,
      bz = function(C, z) has_pts(C) && z <= C[len(C) - 1][0] ? max(0, pchip_at(z, C)) : 0,
      C = pchip_prep(t), z0 = t[0][0], z1 = t[len(t) - 1][0],
      zs = thin_nums(sort_nums(concat([for (p = t) p[0]], [for (p = concat(T1, B1)) if (p[0] > z0 && p[0] < z1) p[0]])), 0.05))
  [for (z = zs) let(t0 = pchip_at(z, T0), t1 = pchip_at(z, T1), b0 = bz(B0, z), b1 = bz(B1, z), h = pchip_at(z, C),
                    u = clamp01((h - b0) / max(0.5, t0 - b0)))
     [z, min(t1 - 0.5, lerp(b1, t1, u))]];
EXT_WIDEST_C = pchip_prep(has_pts(ext_widest_points) ? ext_widest_points : USER_TOP ? [] : widest_followed(def_widest));
max_body_w = max([for (c = EXT_WIDTH_C) c[1]]);
TOP_SQ_TABLE_C = pchip_prep(shoulder_smoothed(beak_remapped(shape_top_squareness), SHOULDER_SMOOTH));     // indexed by fraction of L
BOTTOM_SQ_TABLE_C = pchip_prep(shape_bottom_squareness);

// Exterior width where the tip rounding starts.
tip_half_w = pchip_at(L - tip_curve, EXT_WIDTH_C) / 2;
// Bore axis: at the shank end, sloping down toward the tip by bore_tilt. The built-in shape
// centers it in its tenon; with ext_top_points, bore_axis_height is taken as given.
bore_tan = tan(bore_tilt);
// The socket (socket_d, square to the tilted bore) must keep min_wall above the table plane
// along its whole depth, so the axis rises if needed; the tenon then grows around it (see
// exterior_ring_at).
socket_ry = socket_d / 2 / cos(bore_tilt);
eff_bah = max(USER_TOP ? bore_axis_height : (pchip_at(0, EXT_TOP_C) + pchip_at(0, EXT_BOTTOM_C)) / 2,
              socket_ry + min_wall + max(0, (shank_depth + 8) * tan(bore_tilt)));
function bah_at(z) = eff_bah - z * bore_tan;

// Reed-tip curve, as a width factor d mm behind the tip: a quarter-ellipse r deep, the same shape
// a saxophone reed's own tip has. Slope-continuous into the straight sides at d = r.
function tip_factor(d, r) = d >= r ? 1 : sqrt(max(0, 1 - pow(1 - max(0, d) / r, 2)));

function exterior_half_width_at(z) = max(0, pchip_at(z, EXT_WIDTH_C) / 2 * tip_factor(L - z, tip_curve));
function exterior_top_at(z) = pchip_at(z, EXT_TOP_C);

// Squareness along the length: the shape table's curve (round body, boxier at the beak shoulder,
// easing off toward the tip; the underside pinches in to the rails late), shifted so it starts at
// body_squareness and ends at beak_/underside_squareness — the voice files set those to the
// table's own ends, so they get it exactly.
function shifted_table(z, c, v0, v1) = let(f = clamp01(z / L)) pchip_at(f, c) + lerp(v0 - c[0][1], v1 - c[len(c) - 1][1], f);
function exterior_top_exp(z) = has_pts(EXT_TOP_SQ_C) ? pchip_at(z, EXT_TOP_SQ_C)
  : max(1.2, shifted_table(z, TOP_SQ_TABLE_C, body_squareness, beak_squareness));
function exterior_bottom_exp(z) = has_pts(EXT_BOTTOM_SQ_C) ? pchip_at(z, EXT_BOTTOM_SQ_C)
  : max(1.2, shifted_table(z, BOTTOM_SQ_TABLE_C, body_squareness, underside_squareness));

// Flat table half-width: reed heel width at the rear, reed tip width toward the tip.
function table_half_w(z) = has_pts(TABLE_WIDTH_C) ? pchip_at(z, TABLE_WIDTH_C) / 2
  : lerp(table_width_rear, table_width_tip, clamp01((z - table_rear_z) / (L - table_rear_z))) / 2;

// Past the table's last station the widest point keeps the table's end slope (never rising):
// held level, it stopped while the crest kept descending, so the top of the section flattened
// fast over the last few mm and showed as a crease across the beak just behind the tip.
function widest_table_at(z) = let(c = EXT_WIDEST_C, e = c[len(c) - 1])
  z > e[0] ? e[1] + min(0, e[2]) * (z - e[0]) : pchip_at(z, c);
// beak_tip_height and beak_curve move the crest; the widest point follows by the same ratio (the
// ring scales about the table plane), so the flanks move with it rather than only the top centre.
BEAK_SIDES = def_top_c != def_top0 && !USER_TOP && !has_pts(ext_widest_points);
DEF_TOP0_C = BEAK_SIDES ? pchip_prep(def_top0) : [];
function beak_sides_k(z) = BEAK_SIDES ? exterior_top_at(z) / max(0.01, pchip_at(z, DEF_TOP0_C)) : 1;
function widest_raw(z, top) = max(0.5, min(top - 0.3, widest_table_at(z) * beak_sides_k(z)));

// Underside depth that makes the ring's y=0 chord exactly table_half_w wide. For a superellipse
// |x/hw|^n + |(y-cy)/hh|^n = 1, the chord at y=0 is hw*(1-rel^n)^(1/n) with rel = cy/hh; solve for
// rel, then for the bottom. Capped at 97% of the ring's width so the table edge never degenerates.
// With ext_widest_points the ring's center (widest point) is given, so only the lower half-height
// is solved: the chord is at rel = cy / hb below the center, giving hb = cy / rel.
function table_bot_line(z, hw, top, n_bot) =
  let(ratio = min(0.97, table_half_w(z) / max(0.01, hw)), rel = pow(1 - pow(ratio, n_bot), 1 / n_bot))
  has_pts(EXT_WIDEST_C) ? let(cy = widest_raw(z, top)) cy * (1 - 1 / rel)
  : top * (rel - 1) / (rel + 1);

// Behind the scoop the underside follows the tenon/flare (above the table plane, so uncut); across
// the scoop it blends into the table line. Smootherstep: slope-continuous into both.
function exterior_bottom_from(z, hw, top, n_bot) =
  let(rear = has_pts(EXT_BOTTOM_C) ? pchip_at(z, EXT_BOTTOM_C) : 2 * bah_at(z) - top)
  lerp(rear, table_bot_line(z, hw, top, n_bot), smootherstep(clamp01((z - table_start_z) / table_ramp)));

// The exterior cross-section at z, every term computed once:
//   [half_width, top, bottom, widest_y, top_exponent, bottom_exponent]  (indices E_*)
E_HW = 0; E_TOP = 1; E_BOT = 2; E_CY = 3; E_NT = 4; E_NB = 5;
// A top exponent below 2 makes a ridge along the top center. Fine on the body, but where the beak
// thins out toward the tip it becomes a spike, so it eases up to TIP_TOP_EXP before the tip curve:
// 1.8, nearly round (2 made the top near the tip flatter and wider than real beaks; 1.8 shows no spike).
// The ease runs over a quarter of the length: over only 6mm the section changed shape fast enough
// to show as a crease across the beak (worst with a low beak_squareness).
TIP_TOP_EXP = 1.8;
tip_round_ease = max(6, 0.25 * L);
function exterior_top_exp_final(z) =
  let(n = exterior_top_exp(z), t = smootherstep(clamp01((z - (L - tip_curve - tip_round_ease)) / tip_round_ease)))
  n < TIP_TOP_EXP ? lerp(n, TIP_TOP_EXP, t) : n;

tip_nose = 1.2;  // mm: how far back the front edge of the tip rounds over (see exterior_ring_at)

// Weight of the socket-wall guarantee: 1 along the socket, fading out over the cone plus 3mm.
function socket_weight(z) = z <= eff_shank_depth ? 1 : 1 - smootherstep(clamp01((z - eff_shank_depth) / (socket_cone + 3)));

function exterior_ring_at(z) =
  let(hw0 = exterior_half_width_at(z), top0 = exterior_top_at(z), n_top = exterior_top_exp_final(z), n_bot = exterior_bottom_exp(z))
  // Around the socket the tenon keeps min_wall outside it on every side, growing if needed (a
  // socket wider than the tenon used to cut straight through it).
  let(w = socket_weight(z))
  let(hw = hw0 + w * max(0, socket_d / 2 + min_wall - hw0))
  let(top = top0 + w * max(0, bah_at(z) + socket_ry + min_wall - top0))
  // Floor at -40: where the tip pinches the width to ~0 the table solve heads for -infinity, and
  // anything below the facing cutter's -50 survives as a detached sliver (seen once on an unusual outline).
  let(bot0 = max(-40, exterior_bottom_from(z, hw, top, n_bot)))
  let(bot = bot0 - w * max(0, bot0 - (bah_at(z) - socket_ry - min_wall)))
  let(cy = has_pts(EXT_WIDEST_C) ? max(bot + 0.3, widest_raw(z, top)) : (top + bot) / 2)
  // The very front rounds over (top down to the widest point): the rings close to a vertical line
  // at the tip, and with the top at full height the facets fanned into a point on the crest.
  let(top_n = cy + (top - cy) * tip_factor(L - z, tip_nose))
  [hw, top_n, bot, cy, n_top, n_bot];

// Half-width of exterior ring E at height y (inverting the superellipse) — lets the interior clamp
// against the real cross-section, not just the widest point.
function ring_half_width_at_y(E, y) =
  let(up = y >= E[E_CY], n = up ? E[E_NT] : E[E_NB])
  let(rel = min(1, abs(y - E[E_CY]) / (up ? E[E_TOP] - E[E_CY] : E[E_CY] - E[E_BOT])))
  E[E_HW] * pow(1 - pow(rel, n), 1 / n);

// shoulder_sweep: the shoulder line runs down the sides toward the tip, as on a beak whose flanks
// are cut into the barrel. Behind a line slanting from the crest at the shoulder (SWEEP_Z0) to the
// widest point shoulder_sweep mm further on, the upper half is fuller: the same ring (crest,
// widest point and width unchanged) with a higher top exponent, + SWEEP_FULL once past the
// shoulder's step (SWEEP_ZK). In front of the line it is the ring as before, so the line is a
// ledge, largest mid-flank and fading out at the crest and at the widest point; blurred over
// 0.4 x the sweep, at least 2.5mm (sharper, the line slanting across the ring points came out
// jagged, the longer the sweep the more). Applied to finished
// ring points (sweep_pt) along rays from the ring's centre: star-shaped (no folds) and only ever
// larger, so everything measured on exterior_ring_at (interior clamps, window corners) stays safe.
// (An earlier version delayed the top's drop instead: the crest then dipped below the flanks.)
SWEEP_FULL = 1.6;
SWEEP_BLUR = max(2.5, 0.4 * shoulder_sweep);
SWEEP_Z0 = (USER_TOP ? shoulder_f([for (p = ext_top_points) [p[0] / L, p[1]]]) : SHOULDER_F2) * L;
// The shoulder's step ends where the top's slope first eases to within 15% of the beak's own (the
// mean over the beak's front half).
SWEEP_BEAK_SLOPE = let(a = SWEEP_Z0 + 0.5 * (L - SWEEP_Z0), b = L - tip_curve - 2)
  (exterior_top_at(b) - exterior_top_at(a)) / max(1, b - a);
SWEEP_ZK = let(zs = [for (z = [SWEEP_Z0 + 1 : 0.5 : min(L - tip_curve - 2, SWEEP_Z0 + 25)])
    if ((exterior_top_at(z + 0.25) - exterior_top_at(z - 0.25)) / 0.5 >= 1.15 * SWEEP_BEAK_SLOPE) z])
  len(zs) > 0 ? zs[0] : min(L - tip_curve - 2, SWEEP_Z0 + 25);
// Extra top exponent at z for a point whose ray from the ring centre has sine s (1 = the crest).
function sweep_extra(z, s) = shoulder_sweep <= 0 || s <= 0 || z <= SWEEP_Z0 ? 0
  : let(ramp = smootherstep(clamp01((z - SWEEP_Z0) / max(1, SWEEP_ZK - SWEEP_Z0))))
    let(behind = 1 - smootherstep(clamp01((z - SWEEP_Z0 - shoulder_sweep * (1 - s)) / SWEEP_BLUR + 0.5)))
    SWEEP_FULL * ramp * behind;
// p: a point of the ring (hw, top, cy, n = top exponent) at z, [x, y] or [x, y, z].
function sweep_pt(p, z, hw, top, cy, n) = shoulder_sweep <= 0 || p[1] <= cy ? p
  : let(v = [p[0], p[1] - cy], r = norm(v)) r < 1e-6 ? p
  : let(u = v / r, dn = sweep_extra(z, u[1])) dn <= 0 ? p
  : let(m = n + dn, rho = 1 / pow(pow(abs(u[0]) / hw, m) + pow(u[1] / (top - cy), m), 1 / m))
    concat([u[0] * rho, cy + u[1] * rho], len(p) > 2 ? [p[2]] : []);
function sweep_ring(pts, z, hw, top, cy, n) = shoulder_sweep <= 0 ? pts : [for (p = pts) sweep_pt(p, z, hw, top, cy, n)];

// ===========================================================================================
// 5. Window planform (looking at the table): a long slot, slightly wider toward the tip, rear end
// squared off with rounded corners, front edge following the reed-tip arc one tip rail inside the
// exterior's own tip arc. Side rails stay an even width along its length.
// ===========================================================================================

// The window always stays inside the reed table with side rails left (a window wider than the
// table used to break out through the side walls).
function window_rail_limit(z) = max(0.5, min(table_half_w(z), tip_half_w) - side_rail_width);
win_hw_front = min(window_width / 2, window_rail_limit(win_front_z));
win_hw_rear = min(win_hw_front, (window_width - window_taper) / 2, window_rail_limit(win_z0));

function window_base_hw(z) = lerp(win_hw_rear, win_hw_front, clamp01((z - win_z0) / max(0.001, win_front_z - win_z0)));

// Window width ignoring the rear corner rounding — also what the interior sidewalls follow, so
// the interior stays full-width across the window's rounded rear end. Front edge: the reed-tip
// ellipse, shrunk by the rails so the tip rail stays an even width.
function window_side_hw(z) = max(0, min(window_base_hw(z), window_rail_limit(z)) * tip_factor(win_front_z - z, max(0.5, tip_curve - tip_rail_thickness)));

function window_half_width(z) =
  let(r = min(window_rear_radius, win_hw_rear), d = z - win_z0)
  let(rear = d >= r ? 1e3 : (window_base_hw(z) - r) + sqrt(max(0, r * r - (r - d) * (r - d))))
  (z < win_z0 || z > win_front_z) ? 0 : min(window_side_hw(z), rear);

// Baffle: the interior roof above the reed, from where it takes over from the round
// bore/chamber roof to the tip. Base curve: baffle_points_custom if given, else the measured table
// (shape_baffle), PCHIP-joined; baffle_type can replace it with a classic shape spanning the same
// start and tip heights (baffle_type_at). The three knobs then shape it:
//   baffle_start    moves where it begins; the base curve is stretched/squeezed so the tip end
//                   stays put (kept between the socket cone and 5mm before the tip);
//   baffle_height   lowers the roof toward the reed (+) or raises it (-), easing in over the first
//                   third of the baffle so it blends into the chamber;
//   baffle_hump a smooth hump centred ~80% of the way to the tip.
// The roof is always smooth-maxed to stay >= 0.4mm above the reed line, so no setting can close
// the channel at the tip (wall clearances are guaranteed separately by the interior clamps).
baffle_base_pts = has_pts(baffle_points_custom) ? baffle_points_custom : [for (p = shape_baffle) [p[0] * L, p[1]]];
BAFFLE_BASE_C = pchip_prep(baffle_base_pts);
baffle_z0 = baffle_base_pts[0][0];
baffle_z1 = baffle_base_pts[len(baffle_base_pts) - 1][0];
baffle_start_z = max(shank_taper_end_z + 2, min(baffle_z0 + baffle_start, baffle_z1 - 5));
// baffle_curve bends any baffle along its length (0 = as is): below 0 it comes down toward the
// reed early and runs flatter to the tip, above 0 it stays up and drops late. u -> u^(2^c).
function baffle_warp(u) = baffle_curve == 0 ? u : pow(u, pow(2, baffle_curve));
function baffle_base_at(z) =
  let(u = baffle_warp(clamp01((z - baffle_start_z) / max(1, baffle_z1 - baffle_start_z))))
  pchip_at(baffle_z0 + u * (baffle_z1 - baffle_z0), BAFFLE_BASE_C);
// Classic baffle shapes between the base curve's start height Y0 and tip-end height Y1. A roof that
// drops toward the reed faster than 45 degrees would be an unsupported ledge inside the part as it
// prints (standing on its shank end), so every shape keeps its slope under ~1 by construction:
// the step's face is a 0.85 ramp, the blends are wide enough.
BAFFLE_Y0 = baffle_base_pts[0][1];
BAFFLE_Y1 = baffle_base_pts[len(baffle_base_pts) - 1][1];
function baffle_type_at(z) =
  let(len_ = max(1, baffle_z1 - baffle_start_z), u = baffle_warp(clamp01((z - baffle_start_z) / len_)), drop = BAFFLE_Y0 - BAFFLE_Y1)
  let(flat = lerp(BAFFLE_Y0, BAFFLE_Y1, u), plateau = BAFFLE_Y1 + 0.15 * drop * (1 - u))
  has_pts(baffle_points_custom) ? baffle_base_at(z) :  // your own points win
  baffle_type == "flat" ? flat :
  baffle_type == "rollover" ? lerp(flat, plateau, smootherstep(clamp01((u - 0.45) / 0.45))) :
  baffle_type == "step" ?
    let(zs = lerp(baffle_start_z, baffle_z1, 0.55), ramp = BAFFLE_Y1 + 0.15 * drop * 0.45 + 0.85 * (zs - z))
    -smin(-smin(BAFFLE_Y0, ramp, 2), -plateau, 1) :
  baffle_type == "concave" ? flat + 0.22 * drop * bell(u, 0.62, 0.38) :
  baffle_base_at(z);
function bell(u, c, w) = let(t = 1 - abs(u - c) / w) t > 0 ? smootherstep(t) : 0;
// A bent baffle (baffle_curve != 0) can come down steeper than the shapes above allow for printing
// (a sqrt-like start is vertical), so it is held above a 0.85 descent from every point behind it
// (sampled every 0.5mm over 16mm): the steepest it can get is the same as the step's face.
// Shape edits (baffle_adjust) are held the same way.
BAFFLE_ADJ_C = adjust_prep(baffle_adjust);
function baffle_edited_at(z) = baffle_type_at(z) + adjust_at(z, BAFFLE_ADJ_C);
// Held as a running max over a 0.25mm table, computed once (it is read many times per ring).
BAFFLE_HELD = baffle_curve != 0 || has_pts(BAFFLE_ADJ_C);
BT_H = 0.25;
BT_Z0 = baffle_start_z - 16;
BT_N = BAFFLE_HELD ? ceil((L + 1 - BT_Z0) / BT_H) : 0;
BAFFLE_TAB = [for (i = 0, v = baffle_edited_at(BT_Z0); i <= BT_N;
                   i = i + 1, v = max(baffle_edited_at(BT_Z0 + i * BT_H), v - 0.85 * BT_H)) v];
function baffle_shape_at(z) = !BAFFLE_HELD ? baffle_type_at(z)
  : let(t = max(0, min(BT_N, (z - BT_Z0) / BT_H)), i = min(floor(t), BT_N - 1))
    lerp(BAFFLE_TAB[i], BAFFLE_TAB[i + 1], t - i);
function baffle_roof(z) =
  let(u = clamp01((z - baffle_start_z) / max(1, L - baffle_start_z)))
  let(raw = baffle_shape_at(z) - baffle_height * smootherstep(clamp01(u / 0.35)) - baffle_hump * bell(u, 0.8, 0.18))
  -smin(-raw, -(facing_at_z(z) + 0.4), 0.5);

// ===========================================================================================
// 6. Interior profile: bore -> throat (narrowest) -> chamber (widens again) -> window/baffle
// region, one continuous closed tube. Every dimension is clamped against the exterior ring at the
// same z, so it cannot poke through regardless of parameter values.
// ===========================================================================================

// Wall allowed above the baffle: min_wall through the body, relaxing toward the tip where the
// real beak is only ~2mm thick in total.
function interior_wall(z) = lerp(min_wall, 1.2, clamp01((z - break_z) / F));

// Window-region floor: a thin skin just above the table/facing surface. The window cutter
// punches through it, so the window's outline is set by the cutter alone — the interior never
// breaks through the table itself (which previously made a second, competing outline).
function window_floor_y(z) = facing_at_z(z) + 0.8;

// Socket-to-bore transition: a short cone (~18° half-angle) instead of a flat 90° shoulder —
// kinder to airflow and printable without support. The socket itself is part of the interior
// loft (interior_solid), so the cone starts right at the socket's radius with no lip.

// Highest the interior roof can be at z (worked out without the interior width, so no
// recursion): the exterior top less the wall, or the baffle where that is lower. The window-region
// width clamp is taken at this height, where the roof corners are.
function roof_cap_y(z, E) =
  let(cap = E[E_TOP] - interior_wall(z))
  z >= baffle_start_z ? min(cap, baffle_roof(z)) : cap;

// Mid-height half-width. E = exterior_ring_at(z).
CHAMBER_W_ADJ_C = adjust_prep(chamber_width_adjust);
function interior_half_w(z, E) =
  let(throat_start = eff_throat_z - eff_throat_length, custom_w = has_pts(INT_WIDTH_C))
  let(raw0 =
    z <= eff_shank_depth ? socket_d / 2 :
    z <= shank_taper_end_z ? lerp(socket_d / 2, bore_diameter / 2, ease((z - eff_shank_depth) / (shank_taper_end_z - eff_shank_depth))) :
    (custom_w && z <= win_z0) ? pchip_at(z, INT_WIDTH_C) / 2 :
    z <= throat_start ? bore_diameter / 2 :
    z <= eff_throat_z ? lerp(bore_diameter / 2, throat_width / 2, ease((z - throat_start) / eff_throat_length)) :
    // before the window: the chamber, never narrower than a smooth line from the throat width to the
    // window's rear width (so a short chamber still joins the window)
    z <= win_z0 ? max(chamber_hw(z), lerp(throat_width / 2, win_hw_rear + 0.3, ease(clamp01((z - eff_throat_z) / max(0.001, win_z0 - eff_throat_z))))) :
    // under the window: the chamber (scooped out above the rails, see interior_ring_at) or at
    // least the window itself
    max(window_side_hw(z) + 0.3, chamber_hw(z),
        (custom_w && z <= INT_WIDTH_C[len(INT_WIDTH_C) - 1][0]) ? pchip_at(z, INT_WIDTH_C) / 2 : 0)
  )
  // the shape edit (chamber_width_adjust), after the socket's cone; never narrower than the window
  let(raw = !has_pts(CHAMBER_W_ADJ_C) || z <= shank_taper_end_z ? raw0
    : max(z > win_z0 ? window_side_hw(z) + 0.3 : 1, raw0 + adjust_at(z, CHAMBER_W_ADJ_C) / 2))
  z <= win_z0
    ? min(raw, E[E_HW] - min_wall)
    : min(raw, E[E_HW] - side_rail_width * 0.6, ring_half_width_at_y(E, roof_cap_y(z, E)) - 0.8);

// How much of chamber_height applies at z: 0 at the throat, full after the first 40% of the way
// to the window, faded out over the last stretch before it (at most 4mm; the window's floor is a
// skin the window cuts). It used to follow the chamber's widening, which on real mouthpieces
// peaks under the window, so the setting barely reached the passage before it.
function chamber_weight(z) =
  let(span = max(0.001, win_z0 - eff_throat_z), fade = max(0.5, min(4, 0.3 * span)))
  z <= eff_throat_z ? 0 :
  ease(clamp01((z - eff_throat_z) / max(0.5, 0.4 * span))) * (1 - ease(clamp01((z - (win_z0 - fade)) / fade)));
// The roof's share of chamber_height: 1 while the roof is the round bore/chamber, 0 once the
// baffle has taken over (4mm blend, as in interior_ring_at) — the floor then takes all of it.
function chamber_roof_share(z) = 1 - smootherstep(clamp01((z - baffle_start_z) / 4));

// Floor height. hw = interior_half_w(z, E). floor_shape bends the built-in floor between the
// throat and the window: below 0 it drops toward the window floor early (a deeper chamber), above
// 0 it stays up longer (a longer ramp).
function floor_t(t) = floor_shape == 0 ? t : pow(t, pow(2, floor_shape * 1.5));
FLOOR_ADJ_C = adjust_prep(floor_adjust);
function interior_bottom_y(z, E, hw) =
  z <= eff_throat_z && !(has_pts(FLOOR_C) && z >= FLOOR_C[0][0]) ? max(bah_at(z) - hw, max(E[E_BOT], 0) + min_wall) :
  let(t = floor_t(ease(clamp01((z - eff_throat_z) / max(0.001, win_z0 + window_rear_radius - eff_throat_z)))))
  let(raw = (has_pts(FLOOR_C) ? (z < win_z0 ? pchip_at(z, FLOOR_C) : window_floor_y(z))
          : lerp(bah_at(eff_throat_z) - throat_width / 2, window_floor_y(z), t)) - chamber_extra * chamber_weight(z) * (2 - chamber_roof_share(z))
          + (z < win_z0 ? adjust_at(z, FLOOR_ADJ_C) : 0))
  let(guard = z < win_z0 ? max(E[E_BOT], 0) + min_wall : window_floor_y(z))
  max(raw, guard);


// Ring exponents [top, bottom] per chamber_shape. "round" keeps the bore round until the chamber
// peak, then boxes up into the window (flat floor, near-vertical sidewalls); "square" and
// "horseshoe" reach their shape across the last 6mm before the throat.
// throat_shape: "chamber" = the chamber's own shape is reached across the throat narrowing (as
// above); otherwise the throat gets that section (over the narrowing), then eases into the
// chamber's shape by where the chamber reaches full width (or the window, if sooner).
function section_exps(s, t) = s == "square" ? [lerp(2, 8, t), lerp(2, 8, t)] : s == "horseshoe" ? [lerp(2, 2.5, t), lerp(2, 8, t)] : [2, 2];
function interior_exps_shape(z) =
  throat_shape == "chamber" ? interior_exps_chamber(z) :
  let(eT = section_exps(throat_shape, 1))
  z <= eff_throat_z ? lerp([2, 2], eT, ease(clamp01((z - eff_throat_z + eff_throat_length) / eff_throat_length))) :
  let(z2 = max(eff_throat_z + 2, min(chamber_peak_z, win_z0)))
  lerp(eT, interior_exps_chamber(z), ease(clamp01((z - eff_throat_z) / (z2 - eff_throat_z))));
function interior_exps_chamber(z) =
  chamber_shape == "square" ? let(t = ease(clamp01((z - eff_throat_z + eff_throat_length) / eff_throat_length))) [lerp(2, 8, t), lerp(2, 8, t)] :
  chamber_shape == "horseshoe" ? let(t = ease(clamp01((z - eff_throat_z + eff_throat_length) / eff_throat_length))) [lerp(2, 2.5, t), lerp(2, 8, t)] :
  // at least 6mm: a chamber peak at or past the window start boxed up in one step (a ledge)
  let(bt = ease(clamp01((z - chamber_peak_z) / max(6, win_z0 - chamber_peak_z)))) [lerp(2, 4, bt), lerp(2, 6, bt)];
function interior_exps(z) =
  (has_pts(INT_TOP_SQ_C) || has_pts(INT_BOTTOM_SQ_C))
    ? let(d = interior_exps_shape(z)) [has_pts(INT_TOP_SQ_C) ? pchip_at(z, INT_TOP_SQ_C) : d[0],
                                       has_pts(INT_BOTTOM_SQ_C) ? pchip_at(z, INT_BOTTOM_SQ_C) : d[1]]
    : interior_exps_shape(z);

// The interior cross-section at z: [half_width, top, bottom, top_exponent, bottom_exponent].
// Roof and floor are resolved together, with the exterior limits as hard bounds:
//   - roof: the round bore until the baffle takes over, smoothly capped one wall below the
//     exterior top. It is never pushed up by the floor — only as far as needed when the floor
//     itself can't go lower, and never past the cap.
//   - floor: its formula, but giving way (smoothly) to keep a minimum channel height under the
//     roof: 1.2mm before the window, easing to 0.3mm in the window, where the floor is only a skin
//     the window cutter removes. Before the window it never drops through the underside wall.
//   - width: in the window, checked at the roof's actual height (the roof corners are there, and
//     a rounded beak is much narrower there than lower down), and pulled in to the window width
//     where the floor reaches the reed plane, so the interior can't nick the rails.
// (A bari fit exposed the old rule "roof = max(floor + 1.2, ...)": near the tip, where the baffle
// comes down onto the facing, it pushed the roof up — a ledge seen through the window, and holes
// through the beak corners.)
function interior_ring_at(z) = interior_ring_pts_at(z)[0];

// [ring, its points]: the points come free with the last fit pass.
function interior_ring_pts_at(z) =
  let(E = exterior_ring_at(z), hw0 = interior_half_w(z, E), bot0 = interior_bottom_y(z, E, hw0), ne = interior_exps(z))
  let(cap = E[E_TOP] - interior_wall(z))
  // the roof blends from the round bore/chamber into the baffle over 4mm (no step when the
  // baffle start is moved)
  let(bore_roof = bah_at(z) + hw0 + chamber_extra * chamber_weight(z) * chamber_roof_share(z))
  let(raw = z < baffle_start_z ? bore_roof : lerp(bore_roof, baffle_roof(z), smootherstep(clamp01((z - baffle_start_z) / 4))))
  let(in_win = z > win_z0)
  let(floor_lo = in_win ? -10 : max(E[E_BOT], 0) + min_wall)
  let(min_h = in_win ? lerp(1.2, 0.3, smootherstep(clamp01((z - win_z0) / max(1, window_rear_radius)))) : 1.2)
  let(top = min(cap, max(smin(raw, cap, 0.6), floor_lo + min_h)))
  let(bot = min(top - 0.05, max(floor_lo, smin(bot0, top - min_h, 0.4))))
  let(rail_t = clamp01((bot - facing_at_z(z)) / 0.4))  // 0 once the floor is down at the reed plane
  // Under the window the lower part of the ring is held to the window width (straight side walls,
  // so the rails keep their full thickness); above narrow_top it may open out to the chamber.
  let(narrow = in_win ? window_side_hw(z) + 0.3 * rail_t : 1e3, narrow_top = facing_at_z(z) + 2)
  // walls leaning out (sidewall_angle > 0) need the ring wide enough to reach them at the roof
  let(hw0w = in_win && sidewall_angle > 0 ? max(hw0, narrow + max(0, top - narrow_top) * tan(sidewall_angle)) : hw0)
  let(hw1 = !in_win ? hw0w : max(min(hw0w, ring_half_width_at_y(E, top) - 0.8), min(narrow, hw0w)))
  // Last guarantee: every point of the ring keeps the side wall (min_wall before the window, the
  // rail allowance in it) at its OWN height — the width clamps above only look at mid-height, and
  // a wide throat/chamber/bore in a narrow or low body poked through above and below it. Only x
  // is scaled, so one pass is exact. In the window, points at or below the reed plane are inside
  // the window cut and don't count.
  let(lo = in_win ? facing_at_z(z) + 0.1 : -1e9)
  // Two passes: the window-width limit on the lower walls moves as the width scales. A pass that
  // changes nothing (scale 1) makes the next one the same, so it is skipped, and when the final
  // ring equals the last pass's input its points are reused.
  let(I1 = [hw1, top, bot, ne[0], ne[1], narrow, narrow_top])
  let(f1 = interior_fit(z, E, I1, in_win, lo), s1 = f1[0])
  let(I2 = [hw1 * s1, top, bot, ne[0], ne[1], narrow, narrow_top])
  let(f2 = s1 == 1 ? f1 : interior_fit(z, E, I2, in_win, lo), s2 = f2[0])
  let(hw = hw1 * s1 * s2)
  // I[5] stays 1e3 before the window (it marks "no window here" for interior_points; clamped to
  // the width, the leaning sidewalls reached back into the throat and bore)
  let(I = [max(0.05, hw), top, bot, ne[0], ne[1], in_win ? min(narrow, max(0.05, hw)) : 1e3, narrow_top])
  [I, I == I2 ? f2[1] : interior_points(INT_DIRS, z, I)];

// Width scale (<= 1) that makes every ring point keep its wall at its own height: min_wall before
// the window; under the window 0.6 x side_rail_width for the part within the window width (the
// rails) but the full min_wall for a chamber scooped out wider than the window above them.
// Returns [scale, the points of ring I].
function interior_fit(z, E, I, in_win, lo) =
  let(pts = interior_points(INT_DIRS, z, I))
  let(ratios = [for (p = pts) if (abs(p[0]) > 0.05 && p[1] > lo && p[1] > E[E_BOT] && p[1] < E[E_TOP])
                  let(ext = ring_half_width_at_y(E, p[1]))
                  let(limit = !in_win ? ext - min_wall
                            : abs(p[0]) <= I[5] + 0.01 ? ext - side_rail_width * 0.6
                            : max(min(I[5], ext - side_rail_width * 0.6), ext - min_wall))
                  limit / abs(p[0])])
  [len(ratios) ? max(0.05, min(1, min(ratios))) : 1, pts];

// The interior ring's points: the superellipse, with x held within the window width below
// narrow_top and blending out to the full width over the next 1.5mm (I[5] = 1e3 before the window).
// With sidewall_angle (under the window only) the walls above narrow_top lean out (+, scooped
// out toward the chamber width) or in (-, the chamber narrower than the window toward the roof)
// at that angle from vertical.
function interior_points(dirs, z, I) =
  [for (p = sring(dirs, z, I[0], I[1], I[2], I[3], I[4], (I[1] + I[2]) / 2))
    let(allowed = sidewall_angle == 0 || I[5] >= 1e3
      ? lerp(min(I[5], I[0]), I[0], smootherstep(clamp01((p[1] - I[6]) / 1.5)))
      : sidewall_allowed(I, p[1]))
    [sign(p[0]) * min(abs(p[0]), allowed), p[1], p[2]]];
// Half-width the leaning walls allow at height y (the corner at narrow_top rounded over 1mm).
function sidewall_allowed(I, y) =
  let(d = y - I[6], rise = d <= -1 ? 0 : d >= 1 ? d : (d + 1) * (d + 1) / 4)
  min(I[0], max(0.3 * I[5], min(I[5], I[0]) + rise * tan(sidewall_angle)));

// ---- Baffle texture: shallow dents cut up into the roof from inside, from 4mm past where the
// baffle begins to 2mm behind the tip curve (fading in and out over 3mm). Each dent is the cap of
// a sphere of radius BTX_R (>= 3.5 x the depth, so its sides stay under ~45 degrees and the
// overhang is never wider than the depth: prints without support); grooves are hulls of
// neighbouring spheres. Guarantees, per sample: the wall over the dent keeps interior_wall (and
// room for lettering on top), and the whole sphere stays inside the air path's width (the window's
// width under the window), so it can't reach the side walls or the rails.
BTX_D = baffle_texture_depth;
BTX_S = baffle_texture_spacing;
BTX_R = max(3.5 * BTX_D, (pow(0.6 * BTX_S, 2) / 4 + BTX_D * BTX_D) / (2 * BTX_D));
BTX_Z0 = baffle_start_z + 4;
BTX_Z1 = L - tip_curve - 2;
// y of a superellipse ring's upper half at x (cy = mid-height); undef outside it
function se_top_y(hw, top, cy, n, x) = abs(x) >= hw ? undef : cy + (top - cy) * pow(1 - pow(abs(x) / hw, n), 1 / n);
// half-width of the interior ring I at height y (I as in interior_ring_at)
function int_hw_at_y(I, y) =
  let(cy = (I[1] + I[2]) / 2, up = y >= cy, n = up ? I[3] : I[4])
  let(rel = min(1, abs(y - cy) / max(0.01, up ? I[1] - cy : cy - I[2])))
  I[0] * pow(1 - pow(rel, n), 1 / n);
// One row of samples at z: [[x, sphere centre y, z, depth], ...] (depth 0 = no dent there).
function btx_row(z, xs) =
  let(I = interior_ring_at(z), E = exterior_ring_at(z), cy = (I[1] + I[2]) / 2)
  let(fade = smootherstep(clamp01((z - BTX_Z0) / 3)) * smootherstep(clamp01((BTX_Z1 - z) / 3)))
  let(keep = interior_wall(z) + (HAS_LETTERING ? eff_lettering_depth : 0))
  [for (x = xs)
    let(roof = se_top_y(I[0], I[1], cy, I[3], x), out = se_top_y(E[E_HW], E[E_TOP], E[E_CY], E[E_NT], x))
    let(d0 = is_undef(roof) || is_undef(out) ? 0 : max(0, min(BTX_D * fade, out - roof - keep)))
    let(c = is_undef(roof) ? 0 : roof + d0 - BTX_R)
    let(room = z > win_z0 ? window_side_hw(z) : int_hw_at_y(I, max(I[2], c - BTX_R)))
    let(ok = d0 >= 0.05 && abs(x) + BTX_R <= room && c - BTX_R >= (z > win_z0 ? -10 : I[2]))
    [x, c, z, ok ? d0 : 0]];
module btx_dent(p) translate([p[0], p[1], p[2]]) sphere(r = BTX_R, $fn = 32);
module baffle_texture_cutter() {
  span = BTX_Z1 - BTX_Z0;
  if (span > 2) {
    if (baffle_texture == "along") {
      xs = [for (k = [-6 : 6]) k * BTX_S];
      rows = [for (z = [BTX_Z0 : 1 : BTX_Z1]) btx_row(z, xs)];
      for (k = [0 : len(xs) - 1], i = [0 : len(rows) - 2])
        if (rows[i][k][3] > 0 && rows[i + 1][k][3] > 0) hull() { btx_dent(rows[i][k]); btx_dent(rows[i + 1][k]); }
    } else if (baffle_texture == "across") {
      xs = [for (x = [-12 : 0.75 : 12]) x];
      for (j = [0 : floor(span / BTX_S)]) let(row = btx_row(BTX_Z0 + (span - floor(span / BTX_S) * BTX_S) / 2 + j * BTX_S, xs))
        for (i = [0 : len(row) - 2]) if (row[i][3] > 0 && row[i + 1][3] > 0) hull() { btx_dent(row[i]); btx_dent(row[i + 1]); }
    } else if (baffle_texture == "dimples") {
      dz = BTX_S * 0.866;
      for (j = [0 : floor(span / dz)])
        let(row = btx_row(BTX_Z0 + j * dz, [for (k = [-6 : 6]) (k + (j % 2) / 2) * BTX_S]))
          for (p = row) if (p[3] > 0) btx_dent(p);
    }
  }
}

// ===========================================================================================
// 7. Validation — echoed to the console, not geometry. Assumes the built-in shape.
// ===========================================================================================

// Inside air volume (mm^3): from the end of the neck (the socket depth) to the tip, with the reed
// closing the window — the volume that, with the neck, sets how the mouthpiece tunes on the horn.
// Trapezoid rule over the interior loft's own rings (their polygon area), plus the slot of the
// window below the interior's floor skin, down to the reed (facing) line.
function poly_area(pts) = abs(vsum([for (i = [0 : 1 : len(pts) - 1]) let(a = pts[i], b = pts[(i + 1) % len(pts)]) a[0] * b[1] - b[0] * a[1]])) / 2;
function vsum(v, i = 0, acc = 0) = i >= len(v) ? acc : vsum(v, i + 1, acc + v[i]);
function air_volume() =
  let(zs = [for (r = AIR_RINGS) r[0]])
  let(areas = [for (r = AIR_RINGS) let(z = r[0], I = r[1])
                 poly_area(r[2]) + (z > win_z0 ? 2 * window_half_width(z) * max(0, I[2] - facing_at_z(z)) : 0)])
  vsum([for (i = [0 : 1 : len(zs) - 2]) (zs[i + 1] - zs[i]) * (areas[i] + areas[i + 1]) / 2]);

module validate() {
  for (r = RENAMED_PARAMS) if (!is_undef(r[1]))
    echo(str("WARNING: ", r[0], " was renamed ", r[2], " — this value is ignored; rename it in the file"));
  if (SD_KIND == "rings" && SD_RINGS < SD_COUNT)
    echo(str("WARNING: shank_detail_count ", shank_detail_count, " rings don't fit on the shank's band: ", SD_RINGS, " made"));
  if (has_text(shank_text) && shank_text_h > SHANK_BAND[1] - SHANK_BAND[0] + 0.5)
    echo(str("WARNING: shank_text ", round(shank_text_h * 10) / 10, "mm tall runs past the shank's ", round((SHANK_BAND[1] - SHANK_BAND[0]) * 10) / 10, "mm band onto the flare: try a smaller shank_text_size"));
  if (has_text(shank_text) && text_block(shank_text, shank_text_size)[0] > 2 * PI * (exterior_ring_at(shank_text_z)[E_HW]) - 3)
    echo("WARNING: shank_text is longer than the way around the shank: its ends overlap");
  // a body size past the scale's 0.5-2 limit can't be reached (the old scale knobs aside)
  body_w_got = size_at(BODY_AB_W, BODY_KW);
  body_h_got = size_at(BODY_AB_H, BODY_KH);
  if (!has_pts(ext_width_points) && body_width_scale == 1 && abs(body_w_got - body_width) > 0.05)
    echo(str("WARNING: body_width ", body_width, "mm can't be reached: the body is ", round(body_w_got * 10) / 10, "mm wide"));
  if (shank_diameter > 1.3 * shape_width[0][1])
    echo(str("WARNING: shank_diameter ", shank_diameter, "mm limited to ", 1.3 * shape_width[0][1], "mm (1.3x this outline's shank end)"));
  if (!USER_TOP && body_height_scale == 1 && abs(body_h_got - body_height) > 0.05)
    echo(str("WARNING: body_height ", body_height, "mm can't be reached: the body is ", round(body_h_got * 10) / 10, "mm tall"));
  if (tip_opening < tip_opening_range[0] || tip_opening > tip_opening_range[1])
    echo(str("WARNING: tip_opening ", tip_opening, "mm is outside the commercial range [",
              tip_opening_range[0], ", ", tip_opening_range[1], "]mm for this instrument"));
  gap_at_throat = baffle_roof(max(eff_throat_z, baffle_start_z)) - facing_height(min(F, max(0, eff_throat_z - break_z)));
  if (gap_at_throat < min_airgap)
    echo(str("WARNING: baffle/facing air gap near the throat is only ", gap_at_throat, "mm (min_airgap=", min_airgap, "mm)"));
  if (eff_shank_depth < shank_depth)
    echo(str("WARNING: shank_depth ", shank_depth, "mm limited to ", eff_shank_depth, "mm — the socket can't run past the bore into the throat/window"));
  if (eff_window_length < window_length)
    echo(str("WARNING: window_length ", window_length, "mm shortened to ", eff_window_length, "mm — the window must start at least 30% of the length (and 20mm) from the shank end, and leave room for the socket"));
  if (eff_throat_z < throat_position)
    echo(str("WARNING: throat_position ", throat_position, "mm moved to ", eff_throat_z, "mm — it must come before the window start (", win_z0, "mm); shorten window_length or move throat_position back"));
  if (eff_throat_z > throat_position)
    echo(str("WARNING: throat_position ", throat_position, "mm moved to ", eff_throat_z, "mm — it must come after the socket (", shank_depth, "mm deep)"));
  if (shank_bevel > 0 && SHANK_BEVEL < shank_bevel - 0.01)
    echo(str("WARNING: shank_bevel ", shank_bevel, "mm limited to ", round(SHANK_BEVEL * 10) / 10, "mm: it keeps 0.8mm of the tenon's wall at the opening"));
  if (shank_bevel > 0 && SHANK_BEVEL_DEPTH < shank_bevel_depth - 0.01)
    echo(str("WARNING: shank_bevel_depth ", shank_bevel_depth, "mm limited to ", round(SHANK_BEVEL_DEPTH * 10) / 10, "mm: it leaves 3mm of full-size socket"));
  if (eff_throat_length < throat_taper)
    echo(str("WARNING: throat_taper ", throat_taper, "mm shortened to ", round(eff_throat_length * 10) / 10, "mm — the bore can only start narrowing after the socket"));
  // The chamber as built (the walls keep min_wall, so a chamber wider than the body allows is
  // narrowed): its widest point after the throat.
  chamber_built = 2 * max([0, for (r = AIR_RINGS) if (r[0] > eff_throat_z) r[1][0]]);
  if (len(AIR_RINGS) > 0 && chamber_built < CHAMBER_W - 0.3)  // (no rings: a ligature/cap-only run)
    echo(str("WARNING: the chamber (", CHAMBER_W, "mm wide) is limited to ", round(chamber_built * 10) / 10, "mm — the side walls keep min_wall (", min_wall, "mm)"));
  if (facing_model == "gauge" && len(GAUGE_PTS) <= 2)
    echo("WARNING: facing_model gauge has no facing_gauge_points yet — the power curve is used; add points under Exact points (or drag the facing chart)");
  if (L - TABLE_LEN < tenon_end_z + table_ramp - 0.01)
    echo(str("WARNING: table_length ", TABLE_LEN, "mm is longer than this body's table allows: the table starts at ", round(table_rear_z * 10) / 10, "mm from the shank end"));
  if (has_text(top_text) && top_text_width > top_text_room + 0.01)
    echo(str("WARNING: top_text is about ", round(top_text_width), "mm wide but the top is about ", round(top_text_room), "mm wide there — the ends are cut off; make it smaller, shorter or run it along the body"));
  if (has_text(top_image) && !top_image_wrap && top_image_across > top_image_room + 0.5)
    echo(str("WARNING: the top picture is about ", round(top_image_across), "mm wide but the top is about ", round(top_image_room), "mm wide there — its sides are cut off; make it smaller or wrap it"));
  if (has_text(top_image) && top_image_wrap && top_image_width / 2 > WRAP_MAX + 0.5)
    echo(str("WARNING: the wrapped top picture is ", top_image_width, "mm wide but reaches only about ", round(2 * WRAP_MAX), "mm around the body — its sides are cut off"));
  if (has_text(top_image) && (top_image_z - top_image_len / 2 < lettering_z0 - 0.5 || top_image_z + top_image_len / 2 > lettering_z1 + 0.5))
    echo(str("WARNING: the top picture is about ", round(top_image_len), "mm long and runs past the lettering area — its ends are cut off; make it smaller or move it"));
  if ((has_text(side_text_right) || has_text(side_text_left)) && side_text_long > lettering_z1 - lettering_z0 + 0.01)
    echo(str("WARNING: side text is about ", round(side_text_long), "mm long but there is room for about ", round(lettering_z1 - lettering_z0), "mm — the ends are cut off"));
  if ((ligature_made || part == "ligature" || part == "ligature_seated") && win_z0 - lig_z1 < ligature_position - 0.01)
    echo(str("WARNING: ligature_position ", ligature_position, "mm limited to ", round((win_z0 - lig_z1) * 10) / 10, "mm — the band has to stay on the reed (behind its heel it holds nothing)"));
  if (HAS_LETTERING && eff_lettering_depth < lettering_depth)
    echo(str("WARNING: lettering_depth ", lettering_depth, "mm limited to ", eff_lettering_depth, "mm — at least 0.8mm of the ", lettering_wall, "mm wall there must remain"));
  echo(str("Overall length: ", L, "mm, tip_opening: ", T, "mm, facing_length: ", F, "mm"));
  // the lettering variables and their values now (the app lists them by the text fields)
  echo(str("Text variables: ", join_str([for (t = LETTERING_TOKENS) str(t[0], " ", t[1])], "; ")));
  echo(str("Inside air volume: ", round(air_volume() / 100) / 10, " cm3 (from where the neck ends to the tip, with the reed closing the window)"));
  // the socket the neck fills (the app turns a change of air into mm along the cork with it)
  echo(str("Socket: ", eff_shank_depth, "mm deep, ", socket_d, "mm across, voice ", voice));
}
validate();

// Wall clearance report (part = "clearance_report", echo only — used by scripts/sweep.mjs): the
// smallest distance from the air path to the outside, measured on the interior loft's own rings —
// sideways at each ring point's height, over the roof, and (before the window) down to the
// underside/table — plus the socket wall. Horizontal/vertical distances, so on sloped walls the
// true perpendicular thickness is somewhat less. Echoes "CLEARANCE <mm> at z=<z> (<where>)".
function clearance_rows() =
  [for (r = AIR_RINGS)
    let(z = r[0], E = exterior_ring_at(z), I = r[1], pts = r[2])
    let(inside = [for (p = pts) if (p[1] > E[E_BOT] && p[1] < E[E_TOP]) ring_half_width_at_y(E, p[1]) - abs(p[0])])
    [len(inside) ? min(inside) : 1e9, E[E_TOP] - I[1], z < win_z0 ? I[2] - max(E[E_BOT], facing_at_z(z)) : 1e9, z]];
// Facing report (part = "facing_report", echo only): the gap
// between a flat reed and the rails at each distance back from the tip, for checking a printed
// facing with a glass plate and feeler gauges. "FACING <mm from tip> <gap mm>".
module facing_report() {
  for (d = [0 : 0.5 : F]) echo(str("FACING ", d, " ", facing_height(F - d)));
}

module clearance_report() {
  rows = clearance_rows();
  kinds = ["side wall", "roof", "floor"];
  mins = [for (k = [0 : 2]) let(v = [for (r = rows) r[k]], m = min(v)) [m, rows[search(m, v)[0]][3], kinds[k]]];
  r = socket_d / 2;
  E0 = exterior_ring_at(0);
  socket = min(E0[E_HW] - r, E0[E_TOP] - (eff_bah + r / cos(bore_tilt)), (eff_bah - r / cos(bore_tilt)) - max(E0[E_BOT], 0));
  all = concat(mins, [[socket, 0, "socket wall"]]);
  worst = [for (a = all) if (a[0] == min([for (b = all) b[0]])) a][0];
  // beside the window the side rails set the wall (guarantee 3), not min_wall: say so
  where = worst[2] == "side wall" && worst[1] >= win_z0 ? "side wall beside the window" : worst[2];
  echo(str("CLEARANCE ", worst[0], " at z=", worst[1], " (", where, ")"));
  for (a = all) echo(str("CLEARANCE_", a[2], " ", a[0], " at z=", a[1]));
}

// ===========================================================================================
// 8. Solids
// ===========================================================================================

// Ring-stitched loft. Every main solid is built this way, never hull()-lofted: each ring has the
// same point count and ordering (counter-clockwise in XY seen from +Z), so consecutive rings
// connect by direct index correspondence — no convex-hull ambiguity, no twist/wing artifacts.
// Faces are wound clockwise as seen from outside (OpenSCAD's convention). CGAL (2021.01)
// tolerated the opposite winding, but Manifold (2025+, the web app) treats an
// inside-out solid as empty in a difference(), so every cut silently vanished.
// Each quad between rings is split along mirrored diagonals on the two halves of the ring (the
// rings are symmetric about x = 0, starting at the bottom center), so the mesh is mirror-
// symmetric too — one diagonal everywhere shaded as a thin crease along the crest near the tip.
module ring_loft(rings) {
  m = len(rings) - 1;
  n = len(rings[0]);
  pts = [for (r = rings) each r];
  side_faces = [for (i = [0 : m - 1]) for (k = [0 : n - 1]) each
    let(a = i * n + k, b = i * n + (k + 1) % n, c = (i + 1) * n + (k + 1) % n, d = (i + 1) * n + k)
    k < n / 2 ? [[a, c, b], [a, d, c]] : [[a, d, b], [b, d, c]]
  ];
  back_cap = [[for (k = [0 : n - 1]) k]];
  front_cap = [[for (k = [n - 1 : -1 : 0]) m * n + k]];
  polyhedron(points = pts, faces = concat(side_faces, back_cap, front_cap), convexity = 6);
}

// Unit-circle directions for an n-point ring, starting at the bottom (-90°) going counter-clockwise.
// Ring sampling for n points (n divisible by 4), starting at the bottom center and running
// counter-clockwise, so index k lines up across rings: [n, unit directions by angle, the upper
// half traced RING_OVERSAMPLE times finer (for arc-length resampling, see sring)].
RING_OVERSAMPLE = 4;
function ring_dirs(n) = let(m = n / 2 * RING_OVERSAMPLE)
  [n, [for (k = [0 : n - 1]) let(th = -90 + k / n * 360) [cos(th), sin(th)]],
      [for (j = [0 : m]) let(th = j / m * 180) [cos(th), sin(th)]]];

// Largest i in [lo, hi] with cum[i] <= t (cum ascending).
function cum_find(cum, t, lo, hi) =
  lo >= hi ? lo : let(mid = floor((lo + hi + 1) / 2)) cum[mid] <= t ? cum_find(cum, t, mid, hi) : cum_find(cum, t, lo, mid - 1);

// A closed superellipse ring at height z spanning [bot, top] vertically and ±hw horizontally,
// with separate exponents for the upper and lower halves (2 = ellipse, larger = squarer), which
// meet at height cy. Continuous by construction: at the sides both halves give (±hw, cy).
// Point spacing: by angle, except on a RIDGED top (exponent < 2), where angle spacing bunches
// points at the crest into a fan of skinny triangles that shades like a groove. There the upper
// half's angles are blended toward even ARC-LENGTH spacing (by exponent: none at >= 2, fully
// at <= 1.7), always evaluating the exact curve. Arc length is NOT used generally: where rings
// change aspect quickly (the tip rounding) it slides points sideways between closely spaced rings
// and the triangles fold into a sawtooth — on the lower half (mostly cut away, with a hidden
// length that varies wildly near the tip) and even on a boxy top.
function sring(dirs, z, hw, top, bot, n_top, n_bot, cy, arc_w = undef) =
  let(n = dirs[0], et = 2 / n_top, eb = 2 / n_bot, ht = top - cy, hb = cy - bot)
  let(w = is_undef(arc_w) ? arc_weight(n_top) : arc_w)
  let(up = w == 0 ? [] : [for (d = dirs[2]) [hw * sign(d[0]) * pow(abs(d[0]), et), cy + ht * pow(abs(d[1]), et)]])
  let(m = len(up) - 1, seg = w == 0 ? [] : [for (i = [0 : m - 1]) norm(up[i + 1] - up[i])])
  let(cum = w == 0 ? [] : [for (i = 0, a = 0; i <= m; a = a + (i < m ? seg[i] : 0), i = i + 1) a])
  [for (k = [0 : n - 1])
    let(upper = k > n / 4 && k < 3 * n / 4)
    let(th = !upper || w == 0 ? -90 + k / n * 360
      : let(t = cum[m] * (k - n / 4) / (n / 2), i = cum_find(cum, t, 0, m - 1), f = (t - cum[i]) / max(1e-9, seg[i]))
        lerp(-90 + k / n * 360, (i + f) / m * 180, w))
    let(c = upper && w > 0 ? cos(th) : dirs[1][k][0], s = upper && w > 0 ? sin(th) : dirs[1][k][1], e = s >= 0 ? et : eb)
    [hw * sign(c) * pow(abs(c), e), cy + (s >= 0 ? ht : hb) * sign(s) * pow(abs(s), e), z]];

function arc_weight(n_top) = smootherstep(clamp01((2 - n_top) / 0.3));
// The exterior's arc-length weight along the length, averaged over +-8mm: pointwise it switched on
// and off where the top squareness dips below 2 and comes back (the presets' beaks), sliding the
// crest points sideways ring by ring into a patch of jagged triangles.
function exterior_arc_w(z) = vsum([for (i = [-4 : 4]) arc_weight(exterior_top_exp_final(max(0, min(L, z + 2 * i))))]) / 9;

// Stations from z0 to z1: ~step mm apart, then densely packed over the last `dense` mm so the
// reed-tip arc (which pinches the width to ~0 at the very front) is well resolved.
function station_list(z0, z1, dense = 3, step = 1) =
  let(zm = max(z0, z1 - dense), n = max(1, ceil((zm - z0) / step)), m = 16)
  concat([for (i = [0 : n - 1]) z0 + (zm - z0) * i / n],
         [for (j = [0 : m]) zm + (z1 - zm) * (1 - pow(1 - j / m, 2))]);
function drop_first(v) = [for (i = [1 : len(v) - 1]) v[i]];

// Resolution, all from render_fn: ring point counts, and the spacing between rings along Z (1mm
// at the default 64 — the profiles are smooth enough that finer only costs CGAL time).
EXT_RING_POINTS = render_fn;
INT_RING_POINTS = 4 * round(render_fn * 0.75 / 4);
INT_DIRS = ring_dirs(INT_RING_POINTS);  // built once (interior_ring_at needs them for every ring)
Z_STEP = 64 / render_fn;

// The interior's rings, computed ONCE and shared by the interior loft, the air-volume readout and
// the clearance report: [[z, ring, points], ...] from the end of the socket to the window front.
// Not needed by the ligature, cap and reed parts: skipped there (each run evaluates the whole file).
AIR_RINGS = (part == "ligature_seated" || part == "reed_model" || part == "cap_seated" || part == "ligature" || part == "cap") ? [] : [for (z = drop_first(station_list(eff_shank_depth, win_front_z, tip_curve + 1, Z_STEP)))
  let(R = interior_ring_pts_at(z)) [z, R[0], R[1]]];

// ---- Exterior: tenon -> flare -> tapered body -> beak -> wide rounded tip, as one loft. The
// table and facing are NOT part of it — facing_cutter slices them in afterward.
// The shank end face is square to the (possibly tilted) bore, through the axis at z = -1. The
// profile is constant behind z = 0, so the loft's first ring is simply the z = 0 cross-section
// with each point moved onto that plane — no trimming boolean.
function end_face_z(y) = -1 + (y - bah_at(-1)) * bore_tan;

// The shank bevel takes wall at the opening: it leaves at least 0.8mm of the tenon's wall there
// (measured sideways, over and under the socket at the end face).
SHANK_BEVEL = let(E = exterior_ring_at(0), c = bah_at(0))
  let(wall = min(E[E_HW] - socket_d / 2, E[E_TOP] - (c + socket_ry), (c - socket_ry) - E[E_BOT]))
  max(0, min(shank_bevel, wall - 0.8));
SHANK_BEVEL_DEPTH = max(0, min(shank_bevel_depth, eff_shank_depth - 3));

module exterior_solid() {
  dirs = ring_dirs(EXT_RING_POINTS);
  E0 = exterior_ring_at(0);
  end_ring = [for (p = sring(dirs, 0, E0[E_HW], E0[E_TOP], E0[E_BOT], E0[E_NT], E0[E_NB], E0[E_CY])) [p[0], p[1], end_face_z(p[1])]];
  z_first = max([for (p = end_ring) p[2]]);  // the regular stations start just in front of the end face
  ring_loft(concat([end_ring], [for (z = drop_first(station_list(z_first, L - 0.02, tip_curve + 1, Z_STEP)))
    let(E = exterior_ring_at(max(0, z)))
    sweep_ring(sring(dirs, z, E[E_HW], E[E_TOP], E[E_BOT], E[E_NT], E[E_NB], E[E_CY], exterior_arc_w(z)), max(0, z), E[E_HW], E[E_TOP], E[E_CY], E[E_NT])]));
}

// ---- Interior: the shank socket, then the air path to the window front, as one loft. The socket
// is round square to the (tilted) bore, i.e. slightly taller than wide in a z-plane, and starts
// behind the end face so it opens cleanly through it. with_socket = false gives just the air path
// (for measuring internal volume).
module interior_solid(with_socket = true) {
  dirs = ring_dirs(INT_RING_POINTS);
  r = socket_d / 2;
  ry = r / cos(bore_tilt);
  socket_back_z = -4 - (r + 1) * abs(bore_tan);
  // shank_bevel: a lead-in at the opening, its rings following the (tilted) end face: r + bevel at
  // the face (continued 0.5mm past it so it crosses the face cleanly, no edge in its plane), r at
  // shank_bevel_depth (shank_bevel_depth_eff: leaves 3mm of full socket).
  bdepth = SHANK_BEVEL_DEPTH;
  bv = bdepth > 0 ? SHANK_BEVEL : 0;
  face_ring = function(d, rr) [for (p = sring(dirs, -1 + d, rr, bah_at(-1 + d) + rr / cos(bore_tilt), bah_at(-1 + d) - rr / cos(bore_tilt), 2, 2, bah_at(-1 + d)))
    [p[0], p[1], end_face_z(p[1]) + d]];
  socket = bv <= 0 ? [for (z = [socket_back_z, eff_shank_depth]) sring(dirs, z, r, bah_at(z) + ry, bah_at(z) - ry, 2, 2, bah_at(z))]
    : let(rb = r + bv * (1 + 0.5 / bdepth), rby = rb / cos(bore_tilt))
      [sring(dirs, socket_back_z, rb, bah_at(socket_back_z) + rby, bah_at(socket_back_z) - rby, 2, 2, bah_at(socket_back_z)),
       face_ring(-0.5, rb), face_ring(bdepth, r),
       sring(dirs, eff_shank_depth, r, bah_at(eff_shank_depth) + ry, bah_at(eff_shank_depth) - ry, 2, 2, bah_at(eff_shank_depth))];
  air = [for (r = AIR_RINGS) r[2]];
  ring_loft(with_socket ? concat(socket, air) : air);
}

// ---- Facing cutter: a 2D (Z,Y) profile — table line + facing curve on top, filled
// below — extruded across the full width. Runs the whole length: behind table_start_z the body's
// underside is above y=0, so it removes nothing there.
module facing_cutter() {
  n = 40;
  ps = print_stock;  // the cut sits this much lower, leaving material to sand off the table and rails
  // table_concavity: a shallow hollow along the reed seat, deepest halfway between the reed's heel
  // and the facing break, so the reed seals at both ends of the table.
  nc = 16;
  hollow = table_concavity > 0 && break_z - table_rear_z > 4
    ? [for (i = [0 : nc]) [lerp(table_rear_z, break_z, i / nc), -ps + table_concavity * sin(180 * i / nc)]]
    : [[break_z, -ps]];
  pts = concat(
    [[-2, -50], [-2, -ps]], hollow,
    [for (i = [1 : n]) let(s = F * i / n) [break_z + s, facing_height(s) - ps]],
    [[L + 5, T + 5 * T / max(0.001, F) - ps], [L + 5, -50]]
  );
  w = max_body_w + 10;
  translate([w / 2, 0, 0])
    rotate([0, -90, 0])
      linear_extrude(height = w)
        polygon(pts);
}

// ---- Window cutter: the window planform extruded from well below the table up to the
// interior's mid-height, as a ring loft. Tall enough to clear the interior's rounded floor
// corners, but always below its roof, so it opens the window without notching the baffle.
// Full window width up to just above the facing (so the window outline is exact), then its upper
// corners pull in to stay 0.6mm inside the exterior at their height — near the tip a rounded beak
// can be narrower than the window there (a bari fit got two holes through its beak corners).
// The interior ring at z, interpolated between AIR_RINGS' stations (exact where they're skipped).
function interior_ring_near(z) =
  let(n = len(AIR_RINGS)) n < 2 || z < AIR_RINGS[0][0] || z > AIR_RINGS[n - 1][0] ? interior_ring_at(z)
  : let(i = air_find(z, 0, n - 1), a = AIR_RINGS[i], b = AIR_RINGS[i + 1])
    lerp(a[1], b[1], (z - a[0]) / max(1e-9, b[0] - a[0]));
function air_find(z, lo, hi) = hi - lo <= 1 ? lo :
  let(m = floor((lo + hi) / 2)) AIR_RINGS[m][0] <= z ? air_find(z, m, hi) : air_find(z, lo, m);
module window_cutter() {
  ring_loft([for (z = station_list(win_z0 + 0.01, win_front_z - 0.02, tip_curve + 1, Z_STEP * 0.8))
    let(hw = max(0.05, window_half_width(z)), E = exterior_ring_at(z), I = interior_ring_near(z), top = (I[1] + I[2]) / 2)
    // walls leaning in (sidewall_angle < 0): the cutter's upper corners stay inside them
    let(lean = sidewall_angle < 0 ? sidewall_allowed(I, top) - 0.05 : 1e3)
    let(y_rail = min(facing_at_z(z) + 0.1, top - 0.05), hw_top = max(0.05, min(hw, ring_half_width_at_y(E, top) - 0.6, lean)))
    [[-hw, -10, z], [hw, -10, z], [hw, y_rail, z], [hw_top, top, z], [-hw_top, top, z], [-hw, y_rail, z]]]);
}

// Window outline as a flat plate (for eyeballing the planform).
module window_planform() {
  n = 24;
  zs = [for (i = [0 : n]) win_z0 + (L - win_z0) * i / n];
  linear_extrude(height = 40)
    polygon(concat([for (z = zs) [window_half_width(z), z]], [for (i = [n : -1 : 0]) [-window_half_width(zs[i]), zs[i]]]));
}

// ---- Lettering (top and side text). Each design is a straight prism (down onto the top, or in
// from a side) that only acts within a thin skin that follows the curved surface: engraved = the
// prism minus the exterior shrunk inward by the depth (so the cut is the same depth everywhere);
// raised = the prism inside the exterior grown outward by it. Everything is clipped to the
// lettering area, from 2mm in front of the shank end to lettering_tip_clearance from the tip, so
// nothing lands where the lip and teeth go. Engraving is capped to leave 0.8mm of wall, and side
// text stays 3.5mm above the table, clear of the thin rails beside the window.

// Variables for the lettering texts: {tip} (inches, .105), {tip_mm}, {facing}, {chamber} and
// {length} (mm) become the design's values; {title} its name, {voice} "Alto", {voice_letter} "A".
function str_sub(s, a, b) = b <= a ? "" : chr([for (i = [a : b - 1]) ord(s[i])]);
function fmt_inch(mm) = let(t = round(mm / 25.4 * 1000))
  t >= 1000 ? str(t / 1000) : str(".", t < 100 ? "0" : "", t < 10 ? "0" : "", t);
function fmt1(x) = str(round(x * 10) / 10);
function join_str(v, sep, i = 0, acc = "") = i >= len(v) ? acc : join_str(v, sep, i + 1, i == 0 ? v[0] : str(acc, sep, v[i]));
LETTERING_TOKENS = [["{tip}", fmt_inch(tip_opening)], ["{tip_mm}", str(round(tip_opening * 100) / 100)],
                    ["{facing}", fmt1(facing_length)], ["{chamber}", fmt1(CHAMBER_W)], ["{length}", fmt1(L)],
                    ["{title}", design_title], ["{voice_letter}", len(voice) > 0 ? voice[0] : ""], ["{voice}", voice]];
function fill_tokens(s, i = 0, acc = "") =
  i >= len(s) ? acc
  : let(hit = [for (t = LETTERING_TOKENS) if (str_sub(s, i, min(len(s), i + len(t[0]))) == t[0]) t])
    len(hit) > 0 ? fill_tokens(s, i + len(hit[0][0]), str(acc, hit[0][1])) : fill_tokens(s, i + 1, str(acc, s[i]));

// Multi-line texts: a line break ("\n" in the file) starts a new line; the lines are centred
// on each other, LINE_SPACING x the letter size apart.
LINE_SPACING = 1.4;
function split_lines(s) = let(br = [for (i = [0 : len(s) - 1]) if (s[i] == "\n") i])
  [for (k = [0 : len(br)]) str_sub(s, k == 0 ? 0 : br[k - 1] + 1, k == len(br) ? len(s) : br[k])];
function text_lines(s) = has_text(s) ? [for (l = split_lines(s)) fill_tokens(l)] : [];
// A text's rough block, [width, height] as written: ~k x size per letter of the longest line.
function text_block(s, size, k = 0.62) = let(ls = text_lines(s))
  len(ls) == 0 ? [0, 0] : [k * size * max([for (l = ls) len(l)]), size * (1 + (len(ls) - 1) * LINE_SPACING)];
// Its length along the body and its width across, turned by angle (0 = along, reading to the tip).
function text_len(s, size, angle, k = 0.62) = let(b = text_block(s, size, k)) abs(sin(angle)) * b[1] + abs(cos(angle)) * b[0];
function text_wide(s, size, angle, k = 0.62) = let(b = text_block(s, size, k)) abs(cos(angle)) * b[1] + abs(sin(angle)) * b[0];

lettering_z0 = 2;
lettering_z1 = max(lettering_z0 + 2, L - lettering_tip_clearance);
// Engraving leaves >= 0.8mm: the interior keeps interior_wall() to the outside (min_wall, thinning
// toward the tip past the facing break).
lettering_wall = min(min_wall, interior_wall(lettering_z1));
// The mouthpiece's lettering is always engraved: raised letters would catch the ligature.
eff_lettering_depth = max(0.1, min(lettering_depth, lettering_wall - 0.8));
lettering_raised = lettering_style == "raised";  // the ligature's and the cap's art only
// Default spots: the middle of the lettering area, along the body; side text on the widest line,
// just behind the ligature (see side_text_z, after the ligature's numbers).
// With both a top picture and top text, the pair is centred there: picture toward the tip, text
// toward the shank, 2mm apart. Their lengths along the body: the picture's from its width and
// top_image_aspect, the text's from its size (~0.62 x size per letter when it runs along).
lettering_mid_z = (0.1 * L + lettering_z1) / 2;
top_text_len = text_len(top_text, top_text_size, top_text_angle);
top_image_len = top_image_width * (abs(cos(top_image_angle)) * top_image_aspect + abs(sin(top_image_angle)));
top_both = has_text(top_text) && has_text(top_image);
top_image_z = max(lettering_z0, min(lettering_z1, lettering_mid_z + (top_both ? (top_text_len + 2) / 2 : 0) + top_image_position));
top_text_z = max(lettering_z0, min(lettering_z1, lettering_mid_z - (top_both ? (top_image_len + 2) / 2 : 0) + top_text_position));
// For validate(): the top text's rough width across the body (same ~0.62 x size per letter) against
// the top zone's width (lettering_zone) over its length, and the side texts' length.
top_text_width = text_wide(top_text, top_text_size, top_text_angle);
function top_zone_w(z) = let(E = exterior_ring_at(max(0, min(L, z)))) 2 * max(0.05, ring_half_width_at_y(E, E[E_CY] + 0.55 * (E[E_TOP] - E[E_CY])) - 0.2);
top_text_room = min([for (k = [-1 : 1]) top_zone_w(max(lettering_z0, min(lettering_z1, top_text_z + k * top_text_len / 2)))]);
// The same for the top picture (flat: its width across the top; wrapped: the distance around).
top_image_across = top_image_width * (abs(cos(top_image_angle)) + abs(sin(top_image_angle)) * top_image_aspect);
top_image_room = min([for (k = [-1 : 1]) top_zone_w(max(lettering_z0, min(lettering_z1, top_image_z + k * top_image_len / 2)))]);
side_text_long = max(text_block(side_text_right, side_text_size)[0], text_block(side_text_left, side_text_size)[0]);
function has_text(s) = is_string(s) && len(s) > 0;
HAS_LETTERING = has_text(top_text) || has_text(top_image) || has_text(side_text_right) || has_text(side_text_left);

// lettering_font choices -> OpenSCAD font names. All are SIL OFL fonts in lib/fonts/ (licence files
// alongside), loaded by the use<>s at the top: Liberation (also bundled with desktop OpenSCAD) and
// fonts from Google Fonts. A font name OpenSCAD can't find crashes the browser (WebAssembly) build,
// and so do some font files (Cinzel, Abril Fatface, Righteous, Titan One, Bungee, Russo One, ...,
// even for one letter): test any new font in the static build before adding it.
LETTERING_FONTS = [["Sans Bold", "Liberation Sans:style=Bold"], ["Sans", "Liberation Sans"],
  ["Serif Bold", "Liberation Serif:style=Bold"], ["Serif", "Liberation Serif"], ["Serif Italic", "Liberation Serif:style=Italic"],
  ["Mono Bold", "Liberation Mono:style=Bold"], ["Bebas Neue", "Bebas Neue"], ["Marcellus SC", "Marcellus SC"],
  ["Rozha One", "Rozha One"], ["Alfa Slab One", "Alfa Slab One"], ["Audiowide", "Audiowide"], ["Black Ops One", "Black Ops One"],
  ["Lobster", "Lobster"], ["Pacifico", "Pacifico"], ["Kaushan Script", "Kaushan Script"]];
// A name not in the list is used as a font name as is (a font installed on this computer; desktop only).
lettering_font_name = let(hit = [for (f = LETTERING_FONTS) if (f[0] == lettering_font) f[1]]) len(hit) > 0 ? hit[0] : lettering_font;
// Each text's own typeface (top_text_font, ...): "same" = lettering_font.
function font_name(choice) = !is_string(choice) || choice == "same" ? lettering_font_name
  : let(hit = [for (f = LETTERING_FONTS) if (f[0] == choice) f[1]]) len(hit) > 0 ? hit[0] : choice;

// The exterior over [z0, z1] with every ring moved inward (d > 0) or outward (d < 0) by d.
module exterior_offset(z0, z1, d) {
  dirs = ring_dirs(EXT_RING_POINTS);
  n = max(2, ceil((z1 - z0) / Z_STEP));
  ring_loft([for (i = [0 : n]) let(z = z0 + (z1 - z0) * i / n, zc = max(0, min(L, z)), E = exterior_ring_at(zc))
    sweep_ring(sring(dirs, z, max(0.1, E[E_HW] - d), E[E_TOP] - d, E[E_BOT] + d, E[E_NT], E[E_NB], E[E_CY], exterior_arc_w(z)), zc, max(0.1, E[E_HW] - d), E[E_TOP] - d, E[E_CY], E[E_NT])]);
}

module lettering_text(s, size, font = undef) {
  ls = text_lines(s);
  for (i = [0 : len(ls) - 1]) translate([0, ((len(ls) - 1) / 2 - i) * LINE_SPACING * size])
    text(ls[i], size = size, font = is_undef(font) ? lettering_font_name : font, halign = "center", valign = "center");
}

// Where each design may go, per station, as a loft of rectangles: top lettering above a split
// height partway up the side, side lettering from 1mm above the underside (and 3.5mm above the
// table) to 0.5mm below the split, so the two never meet (cuts touching along an edge left
// holes). The top zone is only as wide as the body at the split, so every column of it meets the
// surface from inside: a raised letter over the bulge below used to float free of the body.
module lettering_zone(top, hw, y_hi) {
  z0 = LETTERING_SPAN[0]; z1 = LETTERING_SPAN[1];
  n = max(2, ceil((z1 - z0) / Z_STEP));
  ring_loft([for (i = [0 : n]) let(z = z0 + (z1 - z0) * i / n, E = exterior_ring_at(max(0, min(L, z))))
    let(ys = E[E_CY] + 0.55 * (E[E_TOP] - E[E_CY]))
    let(w = top ? max(0.05, ring_half_width_at_y(E, ys) - 0.2) : hw)
    let(lo = top ? ys : max(3.5, E[E_BOT] + 1), hi = top ? y_hi : max(lo + 0.01, ys - 0.5))
    [[-w, lo, z], [w, lo, z], [w, hi, z], [-w, hi, z]]]);
}

// The top picture, flat: centred, scaled to top_image_width, upright (top toward the tip) at angle
// 0 once laid on the top. Paths are relative to this file (lib/), so "../art/".
// $fn = 16 for its curves: the model's global $fn (render_fn) made a detailed drawing several times
// heavier (a knot wrapped at 40mm: 240k facets, 5.4s -> 102k, 2.8s) for no visible difference.
module top_image_2d() { art_2d(top_image, top_image_width, top_image_angle); }
module art_2d(name, width, angle) {
  rotate(-180 - angle) resize([width, 0], auto = true) import(str("../art/", name), center = true, $fn = 16);
}

// ---- Wrapped picture: the flat picture's x becomes the distance around the body from the top
// centre (u), measured on the exterior ring at top_image_z. It is cut into 3mm strips, each a
// short prism along that point's inward normal, so the picture follows the surface down both
// sides. Seen from above, a narrow picture looks the same wrapped or not.
function ext_ring_pt(E, th, z = undef) =
  let(c = cos(th), s = sin(th), e = 2 / (s >= 0 ? E[E_NT] : E[E_NB]), h = s >= 0 ? E[E_TOP] - E[E_CY] : E[E_CY] - E[E_BOT])
  let(p = [E[E_HW] * sign(c) * pow(abs(c), e), E[E_CY] + h * sign(s) * pow(abs(s), e)])
  is_undef(z) ? p : sweep_pt(p, z, E[E_HW], E[E_TOP], E[E_CY], E[E_NT]);
// The lowest the wrap goes: 1mm above the underside, and 3.5mm above the table alongside the
// window (as the side text), clear of the thin walls beside the rails.
function wrap_floor(z, E) = max(E[E_BOT] + 1, z >= win_z0 - 2 ? 3.5 : 1);
HAS_WRAP = has_text(top_image) && top_image_wrap;
WRAP_E = HAS_WRAP ? exterior_ring_at(top_image_z) : [];
// The right half of that ring from the top centre down (x >= 0), and the arc length to each point.
WRAP_PTS = !HAS_WRAP ? [] : [for (j = [0 : 360]) ext_ring_pt(WRAP_E, 90 - j / 2, top_image_z)];
WRAP_CUM = !HAS_WRAP ? [] : [for (i = 0, a = 0; i <= 360; a = a + (i < 360 ? norm(WRAP_PTS[i + 1] - WRAP_PTS[i]) : 0), i = i + 1) a];
WRAP_MAX = !HAS_WRAP ? 0 : let(fl = wrap_floor(top_image_z, WRAP_E), below = [for (i = [0 : 360]) if (WRAP_PTS[i][1] < fl) i])
  len(below) > 0 ? WRAP_CUM[below[0]] : WRAP_CUM[360];
// [x, y, tangent x, tangent y] at distance u around the ring (u > 0 toward +x); the tangent points
// the way u grows, so [t, (-ty, tx)] is a right-handed frame with the second axis outward.
function wrap_frame(u) =
  let(a = min(abs(u), WRAP_CUM[359]), i = cum_find(WRAP_CUM, a, 0, 359))
  let(f = (a - WRAP_CUM[i]) / max(1e-9, WRAP_CUM[i + 1] - WRAP_CUM[i]), p = lerp(WRAP_PTS[i], WRAP_PTS[i + 1], f))
  let(d = WRAP_PTS[i + 1] - WRAP_PTS[i], t = d / max(1e-9, norm(d)))
  u >= 0 ? [p[0], p[1], t[0], t[1]] : [-p[0], p[1], t[0], -t[1]];

module top_image_wrapped() {
  // Strip width (mm). The cut's depth follows the real surface (the skin), so a strip only sets the
  // direction and where the picture lands: 3mm places it within ~0.02mm, 1mm only cost time.
  sw = 3;
  // How far each prism starts outside the ring and reaches inside it. Far outside: where the body
  // bulges past that ring, a prism starting close in would begin under the surface and cut a sealed void.
  out = 25; inw = eff_lettering_depth + 3;
  half = min(top_image_width / 2, WRAP_MAX);
  n = ceil(half / sw);
  for (k = [-n : n - 1])
    let(u = (k + 0.5) * sw, fr = wrap_frame(u), a = wrap_frame(u - sw / 2), b = wrap_frame(u + sw / 2))
    // Each strip is a wedge fanning out with the ring's curvature (kappa, per mm), so neighbours
    // stay joined at every depth: parallel strips left gaps further out, and where the body
    // bulges past the ring those gaps became thin uncut slivers (holes in the part).
    let(turn = abs(atan2(a[2] * b[3] - a[3] * b[2], a[2] * b[2] + a[3] * b[3])) * PI / 180)
    let(kappa = min(turn / sw, 0.8 / inw), w_in = 1 - kappa * inw)
    multmatrix([[fr[2], -fr[3], 0, fr[0] + fr[3] * inw],
                [fr[3],  fr[2], 0, fr[1] - fr[2] * inw],
                [0, 0, 1, top_image_z], [0, 0, 0, 1]])
      rotate([-90, 0, 0]) linear_extrude(height = out + inw, scale = [(1 + kappa * out) / w_in, 1])
        scale([w_in, 1]) translate([-u, 0]) intersection() {   // a hair wider than the strip, so neighbours overlap
          top_image_2d();
          translate([u - sw / 2 - 0.05, -100]) square([sw + 0.1, 200]);
        }
}

// Where a wrapped picture may go: over the top and down both sides to wrap_floor, in the lettering area.
module wrap_zone(hw, y_hi) {
  z0 = LETTERING_SPAN[0]; z1 = LETTERING_SPAN[1];
  n = max(2, ceil((z1 - z0) / Z_STEP));
  ring_loft([for (i = [0 : n]) let(z = z0 + (z1 - z0) * i / n, E = exterior_ring_at(max(0, min(L, z))))
    let(lo = wrap_floor(z, E)) [[-hw, lo, z], [hw, lo, z], [hw, y_hi, z], [-hw, y_hi, z]]]);
}

// The design prisms, clipped to their zones (in the design frame).
module lettering_prisms() {
  Es = [for (i = [0 : 16]) exterior_ring_at(LETTERING_SPAN[0] + (LETTERING_SPAN[1] - LETTERING_SPAN[0]) * i / 16)];
  y_hi = max([for (E = Es) E[E_TOP]]) + 5;
  hw_hi = max([for (E = Es) E[E_HW]]) + 5;
  if (has_text(top_image) && !top_image_wrap)
    intersection() {
      lettering_zone(true, hw_hi, y_hi);
      translate([0, 0, top_image_z]) rotate([-90, 0, 0]) linear_extrude(height = y_hi)
        top_image_2d();
    }
  if (has_text(top_image) && top_image_wrap)
    intersection() {
      wrap_zone(hw_hi, y_hi);
      top_image_wrapped();
    }
  if (has_text(top_text))
    intersection() {
      lettering_zone(true, hw_hi, y_hi);
      // Readable from above: across the body with the tip pointing away (90), or along it reading
      // toward the tip (0).
      translate([0, 0, top_text_z]) rotate([-90, 0, 0]) linear_extrude(height = y_hi)
        rotate(-90 - top_text_angle) lettering_text(top_text, top_text_size, font_name(top_text_font));
    }
  // In from each side, upright as seen from that side.
  for (side = [[-1, side_text_right], [1, side_text_left]]) if (has_text(side[1]))
    intersection() {
      lettering_zone(false, hw_hi, y_hi);
      translate([0, side_text_y, side_text_z])
        multmatrix([[0, 0, side[0], 0], [0, 1, 0, 0], [-side[0], 0, 0, 0], [0, 0, 0, 1]])
          linear_extrude(height = hw_hi) lettering_text(side[1], side_text_size, font_name(side_text_font));
    }
}

module lettering_cutter() {
  difference() {
    lettering_prisms();
    exterior_offset(LETTERING_SPAN[0] - 1, LETTERING_SPAN[1] + 1, eff_lettering_depth);
  }
}

// ---- The shank band: the round stretch at the neck end, before the flare into the body (at least
// 7mm: a shank that flares from the end (bari, soprano) gets that much of its flare).
// shank_detail cuts grooves into it (rings, flutes along it, a spiral or knurling) and shank_text runs
// around it, both like the lettering: a cut through a skin that follows the surface. They start
// 1mm past the socket's lead-in (the opening keeps its wall) and leave the shank 1.2mm of wall.
// Grooves have 45-degree sides, so they print standing on the shank end without supports.
SHANK_BAND = let(f = len(FLARE_W) > 0 ? FLARE_W[0] * L : 0.09 * L, z0 = max(1.5, SHANK_BEVEL_DEPTH + 1))
  [z0, max(z0 + 2, min(max(f, z0 + 7), table_rear_z - 2))];   // short of the reed's heel
function shank_wall_at(z) = let(E = exterior_ring_at(z), c = bah_at(z))
  min(E[E_HW] - socket_d / 2, E[E_TOP] - (c + socket_ry), (c - socket_ry) - max(0, E[E_BOT]));   // the table plane cuts the underside
SHANK_WALL = min([for (i = [0 : 4]) shank_wall_at(SHANK_BAND[0] + (SHANK_BAND[1] - SHANK_BAND[0]) * i / 4)]);
SHANK_RAISED = shank_detail_style == "raised";
SHANK_CUT = SHANK_RAISED ? shank_detail_depth : max(0.1, min(shank_detail_depth, SHANK_WALL - 1.2));
SHANK_TEXT_CUT = max(0.1, min(lettering_depth, SHANK_WALL - 1.2));
// "ring" (older files) = rings, just one.
SD_KIND = shank_detail == "ring" ? "rings" : shank_detail;
SD_COUNT = shank_detail == "ring" ? 1 : max(1, shank_detail_count);
HAS_SHANK_DETAIL = SD_KIND == "rings" || SD_KIND == "flutes" || SD_KIND == "spiral" || SD_KIND == "knurled";
HAS_SHANK_ART = HAS_SHANK_DETAIL || has_text(shank_text);
// The text sits in the band's middle; with a detail too, at the flare end (the detail gets the rest).
shank_text_h = text_block(shank_text, shank_text_size)[1];
shank_text_z = !has_text(shank_text) ? SHANK_BAND[1]
  : HAS_SHANK_DETAIL ? max(SHANK_BAND[0] + shank_text_h / 2, SHANK_BAND[1] - shank_text_h / 2 - 0.3)
  : (SHANK_BAND[0] + SHANK_BAND[1]) / 2;
// The rings and flutes run from the end face (-1 on the axis): engraved ones get shallower where the
// socket's lead-in thins the wall (shank_room), keeping 1.2mm.
SD_SPAN = [-1, has_text(shank_text) ? max(1, shank_text_z - shank_text_h / 2 - 0.8) : SHANK_BAND[1]];
function shank_bevel_at(z) = let(d = SHANK_BEVEL_DEPTH) d > 0 ? SHANK_BEVEL * max(0, 1 - (z + 1) / d) : 0;
function shank_room(z0, z1) = min([for (i = [0 : 4]) let(z = z0 + (z1 - z0) * i / 4)
  shank_wall_at(max(0, z)) - shank_bevel_at(z) - 1.2]);
SD_GW = 2 * SHANK_CUT + 0.4;   // a groove's (or raised ring's) width at the surface
SD_RINGS = max(1, min(SD_COUNT, floor((SD_SPAN[1] - SD_SPAN[0]) / (SD_GW + 0.6))));
SD_CENTRES = SD_RINGS == 1 ? [lerp(SD_SPAN[0] + SD_GW / 2, SD_SPAN[1] - SD_GW / 2, clamp01(shank_detail_position))]
  : let(p = (SD_SPAN[1] - SD_SPAN[0]) / SD_RINGS) [for (i = [0 : SD_RINGS - 1]) SD_SPAN[0] + (i + 0.5) * p];
// The shank's details go square to the bore, like the end face (not to the table, which the bore
// is tilted from): built in the bore's frame, origin on its axis at the end face, z along it. A
// design z is about z + 1 there (the end face is at z = -1 on the axis).
module bore_frame() { translate([0, bah_at(-1), -1]) rotate([bore_tilt, 0, 0]) children(); }
// The surface's smallest distance from the bore axis at z (the table plane cuts the underside).
function shank_r_at(z) = let(E = exterior_ring_at(max(0, z)), c = bah_at(z)) min(E[E_HW], E[E_TOP] - c, c - max(0, E[E_BOT]));

// The band's surface, direction by direction: on a boxy body the band is not round, and details
// placed around one circle (its smallest radius) cut deeper and wider at the corners. Every detail
// is instead laid on the surface at its own angle: SD_RGRID holds the surface's distance from the
// bore axis in the bore frame (the details' frame, tilted from the design's: on a steep flare that
// matters) per station (0.5mm apart, z + 1 along the axis) and angle (5 degrees; 90 = top), found by
// bisection along the ray through the exterior rings, tabulated every 0.25mm (SD_EROWS); the table
// plane cuts the underside, as in shank_r_at.
function sd_inside(E, x, y) = y >= max(0, E[E_BOT]) &&
  (let(up = y >= E[E_CY], n = up ? E[E_NT] : E[E_NB], h = up ? E[E_TOP] - E[E_CY] : E[E_CY] - E[E_BOT])
  pow(abs(x) / E[E_HW], n) + pow(min(1.5, abs(y - E[E_CY]) / max(0.01, h)), n) <= 1);
SD_GZ = [min(SD_SPAN[0], SHANK_BAND[0]) - 1.5, SHANK_BAND[1] + 2];
SD_GN = ceil((SD_GZ[1] - SD_GZ[0]) / 0.5);
SD_EZ0 = SD_GZ[0] - 3;
SD_EROWS = !HAS_SHANK_ART ? [] : [for (z = [SD_EZ0 : 0.25 : SD_GZ[1] + 4]) exterior_ring_at(max(0, z))];
function sd_E(z) = let(t = max(0, min(len(SD_EROWS) - 1.001, (z - SD_EZ0) / 0.25)), i = floor(t))
  SD_EROWS[i] + (SD_EROWS[i + 1] - SD_EROWS[i]) * (t - i);
SD_Y0 = bah_at(-1);
function sd_ray(w, a, lo = 0, hi = 40, i = 0) = i >= 16 ? (lo + hi) / 2
  : let(m = (lo + hi) / 2, y = m * sin(a), Y = SD_Y0 + y * cos(bore_tilt) - w * sin(bore_tilt), Z = -1 + y * sin(bore_tilt) + w * cos(bore_tilt))
    sd_inside(sd_E(Z), m * cos(a), Y) ? sd_ray(w, a, m, hi, i + 1) : sd_ray(w, a, lo, m, i + 1);
SD_RGRID = !HAS_SHANK_ART ? [] : [for (i = [0 : SD_GN]) let(z = SD_GZ[0] + (SD_GZ[1] - SD_GZ[0]) * i / SD_GN)
  [for (j = [0 : 71]) sd_ray(z + 1, j * 5)]];
function sd_r(z, a) = let(t = clamp01((z - SD_GZ[0]) / (SD_GZ[1] - SD_GZ[0])) * SD_GN, i = min(SD_GN - 1, floor(t)), fi = t - i,
    b = ((a % 360) + 360) % 360 / 5, j = floor(b) % 72, j1 = (j + 1) % 72, fj = b - floor(b))
  lerp(lerp(SD_RGRID[i][j], SD_RGRID[i][j1], fj), lerp(SD_RGRID[i + 1][j], SD_RGRID[i + 1][j1], fj), fi);

// A detail as a tube swept over the surface (in the bore frame, like the end face): slices
// [angle, z, va, vz, profile], the profile's points [u, v] = u mm out from the surface (- = in) and v
// mm across the path, along (va, vz) = its across-direction in mm around and along the band, to
// the path's right seen from outside (the other way turns the tube inside out).
function sd_slice(s) = [for (p = s[4]) let(a = s[0] + p[1] * s[2] / max(1, sd_r(s[1], s[0])) * 180 / PI, z = s[1] + p[1] * s[3], r = sd_r(z, a) + p[0])
  [r * cos(a), r * sin(a), z + 1]];
module sd_sweep(slices, closed = false) {
  n = len(slices); m = len(slices[0][4]);
  pts = [for (s = slices) each sd_slice(s)];
  side = [for (i = [0 : (closed ? n : n - 1) - 1]) for (k = [0 : m - 1])
    let(a = i * m + k, b = i * m + (k + 1) % m, c = ((i + 1) % n) * m + (k + 1) % m, d = ((i + 1) % n) * m + k) each [[a, c, b], [a, d, c]]];
  caps = closed ? [] : [[for (k = [0 : m - 1]) k], [for (k = [m - 1 : -1 : 0]) (n - 1) * m + k]];
  polyhedron(points = pts, faces = concat(side, caps), convexity = 6);
}
// Profiles, reaching just past the surface (every point is placed from the surface under it, and
// a wide profile on a twisted path folds over itself): a round groove (k deep, open outward), a round bead (k high, rooted 1mm in), a V groove
// (45-degree sides, its point k in, or k out for the raised knurl's diamonds between them).
function sd_groove(k) = concat([for (i = [0 : 12]) let(t = 90 + 180 * i / 12) [k * cos(t), k * sin(t)]], [[1, -k], [1, k]]);
function sd_bead(k) = concat([for (i = [0 : 12]) let(t = -90 + 180 * i / 12) [k * cos(t), k * sin(t)]], [[-1, k], [-1, -k]]);
function sd_vee(k, out = 1) = [[-k, 0], [out, -out - k], [out, out + k]];
// The paths: around at a station, along at an angle, a helix (lead mm per turn, + / - = the two
// directions), each with its profile from a function of the station (depths ease out at the ends).
function sd_ring_path(c, prof) = [for (j = [0 : 143]) [j * 2.5, c, 0, -1, prof]];
function sd_line_path(a, z0, z1, prof) = let(n = max(2, ceil((z1 - z0) / 0.5))) [for (k = [0 : n]) let(z = z0 + (z1 - z0) * k / n) [a, z, 1, 0, prof(z)]];
function sd_helix_path(a0, lead, z0, z1, prof) = let(h = z1 - z0, n = max(4, ceil(max(h / 0.5, abs(360 * h / lead) / 3))))
  [for (k = [0 : n]) let(z = z0 + h * k / n, a = a0 + 360 * (z - z0) / lead, g = 2 * PI * sd_r(z, a) / lead, q = sqrt(1 + g * g))
    [a, z, 1 / q, -g / q, prof(z)]];

SD_K = max(0.1, min(SHANK_CUT, shank_room(SD_SPAN[0], SD_SPAN[1])));   // engraved depth, all along
SD_R = [shank_r_at(SD_SPAN[0]), shank_r_at(SD_SPAN[1])];
SD_STARTS = min(SD_COUNT, 4);
SD_LEAD = SD_STARTS * 2 * SD_GW;                       // a spiral's turns 2 groove widths apart
SD_KNURL_LEAD = 2 * PI * SD_R[0] * 1.2;               // knurl lines ~40 degrees off the bore
SD_FW = min(PI * 2 * shank_r_at((SD_SPAN[0] + SD_SPAN[1]) / 2) / max(2, SD_COUNT) * 0.6, 2 * SHANK_CUT);   // a flute's width
// Twisted and fluted details run from past the end face to the band's end, easing out over their
// last mm at 45 degrees (no ledge to print standing on the end face).
function sd_ease(z, k) = max(0.05, min(k, SD_SPAN[1] - z));
// apex_out: the raised knurl's grooves, their point 0.3mm under the surface so each diamond is rooted
// in the body (the faceted surface lies a little inside the true one sd_r gives).
module sd_knurl(apex_out) {
  for (s = [-1, 1], i = [0 : max(2, SD_COUNT) - 1])
    sd_sweep(sd_helix_path(i * 360 / max(2, SD_COUNT), s * SD_KNURL_LEAD, SD_SPAN[0] - 0.5, SD_SPAN[1],
      function(z) apex_out ? sd_vee(0.3, SHANK_CUT + 0.5) : sd_vee(sd_ease(z, SD_K))));
}

module shank_cutter() {
  // Rings: half-round grooves around the band (no flat ledge to print).
  if (!SHANK_RAISED && SD_KIND == "rings")
    bore_frame() for (c = SD_CENTRES)
      sd_sweep(sd_ring_path(c, sd_groove(max(0.1, min(SHANK_CUT, shank_room(c - SD_GW / 2, c + SD_GW / 2))))), true);
  // Flutes: V grooves along the band, their point SD_FW/2 under the surface.
  if (!SHANK_RAISED && SD_KIND == "flutes")
    bore_frame() for (i = [0 : max(2, SD_COUNT) - 1])
      sd_sweep(sd_line_path(90 + i * 360 / max(2, SD_COUNT), SD_SPAN[0] - 0.5, SD_SPAN[1],
        function(z) sd_vee(sd_ease(z, min(SD_FW / 2, shank_room(max(0, z), max(0, z)))))));
  if (!SHANK_RAISED && SD_KIND == "spiral")
    bore_frame() for (i = [0 : SD_STARTS - 1])
      sd_sweep(sd_helix_path(i * 360 / SD_STARTS, SD_LEAD, SD_SPAN[0] - 0.5, SD_SPAN[1], function(z) sd_groove(sd_ease(z, SD_K))));
  if (!SHANK_RAISED && SD_KIND == "knurled") bore_frame() sd_knurl(false);
  if (has_text(shank_text)) shank_text_cutter();
}

// Raised: the same shapes standing out SHANK_CUT (rings and the spiral as half-round beads, flutes
// as V ridges, knurling as diamonds), trimmed to a skin that follows the surface.
module shank_raised() {
  intersection() {
    exterior_offset(SD_SPAN[0] - 1, SD_SPAN[1] + 1, -SHANK_CUT);
    bore_frame() intersection() {
      translate([-60, -60, 0]) cube([120, 120, 60]);   // not past the end face
      union() {
        if (SD_KIND == "rings")
          for (c = SD_CENTRES) sd_sweep(sd_ring_path(c, sd_bead(SHANK_CUT)), true);
        if (SD_KIND == "flutes")
          for (i = [0 : max(2, SD_COUNT) - 1])
            sd_sweep(sd_line_path(90 + i * 360 / max(2, SD_COUNT), SD_SPAN[0], SD_SPAN[1],
              function(z) [[-1, -SD_FW / 2], [0, -SD_FW / 2], [SD_FW / 2, 0], [0, SD_FW / 2], [-1, SD_FW / 2]]));
        if (SD_KIND == "spiral")
          for (i = [0 : SD_STARTS - 1])
            sd_sweep(sd_helix_path(i * 360 / SD_STARTS, SD_LEAD, SD_SPAN[0], SD_SPAN[1], function(z) sd_bead(SHANK_CUT)));
        if (SD_KIND == "knurled")
          difference() {
            translate([0, 0, SD_SPAN[0] + 1]) cylinder(r = SD_R[1] + SHANK_CUT + 9, h = SD_SPAN[1] - SD_SPAN[0], $fn = EXT_RING_POINTS);
            sd_knurl(true);
          }
      }
    }
  }
}

// The shank text, wrapped around the band: the flat text's x becomes the distance around from the
// top (shank_text_around turns it; + toward the right side, -x), cut into 2mm strips, each a wedge
// standing out along that point's radius from the bore. Read with the tip up, letters upright.
module shank_text_cutter() {
  R = shank_r_at(shank_text_z);
  sw = 2; inw = SHANK_TEXT_CUT + 2; out = 20;  // far out: where the band flares, a strip must still start outside
  half = min(text_block(shank_text, shank_text_size, 1)[0] / 2 + 1, PI * R);
  n = ceil(half / sw);
  z0 = SHANK_BAND[0]; z1 = shank_text_z + shank_text_h / 2 + 1.5;
  difference() {
    bore_frame() intersection() {
      translate([-50, -50, z0 + 1]) cube([100, 100, z1 - z0]);
      for (k = [-n : n - 1])
        let(u = (k + 0.5) * sw, a = 90 + shank_text_around + u / R * 180 / PI, nr = [cos(a), sin(a)], t = [-sin(a), cos(a)])
        let(Rk = sd_r(shank_text_z, a))   // the surface in this strip's direction (a boxy band isn't round)
        multmatrix([[t[0], 0, nr[0], nr[0] * (Rk - inw)], [t[1], 0, nr[1], nr[1] * (Rk - inw)],
                    [0, 1, 0, shank_text_z + 1], [0, 0, 0, 1]])
          linear_extrude(height = inw + out, scale = [(Rk + out) / (Rk - inw), 1])
            scale([(Rk - inw) / R, 1]) translate([-u, 0]) intersection() {
              lettering_text(shank_text, shank_text_size, font_name(shank_text_font));
              translate([u - sw / 2 - 0.05, -50]) square([sw + 0.1, 100]);
            }
    }
    exterior_offset(z0 - 2, z1 + 2, SHANK_TEXT_CUT);
  }
}


// The curve each profile override controls, as the model currently has it: the override itself
// or the built-in shape, and for the interior after the wall clamps (so a dragged curve shows
// where a guarantee holds it back). Only evaluated when echoed — the app's curve editor
// does echo(CURVE_EDITOR = curve_editor_curves()) with the .echo export (no geometry).
function curve_editor_curves() =
  let(sample = function(z0, z1, f) [for (z = [z0 : 0.5 : z1]) [z, f(z)]])
  let(air = function(z0, z1) [for (r = AIR_RINGS) if (r[0] >= z0 && r[0] <= z1) r])
  let(inner = air(shank_taper_end_z, L - tip_curve - 1))
  [["L", L],
   ["ext_width_points", [for (c = EXT_WIDTH_C) [c[0], c[1]]]],
   ["ext_top_points", [for (c = EXT_TOP_C) [c[0], c[1]]]],
   ["ext_bottom_points", [for (c = EXT_BOTTOM_C) [c[0], c[1]]]],
   ["ext_widest_points", [for (c = EXT_WIDEST_C) [c[0], c[1]]]],
   ["ext_top_squareness_points", sample(0, L, function(z) exterior_top_exp(z))],
   ["ext_bottom_squareness_points", sample(0, L, function(z) exterior_bottom_exp(z))],
   ["table_width_points", has_pts(table_width_points) ? table_width_points : [[table_rear_z, table_width_rear], [L, table_width_tip]]],
   ["interior_width_points", [for (r = inner) [r[0], 2 * r[1][0]]]],
   ["interior_top_squareness_points", [for (r = inner) [r[0], r[1][3]]]],
   ["interior_bottom_squareness_points", [for (r = inner) [r[0], r[1][4]]]],
   ["floor_points", [for (r = air(has_pts(FLOOR_C) ? min(FLOOR_C[0][0], eff_throat_z) : eff_throat_z, win_z0)) [r[0], r[1][2]]]],
   ["baffle_points_custom", baffle_base_pts],
   ["facing_gauge_points", sample(0, F, function(d) facing_height(F - d))]];

// The lines the app's "Edit shape" draws and drags, in the design frame (mm, z from the shank end,
// y above the table), after every slider and shape edit: [name, [[z, value], ...]] (value: height,
// or the full width for "width" / "chamber_width"), then the landmarks and the print frame. Only
// evaluated when echoed (echo(SHAPE_EDIT = shape_edit_lines())).
function shape_edit_lines() =
  let(sample = function(z0, z1, C) [for (z = [z0 : max(0.5, (z1 - z0) / 60) : z1]) [z, pchip_at(z, C)]])
  let(rings = function(z0, z1) [for (r = AIR_RINGS) if (r[0] >= z0 && r[0] <= z1) r])
  // the underside as built (the socket's wall, the scoop's blend into the table), up to where the
  // table plane cuts it: the outline table alone runs on past the scoop, off the silhouette
  let(bot = [for (z = [0 : 0.5 : table_rear_z]) [z, exterior_ring_at(z)[E_BOT]]])
  let(cut = [for (i = [0 : len(bot) - 1]) if (bot[i][1] <= 0) i])
  let(k = len(cut) ? cut[0] : len(bot) - 1)
  let(cross = k > 0 && bot[k][1] <= 0
    ? [lerp(bot[k - 1][0], bot[k][0], bot[k - 1][1] / (bot[k - 1][1] - bot[k][1])), 0] : bot[k])
  // the top and width as built too (the socket's wall, the nose and the tip rounding over)
  let(ext = [for (z = [0 : max(0.5, L / 60) : L]) [z, exterior_ring_at(z)]])
  [["top", [for (e = ext) [e[0], e[1][E_TOP]]]],
   ["underside", has_pts(EXT_BOTTOM_C) ? [for (i = [0 : k - 1]) bot[i], cross] : []],
   ["width", [for (e = ext) [e[0], 2 * e[1][E_HW]]]],
   ["baffle", [for (r = rings(baffle_start_z, L)) [r[0], r[1][1]]]],
   ["floor", [for (r = rings(eff_throat_z, win_z0)) [r[0], r[1][2]]]],
   ["chamber_width", [for (r = rings(shank_taper_end_z, L)) [r[0], 2 * r[1][0]]]],
   // the reed side's edge from the table's back to the tip (flat, then the facing): with "top" and
   // "underside" it closes the outside silhouette
   ["rails", [for (z = [table_rear_z : max(0.5, (L - table_rear_z) / 40) : L]) [z, facing_at_z(z)]]],
   ["landmarks", [["socket", eff_shank_depth], ["shoulder", SWEEP_Z0], ["shoulder_end", SWEEP_ZK],
                  // where the shank flares into the body: the width's and the top's own flare
                  ["flare_w0", (len(FLARE_W) ? FLARE_W[0] : 0.09) * L], ["flare_w1", (len(FLARE_W) ? FLARE_W[2] : 0.21) * L],
                  ["flare_h0", (len(FLARE_H) ? FLARE_H[0] : 0.09) * L], ["flare_h1", (len(FLARE_H) ? FLARE_H[2] : 0.21) * L],
                  ["throat", eff_throat_z], ["window", win_z0],
                  // where the tip starts rounding over: the top's and width's last handle (an edit
                  // there holds on to the tip)
                  ["top_end", L - tip_nose], ["width_end", L - tip_curve],
                  ["table", table_rear_z], ["break", break_z], ["tip", L]]],
   ["L", L],
   ["frame", [print_orientation, bore_tilt, end_face_lift]]];

// Where each parameter acts, for the app's "zoom to parameter": [name, [[x0, y0, z0],
// [x1, y1, z1]] (design frame), view, cut] — view is the side to look from ("table", "top",
// "side" (from +x, the left side text's side), "side_right" (from -x), "end" (from the shank end), "tip"
// (from the tip end, a little above), "iso"), cut asks for a lengthwise section (the part is inside). Followed by
// ["frame", [print_orientation, bore_tilt, end_face_lift]] so the viewer can map boxes into the
// print orientation it shows. Only evaluated when echoed (echo(PARAM_FOCUS = param_focus())).
function param_focus() =
  let(box = function(z0, z1)
    let(a = max(0, z0), b = min(L, z1), Es = [for (i = [0 : 12]) exterior_ring_at(a + (b - a) * i / 12)])
    [[-max([for (E = Es) E[E_HW]]), max(0, min([for (E = Es) E[E_BOT]])), a], [max([for (E = Es) E[E_HW]]), max([for (E = Es) E[E_TOP]]), b]])
  let(whole = box(0, L), socket = box(0, eff_shank_depth + 3), bore = box(max(0, shank_taper_end_z - 3), eff_throat_z + 3),
      throat = box(eff_throat_z - 8, eff_throat_z + 6), chamber = box(eff_throat_z - 2, min(L, win_z0 + 12)),
      baffle = box(baffle_start_z - 3, L), window = box(win_z0 - 3, L), tip = box(L - 12, L), beak = box(break_z - 8, L),
      shoulder = box(SHOULDER_F2 * L - 8, L), table = box(table_start_z, L), facing = box(break_z - 3, L), rear = box(0, table_rear_z + 3), body = box(0.1 * L, 0.6 * L),
      lettering = box(lettering_z0, lettering_z1), ligature = box(lig_zt - 3, lig_z1 + 3), lettering_top = box(top_text_z - 12, top_text_z + 12),
      lettering_image = box(top_image_z - 15, top_image_z + 15),
      lettering_side = box(side_text_z - 15, side_text_z + 15), shank = box(0, SHANK_BAND[1] + 4),
      // the side text's shared settings look at the side that has text (the right one is on -x)
      side_view = has_text(side_text_right) && !has_text(side_text_left) ? "side_right" : "side")
  [["frame", [print_orientation, bore_tilt, end_face_lift]],
   ["overall_length", whole, "iso", false], ["neck_cork_diameter", socket, "end", false], ["shank_clearance", socket, "end", false], ["shank_bevel", socket, "end", false], ["shank_bevel_depth", socket, "side", true],
   ["shank_depth", socket, "side", true], ["bore_diameter", bore, "side", true], ["bore_tilt", whole, "side", false],
   ["chamber_shape", chamber, "side", true], ["chamber_width_extra", chamber, "side", true], ["chamber_flare", chamber, "side", true],
   ["chamber_full_length", chamber, "side", true], ["chamber_height", chamber, "side", true],
   ["throat_position", throat, "side", true], ["throat_width", throat, "side", true],
   ["throat_taper", throat, "side", true], ["throat_shape", throat, "side", true], ["floor_shape", chamber, "side", true],
   ["baffle_type", baffle, "side", true], ["baffle_height", baffle, "side", true], ["baffle_start", baffle, "side", true], ["baffle_hump", baffle, "side", true],
   ["baffle_curve", baffle, "side", true], ["baffle_texture", window, "table", false], ["baffle_texture_depth", window, "table", false], ["baffle_texture_spacing", window, "table", false], ["sidewall_angle", window, "table", false], ["shank_diameter", socket, "side", false],
   ["window_length", window, "table", false], ["window_width", window, "table", false], ["window_taper", window, "table", false],
   ["window_rear_radius", window, "table", false], ["side_rail_width", window, "table", false],
   ["tip_rail_thickness", tip, "table", false], ["tip_curve", tip, "table", false],
   ["table_width_tip", table, "table", false], ["table_width_rear", table, "table", false], ["table_length", table, "table", false],
   ["tip_opening", facing, "side", false], ["facing_length", facing, "side", false], ["facing_model", facing, "side", false],
   ["facing_exponent", facing, "side", false], ["print_stock", facing, "side", false],
   ["body_width", whole, "top", false], ["body_height", whole, "side", false], ["beak_tip_height", beak, "side", false],
   ["body_squareness", body, "iso", false], ["beak_squareness", beak, "top", false], ["beak_curve", shoulder, "side", false], ["beak_length", shoulder, "side", false], ["shoulder_sweep", shoulder, "iso", false], ["shoulder_smoothness", shoulder, "iso", false], ["beak_top_width", beak, "tip", false], ["ligature_made", ligature, "iso", false], ["underside_squareness", table, "table", false],
   ["bore_axis_height", bore, "side", true], ["min_wall", whole, "side", true],
   ["table_concavity", table, "table", false],
   ["top_text", lettering_top, "top", false], ["top_text_size", lettering_top, "top", false],
   ["top_text_angle", lettering_top, "top", false], ["top_text_position", lettering_top, "top", false],
   ["top_image", lettering_image, "top", false], ["top_image_width", lettering_image, "top", false], ["top_image_aspect", lettering_image, "top", false],
   ["top_image_angle", lettering_image, "top", false], ["top_image_position", lettering_image, "top", false],
   ["side_text_right", lettering_side, "side_right", false], ["side_text_left", lettering_side, "side", false],
   ["side_text_size", lettering_side, side_view, false], ["side_text_position", lettering_side, side_view, false],
   ["side_text_vertical", lettering_side, side_view, false], ["lettering_style", lettering, "iso", false],
   ["lettering_depth", lettering, "iso", false], ["lettering_font", lettering, "iso", false],
   ["lettering_tip_clearance", lettering, "top", false], ["top_text_font", lettering_top, "top", false],
   ["side_text_font", lettering_side, side_view, false], ["shank_text", shank, "iso", false], ["shank_text_size", shank, "iso", false],
   ["shank_text_around", shank, "iso", false], ["shank_text_font", shank, "iso", false], ["shank_detail", shank, "iso", false], ["shank_detail_style", shank, "iso", false],
   ["shank_detail_count", shank, "iso", false], ["shank_detail_position", shank, "side", false], ["shank_detail_depth", shank, "side", false],
   ["ligature_text_font", ligature, "top", false],
   ["ligature_length", ligature, "side", false], ["ligature_position", ligature, "side", false],
   ["ligature_wall", ligature, "end", false], ["ligature_fit", ligature, "end", false],
   ["ligature_shape", ligature, "end", false], ["ligature_reed_grip", ligature, "end", false], ["ligature_tongue", ligature, "side", false], ["ligature_tongue_side", ligature, "side", false],
   ["ligature_text", ligature, "top", false], ["ligature_text_size", ligature, "top", false], ["ligature_text_angle", ligature, "top", false],
   ["ligature_image", ligature, "top", false], ["ligature_image_width", ligature, "top", false], ["ligature_image_aspect", ligature, "top", false],
   ["ligature_image_angle", ligature, "top", false], ["ligature_lettering_position", ligature, "top", false],
   ["ext_width_points", whole, "top", false], ["ext_top_points", whole, "side", false], ["ext_bottom_points", rear, "side", false],
   ["ext_widest_points", whole, "side", false], ["ext_top_squareness_points", whole, "iso", false],
   ["ext_bottom_squareness_points", whole, "table", false], ["table_width_points", table, "table", false],
   ["interior_width_points", box(shank_taper_end_z, L), "side", true], ["interior_top_squareness_points", box(shank_taper_end_z, L), "side", true],
   ["interior_bottom_squareness_points", box(shank_taper_end_z, L), "side", true], ["floor_points", chamber, "side", true],
   ["baffle_points_custom", baffle, "side", true], ["facing_gauge_points", facing, "side", false],
   ["shape_width", whole, "top", false], ["shape_top", whole, "side", false], ["shape_bottom", rear, "side", false],
   ["shape_widest", whole, "side", false], ["shape_top_squareness", whole, "iso", false],
   ["shape_bottom_squareness", whole, "table", false], ["shape_baffle", baffle, "side", true]];

// ===========================================================================================
// 8b. Ligature (part = "ligature"): a friction-fit ring made for this mouthpiece plus a reed. It
// slides on over the tip with the reed and wedges where the body grows to fill it (the band's
// front edge ligature_position behind the window's back end). Shapes: "d" (default) is round over
// the top like the classic printed ring ligatures and follows the reed underneath, so it presses
// across the reed's width; "round"; "conform" follows the whole body. The reed pocket is
// ligature_reed_grip shallower than the reed, so the reed is the tight spot (the body keeps
// ligature_fit). Optional tongue: the band runs ligature_tongue further toward the shank on one side.
// Built by construction from SUPPORT FUNCTIONS: for each station, h(phi) = the farthest the body
// (above the table) and the reed (below it) reach in direction phi. A running max from the tip
// back makes every station contain everything in front of it, so the band always passes over the
// beak on its way to its seat. "round" is the smallest circle (centred on the midline) around that;
// "d" is the hull of that support and the upper half of the smallest circle around the body alone
// (max of two support functions: still a valid one, containing the body). Inside = h + ligature_fit, outside = inside + ligature_wall (an exact outward offset, so it can't
// self-intersect); the rings are the corners where neighbouring support lines meet. See
// docs/dev/GEOMETRY.md, "Ligature".
// ===========================================================================================

// The band sits on the reed (behind its heel it would have nothing to hold) and behind the tip;
// the tongue gives way first, then the length.
lig_room = L - 8 - (table_rear_z + 1);
lig_len = max(4, min(ligature_length, lig_room));
lig_tongue = max(0, min(ligature_tongue, lig_room - lig_len));
lig_z1 = min(L - 8, max(table_rear_z + 1 + lig_len + lig_tongue, win_z0 - ligature_position));  // front edge
lig_z0 = lig_z1 - lig_len;          // rear edge (the short side)
lig_zt = lig_z0 - lig_tongue;       // rear end of the tongue

// The side text's default spot: 2.5mm behind the band's rear edge on the sides (a metal ligature
// sits there too), where the band doesn't cover it; side_text_position moves it from there.
// (On the sides, 90 degrees from the tongue's middle, the tongue reaches 1/8 of its length: lig_tongue_w.)
side_text_home = lig_z0 - lig_tongue / 8 - 2.5 - side_text_long / 2;
side_text_z = max(lettering_z0, min(lettering_z1, max(lettering_z0 + side_text_long / 2, side_text_home) + side_text_position));
side_text_y = exterior_ring_at(side_text_z)[E_CY] + side_text_vertical;
// The stretch of the body the designs can reach (lettering_z0..z1 at most): the zones and the skin
// are lofted over just this, not the whole lettering area (that was most of lettering's cost).
// Generous: ~1 x size per letter (wide faces), the length either way for any angle, plus 2mm.
LETTERING_SPAN = let(ext = concat(
    has_text(top_text) ? [[top_text_z, max(text_len(top_text, top_text_size, top_text_angle, 1), text_wide(top_text, top_text_size, top_text_angle, 1))]] : [],
    has_text(top_image) ? [[top_image_z, top_image_wrap ? 2 * top_image_len + top_image_width : max(top_image_len, top_image_width * max(1, top_image_aspect))]] : [],
    has_text(side_text_right) || has_text(side_text_left) ? [[side_text_z, max(text_block(side_text_right, side_text_size, 1)[0], text_block(side_text_left, side_text_size, 1)[0])]] : []))
  len(ext) == 0 ? [lettering_z0, lettering_z1]
  : [max(lettering_z0, min([for (e = ext) e[0] - e[1] / 2]) - 2), min(lettering_z1, max([for (e = ext) e[0] + e[1] / 2]) + 2)];
// (Room for raised lettering on the body: none, the mouthpiece's lettering is always engraved.)
lig_raise = 0;
// Covers the sampled outline's chords (the true curve bulges a few hundredths between samples).
LIG_MARGIN = 0.03;
LIG_N = 4 * round(render_fn * 1.5 / 4);                 // support directions per ring
LIG_U = [for (i = [0 : LIG_N - 1]) let(a = -90 + (i - 0.5) * 360 / LIG_N) [cos(a), sin(a)]];
// Support values of points P over LIG_U: one matrix product (LIG_U times P's columns), then each
// row's max (several times faster than a loop per direction).
function lig_sup(P) = [for (row = LIG_U * [[for (p = P) p[0]], [for (p = P) p[1]]]) max(row)];
// The reed: any reed, so a nominal one, 3mm at the heel and as wide as the table (the band is a taper
// fit: a thicker reed seats it a little further forward, a thinner one further back).
LIG_REED_T = 3.0;
lig_reed_hw = max([for (i = [0 : 4]) ring_half_width_at_y(exterior_ring_at(lig_z0 + lig_len * i / 4), 0)]);
lig_step = (lig_z1 - lig_zt) / max(2, ceil(lig_z1 - lig_zt));  // ~1mm between stations
lig_nb = round((lig_z1 - lig_zt) / lig_step);                 // stations over the band, tongue included
lig_rings = max(2, ceil(lig_len));                             // rings of the loft (each follows the tongue's edge)
// The tongue's edge: how much of it (0..1) at angle th (the reed side is -90, the top 90).
lig_tongue_dir = ligature_tongue_side == "top" ? 90 : -90;
function lig_tongue_w(th) = pow((1 + cos(th - lig_tongue_dir)) / 2, 3);

// The reed's cross-section: flat on the table (y = 0), the bark arched below it (thickest in the
// middle, edges ~0.65 of it). Its half-width narrows with the tip's own curve.
function lig_reed_pts(z, t, hw = lig_reed_hw) =
  let(rw = max(0.3, hw * tip_factor(L - z, tip_curve)), te = 0.65 * t)
  concat([[rw, 0], [-rw, 0]], [for (i = [-8 : 8]) [rw * i / 8, -(te + (t - te) * (1 - pow(i / 8, 2)))]]);

// Body above the table plane + the table's edges.
function lig_body_pts(z) =
  let(E = exterior_ring_at(z))
  let(body = [for (j = [0 : LIG_N - 1]) let(p = ext_ring_pt(E, j * 360 / LIG_N, z)) if (p[1] >= 0) p])
  let(hw0 = E[E_BOT] < 0 ? ring_half_width_at_y(E, 0) : 0)
  concat(body, [[hw0, 0], [-hw0, 0]]);

// [body + reed, body alone] support at z. The reed counts ligature_reed_grip + ligature_fit
// thinner, so after the band's ligature_fit gap it is squeezed by the grip (full thickness
// otherwise, also ahead: conservative).
function lig_support(z) =
  let(Pb = lig_body_pts(z), Pr = lig_reed_pts(z, max(0.5, LIG_REED_T - ligature_reed_grip - ligature_fit)), m = lig_raise + LIG_MARGIN)
  let(hb = lig_sup(Pb), hr = lig_sup(Pr))
  [[for (i = [0 : LIG_N - 1]) max(hb[i], hr[i]) + m], [for (i = [0 : LIG_N - 1]) hb[i] + m]];
function pmax(a, b) = [for (i = [0 : len(a) - 1]) max(a[i], b[i])];
function pmax2(a, b) = [pmax(a[0], b[0]), pmax(a[1], b[1])];

// The smallest circle centred on the midline (0, c) holding a shape with support h: radius
// R(c) = max(h - c sin(phi)) is convex in c, so a ternary search finds c. Returns its support.
function lig_circle_R(h, c) = max([for (i = [0 : LIG_N - 1]) h[i] - c * LIG_U[i][1]]);
function lig_circle_c(h, lo, hi, it = 0) =
  it >= 40 ? (lo + hi) / 2
  : let(m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3)
    lig_circle_R(h, m1) < lig_circle_R(h, m2) ? lig_circle_c(h, lo, m2, it + 1) : lig_circle_c(h, m1, hi, it + 1);
function lig_round(h) = let(c = lig_circle_c(h, -30, 40), R = lig_circle_R(h, c)) [for (u = LIG_U) R + c * u[1]];
// "d": h (body + reed) and the upper half of the smallest circle around the body (support of a half
// disc: R + c sin above its centre line, R |cos| + c sin below).
function lig_d(h, hb) = let(c = lig_circle_c(hb, -30, 40), R = lig_circle_R(hb, c))
  [for (i = [0 : LIG_N - 1]) let(u = LIG_U[i]) max(h[i], u[1] >= 0 ? R + c * u[1] : R * abs(u[0]) + c * u[1])];

// Support values at the band's stations (lig_zt .. lig_z1, lig_step apart): each the max over that
// station and everything ahead of it, then shaped by ligature_shape.
function lig_env() =
  let(n_ahead = ceil((L - 0.05 - lig_z1) / lig_step))
  let(zs = [for (i = [0 : lig_nb + n_ahead]) min(L - 0.05, lig_zt + i * lig_step)])
  let(H = [for (z = zs) lig_support(z)], n = len(H) - 1)
  let(back = [for (i = n, acc = H[n]; i >= 0; acc = i > 0 ? pmax2(H[i - 1], acc) : acc, i = i - 1) acc])
  [for (j = [0 : lig_nb]) let(h = back[n - j])
    ligature_shape == "conform" ? h[0] : ligature_shape == "round" ? lig_round(h[0]) : lig_d(h[0], h[1])];

// Support values at any z in the band, between stations.
function lig_h_at(env, z) =
  let(f = clamp01((z - lig_zt) / (lig_z1 - lig_zt)) * lig_nb, i = min(lig_nb - 1, floor(f)), t = f - i)
  [for (k = [0 : LIG_N - 1]) lerp(env[i][k], env[i + 1][k], t)];
// The same for direction k alone (a ring's corners each need only two of them).
function lig_hk_at(env, z, k) =
  let(f = clamp01((z - lig_zt) / (lig_z1 - lig_zt)) * lig_nb, i = min(lig_nb - 1, floor(f)), t = f - i)
  lerp(env[i][k], env[i + 1][k], t);

// Corner i of a ring from support values h pushed out by d: where lines i and i+1 meet (index 0 at
// the bottom centre, counter-clockwise, as sring's rings run).
function lig_corner(h, i, d) = lig_corner2(h[i], h[(i + 1) % LIG_N], i, d);
function lig_corner2(hi, hj, i, d) =
  let(a = LIG_U[i], b = LIG_U[(i + 1) % LIG_N], ha = hi + d, hb = hj + d, det = a[0] * b[1] - a[1] * b[0])
  [(ha * b[1] - hb * a[1]) / det, (a[0] * hb - b[0] * ha) / det];
// Corner i of the band's ring at z (from env, between stations).
function lig_corner_at(env, z, i, d) = lig_corner2(lig_hk_at(env, z, i), lig_hk_at(env, z, (i + 1) % LIG_N), i, d);
function lig_ring(h, z, d) = [for (i = [0 : LIG_N - 1]) concat(lig_corner(h, i, d), z)];
// Ring t (0 = the rear edge, following the tongue; 1 = the front edge): each corner at its own z.
// inset: that far inside both edges (the lettering's skin).
function lig_ring_t(env, t, d, inset = 0) =
  [for (i = [0 : LIG_N - 1])
    let(th = -90 + i * 360 / LIG_N, z = lerp(lig_z0 - lig_tongue * lig_tongue_w(th) + inset, lig_z1 - inset, t))
    concat(lig_corner_at(env, z, i, d), z)];

function ring_perimeter(R) = vsum([for (i = [0 : len(R) - 1]) norm(R[(i + 1) % len(R)] - R[i])]);

// A tube from matching outer and inner rings (rear to front, same point count): the two walls and
// both end faces as triangles, so non-planar ends (the tongue) are fine.
module tube_loft(outer, inner) {
  m = len(outer) - 1;
  n = len(outer[0]);
  pts = concat([for (r = outer) each r], [for (r = inner) each r]);
  o = function(i, k) i * n + (k % n);
  q = function(i, k) (m + 1) * n + i * n + (k % n);
  faces = concat(
    [for (i = [0 : m - 1]) for (k = [0 : n - 1]) each [[o(i, k), o(i + 1, k + 1), o(i, k + 1)], [o(i, k), o(i + 1, k), o(i + 1, k + 1)]]],
    [for (i = [0 : m - 1]) for (k = [0 : n - 1]) each [[q(i, k), q(i, k + 1), q(i + 1, k + 1)], [q(i, k), q(i + 1, k + 1), q(i + 1, k)]]],
    [for (k = [0 : n - 1]) each [[o(0, k), o(0, k + 1), q(0, k + 1)], [o(0, k), q(0, k + 1), q(0, k)]]],
    [for (k = [0 : n - 1]) each [[o(m, k), q(m, k), q(m, k + 1)], [o(m, k), q(m, k + 1), o(m, k + 1)]]]);
  polyhedron(points = pts, faces = faces, convexity = 4);
}

// ---- Lettering on the ligature (ligature_text / ligature_image) on the band's top, in the
// mouthpiece's lettering font, style and depth. As the top text: a straight prism down onto the
// top, acting only in a skin of the band (its own rings offset by the depth, so it follows the
// band), kept LIG_ART_INSET inside the band's edges (no faces shared with them). Picture toward the
// tip, text toward the shank, 2mm apart, centred on the top (the tongue counts when it is on top).
// Engraving leaves at least 0.8mm of the band's wall.
// "same" = the mouthpiece's top picture (and its aspect).
LIG_IMAGE = ligature_image == "same" ? top_image : ligature_image;
LIG_IMAGE_ASPECT = ligature_image == "same" ? top_image_aspect : ligature_image_aspect;
LIG_HAS_ART = has_text(ligature_text) || has_text(LIG_IMAGE);
LIG_ART_INSET = max(0.8, min(1.0, 0.45 * ligature_wall) + 0.3);   // clear of the rounded rear edge
lig_art_depth = lettering_raised ? lettering_depth : max(0.1, min(lettering_depth, ligature_wall - 0.8));
lig_top_z0 = lig_z0 - lig_tongue * lig_tongue_w(90);   // the top's rear edge
lig_text_len = text_len(ligature_text, ligature_text_size, ligature_text_angle);
lig_text_wide = text_wide(ligature_text, ligature_text_size, ligature_text_angle);
lig_image_len = ligature_image_width * (abs(cos(ligature_image_angle)) * LIG_IMAGE_ASPECT + abs(sin(ligature_image_angle)));
lig_image_wide = ligature_image_width * (abs(sin(ligature_image_angle)) * LIG_IMAGE_ASPECT + abs(cos(ligature_image_angle)));
lig_art_both = has_text(ligature_text) && has_text(LIG_IMAGE);
lig_art_mid = max(lig_top_z0, min(lig_z1, (lig_top_z0 + lig_z1) / 2 + ligature_lettering_position));
lig_image_z = lig_art_mid + (lig_art_both ? (lig_text_len + 2) / 2 : 0);
lig_text_z = lig_art_mid - (lig_art_both ? (lig_image_len + 2) / 2 : 0);
lig_art_len = (has_text(ligature_text) ? lig_text_len : 0) + (has_text(LIG_IMAGE) ? lig_image_len : 0) + (lig_art_both ? 2 : 0);
lig_art_wide = max(has_text(ligature_text) ? lig_text_wide : 0, has_text(LIG_IMAGE) ? lig_image_wide : 0);

// The text and picture as prisms standing up from the band's widest line (so they reach only its
// top), readable from above with the tip away, as the mouthpiece's top text.
module lig_art_prisms(env, y_lo, y_hi) {
  if (has_text(LIG_IMAGE))
    translate([0, y_lo, lig_image_z]) rotate([-90, 0, 0]) linear_extrude(height = y_hi - y_lo)
      art_2d(LIG_IMAGE, ligature_image_width, ligature_image_angle);
  if (has_text(ligature_text))
    translate([0, y_lo, lig_text_z]) rotate([-90, 0, 0]) linear_extrude(height = y_hi - y_lo)
      rotate(-90 - ligature_text_angle) lettering_text(ligature_text, ligature_text_size, font_name(ligature_text_font));
}

// Engraved: what to cut from the band; raised: what to add to it. The skin is a tube between the
// band's rings at two offsets, LIG_ART_INSET inside both edges (two closed solids subtracted left a
// sliver where their end caps differ, over the tongue's slanted edge).
module lig_art(env, y_lo, y_hi) {
  d = ligature_fit + ligature_wall;
  rings = function(dd) [for (j = [0 : lig_rings]) lig_ring_t(env, j / lig_rings, dd, LIG_ART_INSET)];
  intersection() {
    lig_art_prisms(env, y_lo, y_hi);
    tube_loft(rings(lettering_raised ? d + lig_art_depth : d + 1), rings(lettering_raised ? d - 0.2 : d - lig_art_depth));
  }
}

// Finished edges, kept printable (it prints standing on its front edge, the tail up): the rear edge
// (on top) rounded outside with radius LIG_EDGE_R; the front edge (on the plate) a 45° chamfer
// outside (a round there would lift off the plate) and a small one inside, which also eases the band
// over the reed. Each corner measures from its own edges (the tail makes some longer).
LIG_EDGE_R = min(1.0, 0.45 * ligature_wall);
LIG_EDGE_C = min(0.4, 0.2 * ligature_wall);
LIG_EDGE_CI = 0.3;
function lig_edge_cut(s_rear, s_front) =
  max(s_rear >= LIG_EDGE_R ? 0 : LIG_EDGE_R - sqrt(LIG_EDGE_R * LIG_EDGE_R - pow(LIG_EDGE_R - s_rear, 2)), LIG_EDGE_C - s_front, 0);
// The rings' t: fine near both edges (for the shortest and the longest corner), ~1mm between.
lig_ts = let(lmax = lig_len + lig_tongue, k = 6)
  [for (t = thin_nums(sort_nums(concat(
      [for (j = [0 : k]) LIG_EDGE_R / lmax * j / k], [for (j = [1 : k]) LIG_EDGE_R / lig_len * j / k],
      [for (j = [1 : lig_rings - 1]) j / lig_rings],
      [for (j = [0 : 3]) 1 - max(LIG_EDGE_C, LIG_EDGE_CI) / lig_len * j / 3])), 0.002)) if (t >= 0 && t <= 1) t];
// A ring at t with the edges' cut: d_out outside (cut inward), d_in inside (the front chamfer, outward).
function lig_ring_edge(env, t, d, inside) =
  [for (i = [0 : LIG_N - 1])
    let(th = -90 + i * 360 / LIG_N, zr = lig_z0 - lig_tongue * lig_tongue_w(th), len = lig_z1 - zr, z = lerp(zr, lig_z1, t))
    let(cut = inside ? max(0, LIG_EDGE_CI - (1 - t) * len) : -lig_edge_cut(t * len, (1 - t) * len))
    concat(lig_corner_at(env, z, i, d + cut), z)];

module ligature_band() {
  env = lig_env();
  outer = [for (t = lig_ts) lig_ring_edge(env, t, ligature_fit + ligature_wall, false)];
  inner = [for (t = lig_ts) lig_ring_edge(env, t, ligature_fit, true)];
  // the lettering's reach: up from the widest line (at the band's middle) to above its top
  mid = lig_ring(lig_h_at(env, (lig_z0 + lig_z1) / 2), (lig_z0 + lig_z1) / 2, ligature_fit + ligature_wall);
  y_lo = mid[LIG_N / 4][1];
  y_hi = max([for (p = outer[0]) p[1]]) + lig_art_depth + 5;
  // through the solid kernel (a box around it), so a bad face shows and the genus is reported
  intersection() {
    translate([-100, -100, lig_zt - 1]) cube([200, 200, lig_z1 - lig_zt + 2]);
    if (!LIG_HAS_ART) tube_loft(outer, inner);
    else if (lettering_raised) union() { tube_loft(outer, inner); lig_art(env, y_lo, y_hi); }
    else difference() { tube_loft(outer, inner); lig_art(env, y_lo, y_hi); }
  }
  room_w = 2 * 0.75 * max([for (p = mid) p[0]]);
  room_l = lig_z1 - lig_top_z0 - 2 * LIG_ART_INSET;
  if (LIG_HAS_ART && lig_art_wide > room_w + 0.01)
    echo(str("WARNING: ligature lettering is about ", round(lig_art_wide), "mm wide but the band's top is about ", round(room_w), "mm wide: it runs down the sides; make it smaller or shorter"));
  if (LIG_HAS_ART && lig_art_len > room_l + 0.01)
    echo(str("WARNING: ligature lettering is about ", round(lig_art_len), "mm long but the band's top is about ", round(room_l), "mm long: the ends are cut off; make it smaller or turn it across"));
  if (LIG_HAS_ART && lig_art_depth < lettering_depth)
    echo(str("WARNING: ligature lettering depth ", lettering_depth, "mm limited to ", lig_art_depth, "mm: at least 0.8mm of the band's wall must remain"));
  if (lig_len < ligature_length - 0.01)
    echo(str("WARNING: ligature_length ", ligature_length, "mm shortened to ", round(lig_len * 10) / 10, "mm: the band has to stay on the reed and behind the tip"));
  else if (lig_tongue < ligature_tongue - 0.01)
    echo(str("WARNING: ligature_tongue ", ligature_tongue, "mm shortened to ", round(lig_tongue * 10) / 10, "mm: the band has to stay on the reed and behind the tip"));
  else if (abs(lig_z1 - (win_z0 - ligature_position)) > 0.01)
    echo(str("WARNING: ligature_position ", ligature_position, "mm moved to ", round((win_z0 - lig_z1) * 10) / 10, "mm: the band has to stay on the reed and behind the tip"));
  // For the app's readout: "LIGATURE <length> <front edge behind the window> <inside width, height
  // at the rear> <same at the front> <inside girth at the rear> <mm it moves forward per 0.1mm
  // thicker reed> <mm forward of here it first touches the reed>" (the reed adds to the height, so
  // the height's taper sets how far; -1 = no taper).
  xs = function(R, k) [for (p = R) p[k]];
  dims = function(R) [max(xs(R, 0)) - min(xs(R, 0)), max(xs(R, 1)) - min(xs(R, 1))];
  rear = lig_ring(lig_h_at(env, lig_z0), lig_z0, ligature_fit);
  dr = dims(rear);
  df = dims(lig_ring(lig_h_at(env, lig_z1), lig_z1, ligature_fit));
  slope = (dr[1] - df[1]) / lig_len;
  r2 = function(v) round(v * 100) / 100;
  echo(str("LIGATURE ", r2(lig_len), " ", r2(win_z0 - lig_z1), " ", r2(dr[0]), " ", r2(dr[1]), " ", r2(df[0]), " ", r2(df[1]), " ",
           r2(ring_perimeter(rear)), " ", slope > 0.005 ? r2(0.1 / slope) : -1, " ", slope > 0.005 ? r2(ligature_reed_grip / slope) : -1));
}

// A plain reed for the fit view: flat on the table from its heel (the table's rear) to the tip,
// full thickness until the vamp (the last ~47%), thinning to 0.1mm at the tip.
function reed_thickness_at(z) =
  let(vamp = 0.47 * (L - table_rear_z), d = L - z)
  d >= vamp ? LIG_REED_T : 0.1 + (LIG_REED_T - 0.1) * pow(d / vamp, 1.2);
module reed_model() {
  n = max(8, ceil((L - table_rear_z) / 1.5));
  ring_loft([for (i = [0 : n]) let(z = lerp(table_rear_z, L - 0.05, i / n), t = reed_thickness_at(z), te = 0.65 * t,
                                   rw = max(0.3, lig_reed_hw * tip_factor(L - z, tip_curve)))
    concat([for (k = [0 : 8]) [rw * k / 8, -(te + (t - te) * (1 - pow(k / 8, 2))), z]],
           [[rw, 0, z], [-rw, 0, z]],
           [for (k = [-8 : -1]) [rw * k / 8, -(te + (t - te) * (1 - pow(k / 8, 2))), z]])]);
}

// ===========================================================================================
// 8c. Cap (part = "cap"): a shell over the tip, the reed and the ligature, as a store-bought cap:
// one smooth taper with a slot up from the rim and air holes in the end; the rim clips onto the
// ligature. Built like the ligature, by construction from SUPPORT FUNCTIONS: for each station
// h(phi) = the farthest the body, any reed (CAP_REED_T thick, a little wider than the table) and the
// ligature (the printed one's outside, or a metal one's band) reach in direction phi. A running max
// from the tip back makes every station contain everything in front of it, so the cap always slides
// on. Inside = that + CAP_CLEARANCE, shaped (cap_shape), then the 3D convex hull of itself (a concave
// majorant along the length, per direction): one smooth taper, no steps. Outside = that + cap_wall.
// The closed end is a dome: the last ring scaled down about its centre (a scaled support function is
// always valid, unlike an inward offset) over cap_end_gap, the outside shifted out by the wall. It
// stops narrowing CAP_HOLD behind the tip (the beak's rounded tip would pinch it to a snout). Over the
// ligature's band (inside only) the inside is cap_grip smaller than the band: the collar. The cap
// prints standing on its rim.
// ===========================================================================================

CAP_PRINTED = cap_ligature == "printed";
CAP_REED_T = 4.0;            // the thickest reed the cap makes room for, at the heel (mm)
CAP_REED_HW = lig_reed_hw + 0.5;   // and a reed 1mm wider than the table
CAP_CLEARANCE = 0.5;         // room around everything inside (mm)
CAP_HOLD = 6;                // the cap stops narrowing this far behind the tip (mm)
CAP_BEAD_W = 1.2;            // the rim bead's flat height (mm)
CAP_FLEX = 0.4;              // how far the collar may be pushed out on its way over the band (mm)
cap_m_len = max(4, min(cap_metal_length, lig_room));
cap_m_z1 = min(L - 8, max(table_rear_z + 1 + cap_m_len, win_z0 - cap_metal_position));
cap_m_z0 = cap_m_z1 - cap_m_len;
cap_zr = max(6, (CAP_PRINTED ? lig_zt : cap_m_z0) - 1);   // the short cap's rim: 1mm behind the ligature (tongue included)
cap_z0 = max(0, cap_zr - cap_extend);                      // the rim, cap_extend further back (0 = the shank end)
cap_cz0 = CAP_PRINTED ? lig_z0 : cap_m_z0;                 // the collar: over the band
cap_cz1 = (CAP_PRINTED ? lig_z1 : cap_m_z1) - 0.5;
cap_nst = max(4, ceil((L - 0.05 - cap_z0) / 1));           // stations, ~1mm apart
cap_art_depth = lettering_raised ? lettering_depth : max(0.1, min(lettering_depth, cap_wall - 0.8));
CAP_IMAGE = cap_image == "same" ? top_image : cap_image;
CAP_IMAGE_ASPECT = cap_image == "same" ? top_image_aspect : cap_image_aspect;
CAP_HAS_ART = has_text(cap_text) || has_text(CAP_IMAGE);

function cap_sup(P, c = 0) = [for (v = lig_sup(P)) v + c];
function cap_add(h, c) = [for (v = h) v + c];
// Support values moved inward can leave lines that no longer touch the shape (the corners between
// neighbours then cross over): pull each such line in to the corner of its neighbours, a few times.
function cap_tighten(h, it = 8) =
  it <= 0 ? h
  : cap_tighten([for (i = [0 : LIG_N - 1])
      let(a = (i + LIG_N - 1) % LIG_N, b = (i + 1) % LIG_N, ua = LIG_U[a], ub = LIG_U[b], det = ua[0] * ub[1] - ua[1] * ub[0])
      min(h[i], [(h[a] * ub[1] - h[b] * ua[1]) / det, (ua[0] * h[b] - ub[0] * h[a]) / det] * LIG_U[i])], it - 1);

// The body's outline at z (behind the table: all of it; on the table: above it + the table's edges).
function cap_body_pts(z) =
  z >= table_rear_z ? lig_body_pts(z)
  : let(E = exterior_ring_at(z)) [for (j = [0 : LIG_N - 1]) ext_ring_pt(E, j * 360 / LIG_N, z)];

// Everything the cap has to clear at z: support values over LIG_U. A metal ligature's screws aren't
// in it: they ride in the slot's window.
function cap_S(z, env) =
  let(P = concat(cap_body_pts(z), z >= table_rear_z ? lig_reed_pts(z, CAP_REED_T, CAP_REED_HW) : []))
  let(h0 = cap_sup(P, lig_raise + LIG_MARGIN))
  let(hs = !CAP_PRINTED && z >= cap_m_z0 - 0.01 && z <= cap_m_z1 + 0.01 ? cap_add(h0, cap_metal_proud) : h0)
  CAP_PRINTED && z >= lig_zt - 0.01 && z <= lig_z1 + 0.01
    ? pmax(hs, cap_add(lig_h_at(env, z), ligature_fit + ligature_wall + lig_raise))
    : hs;

// The least concave majorant of y over x (x ascending): the upper hull's indices (a monotone chain),
// then each value on the hull's segment above it. Applied to each direction's support values along
// the cap, it gives the cross-sections of the 3D convex hull of what the cap holds: a smooth taper
// with no steps or hollows, as a moulded cap. A concave majorant of values that never grow toward
// the tip never grows either, so the cap still slides on.
function cap_hull_pop(x, y, st, i) =
  let(m = len(st))
  m >= 2 && (y[st[m - 1]] - y[st[m - 2]]) * (x[i] - x[st[m - 2]]) <= (y[i] - y[st[m - 2]]) * (x[st[m - 1]] - x[st[m - 2]])
    ? cap_hull_pop(x, y, [for (j = [0 : m - 2]) st[j]], i) : st;
function cap_hull_idx(x, y, i = 0, st = []) = i >= len(x) ? st : cap_hull_idx(x, y, i + 1, concat(cap_hull_pop(x, y, st, i), [i]));
function cap_majorant(x, y) =
  let(h = cap_hull_idx(x, y))
  concat([for (s = [0 : len(h) - 2]) for (i = [h[s] : h[s + 1] - 1])
           lerp(y[h[s]], y[h[s + 1]], (x[i] - x[h[s]]) / (x[h[s + 1]] - x[h[s]]))], [y[len(y) - 1]]);

// Support values at any z (between the stations).
function cap_h_at(H, z) =
  let(f = clamp01((z - cap_z0) / (L - 0.05 - cap_z0)) * cap_nst, i = min(cap_nst - 1, floor(f)), t = f - i)
  [for (k = [0 : LIG_N - 1]) lerp(H[i][k], H[i + 1][k], t)];

// The slot, as on store-bought caps: up from the rim on the screw side (under the reed for a standard
// ligature, on top for an inverted one), for air and so the rim springs onto the ligature. Over a
// metal ligature it starts as a window as wide as the screws (+ 0.8mm a side), straight to 1.5mm past
// their front end, then rounded: the screws come in at the rim as the cap slides on and ride in it,
// so the cap needn't cover them. A prism from the table plane (y = 0, inside the cap at every
// station) outward.
cap_win_w = CAP_PRINTED ? 0 : cap_metal_screw_width + 1.6;
cap_win_z1 = CAP_PRINTED ? 0 : (cap_m_z0 + cap_m_z1) / 2 + cap_metal_screw_length / 2 + 1.5 + cap_win_w / 2;
module cap_slot_2d(z_slot1) {
  module tab(w, z1) if (w > 0 && z1 - w / 2 > cap_z0) hull() {
    translate([-w / 2, cap_z0 - 1]) square([w, 0.01]);
    translate([0, z1 - w / 2]) circle(d = w, $fn = 24);
  }
  tab(cap_win_w, cap_win_z1);
  if (cap_slot_length > 0) tab(cap_slot_width, z_slot1);
}
module cap_slot_cutter(z_slot1) {
  if (cap_slot_length > 0 || cap_win_w > 0)
    mirror([0, cap_slot_side == "top" ? 1 : 0, 0]) rotate([90, 0, 0]) linear_extrude(height = 80) cap_slot_2d(z_slot1);
}
// The end's air holes: a row across, straight along the axis through the dome, from inside the cap.
module cap_end_vent_cutter(xs, y, z0, z1) {
  for (x = xs) translate([x, y, z0]) cylinder(d = cap_end_vent_size, h = z1 - z0, $fn = 16);
}

// The side vents. A ring's side, [x, the middle of its flat (or near-flat) side's height, inside
// height], and how far out a ring reaches at height y (its outline crossing y, the right side).
function cap_side(R) =
  let(xm = max([for (p = R) p[0]]), ys = [for (p = R) if (p[0] > xm - 0.3) p[1]], all = [for (p = R) p[1]])
  [xm, (min(ys) + max(ys)) / 2, max(all) - min(all)];
function cap_ring_x(R, y) =
  max(concat([0], [for (i = [0 : len(R) - 1]) let(a = R[i], b = R[(i + 1) % len(R)])
    if (a[0] > 0 && b[0] > 0 && (a[1] - y) * (b[1] - y) <= 0 && a[1] != b[1]) lerp(a[0], b[0], (y - a[1]) / (b[1] - a[1]))]));
// One vent on the right side (mirrored for the left): pts = [[z, y, x_out], ...] along its centre
// line, hulled pairwise. A straight bore from the middle out through the wall, plus a 45° chamfer at
// the outer edge so the opening looks finished. Horizontal round holes and slots running up the cap
// (it prints standing on its rim) bridge cleanly at these sizes.
module cap_side_vent(pts, d, ch) {
  module bore(p) translate([0, p[1], p[0]]) rotate([0, 90, 0]) cylinder(d = d, h = p[2] + 1, $fn = 20);
  module flare(p) {
    translate([p[2] - ch, p[1], p[0]]) rotate([0, 90, 0]) cylinder(d = d, h = 0.01, $fn = 20);
    translate([p[2] + 0.3, p[1], p[0]]) rotate([0, 90, 0]) cylinder(d = d + 2 * (ch + 0.3), h = 0.01, $fn = 20);
  }
  for (j = [0 : max(0, len(pts) - 2)]) {
    q = len(pts) > 1 ? [pts[j], pts[j + 1]] : [pts[0]];
    hull() for (p = q) bore(p);
    hull() for (p = q) flare(p);
  }
}

// A stand-in metal ligature, to see the cap over it (part = metal_ligature_model; not for printing):
// the band (cap_metal_proud thick, on the body and a reed) and, on the slot side, a screw block as
// wide and long as the cap_metal_screw_ numbers with two screws across it.
module metal_ligature_model() {
  n = max(2, ceil(cap_m_len));
  zs = [for (i = [0 : n]) lerp(cap_m_z0, cap_m_z1, i / n)];
  hs = [for (z = zs) cap_sup(concat(cap_body_pts(z), lig_reed_pts(z, LIG_REED_T)))];
  tube_loft([for (i = [0 : n]) lig_ring(hs[i], zs[i], cap_metal_proud)], [for (i = [0 : n]) lig_ring(hs[i], zs[i], 0.05)]);
  zc = (cap_m_z0 + cap_m_z1) / 2;
  top = cap_slot_side == "top";
  y0 = top ? exterior_ring_at(zc)[E_TOP] + cap_metal_proud - 0.5 : -LIG_REED_T - cap_metal_proud + 0.5;
  h = 3.5;
  translate([-cap_metal_screw_width / 2 + 2, top ? y0 : y0 - h, zc - cap_metal_screw_length / 2]) cube([cap_metal_screw_width - 4, h, cap_metal_screw_length]);
  for (dz = [-1, 1]) translate([0, top ? y0 + h : y0 - h, zc + dz * cap_metal_screw_length / 4])
    rotate([0, 90, 0]) cylinder(d = 3.5, h = cap_metal_screw_width, center = true, $fn = 16);
}

module cap_part() {
  env = CAP_PRINTED ? lig_env() : [];
  n = cap_nst;
  zs = [for (i = [0 : n]) lerp(cap_z0, L - 0.05, i / n)];
  S = [for (z = zs) cap_S(z, env)];
  // running max from the tip back (inclusive): B(i) holds everything at and ahead of station i
  rev = [for (i = n, acc = S[n]; i >= 0; acc = i > 0 ? pmax(S[i - 1], acc) : acc, i = i - 1) acc];
  n_h = max(1, min(n, floor((L - CAP_HOLD - cap_z0) / ((L - 0.05 - cap_z0) / n))));
  B = function(i) rev[n - min(i, n_h)];   // (held from station n_h to the tip)
  in_collar = function(z) z >= cap_cz0 - 0.01 && z <= cap_cz1 + 0.01;
  shape = function(h) cap_shape == "round" ? lig_round(h) : h;
  // what the cap must clear at each station + the clearance, shaped; then the dome past the tip
  Hs = [for (i = [0 : n]) shape(cap_add(B(i), CAP_CLEARANCE))];
  hl = Hs[n];
  c0 = lig_circle_c(hl, -30, 40);                       // the end shrinks toward this point on the midline
  dome = max(0.6, min(1, cap_end_dome));               // lower leaves a flat ceiling too wide to print
  dh = dome * cap_end_gap;                              // the dome's height
  zb = L + cap_end_gap - dh;                            // where it starts
  s_end = 1 - 0.7 * dome;                               // the end face's size (a fraction of the ring)
  nd = 6;
  psis = [for (j = [1 : max(1, nd)]) 90 * j / max(1, nd)];
  dome_h = function(psi) let(s = 1 - (1 - s_end) * (1 - cos(psi))) [for (k = [0 : LIG_N - 1]) s * (hl[k] - c0 * LIG_U[k][1]) + c0 * LIG_U[k][1]];
  // the whole inside as one convex hull, direction by direction: [stations, the dome's base, the dome]
  X = concat(zs, [zb], nd > 0 ? [for (p = psis) zb + dh * sin(p)] : []);
  Y = concat(Hs, [hl], nd > 0 ? [for (p = psis) dome_h(p)] : []);
  cols = [for (k = [0 : LIG_N - 1]) cap_majorant(X, [for (h = Y) h[k]])];
  Hm = [for (i = [0 : len(X) - 1]) [for (k = [0 : LIG_N - 1]) cols[k][i]]];
  // inside: the hull, but over the band only cap_grip smaller than it (and at most CAP_FLEX inside
  // what it passes on the way)
  H = [for (i = [0 : n])
    in_collar(zs[i])
      ? shape(cap_tighten([for (k = [0 : LIG_N - 1]) max((i < n ? B(i + 1) : S[i])[k] + 0.05 - CAP_FLEX, S[i][k] - cap_grip)]))
      : Hm[i]];
  Ho = [for (i = [0 : n]) pmax(H[i], Hm[i])];          // the outside follows the hull (the collar is inside only)
  // inside rings: from 1mm behind the rim to the closed end's face
  in_rings = concat(
    [lig_ring(H[0], cap_z0 - 1, 0)],
    [for (i = [0 : n]) lig_ring(H[i], zs[i], 0)],
    [lig_ring(Hm[n + 1], zb, 0)],
    nd > 0 ? [for (j = [0 : nd - 1]) lig_ring(Hm[n + 2 + j], X[n + 2 + j], 0)] : []);
  // outside rings: the hull + the wall, then the dome pushed out by the wall (the wall turns from
  // sideways to forwards as the dome curves, so it never thins)
  outer_at = function(z, delta = 0) lig_ring(cap_h_at(Ho, z), z, cap_wall + delta);
  // the rim (on the plate): a bead cap_rim_bead proud, CAP_BEAD_W tall, its upper side sloping back at
  // 45° (no overhang); the bottom corner chamfered 0.3mm (the first layers' squash)
  rim = function(s) (s <= CAP_BEAD_W ? cap_rim_bead : max(0, cap_rim_bead - (s - CAP_BEAD_W))) - max(0, 0.3 - s);
  rim_zs = [for (s = [0, 0.1, 0.2, 0.3, CAP_BEAD_W / 2, CAP_BEAD_W, CAP_BEAD_W + cap_rim_bead / 2, CAP_BEAD_W + cap_rim_bead]) cap_z0 + s];
  out_zs = thin_nums(sort_nums(concat(zs, [for (z = rim_zs) if (z < zs[n] - 0.05) z])), 0.02);
  out_rings = concat(
    [for (z = out_zs) outer_at(z, rim(z - cap_z0))],
    [lig_ring(Hm[n + 1], zb, cap_wall)],
    nd > 0 ? [for (j = [0 : nd - 1]) let(psi = psis[j]) lig_ring(Hm[n + 2 + j], X[n + 2 + j] + cap_wall * sin(psi), cap_wall * cos(psi))]
           : [lig_ring(Hm[n + 1], zb + cap_wall, cap_wall)]);
  z_end = zb + dh + cap_wall;
  // the slot: from the rim to cap_slot_length past the short cap's rim (so a longer cap's collar
  // still springs), past the window, kept 3mm short of the dome
  z_slot1 = min(zb - 3, max(cap_zr + cap_slot_length, cap_win_w > 0 ? cap_win_z1 + 2 : 0));
  // the end's holes: a row on the dome's centre line, within 55% of its half-width (so each starts
  // inside the cap), cap_end_vent_size + 1.6mm apart
  e_hw = 0.55 * min(hl[LIG_N / 4], hl[3 * LIG_N / 4]);
  e_p = cap_end_vent_size + 1.6;
  e_n = cap_end_vents <= 0 ? 0 : max(0, min(cap_end_vents, floor((2 * e_hw - cap_end_vent_size) / e_p) + 1));
  e_xs = [for (i = [0 : 1 : e_n - 1]) (i - (e_n - 1) / 2) * e_p];
  // the side vents: both sides, on the side's middle line, from 2.5mm in front of the collar (the
  // grip stays whole) to 3mm short of the tip. Slots run along the cap (up to 22mm, following the
  // side's middle line as the cap tapers) and stack up the side, within 45% of the inside height;
  // holes run along it. cap_side_vent_gap of wall between neighbours.
  sv_d = cap_side_vent_size;
  sv_ch = min(0.6, 0.35 * cap_wall);
  sv_z0 = max(cap_cz1, cap_zr) + 2.5;
  sv_z1 = min(zb, L) - 3;
  sv_span = sv_z1 - sv_z0;
  sv_zm = (sv_z0 + sv_z1) / 2;
  sv_slots = cap_side_vents == "slots";
  sv_mid = cap_side(lig_ring(cap_h_at(H, sv_zm), sv_zm, 0));
  sv_fit = cap_side_vents == "none" || sv_span < sv_d ? 0
         : sv_slots ? floor((max(sv_d, 0.45 * sv_mid[2]) - sv_d) / (sv_d + cap_side_vent_gap)) + 1
         : floor((sv_span - sv_d) / (sv_d + cap_side_vent_gap)) + 1;
  sv_n = max(0, min(cap_side_vent_count, sv_fit));
  sv_len = min(sv_span, 22);
  // a centre-line point at z, dy off the side's middle: [z, y, the outside's reach there]
  sv_y = function(z) cap_side(outer_at(z))[1];
  sv_pt = function(z, y) [z, y, cap_ring_x(outer_at(z), y)];
  sv_lines = sv_n == 0 ? []
    : sv_slots
      ? let(za = sv_zm - (sv_len - sv_d) / 2, zc = sv_zm + (sv_len - sv_d) / 2, ya = sv_y(za), yc = sv_y(zc), m = max(1, ceil((zc - za) / 3)))
        [for (k = [0 : sv_n - 1]) let(dy = (k - (sv_n - 1) / 2) * (sv_d + cap_side_vent_gap))
           [for (j = [0 : m]) sv_pt(lerp(za, zc, j / m), lerp(ya, yc, j / m) + dy)]]
      : let(step = sv_d + cap_side_vent_gap)
        [for (k = [0 : sv_n - 1]) let(z = sv_zm + (k - (sv_n - 1) / 2) * step) [sv_pt(z, sv_y(z))]];
  // text and pictures on the top (as on the ligature)
  t_mid = max(cap_z0 + 3, min(L - 3, (cap_z0 + L) / 2 + cap_lettering_position));
  t_len = text_len(cap_text, cap_text_size, cap_text_angle);
  i_len = cap_image_width * (abs(cos(cap_image_angle)) * CAP_IMAGE_ASPECT + abs(sin(cap_image_angle)));
  both = has_text(cap_text) && has_text(CAP_IMAGE);
  i_z = t_mid + (both ? (t_len + 2) / 2 : 0);
  t_z = t_mid - (both ? (i_len + 2) / 2 : 0);
  a_ring = lig_ring(cap_h_at(Ho, t_mid), t_mid, cap_wall);
  y_lo = a_ring[LIG_N / 4][1];
  y_hi = max([for (p = a_ring) p[1]]) + cap_art_depth + 5;
  module prisms() {
    if (has_text(CAP_IMAGE))
      translate([0, y_lo, i_z]) rotate([-90, 0, 0]) linear_extrude(height = y_hi - y_lo)
        art_2d(CAP_IMAGE, cap_image_width, cap_image_angle);
    if (has_text(cap_text))
      translate([0, y_lo, t_z]) rotate([-90, 0, 0]) linear_extrude(height = y_hi - y_lo)
        rotate(-90 - cap_text_angle) lettering_text(cap_text, cap_text_size, font_name(cap_text_font));
  }
  // the straight part of the shell, thicker/thinner by delta, for the lettering's skin
  module skin_solid(delta) { ring_loft([for (z = zs) outer_at(z, delta)]); }
  difference() {
    union() {
      difference() {
        ring_loft(out_rings);
        ring_loft(in_rings);
      }
      if (CAP_HAS_ART && lettering_raised)
        intersection() { prisms(); difference() { skin_solid(cap_art_depth); skin_solid(-0.2); } }
    }
    cap_slot_cutter(z_slot1);
    if (e_n > 0) cap_end_vent_cutter(e_xs, c0, zb, z_end + 2);
    for (line = sv_lines, s = [0, 1]) mirror([s, 0, 0]) cap_side_vent(line, sv_d, sv_ch);
    if (CAP_HAS_ART && !lettering_raised)
      intersection() { prisms(); difference() { skin_solid(1); skin_solid(-cap_art_depth); } }
  }
  // readouts: "CAP <length> <rim z> <inside width, height at the collar> <squeeze>"
  cmid = min(n, max(0, round(((cap_cz0 + cap_cz1) / 2 - cap_z0) / ((L - 0.05 - cap_z0) / n))));
  xs = function(R, k) [for (p = R) p[k]];
  cr = lig_ring(H[cmid], zs[cmid], 0);
  squeeze = max([for (i = [0 : n]) if (in_collar(zs[i])) max([for (k = [0 : LIG_N - 1]) S[i][k] - H[i][k]])]);
  r2 = function(v) round(v * 100) / 100;
  echo(str("CAP ", r2(z_end - cap_z0), " ", r2(cap_z0), " ", r2(max(xs(cr, 0)) - min(xs(cr, 0))), " ", r2(max(xs(cr, 1)) - min(xs(cr, 1))), " ", r2(squeeze)));
  echo(str("EXPECTED GENUS ", e_n + 2 * sv_n));
  if (cap_side_vents != "none" && sv_n < cap_side_vent_count)
    echo(str("WARNING: cap_side_vent_count ", cap_side_vent_count, " reduced to ", sv_n, ": that many fit on each side"));
  if (cap_end_dome < 0.6)
    echo(str("WARNING: cap_end_dome ", cap_end_dome, " raised to 0.6: a flatter end is a ceiling too wide to print without supports"));
  if (e_n < cap_end_vents)
    echo(str("WARNING: cap_end_vents ", cap_end_vents, " reduced to ", e_n, ": that many fit across the cap's end"));
  if (cap_slot_length > 0 && z_slot1 < cap_zr + cap_slot_length - 0.01)
    echo(str("WARNING: cap_slot_length ", cap_slot_length, "mm shortened to ", r2(z_slot1 - cap_zr), "mm: it stops 3mm short of the closed end"));
  if (cap_grip > 0.01 && squeeze < 0.5 * cap_grip)
    echo(str("WARNING: the cap's collar only squeezes ", r2(max(0, squeeze)), "mm (cap_grip ", cap_grip, "mm)"));
  // the art's reach across the top (it runs down the sides past ~3/4 of the half-width) and along
  // the cap (past its ends it is cut off)
  a_wide = max(has_text(cap_text) ? text_wide(cap_text, cap_text_size, cap_text_angle) : 0,
               has_text(CAP_IMAGE) ? cap_image_width * (abs(sin(cap_image_angle)) * CAP_IMAGE_ASPECT + abs(cos(cap_image_angle))) : 0);
  a_room = 2 * 0.75 * max([for (p = a_ring) p[0]]);
  a_z0 = min(has_text(cap_text) ? t_z - t_len / 2 : L, has_text(CAP_IMAGE) ? i_z - i_len / 2 : L);
  a_z1 = max(has_text(cap_text) ? t_z + t_len / 2 : 0, has_text(CAP_IMAGE) ? i_z + i_len / 2 : 0);
  if (CAP_HAS_ART && a_wide > a_room + 0.5)
    echo(str("WARNING: the cap's lettering is about ", round(a_wide), "mm wide but its top is about ", round(a_room), "mm wide: it runs down the sides; make it smaller or turn it"));
  if (CAP_HAS_ART && (a_z0 < cap_z0 - 0.5 || a_z1 > L + 0.5))
    echo(str("WARNING: the cap's lettering is about ", round(a_z1 - a_z0), "mm long but the cap is about ", round(L - cap_z0), "mm long: the ends are cut off; make it smaller or turn it across"));
  if (CAP_HAS_ART && cap_art_depth < lettering_depth)
    echo(str("WARNING: cap lettering depth ", lettering_depth, "mm limited to ", cap_art_depth, "mm: at least 0.8mm of the wall must remain"));
}

// ===========================================================================================
// 9. Assembly and part selection
// ===========================================================================================

module mouthpiece_body() {
  difference() {
    union() {
      exterior_solid();
      if (HAS_SHANK_DETAIL && SHANK_RAISED) shank_raised();
    }
    interior_solid();
    if (baffle_texture != "none") baffle_texture_cutter();
    window_cutter();
    facing_cutter();
    if (HAS_LETTERING) lettering_cutter();
    if (HAS_SHANK_ART) shank_cutter();
  }
}

module shank_test_ring() {
  intersection() {
    mouthpiece_body();
    translate([-100, -100, -1]) cube([200, 200, eff_shank_depth + 2]);
  }
}

module selected_part() {
if      (part == "shank_test_ring")          shank_test_ring();
else if (part == "ligature_seated")          ligature_band();
else if (part == "cap_seated")               cap_part();
else if (part == "metal_ligature_model")     metal_ligature_model();
else if (part == "cap_clash")                { intersection() { cap_part(); mouthpiece_body(); } if (CAP_PRINTED) intersection() { cap_part(); ligature_band(); } else intersection() { cap_part(); metal_ligature_model(); } }
else if (part == "reed_model")               reed_model();
else if (part == "ligature_clash")           intersection() { ligature_band(); mouthpiece_body(); }
else if (part == "clearance_report")         clearance_report();
else if (part == "facing_report")            facing_report();
else if (part == "interior_only")            interior_solid(with_socket = false);
else if (part == "debug_exterior")           exterior_solid();
else if (part == "debug_interior")           { interior_solid(); % exterior_solid(); }
else if (part == "debug_window_cutter")      { window_cutter(); % exterior_solid(); }
else if (part == "debug_window_only")        window_cutter();
else if (part == "debug_window_planform")    window_planform();
else if (part == "debug_facing_cutter")      { facing_cutter(); % exterior_solid(); }
else if (part == "debug_facing_only")        facing_cutter();
else if (part == "debug_ext_minus_interior") difference() { exterior_solid(); interior_solid(); }
else if (part == "debug_ext_minus_window")   difference() { exterior_solid(); window_cutter(); }
else if (part == "debug_ext_minus_facing")   difference() { exterior_solid(); facing_cutter(); }
else                                         mouthpiece_body();  // "mouthpiece"
}

// Print orientation: the shank end face is the plane through the bore axis at z = -1, square to
// the (tilted) bore (end_face_z). Rotating by -bore_tilt about X turns its normal to +Z; the lift
// then puts it on z = 0, so the part stands on the end the neck goes into.
end_face_lift = bah_at(-1) * sin(bore_tilt) + cos(bore_tilt);
// The ligature on its own is printed standing on its front edge (flat; the tongue points up).
if (part == "ligature") { if (print_orientation) translate([0, 0, lig_z1]) rotate([180, 0, 0]) ligature_band(); else ligature_band(); }
// The cap stands on its rim, open end down (the closed end is a dome: no supports needed).
else if (part == "cap") { if (print_orientation) translate([0, 0, -cap_z0]) cap_part(); else cap_part(); }
else if (print_orientation) translate([0, 0, end_face_lift]) rotate([-bore_tilt, 0, 0]) selected_part();
else selected_part();
