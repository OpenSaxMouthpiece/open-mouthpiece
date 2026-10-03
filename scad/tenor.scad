// Tenor saxophone mouthpiece. Values measured from a real tenor mouthpiece (0.095" tip):
// rounded, caliper-style dimensions only — no mesh geometry (see Credits in README.md).
// Geometry: lib/mouthpiece_base.scad.

include <lib/mouthpiece_base.scad>  // geometry + defaults; everything below overrides it (keep this line first)

/* [Shank] */
// Your neck cork's diameter (mm), measured with calipers.
neck_cork_diameter = 17.2; // [10:0.05:27]
// How much smaller than your cork the socket is (mm): bigger = tighter. Try 0.1-0.3.
shank_clearance = 0.2; // [0:0.01:0.6]
// How much wider the socket's mouth is, per side (mm), to ease it onto the cork.
shank_bevel = 1.0; // [0:0.1:3]
// How far in the socket's bevel goes (mm); equal to its width = 45°.
shank_bevel_depth = 1.0; // [0.2:0.1:20]
// How far the cork goes in (mm). Other settings give way to keep it.
shank_depth = 26.0; // [10:0.5:70]
// Diameter of the tube behind the socket (mm), about your neck tip's inside diameter.
bore_diameter = 17.0; // [8:0.1:24]
// Angle between the bore and the reed table (degrees); typically about 4.
bore_tilt = 4.1; // [-3:0.1:8]
// Outside size of the shank end (1 = the preset's own outline).
shank_scale = 1.0; // [0.85:0.01:1.3]

/* [Chamber] */
// Cross-section of the chamber after the throat.
chamber_shape = "round"; // [round, square, horseshoe]
// Inside width of the chamber (mm); never narrower than the window.
chamber_width = 14.5; // [8:0.1:30]
// How gradually the chamber widens after the throat: low = quickly, high = slowly.
chamber_flare = 0.4; // [0.1:0.05:0.9]
// How far the full width runs toward the tip (mm); 40 = as far as it can.
chamber_full_length = 40; // [0:0.5:40]
// Height before the window (mm); 0 = as tall as wide. Taller lowers the floor.
chamber_height = 0; // [0:0.1:30]
// Floor from throat to window: - drops early (deeper), + stays high (a ramp).
floor_shape = 0; // [-1:0.05:1]
// Where the throat (the narrowest point inside) sits, from the neck end (mm).
throat_position = 53.0; // [20:0.5:90]
// Width of the throat, the narrowest point inside (mm).
throat_width = 14.9; // [5:0.1:24]
// Length of the bore's narrowing into the throat (mm). Short = an abrupt step.
throat_taper = 11; // [1:0.5:80]
// Throat cross-section; "chamber" = the same as the chamber.
throat_shape = "chamber"; // [chamber, round, square, horseshoe]

/* [Baffle] */
// Shape of the roof above the reed. Step = a ledge.
baffle_type = "measured"; // [measured, flat, rollover, step, concave]
// Moves the baffle toward the reed (+) or away from it (-) (mm).
baffle_height = 0; // [-3:0.1:4]
// Moves where the baffle begins, toward the tip (+) or the neck (-) (mm).
baffle_start = 0; // [-15:0.5:15]
// Bends the baffle: - comes down early, + stays up and drops late.
baffle_curve = 0; // [-1:0.05:1]
// Height of a smooth hump on the baffle just behind the tip (mm).
baffle_hump = 0; // [0:0.1:3]

/* [Window] */
// Length of the opening under the reed (mm).
window_length = 42.0; // [8:0.5:70]
// Width of the opening under the reed (mm); kept inside the rails automatically.
window_width = 16.2; // [6:0.1:22]
// How much narrower the window is at the back (mm).
window_taper = 4.3; // [0:0.1:12]
// Rounding of the window's back corners (mm).
window_rear_radius = 5.3; // [0:0.1:10]
// Chamber side walls over the window (degrees): + lean out (scooped), - lean in.
sidewall_angle = 0; // [-20:1:30]
// Width of the side rails the reed seals on (mm).
side_rail_width = 1.0; // [0.8:0.05:2.5]
// Thickness of the tip rail (mm).
tip_rail_thickness = 1.4; // [0.3:0.02:3]
// How far back the tip's curve reaches (mm), outside and window. Match your reed.
tip_curve = 3.8; // [0.5:0.1:12]

/* [Table] */
// Width of the reed seat toward the tip (mm). Match your reed.
table_width_tip = 17.6; // [8:0.1:30]
// Width of the reed seat at the back (mm). Match your reed's heel.
table_width_rear = 14.7; // [8:0.1:30]
// Length of your reed (mm): the reed seat starts this far back from the tip.
reed_length = 77.7; // [50:0.5:120]
// A slight hollow along the reed seat (mm) so the reed seals at both ends.
table_concavity = 0; // [0:0.005:0.1]

/* [Facing] */
// Gap at the tip, from the tip rail to a straightedge on the table (mm).
tip_opening = 2.41; // [0.5:0.01:4.5]
// From the tip back to the break, where the rails leave the flat table (mm).
facing_length = 25.2; // [10:0.1:45]
// Facing curve: Power (shaped by the exponent), Arc (a true radius) or Gauge (your points).
facing_model = "power"; // [power, arc, gauge]
// Power curve shape: 2 is an even curve; lower opens sooner, higher later.
facing_exponent = 1.8; // [1.5:0.05:3]

/* [Exterior] */
// Total length, neck end to tip (mm). Also changes the inside volume.
overall_length = 96.7; // [55:0.1:160]
// Body width (1 = the preset's own outline).
body_width_scale = 1.0; // [0.8:0.01:1.25]
// Body height (1 = the preset's own outline).
body_height_scale = 1.0; // [0.8:0.01:1.25]
// Height of the beak at the tip (mm).
beak_tip_height = 3.6; // [2:0.1:8]
// Body cross-section: 2 = round, higher = boxier, lower = pointed sides.
body_squareness = 2.0; // [1.2:0.1:8]
// Top of the beak: lower = ridged, higher = flat.
beak_squareness = 1.5; // [1.2:0.1:8]
// Beak profile from the side: + concave (scooped), - convex (fuller).
beak_curve = 0; // [-1:0.05:1]
// Moves the shoulder where the beak starts (mm): + a longer, flatter beak, - shorter.
beak_length = 0; // [-15:0.5:15]
// How far the shoulder line runs down the sides toward the tip (mm); 0 = straight across.
shoulder_sweep = 0; // [0:0.5:12]
// Lower sides near the tip: 1.2 (lowest) = curved in, higher = boxier.
underside_squareness = 1.2; // [1.2:0.1:8]
// Pocket on the beak for a stick-on tooth patch (mm deep); 0 = none.
tooth_plate_recess = 0; // [0:0.05:1]
// Length of the tooth-patch pocket, back from the tip (mm).
tooth_plate_length = 12; // [5:0.5:25]

/* [Lettering] */
// Text on top (empty = none). {tip}, {tip_mm}, {facing}, {chamber}, {length} fill in.
top_text = "";
// Letter height (mm).
top_text_size = 5; // [2:0.5:20]
// Text direction: 0 = along (toward the tip), 90 = across; 180, 270 = upside down.
top_text_angle = 90; // [0:90:270]
// Moves the top text toward the tip (+) or the shank (-) (mm).
top_text_position = 0; // [-50:0.5:50]
// SVG picture on top (empty = none). Use filled shapes, not strokes.
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
// Text on the right side (seen from above, tip away). Same fill-ins as the top text.
side_text_right = "";
// Text on the left side.
side_text_left = "";
// Side letter height (mm).
side_text_size = 3.5; // [1.5:0.5:10]
// Moves the side text toward the tip (+) or the shank (-) (mm).
side_text_position = 0; // [-50:0.5:50]
// Moves the side text up (+) or down (-) (mm).
side_text_vertical = 0; // [-10:0.5:10]
lettering_style = "engraved"; // [engraved, raised]
// How deep the letters go, or how far they stand out (mm).
lettering_depth = 0.5; // [0.2:0.05:1.5]
// Typeface. Keep script faces 5mm or taller.
lettering_font = "Sans Bold"; // [Sans Bold, Sans, Serif Bold, Serif, Serif Italic, Mono Bold, Bebas Neue, Marcellus SC, Rozha One, Alfa Slab One, Audiowide, Black Ops One, Lobster, Pacifico, Kaushan Script]
// Keeps lettering this far back from the tip (mm).
lettering_tip_clearance = 22; // [5:0.5:60]

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
floor_points = [[40, 3.4], [46, 3.2], [52, 2.9], [54, 1.8]];
// Advanced: your own baffle, [[distance, height above the table], ...]; wins over the shape.
baffle_points_custom = [];
// Advanced: your own facing (Gauge), [[mm from the tip, gap], ...].
facing_gauge_points = [];

/* [Manufacturing] */
// Thinnest wall allowed (mm). The inside shrinks to keep it.
min_wall = 2.0; // [1.2:0.1:4]
// Smallest baffle-to-reed gap near the throat (mm); only warns.
min_airgap = 0.5; // [0.2:0.05:2]
// Extra on the table and facing to sand flat after printing (mm); try 0.1-0.2.
print_stock = 0; // [0:0.01:0.5]

/* [Ligature] */
// A ligature is made for this design (the app shows it and offers its download).
ligature_made = false;
// Length of the ligature band along the mouthpiece (mm), on its short side.
ligature_length = 12; // [6:0.5:30]
// Band's front edge, mm behind the window's back end; negative is over the window.
ligature_position = 2; // [-10:0.5:25]
// Band thickness (mm): thinner flexes onto it more easily, thicker grips harder.
ligature_wall = 2.0; // [1.2:0.1:5]
// D: round on top, following the reed underneath. Round, or following the whole body.
ligature_shape = "d"; // [d, round, conform]
// Extra length on one side, running toward the shank (mm); 0 = a straight band.
ligature_tongue = 7; // [0:0.5:15]
ligature_tongue_side = "top"; // [top, reed]
// Gap between the band and the mouthpiece's body (mm); the reed is squeezed instead.
ligature_fit = 0.1; // [-0.4:0.05:0.5]
// How much it squeezes the reed against the table (mm): the reed is the tight spot.
ligature_reed_grip = 0.2; // [0:0.05:0.6]
// Your reed's thickness at the heel (mm), usually about 3.
ligature_reed_thickness = 3.0; // [2:0.05:4.5]
// Reed width (mm); 0 = the table's width.
ligature_reed_width = 0; // [0:0.1:24]
// Text on the ligature's top (empty = none). Same fill-ins as the top text.
ligature_text = "";
// Ligature letter height (mm).
ligature_text_size = 4; // [2:0.5:12]
// Ligature text direction: 0 = along (toward the tip), 90 = across; 180, 270 = upside down.
ligature_text_angle = 90; // [0:90:270]
// SVG picture on the ligature's top (empty = none). Use filled shapes, not strokes.
ligature_image = "";
// Ligature picture width (mm).
ligature_image_width = 8; // [3:0.5:30]
// Picture height / width, for spacing (the app fills it in).
ligature_image_aspect = 1; // [0.1:0.01:10]
// Ligature picture rotation (degrees).
ligature_image_angle = 0; // [0:15:345]
// Moves the ligature's text and picture toward the tip (+) or the shank (-) (mm).
ligature_lettering_position = 0; // [-15:0.5:15]

/* [Output] */
// What to make: the mouthpiece, a shank test ring, a ligature, or debug pieces.
part = "mouthpiece"; // [mouthpiece, shank_test_ring, ligature, ligature_seated, reed_model, ligature_clash, interior_only, debug_exterior, debug_interior, debug_window_cutter, debug_window_only, debug_window_planform, debug_facing_cutter, debug_facing_only, debug_ext_minus_interior, debug_ext_minus_window, debug_ext_minus_facing, clearance_report, facing_report]
// Smoothness: higher is smoother but slower. 64 is fine for printing.
render_fn = 64; // [16:8:128]
// Stand it on its neck end, as printed. Off: lie it on the reed table.
print_orientation = true;

/* [Hidden] */

// Built-in outline, [[fraction of L, value], ...] joined by PCHIP (rounded, hand-smoothed caliper-
// style stations measured from a real mouthpiece; the base file's are the alto's): full width,
// top, underside behind the table (the table cut takes over after it), height of the section's
// widest point, top and underside squareness, and the "medium" baffle. Shape: short tenon, quick
// flare to the widest body, near-flat top, a steep shoulder at ~60% of the length (where the
// section gets boxier), then a straight beak to a thin, WIDE tip. Any ext_*_points override
// replaces the matching curve.
shape_width = [[0, 23.0], [0.078, 23.0], [0.124, 24.3], [0.155, 26.7], [0.186, 30.5], [0.2, 30.7], [0.248, 30.3], [0.62, 27.0], [0.745, 25.8], [0.838, 24.1], [0.9, 21.9], [0.962, 18.7], [1, 16.4]];
shape_top = [[0, 26.5], [0.093, 25.95], [0.13, 26.4], [0.165, 27.9], [0.186, 29.3], [0.23, 28.8], [0.32, 27.7], [0.46, 26.1], [0.54, 25.2], [0.58, 24.8], [0.595, 22.5], [0.61, 20.7], [0.645, 18.3], [0.672, 17.1], [0.775, 12.9], [1, 3.6]];
shape_bottom = [[0, 3.45], [0.093, 2.8], [0.14, 1.9], [0.171, 0.96], [0.2, 0]];
shape_widest = [[0, 15.1], [0.186, 15.2], [0.2, 13.7], [0.372, 12.85], [0.62, 11.25], [0.7, 10.5], [0.775, 9.3], [0.869, 6.1], [0.962, 3.1]];
shape_top_squareness = [[0, 2.0], [0.1, 2.1], [0.56, 1.9], [0.62, 2.2], [0.68, 2.0], [0.81, 1.5], [1, 1.5]];
shape_bottom_squareness = [[0, 2.0], [0.2, 2.0], [0.38, 1.8], [0.68, 1.6], [0.745, 1.45], [0.815, 1.2], [1, 1.2]];
shape_baffle = [[0.419, 20.7], [0.46, 19.7], [0.496, 18.7], [0.559, 16.9], [0.595, 15.5], [0.703, 10.8], [0.765, 8.5], [0.853, 5.7], [0.915, 3.8], [0.977, 2.7]];
// Commercial tip-opening range for this instrument — only used for a validate() warning (mm).
tip_opening_range = [1.60, 3.80];
