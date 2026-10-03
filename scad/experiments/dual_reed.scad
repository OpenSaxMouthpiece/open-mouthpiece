// Dual-reed mouthpiece: an experiment. Two reed tables in a V, a reed on each, and a divider
// (the septum) between their passages. Its own model, not built by the Generator.
// Alto sizes by default; every size is a setting, so it can be made for any saxophone.
// Frame as the generator's: Z = bore axis (z = 0 neck end), X = width, Y = across the two tables.

/* [Shank] */
// Your neck cork's diameter (mm), measured with calipers.
neck_cork_diameter = 16.2; // [10:0.05:27]
// How much smaller than your cork the socket is (mm): bigger = tighter. Try 0.1-0.3.
shank_clearance = 0.2; // [0:0.01:0.6]
// How far the cork goes in (mm). Shortened if the body is too thin around it.
shank_depth = 29.0; // [10:0.5:70]
// Socket wider at its mouth by this much (mm); 0 = straight.
socket_taper = 0.0; // [0:0.05:1]
// Outside diameter of the round shank (mm). Grown if the socket needs the wall.
shank_diameter = 22.0; // [14:0.1:36]
// Length of the taper from the tables to the round shank (mm).
shank_taper_length = 11.3; // [2:0.1:40]
// Length of the plain round shank at the neck end (mm).
shank_tube_length = 6.0; // [0:0.5:40]

/* [Facing] */
// Gap at the tip, for each reed: from the tip rail to a straightedge on its table (mm).
tip_opening = 1.60; // [0.5:0.01:3.5]
// From the tip back to the break, where the rails leave the flat table (mm).
facing_length = 25.5; // [10:0.1:45]
// Facing curve: 2 = even; higher stays close to the reed longer, lower opens earlier.
facing_exponent = 2.0; // [1:0.05:4]
// Thickness between the two tip rails at the very tip (mm).
tip_web = 2.2; // [0.8:0.05:5]
// Tip rail width, front to back (mm).
tip_rail_thickness = 0.9; // [0.4:0.05:3]
// Rounds the tip's front edge (mm); 0 = square.
tip_edge_radius = 0.45; // [0:0.05:1.5]

/* [Table] */
// Table width just behind the rounded tip (mm).
table_width_tip = 16.8; // [10:0.1:24]
// Table width where it ends, toward the shank (mm).
table_width_rear = 13.6; // [8:0.1:24]
// How far back the rounded tip outline runs (mm).
nose_length = 4.0; // [1:0.1:10]
// Tip outline: 2 = round, higher = squarer.
nose_shape = 2.25; // [1.5:0.05:4]
// Side rail width near the tip (mm).
side_rail_width = 1.4; // [0.6:0.05:3]
// Side rail width at the window's end (mm).
side_rail_width_rear = 2.18; // [0.6:0.05:4]
// Angle between the two tables (degrees): bigger = a thicker body.
table_angle = 13.0; // [6:0.5:24]

/* [Window] */
// Window length from the tip (mm). Shortened to leave room for the socket.
window_length = 38.0; // [15:0.5:75]
// Length of the window's rounded back end (mm).
window_rounding = 5.0; // [0:0.5:20]

/* [Septum] */
// Divider thickness at its front (mm); 0 = no divider.
septum_thickness = 1.8; // [0:0.05:4]
// Thickness where its tapered back end begins (mm).
septum_thickness_rear = 1.8; // [0:0.05:4]
// Thickness of its back edge (mm).
septum_edge = 0.3; // [0.1:0.05:2]
// Where it begins, back from the tip (mm). 0-1 = joined to the tip.
septum_start = 0.0; // [0:0.5:30]
// How long it runs (mm); it stops before the bore.
septum_length = 32.0; // [0:0.5:80]
// Length of its tapered back end (mm).
septum_taper_length = 5.0; // [0:0.5:20]
// Air gap kept on each side of it near the tip (mm); it thins to keep it.
septum_passage = 0.4; // [0.2:0.05:2]

/* [Chamber] */
// Inside cross-section, times the built-in profile: bigger = more air inside.
chamber_size = 1.0; // [0.4:0.01:2.5]
// Corner radius of the chamber's section (mm).
chamber_corner = 0.4; // [0:0.05:3]
// Length over which the chamber rounds into the bore (mm).
throat_blend = 5.3; // [1:0.1:30]
// Thinnest material between the chamber and a table (mm).
min_floor = 1.0; // [0.6:0.05:3]
// Thinnest side wall (mm). The chamber narrows to keep it.
min_wall = 1.2; // [0.8:0.05:3]

/* [Exterior] */
// Total length, neck end to tip (mm). Also changes the inside volume.
overall_length = 89.3; // [55:0.1:160]
// Body width beside the tables, times the built-in outline.
body_width_scale = 1.0; // [0.6:0.01:1.6]
// Height of the widest point, as a fraction of the body's thickness.
shoulder_height = 0.5; // [0.2:0.05:0.9]
// Rounds the table edges (mm).
edge_radius = 0.8; // [0:0.05:3]

/* [Output] */
// What to make: the mouthpiece, a shank test ring, or views for checking.
part = "mouthpiece"; // [mouthpiece, shank_test_ring, cutaway, chamber_only, septum_only, clearance_report, facing_report]
// Smoothness: higher is smoother but slower. 64 is fine for printing.
render_fn = 64; // [16:8:128]

/* [Hidden] */
// Always stands on its neck end (the design frame is the print frame).
print_orientation = true;
bore_tilt = 0;
end_face_lift = 0;
// How far the septum reaches into the side walls (overlap, so the solid is one piece).
septum_bite = 0.2;

// Built-in inside cross-section area (mm^2) along the chamber, at alto size: [mm from the tip,
// area], stretched to the chamber's length and scaled by chamber_size.
AREA = [[0, 0], [2.5, 2.5], [5, 14.6], [7.5, 28.6], [10, 44.3], [12.5, 56.7], [15, 71.9], [17.5, 84.8],
        [20, 97.7], [22.5, 109.6], [25, 121.7], [27.5, 133.7], [30, 146.3], [32.5, 159.0], [35, 170.0],
        [37.5, 177.2], [40, 163.3], [42.5, 163.3], [45, 170.1], [47.5, 176.0], [50, 178.9], [52.5, 191.2],
        [55, 204.0], [57.5, 213.0], [60.3, 201.6]];
AREA_LEN = 60.3;
// Built-in body half-width beside the tables, at alto size: [mm from the tip, mm], stretched to
// the length and scaled by body_width_scale.
WAIST = [[0, 8.4], [10, 8.4], [20, 9.6], [30, 10.8], [40, 10.8], [50, 10.8], [60, 10.4], [70, 11.2], [89.3, 12.9]];
WAIST_LEN = 89.3;

// ===========================================================================================
// Derived. Internally x runs along the axis from the tip (x = 0) to the neck end (x = L);
// the two tables are at +-z, the width is y. The output is turned into the design frame.
// ===========================================================================================

L = overall_length;
Q = 64 / render_fn;
$fn = max(16, round(0.75 * render_fn));
step_tip = 0.25 * Q;
step_fine = 1.0 * Q;
step_mid = 2.0 * Q;

ha = table_angle / 2;
h_tip = tip_web / 2 + tip_opening;
socket_d = neck_cork_diameter - shank_clearance;
sock_r = socket_d / 2;
sock_r_mouth = (socket_d + socket_taper) / 2;
w0 = table_width_tip / 2;
nose_end = max(nose_length, tip_edge_radius) + 0.5;

// The window gives way first (to >= 15mm), so the socket keeps its depth.
win_len = max(15, min(window_length, L - shank_depth - 6));
win_round = win_len - min(window_rounding, win_len - tip_rail_thickness - 1);
// The flat table ends where the shank taper starts (past the window and the facing).
table_end = min(L - 2, max(L - shank_tube_length - shank_taper_length, win_len + 3, facing_length + 1));
shank_cyl = min(L, max(table_end + 1, L - shank_tube_length));
table_wslope = (table_width_tip - table_width_rear) / 2 / table_end;
shank_od = max(shank_diameter, 2 * (sock_r_mouth + min_wall));

function clamp01(t) = max(0, min(1, t));
function smooth(t) = let(u = clamp01(t)) u * u * (3 - 2 * u);
function lerp(a, b, t) = a + (b - a) * clamp01(t);

// --- outside -------------------------------------------------------------------------------
// Half-thickness: the table plane, less the facing curve, less the rounding on the tip's edge.
function facing(x) = (x < facing_length) ? tip_opening * pow((facing_length - x) / facing_length, facing_exponent) : 0;
function tip_roll(x) = (tip_edge_radius <= 0 || x >= tip_edge_radius) ? 0
  : tip_edge_radius - sqrt(max(0, tip_edge_radius * tip_edge_radius - pow(tip_edge_radius - x, 2)));
function h_out(x) = max(0.05, h_tip + x * tan(ha) - facing(x) - tip_roll(x));

// Plan outline of the table, with a rounded nose.
function nose(x) = (x >= nose_length) ? 1
  : pow(max(0, 1 - pow((nose_length - x) / nose_length, nose_shape)), 1 / nose_shape);
function tw(x) = max(0.05, (w0 - table_wslope * x) * nose(x));

// Side rail land, and so the window's half-width.
function rail(x) = side_rail_width + (side_rail_width_rear - side_rail_width) * (x - 4) / max(1, win_len - 4);
function ww(x) = (x >= win_len) ? 0 :
  let(base = max(0.1, tw(x) - rail(x)))
  (x <= win_round) ? base : base * sqrt(max(0, 1 - pow((x - win_round) / (win_len - win_round), 2)));

function waist(x) = max(tw(x), body_width_scale * lookup(x * WAIST_LEN / L, WAIST) * nose(x));

// The shank: the section rounds into a plain cylinder.
function shk(x) = smooth((x - table_end) / (shank_cyl - table_end));
function h_b(x) = lerp(h_out(x), shank_od / 2, shk(x));
function w_b(x) = lerp(waist(x), shank_od / 2, shk(x));
function t_b(x) = lerp(tw(x), shank_od / 2, shk(x));

// The body's section is the hull of two rounded rectangles: the table land (half-thickness h,
// half-width t) and the shoulders (h x shoulder_height, half-width w). Its support function in
// the direction (cos a, sin a) (a from the width toward a table) gives the true wall to anything
// inside it.
function rr_support(a, b, r, ca, sa) = let(rr = max(0, min(r, a * 0.98, b * 0.98))) ca * (b - rr) + sa * (a - rr) + rr;
function body_sec(x) = let(k = shk(x), h = h_b(x), t = t_b(x), w = w_b(x))
  [h, t, lerp(edge_radius, min(h, t), k), h * lerp(shoulder_height, 1, k), w, lerp(min(h * 0.45, w * 0.5), min(h, w), k)];
function body_support(B, ca, sa) = max(rr_support(B[0], B[1], B[2], ca, sa), rr_support(B[3], B[4], B[5], ca, sa));
DIRS = [for (i = [0 : 12]) let(a = i * 90 / 12) [cos(a), sin(a)]];
// Wall needed in a direction: the floor toward a table, the side wall toward the side.
function wall_in(ca, sa) = (ca * min_wall + sa * min_floor) / (ca + sa);

// --- the socket ----------------------------------------------------------------------------
// The socket starts where the body is thick enough all the way to the neck end (it gives way
// last: the window shortened first), and never closer than 6mm behind the window.
function socket_wall_at(x) = let(B = body_sec(x)) min([for (d = DIRS) body_support(B, d[0], d[1])]) - sock_r_mouth;
bore_x0 = min(L - 8, max(L - shank_depth, win_len + 6));
SOCKET_XS = upto(bore_x0, L, 0.5);
SOCKET_THIN = [for (i = [0 : len(SOCKET_XS) - 1]) if (socket_wall_at(SOCKET_XS[i]) < min_wall - 1e-6) i];
bore_x = len(SOCKET_THIN) ? min(L - 8, SOCKET_XS[min(len(SOCKET_XS) - 1, SOCKET_THIN[len(SOCKET_THIN) - 1] + 1)]) : bore_x0;
eff_shank_depth = L - bore_x;

// --- the chamber: its section solved at each station to give the built-in area -------------
function area_t(x) = (x >= bore_x) ? PI * sock_r * sock_r : chamber_size * lookup(x * AREA_LEN / bore_x, AREA);
cham_blend_start = bore_x - throat_blend;
function cblend(x) = smooth((x - cham_blend_start) / (bore_x - cham_blend_start));
// Near the throat both limits close in on the socket radius, so the chamber meets the bore.
function hc_lim(x) = h_b(x) - min_floor;
// The widest the chamber can be at that height and keep its walls in every direction.
function wc_lim(x) = let(B = body_sec(x), hc = hc_lim(x), r = min(chamber_corner, hc))
  min([for (d = DIRS) if (d[0] > 0.05) (body_support(B, d[0], d[1]) - wall_in(d[0], d[1]) - d[1] * (hc - r) - r) / d[0] + r]);
// (never past the walls: the body can be thinner just before the socket)
function hc_max(x) = max(0.05, min(hc_lim(x), lerp(hc_lim(x), sock_r, cblend(x))));
function wc_max(x) = max(0.05, min(wc_lim(x), lerp(wc_lim(x), sock_r, cblend(x))));
// first pass, a rectangle
function wc0(x) = min(wc_max(x), max(area_t(x) / (4 * hc_max(x)), ww(x)));
function hc0(x) = min(hc_max(x), area_t(x) / (4 * wc0(x)));
// the corner rounding costs (4 - PI) r^2 of area: add it back and solve again
function r0(x) = lerp(chamber_corner, min(hc0(x), wc0(x)), cblend(x));
function area_a(x) = area_t(x) + (4 - PI) * pow(r0(x), 2);
function wc(x) = min(wc_max(x), max(area_a(x) / (4 * hc_max(x)), ww(x)));
function hc(x) = min(hc_max(x), area_a(x) / (4 * wc(x)));
function cham_r(x) = lerp(chamber_corner, min(hc(x), wc(x)), cblend(x));

// --- the septum ----------------------------------------------------------------------------
// Started within 1mm of the tip it is joined to the solid tip; further back its front is free.
sept_x0 = septum_start <= 1 ? 0 : septum_start;
sept_x1 = min(septum_start + septum_length, bore_x - 1);
HAS_SEPTUM = septum_thickness > 0 && sept_x1 - sept_x0 > 0.5;
function sept_raw(x) =
  let(flat_end = sept_x0 + max(0.01, (sept_x1 - sept_x0) - septum_taper_length))
  (x <= flat_end)
    ? lerp(septum_thickness, septum_thickness_rear, (x - sept_x0) / max(0.01, flat_end - sept_x0)) / 2
    : lerp(septum_thickness_rear, septum_edge, (x - flat_end) / max(0.01, sept_x1 - flat_end)) / 2;
// thinned so a passage of septum_passage always stays on each side
function sept_h(x) = min(sept_raw(x), max(0.05, h_out(x) - septum_passage));

// --- stations ------------------------------------------------------------------------------
function upto(a, b, s) = [for (x = [a : s : b]) x];
xs_nose = upto(0, nose_end, step_tip);
xs_face = upto(nose_end + step_fine, facing_length, step_fine);
xs_rear = upto(max(nose_end, facing_length) + step_mid, L, step_mid);
xs_body = concat(xs_nose, xs_face, xs_rear, (xs_rear[len(xs_rear) - 1] < L - 0.01) ? [L] : []);
xs_cham = concat([for (x = upto(1, bore_x, step_fine)) if (hc(x) > 0.12 && wc(x) > 0.12) x], [bore_x]);
// fine over the nose like the window's outline, so its sides stay in the walls there
xs_sept = concat(upto(sept_x0, min(sept_x1, nose_end), step_tip), upto(max(sept_x0, nose_end + step_fine), sept_x1, step_fine),
                 [sept_x1]);

// ===========================================================================================
// Solids
// ===========================================================================================

module rrect(a, b, r) {
  rr = max(0.01, min(r, a * 0.98, b * 0.98));
  offset(r = rr) square([max(0.02, 2 * (a - rr)), max(0.02, 2 * (b - rr))], center = true);
}
// A thin slice of a section at x; consecutive slices are hulled into the solids.
module at(x) { translate([x, 0, 0]) rotate([0, 90, 0]) linear_extrude(0.01) children(); }

module body() {
  for (i = [0 : len(xs_body) - 2]) hull()
    for (j = [i, i + 1]) let(B = body_sec(xs_body[j]))
      at(xs_body[j]) hull() { rrect(B[0], B[1], B[2]); rrect(B[3], B[4], B[5]); }
}

module chamber() {
  for (i = [0 : len(xs_cham) - 2]) hull()
    for (j = [i, i + 1]) let(x = xs_cham[j]) at(x) rrect(hc(x), wc(x), cham_r(x));
}

module bore() {
  translate([bore_x, 0, 0]) rotate([0, 90, 0])
    cylinder(h = eff_shank_depth + 1, d1 = socket_d, d2 = socket_d + socket_taper);
}

// One cut through the whole thickness opens both windows.
module windows() {
  hi = [for (x = [tip_rail_thickness : 0.5 : win_len]) [x, ww(x)]];
  lo = [for (x = [win_len : -0.5 : tip_rail_thickness]) [x, -ww(x)]];
  linear_extrude(height = 4 * L, center = true) polygon(concat(hi, lo));
}

// The divider between the two reeds' passages: a baffle for both, built at the chamber's own
// width (plus a bite into the walls), so it needs no boolean against the body.
module septum() {
  if (HAS_SEPTUM)
    for (i = [0 : len(xs_sept) - 2]) hull()
      for (j = [i, i + 1]) let(x = xs_sept[j])
        at(x) rrect(max(0.05, sept_h(x)), max(0.05, wc(x) + septum_bite), 0.15);
}

module mouthpiece() {
  union() {
    difference() { body(); chamber(); bore(); windows(); }
    septum();
  }
}

module shank_test_ring() {
  intersection() { mouthpiece(); translate([bore_x - 1, -L, -L]) cube([L, 2 * L, 2 * L]); }
}

// Into the design frame: x from the tip -> z from the neck end, y -> -x, z -> y. It stands on
// its neck end, as printed (the 0.01 is the sections' slice thickness).
module design_frame() { multmatrix([[0, -1, 0, 0], [0, 0, 1, 0], [-1, 0, 0, L + 0.01], [0, 0, 0, 1]]) children(); }

// ===========================================================================================
// Readouts (the app reads these lines)
// ===========================================================================================

// Inside air from where the neck ends to the tip, with the reeds closing the windows.
function air_area(x) =
  let(hb = h_out(x), w = ww(x))
  x < 1 ? (x >= tip_rail_thickness ? 4 * w * hb : 0)
  : let(h = hc(x), c = wc(x), r = cham_r(x), s = HAS_SEPTUM && x >= sept_x0 && x <= sept_x1 ? sept_h(x) : 0)
    4 * h * c - (4 - PI) * r * r + 4 * w * max(0, hb - h)
    - 4 * min(s, h) * c - 4 * max(0, min(s, hb) - h) * w;
function air_volume() = let(d = 0.5) d * [for (x = [d / 2 : d : bore_x]) air_area(x)] * [for (x = [d / 2 : d : bore_x]) 1];

// The thinnest wall: [mm, x, where] per station, the chamber's against the body in every
// direction, and the socket's.
function chamber_wall_at(x) = let(B = body_sec(x), h = hc(x), c = wc(x), r = min(cham_r(x), h * 0.98, c * 0.98))
  let(walls = [for (d = DIRS) body_support(B, d[0], d[1]) - (d[0] * (c - r) + d[1] * (h - r) + r)], m = min(walls))
  [m, x, search(m, walls)[0] <= 6 ? (x < win_len ? "side wall beside the window" : "side wall") : "floor"];
function clearance_rows() = concat(
  [for (x = upto(2, bore_x - 1, 1)) chamber_wall_at(x)],
  [for (x = upto(bore_x, L, 1)) [socket_wall_at(x), x, "socket wall"]]);

module facing_report() {
  for (d = [0 : 0.5 : facing_length]) echo(str("FACING ", d, " ", facing(d)));
}

module clearance_report() {
  rows = clearance_rows();
  v = [for (r = rows) r[0]];
  worst = rows[search(min(v), v)[0]];
  // z from the neck end, as the generator reports it
  echo(str("CLEARANCE ", worst[0], " at z=", L - worst[1], " (", worst[2], ")"));
}

// "Zoom to parameter": a box (design frame) per setting, the side to look from, and whether to
// cut it open.
function bx(x0, x1) = let(a = max(0, x0), b = min(L, x1), xs = [for (i = [0 : 8]) a + (b - a) * i / 8])
  let(w = max([for (x = xs) max(w_b(x), t_b(x))]), h = max([for (x = xs) h_b(x)])) [[-w, -h, L - b], [w, h, L - a]];
function param_focus() =
  let(whole = bx(0, L), socket = bx(bore_x - 3, L), shank = bx(table_end - 3, L), tip = bx(0, 8), face = bx(0, facing_length + 3),
      table = bx(0, table_end), window = bx(0, win_len + 3), sept = bx(sept_x0, sept_x1 + 2), cham = bx(0, bore_x + 2))
  [["frame", [print_orientation, bore_tilt, end_face_lift]],
   ["overall_length", whole, "iso", false], ["neck_cork_diameter", socket, "end", false], ["shank_clearance", socket, "end", false],
   ["shank_depth", socket, "side", true], ["socket_taper", socket, "side", true], ["shank_diameter", shank, "side", false],
   ["shank_taper_length", shank, "side", false], ["shank_tube_length", shank, "side", false],
   ["tip_opening", face, "side", false], ["facing_length", face, "side", false], ["facing_exponent", face, "side", false],
   ["tip_web", tip, "side", false], ["tip_rail_thickness", tip, "table", false], ["tip_edge_radius", tip, "side", false],
   ["table_width_tip", table, "table", false], ["table_width_rear", table, "table", false], ["nose_length", tip, "table", false],
   ["nose_shape", tip, "table", false], ["side_rail_width", window, "table", false], ["side_rail_width_rear", window, "table", false],
   ["table_angle", whole, "side", false], ["window_length", window, "table", false], ["window_rounding", window, "table", false],
   ["septum_thickness", sept, "side", true], ["septum_thickness_rear", sept, "side", true], ["septum_edge", sept, "side", true],
   ["septum_start", sept, "side", true], ["septum_length", sept, "side", true], ["septum_taper_length", sept, "side", true],
   ["septum_passage", sept, "side", true], ["chamber_size", cham, "side", true], ["chamber_corner", cham, "side", true],
   ["throat_blend", cham, "side", true], ["min_floor", cham, "side", true], ["min_wall", cham, "side", true],
   ["body_width_scale", whole, "top", false], ["shoulder_height", whole, "end", false], ["edge_radius", whole, "iso", false]];

// The summary every render prints, and notes when a setting was adjusted.
module report() {
  echo(str("Overall length: ", L, "mm, tip_opening: ", tip_opening, "mm, facing_length: ", facing_length, "mm"));
  echo(str("Inside air volume: ", round(air_volume() / 100) / 10, " cm3 (from where the neck ends to the tip, with the reeds closing the windows)"));
  // Two windows make genus 2; a septum whose front is free (it starts behind the tip) adds one.
  echo(str("EXPECTED GENUS ", HAS_SEPTUM && sept_x0 > 0 ? 3 : 2));
  if (win_len < window_length - 1e-6) echo(str("WARNING: window_length shortened to ", win_len, "mm to leave room for the socket"));
  if (eff_shank_depth < shank_depth - 1e-6)
    echo(str("WARNING: shank_depth shortened to ", eff_shank_depth, "mm: the body is too thin around the socket (try a bigger table_angle)"));
  if (shank_od > shank_diameter + 1e-6) echo(str("WARNING: shank_diameter limited to ", shank_od, "mm to keep the socket's wall"));
  if (septum_thickness > 0 && sept_x1 < septum_start + septum_length - 1e-6)
    echo(str("WARNING: septum_length shortened to ", max(0, sept_x1 - septum_start), "mm: it stops before the bore"));
  if (tip_web - 2 * tip_edge_radius < 0.8) echo("WARNING: tip_web minus twice tip_edge_radius leaves under 0.8mm at the tip's front edge");
  if (tip_web < 1.4 && !HAS_SEPTUM) echo("WARNING: tip_web under 1.4mm with no septum: the tip is a thin shell");
}

// ===========================================================================================
// Output
// ===========================================================================================

report();
if (part == "mouthpiece") design_frame() mouthpiece();
else if (part == "shank_test_ring") design_frame() shank_test_ring();
else if (part == "cutaway")
  design_frame() difference() { mouthpiece(); translate([-1, 0, -L]) cube([L + 2, L, 2 * L]); }
else if (part == "chamber_only") design_frame() { chamber(); bore(); }
else if (part == "septum_only") design_frame() septum();
else if (part == "clearance_report") clearance_report();
else if (part == "facing_report") facing_report();
