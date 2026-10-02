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
// The Customizer can't edit nested lists: use the app's Curves panel, or set them in the file or
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
// How far in the socket's bevel goes (mm); equal to its width = 45°.
shank_bevel_depth = 1.0; // [0.2:0.1:20]
// How far the cork goes in (mm). Other settings give way to keep it.
shank_depth = 22.0; // [10:0.5:70]
// Diameter of the tube behind the socket (mm), about your neck tip's inside diameter.
bore_diameter = 15.6; // [8:0.1:24]
// Angle between the bore and the reed table (degrees); typically about 4.
bore_tilt = 4.4; // [-3:0.1:8]
// Outside size of the shank end (1 = the preset's own outline).
shank_scale = 1.0; // [0.85:0.01:1.3]

/* [Chamber] */
// Cross-section of the chamber after the throat.
chamber_shape = "horseshoe"; // [round, square, horseshoe]
// Inside width of the chamber (mm); never narrower than the window.
chamber_width = 14.6; // [8:0.1:30]
// How gradually the chamber widens after the throat: low = quickly, high = slowly.
chamber_flare = 0.4; // [0.1:0.05:0.9]
// How far the full width runs toward the tip (mm); 40 = as far as it can.
chamber_full_length = 40; // [0:0.5:40]
// Height before the window (mm); 0 = as tall as wide. Taller lowers the floor.
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
// How far back the tip's curve reaches (mm), outside and window. Match your reed.
tip_curve = 3.5; // [0.5:0.1:12]

/* [Table] */
// Width of the reed seat toward the tip (mm). Match your reed.
table_width_tip = 16.8; // [8:0.1:30]
// Width of the reed seat at the back (mm). Match your reed's heel.
table_width_rear = 13.2; // [8:0.1:30]
// Length of your reed (mm): the reed seat starts this far back from the tip.
reed_length = 71.8; // [50:0.5:120]
// A slight hollow along the reed seat (mm) so the reed seals at both ends.
table_concavity = 0; // [0:0.005:0.1]

/* [Facing] */
// Gap at the tip, from the tip rail to a straightedge on the table (mm).
tip_opening = 1.93; // [0.5:0.01:4.5]
// From the tip back to the break, where the rails leave the flat table (mm).
facing_length = 23.8; // [10:0.1:45]
// Facing curve: Power (shaped by the exponent), Arc (a true radius) or Gauge (your points).
facing_model = "power"; // [power, arc, gauge]
// Power curve shape: 2 is an even curve; lower opens sooner, higher later.
facing_exponent = 1.8; // [1.5:0.05:3]

/* [Exterior] */
// Total length, neck end to tip (mm). Also changes the inside volume.
overall_length = 89.3; // [55:0.1:160]
// Body width (1 = the preset's own outline).
body_width_scale = 1.0; // [0.8:0.01:1.25]
// Body height (1 = the preset's own outline).
body_height_scale = 1.0; // [0.8:0.01:1.25]
// Height of the beak at the tip (mm).
beak_tip_height = 3.6; // [2:0.1:8]
// Body cross-section: 2 = round, higher = boxier, lower = pointed sides.
body_squareness = 2.0; // [1.2:0.1:8]
// Top of the beak: lower = ridged, higher = flat.
beak_squareness = 1.6; // [1.2:0.1:8]
// Beak profile from the side: + concave (scooped), - convex (fuller).
beak_curve = 0; // [-1:0.05:1]
// Moves the shoulder where the beak starts (mm): + a longer, flatter beak, - shorter.
beak_length = 0; // [-15:0.5:15]
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
floor_points = [];
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
shape_width = [[0, 22.0], [0.085, 22.0], [0.125, 23.3], [0.175, 26.7], [0.205, 29.0], [0.29, 28.1], [0.46, 26.4], [0.83, 22.3], [1, 16.9]];
shape_top = [[0, 25.5], [0.125, 25.4], [0.205, 27.6], [0.3, 26.3], [0.405, 25.1], [0.495, 24.0], [0.575, 22.7], [0.62, 18.9], [0.685, 15.4], [0.775, 11.9], [1, 3.6]];
shape_bottom = [[0, 3.5], [0.115, 2.4], [0.195, 0]];
shape_widest = [[0, 14.5], [0.18, 13.9], [0.27, 12.6], [0.385, 11.4], [0.76, 8.7], [0.95, 3.5]];
shape_top_squareness = [[0, 2.0], [0.58, 2.0], [0.64, 2.7], [0.84, 1.6], [1, 1.6]];
shape_bottom_squareness = [[0, 2.0], [0.74, 2.0], [0.87, 1.2], [1, 1.2]];
shape_baffle = [[0.487, 18.2], [0.555, 15.9], [0.728, 9.6], [0.795, 7.2], [0.924, 3.3], [0.969, 2.4]];
// Commercial tip-opening range for this instrument — only used for a validate() warning (mm).
tip_opening_range = [1.40, 2.80];

$fn = render_fn;

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
RENAMED_PARAMS = [["chamber_d", chamber_d, "chamber_width"], ["bore_d", bore_d, "bore_diameter"], ["throat_z", throat_z, "throat_position"], ["throat_length", throat_length, "throat_taper"], ["chamber_position", chamber_position, "chamber_flare"], ["chamber_length", chamber_length, "chamber_full_length (0 = all the way is now 40)"], ["tip_thickness", tip_thickness, "beak_tip_height"], ["tip_round", tip_round, "tip_curve"], ["side_text_height", side_text_height, "side_text_vertical"], ["baffle_rollover", baffle_rollover, "baffle_hump"]];

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
// The chamber: widens from the throat to chamber_width at chamber_peak_z, holds that width to
// chamber_end_z, then closes smoothly into the window width by chamber_close_z, just behind the
// tip rounding (the measured references stay ~chamber-wide under the baffle to ~90% of L).
chamber_close_z = L - tip_curve - 1;
chamber_end_z = max(chamber_peak_z, chamber_full_length < 40 ? min(chamber_peak_z + chamber_full_length, chamber_close_z - 4) : chamber_close_z - max(4, 0.12 * L));
function chamber_hw(z) =
  z <= eff_throat_z ? 0 :
  z <= chamber_peak_z ? lerp(throat_width / 2, chamber_width / 2, ease(clamp01((z - eff_throat_z) / max(0.001, chamber_peak_z - eff_throat_z)))) :
  lerp(chamber_width / 2, 0, smootherstep(clamp01((z - chamber_end_z) / max(1, chamber_close_z - chamber_end_z))));
// chamber_height: extra half-height beyond round, applied with chamber_weight (before the window).
chamber_extra = chamber_height > 0 ? (chamber_height - chamber_width) / 2 : 0;

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
table_rear_z = max(L - reed_length, tenon_end_z + table_ramp);
table_start_z = table_rear_z - table_ramp;  // where the underside first reaches the table plane (roughly)

// The shape tables ARE the built-in outline (there is nothing behind them): an empty one used to
// hang the render or collapse the outline, so stop with a clear message instead.
EMPTY_SHAPE_TABLES = [for (t = [["shape_width", shape_width], ["shape_top", shape_top], ["shape_bottom", shape_bottom],
  ["shape_widest", shape_widest], ["shape_top_squareness", shape_top_squareness],
  ["shape_bottom_squareness", shape_bottom_squareness], ["shape_baffle", shape_baffle]]) if (!has_pts(t[1])) t[0]];
SHAPE_TABLES_OK = assert(len(EMPTY_SHAPE_TABLES) == 0, str("empty shape table(s) ", EMPTY_SHAPE_TABLES,
  ": the shape tables are the built-in outline and need their points. In the app press Revert to reload the file.")) true;

// The body_*_scale knobs fade in across the flare, so the tenon keeps its size and stays round.
function body_scale(f, k) = lerp(1, k, smootherstep(clamp01((f - 0.09) / 0.12)));
// shank_scale is the other way round: the tenon's outside, fading back to 1 across the flare; its
// heights scale about the bore axis (from the tables, before the socket guarantee), so the bore
// stays centred.
function shank_k(f) = lerp(shank_scale, 1, smootherstep(clamp01((f - 0.09) / 0.12)));
shank_mid0 = (shape_top[0][1] + shape_bottom[0][1]) / 2;
function shank_y(f, y) = shank_scale == 1 ? y : let(m = shank_mid0 - f * L * tan(bore_tilt)) m + (y - m) * shank_k(f);
def_width = [for (p = shape_width) [p[0] * L, p[1] * body_scale(p[0], body_width_scale) * shank_k(p[0])]];
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
shape_top_b = beak_remapped(shape_top);
def_top0 = [for (p = shape_top_b) [p[0] * L, shank_y(p[0], p[1] * body_scale(p[0], body_height_scale))]];
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
def_widest = [for (p = beak_remapped(shape_widest)) [p[0] * L, shank_y(p[0], p[1] * body_scale(p[0], body_height_scale))]];

// Effective outline curves. With a custom top but no underside/widest points, those follow the
// top (mirrored about the bore axis / halfway) rather than the built-in table.
USER_TOP = has_pts(ext_top_points);
EXT_WIDTH_C  = pchip_prep(has_pts(ext_width_points) ? ext_width_points : def_width);
EXT_TOP_C    = pchip_prep(USER_TOP ? ext_top_points : def_top_c);
EXT_BOTTOM_C = pchip_prep(has_pts(ext_bottom_points) ? ext_bottom_points : USER_TOP ? [] : def_bottom);
EXT_WIDEST_C = pchip_prep(has_pts(ext_widest_points) ? ext_widest_points : USER_TOP ? [] : def_widest);
max_body_w = max([for (c = EXT_WIDTH_C) c[1]]);
TOP_SQ_TABLE_C = pchip_prep(beak_remapped(shape_top_squareness));     // indexed by fraction of L
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
function widest_raw(z, top) = max(0.5, min(top - 0.3, widest_table_at(z)));

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
// thins out toward the tip it becomes a spike, so it eases up to 2 (round) before the tip curve.
// The ease runs over a quarter of the length: over only 6mm the section changed shape fast enough
// to show as a crease across the beak (worst with a low beak_squareness).
tip_round_ease = max(6, 0.25 * L);
function exterior_top_exp_final(z) =
  let(n = exterior_top_exp(z), t = smootherstep(clamp01((z - (L - tip_curve - tip_round_ease)) / tip_round_ease)))
  n < 2 ? lerp(n, 2, t) : n;

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
function baffle_shape_at(z) = baffle_curve == 0 ? baffle_type_at(z)
  : max([for (k = [0 : 32]) baffle_type_at(z - 0.5 * k) - 0.85 * 0.5 * k]);
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
function interior_half_w(z, E) =
  let(throat_start = eff_throat_z - eff_throat_length, custom_w = has_pts(INT_WIDTH_C))
  let(raw =
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
function interior_bottom_y(z, E, hw) =
  z <= eff_throat_z && !(has_pts(FLOOR_C) && z >= FLOOR_C[0][0]) ? max(bah_at(z) - hw, max(E[E_BOT], 0) + min_wall) :
  let(t = floor_t(ease(clamp01((z - eff_throat_z) / max(0.001, win_z0 + window_rear_radius - eff_throat_z)))))
  let(raw = (has_pts(FLOOR_C) ? (z < win_z0 ? pchip_at(z, FLOOR_C) : window_floor_y(z))
          : lerp(bah_at(eff_throat_z) - throat_width / 2, window_floor_y(z), t)) - chamber_extra * chamber_weight(z) * (2 - chamber_roof_share(z)))
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
  let(bt = ease(clamp01((z - chamber_peak_z) / max(0.001, win_z0 - chamber_peak_z)))) [lerp(2, 4, bt), lerp(2, 6, bt)];
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
function interior_ring_at(z) =
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
  // Two passes: the window-width limit on the lower walls moves as the width scales.
  let(s1 = interior_fit(z, E, [hw1, top, bot, ne[0], ne[1], narrow, narrow_top], in_win, lo))
  let(s2 = interior_fit(z, E, [hw1 * s1, top, bot, ne[0], ne[1], narrow, narrow_top], in_win, lo))
  let(hw = hw1 * s1 * s2)
  [max(0.05, hw), top, bot, ne[0], ne[1], min(narrow, max(0.05, hw)), narrow_top];

// Width scale (<= 1) that makes every ring point keep its wall at its own height: min_wall before
// the window; under the window 0.6 x side_rail_width for the part within the window width (the
// rails) but the full min_wall for a chamber scooped out wider than the window above them.
function interior_fit(z, E, I, in_win, lo) =
  let(pts = interior_points(ring_dirs(INT_RING_POINTS), z, I))
  let(ratios = [for (p = pts) if (abs(p[0]) > 0.05 && p[1] > lo && p[1] > E[E_BOT] && p[1] < E[E_TOP])
                  let(ext = ring_half_width_at_y(E, p[1]))
                  let(limit = !in_win ? ext - min_wall
                            : abs(p[0]) <= I[5] + 0.01 ? ext - side_rail_width * 0.6
                            : max(min(I[5], ext - side_rail_width * 0.6), ext - min_wall))
                  limit / abs(p[0])])
  len(ratios) ? max(0.05, min(1, min(ratios))) : 1;

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

// ===========================================================================================
// 7. Validation — echoed to the console, not geometry. Assumes the built-in shape.
// ===========================================================================================

// Inside air volume (mm^3): from the end of the neck (the socket depth) to the tip, with the reed
// closing the window — the volume that, with the neck, sets how the mouthpiece tunes on the horn.
// Trapezoid rule over the interior loft's own rings (their polygon area), plus the slot of the
// window below the interior's floor skin, down to the reed (facing) line.
function poly_area(pts) = abs(vsum([for (i = [0 : len(pts) - 1]) let(a = pts[i], b = pts[(i + 1) % len(pts)]) a[0] * b[1] - b[0] * a[1]])) / 2;
function vsum(v, i = 0, acc = 0) = i >= len(v) ? acc : vsum(v, i + 1, acc + v[i]);
function air_volume() =
  let(zs = [for (r = AIR_RINGS) r[0]])
  let(areas = [for (r = AIR_RINGS) let(z = r[0], I = r[1])
                 poly_area(r[2]) + (z > win_z0 ? 2 * window_half_width(z) * max(0, I[2] - facing_at_z(z)) : 0)])
  vsum([for (i = [0 : len(zs) - 2]) (zs[i + 1] - zs[i]) * (areas[i] + areas[i + 1]) / 2]);

module validate() {
  for (r = RENAMED_PARAMS) if (!is_undef(r[1]))
    echo(str("WARNING: ", r[0], " was renamed ", r[2], " — this value is ignored; rename it in the file"));
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
  if (shank_bevel > 0 && shank_bevel_eff() < shank_bevel - 0.01)
    echo(str("WARNING: shank_bevel ", shank_bevel, "mm limited to ", round(shank_bevel_eff() * 10) / 10, "mm: it keeps 0.8mm of the tenon's wall at the opening"));
  if (shank_bevel > 0 && shank_bevel_depth_eff() < shank_bevel_depth - 0.01)
    echo(str("WARNING: shank_bevel_depth ", shank_bevel_depth, "mm limited to ", round(shank_bevel_depth_eff() * 10) / 10, "mm: it leaves 3mm of full-size socket"));
  if (eff_throat_length < throat_taper)
    echo(str("WARNING: throat_taper ", throat_taper, "mm shortened to ", round(eff_throat_length * 10) / 10, "mm — the bore can only start narrowing after the socket"));
  // The chamber as built (the walls keep min_wall, so a chamber wider than the body allows is
  // narrowed): its widest point after the throat.
  chamber_built = 2 * max([0, for (r = AIR_RINGS) if (r[0] > eff_throat_z) r[1][0]]);
  if (chamber_built < chamber_width - 0.3)
    echo(str("WARNING: chamber_width ", chamber_width, "mm limited to ", round(chamber_built * 10) / 10, "mm — the side walls keep min_wall (", min_wall, "mm)"));
  if (facing_model == "gauge" && len(GAUGE_PTS) <= 2)
    echo("WARNING: facing_model gauge has no facing_gauge_points yet — the power curve is used; add points in the Curves panel");
  if (L - reed_length < tenon_end_z + table_ramp - 0.01)
    echo(str("WARNING: reed_length ", reed_length, "mm is longer than this body's table allows: the table starts at ", round(table_rear_z * 10) / 10, "mm from the shank end"));
  if (has_text(top_text) && top_text_width > top_text_room + 0.01)
    echo(str("WARNING: top_text is about ", round(top_text_width), "mm wide but the top is about ", round(top_text_room), "mm wide there — the ends are cut off; make it smaller, shorter or run it along the body"));
  if ((has_text(side_text_right) || has_text(side_text_left)) && side_text_long > lettering_z1 - lettering_z0 + 0.01)
    echo(str("WARNING: side text is about ", round(side_text_long), "mm long but there is room for about ", round(lettering_z1 - lettering_z0), "mm — the ends are cut off"));
  if (HAS_LETTERING && eff_lettering_depth < lettering_depth)
    echo(str("WARNING: lettering_depth ", lettering_depth, "mm limited to ", eff_lettering_depth, "mm — at least 0.8mm of the ", lettering_wall, "mm wall there must remain"));
  echo(str("Overall length: ", L, "mm, tip_opening: ", T, "mm, facing_length: ", F, "mm"));
  echo(str("Inside air volume: ", round(air_volume() / 100) / 10, " cm3 (from where the neck ends to the tip, with the reed closing the window)"));
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
Z_STEP = 64 / render_fn;

// The interior's rings, computed ONCE and shared by the interior loft, the air-volume readout and
// the clearance report: [[z, ring, points], ...] from the end of the socket to the window front.
AIR_RINGS = [for (z = drop_first(station_list(eff_shank_depth, win_front_z, tip_curve + 1, Z_STEP)))
  let(I = interior_ring_at(z)) [z, I, interior_points(ring_dirs(INT_RING_POINTS), z, I)]];

// ---- Exterior: tenon -> flare -> tapered body -> beak -> wide rounded tip, as one loft. The
// table and facing are NOT part of it — facing_cutter slices them in afterward.
// The shank end face is square to the (possibly tilted) bore, through the axis at z = -1. The
// profile is constant behind z = 0, so the loft's first ring is simply the z = 0 cross-section
// with each point moved onto that plane — no trimming boolean.
function end_face_z(y) = -1 + (y - bah_at(-1)) * bore_tan;

// The shank bevel takes wall at the opening: it leaves at least 0.8mm of the tenon's wall there
// (measured sideways, over and under the socket at the end face).
function shank_bevel_eff() =
  let(E = exterior_ring_at(0), c = bah_at(0))
  let(wall = min(E[E_HW] - socket_d / 2, E[E_TOP] - (c + socket_ry), (c - socket_ry) - E[E_BOT]))
  max(0, min(shank_bevel, wall - 0.8));
function shank_bevel_depth_eff() = max(0, min(shank_bevel_depth, eff_shank_depth - 3));

module exterior_solid() {
  dirs = ring_dirs(EXT_RING_POINTS);
  E0 = exterior_ring_at(0);
  end_ring = [for (p = sring(dirs, 0, E0[E_HW], E0[E_TOP], E0[E_BOT], E0[E_NT], E0[E_NB], E0[E_CY])) [p[0], p[1], end_face_z(p[1])]];
  z_first = max([for (p = end_ring) p[2]]);  // the regular stations start just in front of the end face
  ring_loft(concat([end_ring], [for (z = drop_first(station_list(z_first, L - 0.02, tip_curve + 1, Z_STEP)))
    let(E = exterior_ring_at(max(0, z)))
    sring(dirs, z, E[E_HW], E[E_TOP], E[E_BOT], E[E_NT], E[E_NB], E[E_CY], exterior_arc_w(z))]));
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
  bdepth = shank_bevel_depth_eff();
  bv = bdepth > 0 ? shank_bevel_eff() : 0;
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
module window_cutter() {
  ring_loft([for (z = station_list(win_z0 + 0.01, win_front_z - 0.02, tip_curve + 1, Z_STEP * 0.8))
    let(hw = max(0.05, window_half_width(z)), E = exterior_ring_at(z), I = interior_ring_at(z), top = (I[1] + I[2]) / 2)
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

// {token} fill-ins for the lettering texts.
function str_sub(s, a, b) = b <= a ? "" : chr([for (i = [a : b - 1]) ord(s[i])]);
function fmt_inch(mm) = let(t = round(mm / 25.4 * 1000))
  t >= 1000 ? str(t / 1000) : str(".", t < 100 ? "0" : "", t < 10 ? "0" : "", t);
function fmt1(x) = str(round(x * 10) / 10);
LETTERING_TOKENS = [["{tip}", fmt_inch(tip_opening)], ["{tip_mm}", str(round(tip_opening * 100) / 100)],
                    ["{facing}", fmt1(facing_length)], ["{chamber}", fmt1(chamber_width)], ["{length}", fmt1(L)]];
function fill_tokens(s, i = 0, acc = "") =
  i >= len(s) ? acc
  : let(hit = [for (t = LETTERING_TOKENS) if (str_sub(s, i, min(len(s), i + len(t[0]))) == t[0]) t])
    len(hit) > 0 ? fill_tokens(s, i + len(hit[0][0]), str(acc, hit[0][1])) : fill_tokens(s, i + 1, str(acc, s[i]));

lettering_z0 = 2;
lettering_z1 = max(lettering_z0 + 2, L - lettering_tip_clearance);
// Engraving leaves >= 0.8mm: the interior keeps interior_wall() to the outside (min_wall, thinning
// toward the tip past the facing break).
lettering_wall = min(min_wall, interior_wall(lettering_z1));
eff_lettering_depth = lettering_style == "raised" ? lettering_depth : max(0.1, min(lettering_depth, lettering_wall - 0.8));
lettering_raised = lettering_style == "raised";
// Default spots: the middle of the lettering area, along the body; side text on the widest line.
// With both a top picture and top text, the pair is centred there: picture toward the tip, text
// toward the shank, 2mm apart. Their lengths along the body: the picture's from its width and
// top_image_aspect, the text's from its size (~0.62 x size per letter when it runs along).
lettering_mid_z = (0.1 * L + lettering_z1) / 2;
top_text_len = abs(sin(top_text_angle)) * top_text_size + abs(cos(top_text_angle)) * 0.62 * top_text_size * len(fill_tokens(top_text));
top_image_len = top_image_width * (abs(cos(top_image_angle)) * top_image_aspect + abs(sin(top_image_angle)));
top_both = has_text(top_text) && has_text(top_image);
top_image_z = max(lettering_z0, min(lettering_z1, lettering_mid_z + (top_both ? (top_text_len + 2) / 2 : 0) + top_image_position));
top_text_z = max(lettering_z0, min(lettering_z1, lettering_mid_z - (top_both ? (top_image_len + 2) / 2 : 0) + top_text_position));
side_text_z = max(lettering_z0, min(lettering_z1, lettering_mid_z + side_text_position));
side_text_y = exterior_ring_at(side_text_z)[E_CY] + side_text_vertical;
// For validate(): the top text's rough width across the body (same ~0.62 x size per letter) against
// the top zone's width (lettering_zone) over its length, and the side texts' length.
top_text_width = abs(cos(top_text_angle)) * top_text_size + abs(sin(top_text_angle)) * 0.62 * top_text_size * len(fill_tokens(top_text));
function top_zone_w(z) = let(E = exterior_ring_at(max(0, min(L, z)))) 2 * max(0.05, ring_half_width_at_y(E, E[E_CY] + 0.55 * (E[E_TOP] - E[E_CY])) - 0.2);
top_text_room = min([for (k = [-1 : 1]) top_zone_w(max(lettering_z0, min(lettering_z1, top_text_z + k * top_text_len / 2)))]);
side_text_long = 0.62 * side_text_size * max(len(fill_tokens(side_text_right)), len(fill_tokens(side_text_left)));
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

// The exterior over [z0, z1] with every ring moved inward (d > 0) or outward (d < 0) by d.
module exterior_offset(z0, z1, d) {
  dirs = ring_dirs(EXT_RING_POINTS);
  n = max(2, ceil((z1 - z0) / Z_STEP));
  ring_loft([for (i = [0 : n]) let(z = z0 + (z1 - z0) * i / n, E = exterior_ring_at(max(0, min(L, z))))
    sring(dirs, z, max(0.1, E[E_HW] - d), E[E_TOP] - d, E[E_BOT] + d, E[E_NT], E[E_NB], E[E_CY], exterior_arc_w(z))]);
}

module lettering_text(s, size) {
  text(fill_tokens(s), size = size, font = lettering_font_name, halign = "center", valign = "center");
}

// Where each design may go, per station, as a loft of rectangles: top lettering above a split
// height partway up the side, side lettering from 1mm above the underside (and 3.5mm above the
// table) to 0.5mm below the split, so the two never meet (cuts touching along an edge left
// holes). The top zone is only as wide as the body at the split, so every column of it meets the
// surface from inside: a raised letter over the bulge below used to float free of the body.
module lettering_zone(top, hw, y_hi) {
  n = max(2, ceil((lettering_z1 - lettering_z0) / Z_STEP));
  ring_loft([for (i = [0 : n]) let(z = lettering_z0 + (lettering_z1 - lettering_z0) * i / n, E = exterior_ring_at(max(0, min(L, z))))
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
function ext_ring_pt(E, th) =
  let(c = cos(th), s = sin(th), e = 2 / (s >= 0 ? E[E_NT] : E[E_NB]), h = s >= 0 ? E[E_TOP] - E[E_CY] : E[E_CY] - E[E_BOT])
  [E[E_HW] * sign(c) * pow(abs(c), e), E[E_CY] + h * sign(s) * pow(abs(s), e)];
// The lowest the wrap goes: 1mm above the underside, and 3.5mm above the table alongside the
// window (as the side text), clear of the thin walls beside the rails.
function wrap_floor(z, E) = max(E[E_BOT] + 1, z >= win_z0 - 2 ? 3.5 : 1);
WRAP_E = exterior_ring_at(top_image_z);
// The right half of that ring from the top centre down (x >= 0), and the arc length to each point.
WRAP_PTS = [for (j = [0 : 360]) ext_ring_pt(WRAP_E, 90 - j / 2)];
WRAP_CUM = [for (i = 0, a = 0; i <= 360; a = a + (i < 360 ? norm(WRAP_PTS[i + 1] - WRAP_PTS[i]) : 0), i = i + 1) a];
WRAP_MAX = let(fl = wrap_floor(top_image_z, WRAP_E), below = [for (i = [0 : 360]) if (WRAP_PTS[i][1] < fl) i])
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
  n = max(2, ceil((lettering_z1 - lettering_z0) / Z_STEP));
  ring_loft([for (i = [0 : n]) let(z = lettering_z0 + (lettering_z1 - lettering_z0) * i / n, E = exterior_ring_at(max(0, min(L, z))))
    let(lo = wrap_floor(z, E)) [[-hw, lo, z], [hw, lo, z], [hw, y_hi, z], [-hw, y_hi, z]]]);
}

// The design prisms, clipped to their zones (in the design frame).
module lettering_prisms() {
  Es = [for (i = [0 : 16]) exterior_ring_at(lettering_z0 + (lettering_z1 - lettering_z0) * i / 16)];
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
        rotate(-90 - top_text_angle) lettering_text(top_text, top_text_size);
    }
  // In from each side, upright as seen from that side.
  for (side = [[-1, side_text_right], [1, side_text_left]]) if (has_text(side[1]))
    intersection() {
      lettering_zone(false, hw_hi, y_hi);
      translate([0, side_text_y, side_text_z])
        multmatrix([[0, 0, side[0], 0], [0, 1, 0, 0], [-side[0], 0, 0, 0], [0, 0, 0, 1]])
          linear_extrude(height = hw_hi) lettering_text(side[1], side_text_size);
    }
}

module lettering_cutter() {
  difference() {
    lettering_prisms();
    exterior_offset(lettering_z0 - 1, lettering_z1 + 1, eff_lettering_depth);
  }
}

// Tooth-patch pocket: a shallow recess on top of the beak for a stick-on patch, from 1.5mm behind
// the tip back tooth_plate_length, as wide as the top lettering zone (less 0.5mm a side). Its floor
// follows the surface tooth_plate_recess down, but always leaves 0.8mm over the roof inside.
tooth_z1 = L - 1.5;
tooth_z0 = max(break_z - 5, tooth_z1 - tooth_plate_length);
HAS_TOOTH_POCKET = tooth_plate_recess > 0 && tooth_z1 - tooth_z0 >= 2;
function tooth_depth(z, E) = max(0.05, min(tooth_plate_recess, E[E_TOP] - interior_ring_at(z)[1] - 0.8));
module tooth_pocket() {
  n = max(2, ceil((tooth_z1 - tooth_z0) / 0.5));
  zs = [for (i = [0 : n]) tooth_z0 + (tooth_z1 - tooth_z0) * i / n];
  dirs = ring_dirs(EXT_RING_POINTS);
  difference() {
    ring_loft([for (z = zs) let(E = exterior_ring_at(z), ys = E[E_CY] + 0.55 * (E[E_TOP] - E[E_CY]))
      let(w = max(0.05, ring_half_width_at_y(E, ys) - 0.7))
      [[-w, ys, z], [w, ys, z], [w, E[E_TOP] + 5, z], [-w, E[E_TOP] + 5, z]]]);
    ring_loft([for (z = [tooth_z0 - 1, each zs, tooth_z1 + 1]) let(zc = max(tooth_z0, min(tooth_z1, z)), E = exterior_ring_at(zc), d = tooth_depth(zc, E))
      sring(dirs, z, max(0.1, E[E_HW] - d), E[E_TOP] - d, E[E_BOT] + d, E[E_NT], E[E_NB], E[E_CY], exterior_arc_w(zc))]);
  }
}

module lettering_raised_solid() {
  intersection() {
    lettering_prisms();
    exterior_offset(lettering_z0 - 1, lettering_z1 + 1, -eff_lettering_depth);
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

// Where each parameter acts, for the app's "zoom to parameter": [name, [[x0, y0, z0],
// [x1, y1, z1]] (design frame), view, cut] — view is the side to look from ("table", "top",
// "side" (from +x, the left side text's side), "side_right" (from -x), "end", "iso"), cut asks for a lengthwise section (the part is inside). Followed by
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
      lettering_side = box(side_text_z - 15, side_text_z + 15),
      // the side text's shared settings look at the side that has text (the right one is on -x)
      side_view = has_text(side_text_right) && !has_text(side_text_left) ? "side_right" : "side")
  [["frame", [print_orientation, bore_tilt, end_face_lift]],
   ["overall_length", whole, "iso", false], ["neck_cork_diameter", socket, "end", false], ["shank_clearance", socket, "end", false], ["shank_bevel", socket, "end", false], ["shank_bevel_depth", socket, "side", true],
   ["shank_depth", socket, "side", true], ["bore_diameter", bore, "side", true], ["bore_tilt", whole, "side", false],
   ["chamber_shape", chamber, "side", true], ["chamber_width", chamber, "side", true], ["chamber_flare", chamber, "side", true],
   ["chamber_full_length", chamber, "side", true], ["chamber_height", chamber, "side", true],
   ["throat_position", throat, "side", true], ["throat_width", throat, "side", true],
   ["throat_taper", throat, "side", true], ["throat_shape", throat, "side", true], ["floor_shape", chamber, "side", true],
   ["baffle_type", baffle, "side", true], ["baffle_height", baffle, "side", true], ["baffle_start", baffle, "side", true], ["baffle_hump", baffle, "side", true],
   ["baffle_curve", baffle, "side", true], ["sidewall_angle", window, "table", false], ["shank_scale", socket, "side", false],
   ["window_length", window, "table", false], ["window_width", window, "table", false], ["window_taper", window, "table", false],
   ["window_rear_radius", window, "table", false], ["side_rail_width", window, "table", false],
   ["tip_rail_thickness", tip, "table", false], ["tip_curve", tip, "table", false],
   ["table_width_tip", table, "table", false], ["table_width_rear", table, "table", false], ["reed_length", table, "table", false],
   ["tip_opening", facing, "side", false], ["facing_length", facing, "side", false], ["facing_model", facing, "side", false],
   ["facing_exponent", facing, "side", false], ["print_stock", facing, "side", false],
   ["body_width_scale", whole, "top", false], ["body_height_scale", whole, "side", false], ["beak_tip_height", beak, "side", false],
   ["body_squareness", body, "iso", false], ["beak_squareness", beak, "top", false], ["beak_curve", shoulder, "side", false], ["beak_length", shoulder, "side", false], ["ligature_made", ligature, "iso", false], ["underside_squareness", table, "table", false],
   ["bore_axis_height", bore, "side", true], ["min_wall", whole, "side", true],
   ["tooth_plate_recess", beak, "top", false], ["tooth_plate_length", beak, "top", false], ["table_concavity", table, "table", false],
   ["top_text", lettering_top, "top", false], ["top_text_size", lettering_top, "top", false],
   ["top_text_angle", lettering_top, "top", false], ["top_text_position", lettering_top, "top", false],
   ["top_image", lettering_image, "top", false], ["top_image_width", lettering_image, "top", false], ["top_image_aspect", lettering_image, "top", false],
   ["top_image_angle", lettering_image, "top", false], ["top_image_position", lettering_image, "top", false],
   ["side_text_right", lettering_side, "side_right", false], ["side_text_left", lettering_side, "side", false],
   ["side_text_size", lettering_side, side_view, false], ["side_text_position", lettering_side, side_view, false],
   ["side_text_vertical", lettering_side, side_view, false], ["lettering_style", lettering, "iso", false],
   ["lettering_depth", lettering, "iso", false], ["lettering_font", lettering, "iso", false],
   ["lettering_tip_clearance", lettering, "top", false],
   ["ligature_length", ligature, "side", false], ["ligature_position", ligature, "side", false],
   ["ligature_wall", ligature, "end", false], ["ligature_fit", ligature, "end", false],
   ["ligature_shape", ligature, "end", false], ["ligature_reed_grip", ligature, "end", false], ["ligature_tongue", ligature, "side", false], ["ligature_tongue_side", ligature, "side", false],
   ["ligature_reed_thickness", ligature, "end", false], ["ligature_reed_width", ligature, "table", false],
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
// Raised lettering stands out of the body: leave room for it all round.
lig_raise = HAS_LETTERING && lettering_raised ? lettering_depth : 0;
// Covers the sampled outline's chords (the true curve bulges a few hundredths between samples).
LIG_MARGIN = 0.03;
LIG_N = 4 * round(render_fn * 1.5 / 4);                 // support directions per ring
LIG_U = [for (i = [0 : LIG_N - 1]) let(a = -90 + (i - 0.5) * 360 / LIG_N) [cos(a), sin(a)]];
lig_reed_hw = ligature_reed_width > 0 ? ligature_reed_width / 2
  : max([for (i = [0 : 4]) ring_half_width_at_y(exterior_ring_at(lig_z0 + lig_len * i / 4), 0)]);
lig_step = (lig_z1 - lig_zt) / max(2, ceil(lig_z1 - lig_zt));  // ~1mm between stations
lig_nb = round((lig_z1 - lig_zt) / lig_step);                 // stations over the band, tongue included
lig_rings = max(2, ceil(lig_len));                             // rings of the loft (each follows the tongue's edge)
// The tongue's edge: how much of it (0..1) at angle th (the reed side is -90, the top 90).
lig_tongue_dir = ligature_tongue_side == "top" ? 90 : -90;
function lig_tongue_w(th) = pow((1 + cos(th - lig_tongue_dir)) / 2, 3);

// The reed's cross-section: flat on the table (y = 0), the bark arched below it (thickest in the
// middle, edges ~0.65 of it). Its half-width narrows with the tip's own curve.
function lig_reed_pts(z, t) =
  let(rw = max(0.3, lig_reed_hw * tip_factor(L - z, tip_curve)), te = 0.65 * t)
  concat([[rw, 0], [-rw, 0]], [for (i = [-8 : 8]) [rw * i / 8, -(te + (t - te) * (1 - pow(i / 8, 2)))]]);

// Body above the table plane + the table's edges.
function lig_body_pts(z) =
  let(E = exterior_ring_at(z))
  let(body = [for (j = [0 : LIG_N - 1]) let(p = ext_ring_pt(E, j * 360 / LIG_N)) if (p[1] >= 0) p])
  let(hw0 = E[E_BOT] < 0 ? ring_half_width_at_y(E, 0) : 0)
  concat(body, [[hw0, 0], [-hw0, 0]]);

// [body + reed, body alone] support at z. The reed counts ligature_reed_grip + ligature_fit
// thinner, so after the band's ligature_fit gap it is squeezed by the grip (full thickness
// otherwise, also ahead: conservative).
function lig_support(z) =
  let(Pb = lig_body_pts(z), Pr = lig_reed_pts(z, max(0.5, ligature_reed_thickness - ligature_reed_grip - ligature_fit)), m = lig_raise + LIG_MARGIN)
  let(hb = [for (u = LIG_U) max([for (p = Pb) p * u])], hr = [for (u = LIG_U) max([for (p = Pr) p * u])])
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

// Corner i of a ring from support values h pushed out by d: where lines i and i+1 meet (index 0 at
// the bottom centre, counter-clockwise, as sring's rings run).
function lig_corner(h, i, d) =
  let(j = (i + 1) % LIG_N, a = LIG_U[i], b = LIG_U[j], ha = h[i] + d, hb = h[j] + d, det = a[0] * b[1] - a[1] * b[0])
  [(ha * b[1] - hb * a[1]) / det, (a[0] * hb - b[0] * ha) / det];
function lig_ring(h, z, d) = [for (i = [0 : LIG_N - 1]) concat(lig_corner(h, i, d), z)];
// Ring t (0 = the rear edge, following the tongue; 1 = the front edge): each corner at its own z.
// inset: that far inside both edges (the lettering's skin).
function lig_ring_t(env, t, d, inset = 0) =
  [for (i = [0 : LIG_N - 1])
    let(th = -90 + i * 360 / LIG_N, z = lerp(lig_z0 - lig_tongue * lig_tongue_w(th) + inset, lig_z1 - inset, t))
    concat(lig_corner(lig_h_at(env, z), i, d), z)];

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
LIG_HAS_ART = has_text(ligature_text) || has_text(ligature_image);
LIG_ART_INSET = 0.8;
lig_art_depth = lettering_raised ? lettering_depth : max(0.1, min(lettering_depth, ligature_wall - 0.8));
lig_top_z0 = lig_z0 - lig_tongue * lig_tongue_w(90);   // the top's rear edge
lig_text_n = len(fill_tokens(ligature_text));
lig_text_len = abs(sin(ligature_text_angle)) * ligature_text_size + abs(cos(ligature_text_angle)) * 0.62 * ligature_text_size * lig_text_n;
lig_text_wide = abs(cos(ligature_text_angle)) * ligature_text_size + abs(sin(ligature_text_angle)) * 0.62 * ligature_text_size * lig_text_n;
lig_image_len = ligature_image_width * (abs(cos(ligature_image_angle)) * ligature_image_aspect + abs(sin(ligature_image_angle)));
lig_image_wide = ligature_image_width * (abs(sin(ligature_image_angle)) * ligature_image_aspect + abs(cos(ligature_image_angle)));
lig_art_both = has_text(ligature_text) && has_text(ligature_image);
lig_art_mid = max(lig_top_z0, min(lig_z1, (lig_top_z0 + lig_z1) / 2 + ligature_lettering_position));
lig_image_z = lig_art_mid + (lig_art_both ? (lig_text_len + 2) / 2 : 0);
lig_text_z = lig_art_mid - (lig_art_both ? (lig_image_len + 2) / 2 : 0);
lig_art_len = (has_text(ligature_text) ? lig_text_len : 0) + (has_text(ligature_image) ? lig_image_len : 0) + (lig_art_both ? 2 : 0);
lig_art_wide = max(has_text(ligature_text) ? lig_text_wide : 0, has_text(ligature_image) ? lig_image_wide : 0);

// The text and picture as prisms standing up from the band's widest line (so they reach only its
// top), readable from above with the tip away, as the mouthpiece's top text.
module lig_art_prisms(env, y_lo, y_hi) {
  if (has_text(ligature_image))
    translate([0, y_lo, lig_image_z]) rotate([-90, 0, 0]) linear_extrude(height = y_hi - y_lo)
      art_2d(ligature_image, ligature_image_width, ligature_image_angle);
  if (has_text(ligature_text))
    translate([0, y_lo, lig_text_z]) rotate([-90, 0, 0]) linear_extrude(height = y_hi - y_lo)
      rotate(-90 - ligature_text_angle) lettering_text(ligature_text, ligature_text_size);
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

module ligature_band() {
  env = lig_env();
  outer = [for (j = [0 : lig_rings]) lig_ring_t(env, j / lig_rings, ligature_fit + ligature_wall)];
  inner = [for (j = [0 : lig_rings]) lig_ring_t(env, j / lig_rings, ligature_fit)];
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
  d >= vamp ? ligature_reed_thickness : 0.1 + (ligature_reed_thickness - 0.1) * pow(d / vamp, 1.2);
module reed_model() {
  n = max(8, ceil((L - table_rear_z) / 1.5));
  ring_loft([for (i = [0 : n]) let(z = lerp(table_rear_z, L - 0.05, i / n), t = reed_thickness_at(z), te = 0.65 * t,
                                   rw = max(0.3, lig_reed_hw * tip_factor(L - z, tip_curve)))
    concat([for (k = [0 : 8]) [rw * k / 8, -(te + (t - te) * (1 - pow(k / 8, 2))), z]],
           [[rw, 0, z], [-rw, 0, z]],
           [for (k = [-8 : -1]) [rw * k / 8, -(te + (t - te) * (1 - pow(k / 8, 2))), z]])]);
}

// ===========================================================================================
// 9. Assembly and part selection
// ===========================================================================================

module mouthpiece_body() {
  difference() {
    union() {
      exterior_solid();
      if (HAS_LETTERING && lettering_raised) lettering_raised_solid();
    }
    interior_solid();
    window_cutter();
    facing_cutter();
    if (HAS_LETTERING && !lettering_raised) lettering_cutter();
    if (HAS_TOOTH_POCKET) tooth_pocket();
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
else if (print_orientation) translate([0, 0, end_face_lift]) rotate([-bore_tilt, 0, 0]) selected_part();
else selected_part();
