# Geometry notes (developer reference)

How the generator (`scad/lib/mouthpiece_base.scad`) works. Read before changing it or the presets.

## Construction

`exterior - interior - window_cutter - facing_cutter`. Every main solid is a **ring-stitched
polyhedron** (`ring_loft`: same point count and order per ring, consecutive rings stitched by index,
quad diagonals mirrored on the two halves so the mesh is symmetric). No `hull()` anywhere.

### Exterior

- **Rings.** `exterior_ring_at(z)` -> `[hw, top, bot, widest_y, n_top, n_bot]` (indices `E_*`),
  computed once per station. Superellipse rings (`sring`) with separate upper/lower exponents that
  meet at the widest point; points by angle, blended toward arc-length spacing only on ridged tops
  (exponent < 2), the weight averaged over ±8mm (`exterior_arc_w`; pointwise, it slid crest points
  into jagged triangles). Resolution from `render_fn`: `render_fn` points per exterior ring, ~0.75x
  per interior ring, spacing `Z_STEP = 64 / render_fn` (1mm at 64), plus 16 dense rings over the tip.
- **Outline** = the file's **shape tables** (`shape_width`, `shape_top`, `shape_bottom` behind the
  table, `shape_widest`, `shape_top/bottom_squareness`, each `[[fraction of L, value]]`) joined by
  **PCHIP** (monotone cubic: C1, no overshoot); an `ext_*_points` override replaces a curve. The
  app's shape edits (`top_adjust`, `underside_adjust`, `width_adjust`, and inside `baffle_adjust`,
  `floor_adjust`, `chamber_width_adjust`: `[[fraction of L, mm]]`, 0 at both ends unless given)
  add to the outline after every slider (`adjusted()`, resampled) or to the inside's own lines,
  always before the clamps, so every guarantee still holds (the baffle's printable-slope hold
  applies to them). A top or underside edit also stretches the section between them (`widest_followed()`:
  the widest point moves in proportion), so the flanks follow the crest instead of being squashed. An empty
  table stops with an assertion (`SHAPE_TABLES_OK`); there is no fallback. Knobs:
  `body_width`, `body_height` in mm (the body's widest / tallest table point; the scale that gives
  it, `size_k`, fades in across the flare so the tenon keeps its size; the fade is the flare's own
  progress, `flare_fade`, so a size change stretches the flare's curve instead of adding a hump),
  `beak_tip_height` (the top eases onto it over the last 40%), the three squareness values.
- **Tip.** Width x `tip_factor` (reed-tip quarter ellipse). The front edge rounds over (`tip_nose`
  1.2mm), since the rings close to a vertical line there. A ridged top (exponent < 2) eases to 2
  over 0.25 L before the tip (`tip_round_ease`, `exterior_top_exp_final`). The widest-point table
  keeps its end slope to the tip (`widest_table_at`; held level, it flattened the section into a lip
  line).
- **Beak sliders** (exact no-ops at 0): the shoulder is `shoulder_f(shape_top)`, the start of the
  top's steepest drop (knots from 0.3 L on). `beak_length` (mm, + = longer beak) moves it to
  `SHOULDER_F2` and stretches the top, widest-point and top-squareness tables to follow
  (`beak_remap`: piecewise linear between an anchor 0.3 L behind the shoulder and the tip; 0.2 L
  bunched the body into a bump). `beak_curve` (-1..1, + = scooped) resamples the top from
  `SHOULDER_F2` to the tip (17 knots) and subtracts a half sine of 12% of the beak's drop, so
  shoulder and tip stay put; the roof cap (guarantee 4) keeps the wall. With it and
  `beak_tip_height`, the widest point scales by the same ratio as the crest (`beak_sides_k`, vs
  `def_top0`), so the flanks follow the top (moving the crest alone left a groove / crease).
- **`shoulder_smoothness`** (0..1): the shoulder is the top table's steep drop plus the
  top-squareness table's boxier band behind it; both are replaced around the shoulder by a cubic
  matching value and slope at the ends of a window growing with the setting (10% of L behind, 22%
  in front at 1; `shoulder_smoothed()`), so 1 is a long even drop with nothing left on the flanks.
  A shape edit pushing the shoulder's corner down (`top_adjust`) raises it by the share of the drop
  taken away (`SHOULDER_SMOOTH`): a smooth pull over a sharp step left a double edge (a groove).
- **`beak_top_width`** (-1..1): scales the widest-point table over the beak (x0.55 at -1, x1.2 at
  +1; `beak_top_k()`, faded in across the shoulder): lower pulls the upper flanks in for a narrower,
  rounder top, higher fills them out. 0 = as designed.
- **`shoulder_sweep`** (mm, 0..20): the shoulder line runs down the flanks toward the tip. Behind a
  line slanting from the crest at the shoulder (`SWEEP_Z0`) to the widest point `shoulder_sweep` mm
  further on, the upper half is the same ring with a higher top exponent (+1.6 once past the
  shoulder's step, `SWEEP_ZK`), blurred over max(2.5, 0.4 x sweep) mm. Crest, widest point and width
  are unchanged. `sweep_pt` moves finished ring points outward along rays from the ring centre
  (star-shaped, only ever larger), so everything measured on `exterior_ring_at` stays safe; every
  surface-following part goes through it (exterior loft, `exterior_offset`, tooth pocket,
  `ext_ring_pt`). Check sections, not only angled renders: a version that delayed the top's drop
  dipped the crest into a channel.
- **Bore axis** is centred in the table's tenon (`eff_bah`); `bore_axis_height` only applies with
  `ext_top_points`. The shank end face is square to the tilted bore, built into the loft's first
  ring (no trimming boolean).
- **Shank outside**: `shank_diameter` scales the tables' tenon to that width at the neck end (and
  its heights about the bore axis), fading back to 1 across the flare (`shank_k`); the socket
  guarantee still grows it if thin. The old `*_scale` knobs are hidden multipliers for older files
  and links; src/migrate.ts turns an old file's into sizes (`outlineSizes`).

### Table, facing, window, socket

- **Table**: a flat reed seat from the table's back end (`L - table_length`) to the facing break, width set
  directly (`table_width_rear` -> `table_width_tip`): `table_bot_line` solves each ring's underside
  so the y = 0 chord is exactly that wide; a short scoop (`table_ramp`, 0.09 L) blends the underside
  from the tenon. `table_concavity` adds a half-sine hollow (reed heel to break) in the facing cutter.
- **Facing**: `facing_cutter` removes everything below the table plane and the facing curve
  (`facing_model` power/arc/gauge), lowered by `print_stock` when set. Gauge = PCHIP through
  `GAUGE_PTS`: [0, tip_opening], the user's points inside (0, facing_length) in order and never
  rising toward the break (clamped by construction), [facing_length, 0]; no points = power.
- **Window**: a slot (`window_width`, `window_taper`, `window_rear_radius`) whose front follows the
  reed-tip arc one `tip_rail_thickness` inside the tip; `window_cutter` (6-point rings) cuts it from
  below the table up to the interior's mid-height.
- **Socket**: `socket_d = neck_cork_diameter - shank_clearance` (a bigger "clearance" is a
  **tighter** fit: the cork's squeeze; the app calls it "Cork squeeze"), `eff_shank_depth` deep: the
  interior loft's first two rings (round, square to the tilted bore), then a short cone to the bore.
  **Entry bevel** (`shank_bevel` wider per side at the mouth, `shank_bevel_depth` deep; 1 x 1mm =
  45°): two extra rings that follow the tilted end face (points moved onto `end_face_z(y) + d`), the
  cone continued 0.5mm past the face so it crosses it cleanly. Clamped: `shank_bevel_eff()` leaves
  0.8mm of tenon wall at the face, `shank_bevel_depth_eff()` 3mm of full-size socket. Printed
  standing on the end face, the bevel is an overhang: fine at 45°, steep above ~60°.

### Interior

`interior_ring_at(z)` -> `[hw, top, bot, n_top, n_bot, narrow_hw, narrow_top]`: bore -> throat ->
chamber -> window region. `AIR_RINGS` (computed once) feeds the interior loft, the air-volume
readout and the clearance report.

- **Chamber** (`chamber_hw`): the space under the baffle from the throat to near the tip: throat
  width -> `chamber_width` at `chamber_peak_z` (throat + `chamber_flare` x (facing break - throat)),
  held to `chamber_end_z` (`chamber_full_length`; 40 = as far as it goes), closing by
  `L - tip_curve - 1`. Never narrower than the window above it. On the presets the chamber peaks
  under the window, so `chamber_flare` / `chamber_full_length` only show when `chamber_width` is
  wider than the window.
- **Under the window** the walls rise straight from the window edge for 2mm (rails keep full
  thickness), then open out to the chamber width (`interior_points`); `sidewall_angle` (!= 0) leans
  them out or in from there (`sidewall_allowed`; leaning in, the window cutter's upper corners
  follow). The floor there is a 0.8mm skin above the facing that the window cutter removes.
- **`chamber_height`** (0 = round) acts between the throat and the window: full after the first 40%
  of that stretch, faded out over its last <= 4mm; where the baffle is already the roof the floor
  takes all of it (`chamber_roof_share`), so its effect is modest (alto 8.7 -> 9.1 cm³ from 8 to
  20mm).
- **`floor_shape`** bends the built-in floor from throat to window (`floor_t`, t^(2^(1.5 s))).
  `floor_points` can start before the throat (the bore's round floor is used until its first point).
- **Throat**: `throat_shape` ("chamber" = as the chamber) gives it its own section, easing into the
  chamber's by the chamber peak or the window. The bore narrows into it over `throat_taper`.
- **Clamp order** (the socket is the fit on the horn, so it gives way last): the window shortens (to
  >= 15mm) to leave the socket + cone + 6mm, the throat moves forward past the socket end and back
  before the window (`eff_throat_z`), the narrowing shortens to what's left (`eff_throat_length`,
  >= 1mm), and only then the socket (`eff_shank_depth`). Each is a validate() note. `socket_d` /
  `socket_cone` are defined above all of these (a top-level variable read before its assignment is
  undef; this once hung every render).

### Baffle

The roof over the reed: `baffle_points_custom` if given, else the measured `shape_baffle`, or a
classic shape from `baffle_type` (flat / rollover / step / concave, `baffle_type_at`, between the
base curve's start and tip heights; concave = a 0.22 x drop bell at 62%). Every shape descends toward
the reed at a slope under ~0.85 (the step's face is a fixed 0.85 ramp): steeper would be an
unsupported ledge inside the part when printed standing up. Sliders: `baffle_height` (+ = closer to
the reed; eases in over the first third), `baffle_start` (moves where it begins; the tip end stays),
`baffle_hump` (a bell at 80% of the way to the tip), `baffle_curve` (u -> u^(2^c); held above a 0.85
descent from every point 16mm behind it, `baffle_shape_at`). The roof blends in from the
bore/chamber over 4mm and is smooth-maxed to stay >= 0.4mm above the reed line (`baffle_roof`).

### Readouts

- `validate()` warns when a guarantee overrode a parameter, and on: the chamber narrowed by the
  walls, Gauge without points, reed longer than the table allows, top text wider than the top / side
  text longer than the room (estimated at 0.62 x size per letter).
- "Inside air volume: X cm3" on every render (socket depth to tip, reed closing the window).
- Echo-only parts: `clearance_report` (thinnest wall), `facing_report` (facing gap per mm from the
  tip). `part` also has `shank_test_ring`, `interior_only` and `debug_*` pieces.
- `curve_editor_curves()`: every `*_points` override's curve as the model has it (interior curves
  sampled from `AIR_RINGS`, i.e. after the clamps); only evaluated when echoed (the app's Curves
  panel). Add new overrides to it.
- `param_focus()`: for "zoom to parameter": per parameter/list a box (design frame), a view side and
  whether it's inside (cut), plus the print transform. Add new parameters to it.

### Lettering and pictures

- **Text** (tab "Lettering"): `top_text`, `side_text_right/left` (right = -X, the player's right
  looking down on the top with the tip away), `{tip}`/`{tip_mm}`/`{facing}`/`{chamber}`/`{length}`
  fill-ins (`fill_tokens`), engraved (default) or raised. Each text is a straight prism (down onto
  the top / in from a side) acting only in a skin that follows the surface: engraved = prism minus
  `exterior_offset(.., depth)` (the exterior shrunk inward), raised = prism inside the grown one.
  Clipped by `lettering_zone` lofts to z in [2, L - lettering_tip_clearance]; the top zone sits above
  a split 55% up from the widest line, as wide as the body there; the side zone runs from
  max(3.5, underside + 1) to 0.5mm below the split (top and side cuts meeting along an edge made
  holes; a raised letter below the split floated loose). Engraving leaves >= 0.8mm of
  `interior_wall()`.
- **Top picture**: `top_image` = an SVG name in `scad/art/`, imported as `"../art/" + name`,
  `center = true`, `resize([top_image_width, 0], auto = true)`, cut like the top text. OpenSCAD can't
  measure an import, so `top_image_aspect` (height / width) is filled in by the app's picker; it only
  spaces picture and text (picture toward the tip, 2mm apart). SVG rules (filled shapes, holes as
  subpaths) are in `scad/art/README.md`. Quirk: several import()s of computed file names in one for
  loop all gave the first file. User uploads live in the browser and are sent per render.
- **Wrapped picture** (`top_image_wrap`): the picture's x becomes the distance around the body from
  the top centre, measured on the exterior ring at `top_image_z` (`WRAP_PTS`/`WRAP_CUM`,
  `wrap_frame(u)`). Cut into 1mm strips, each a wedge-shaped prism along that point's inward normal
  (`linear_extrude(scale = ...)`; parallel strips left uncut slivers, genus 3-12), clipped by
  `wrap_zone` down to `wrap_floor`. One measuring ring, so a picture much taller than the body
  distorts toward its ends; one covering the whole body can still give genus 3 (accepted).
- **Fonts**: `lettering_font` is a dropdown of 15 names (`LETTERING_FONTS`; an unknown name is used
  as is, desktop only), all SIL OFL in `scad/lib/fonts/`, registered by `use <fonts/...>` at the top
  of the base (Liberation is not bundled with the WebAssembly build). In the wasm build a missing
  font, and some font files (Cinzel, Abril Fatface, Righteous, Titan One, Bungee, Russo One, Passion
  One, Monoton, Bowlby One), crash the render ("null function"): test every new font there.
  `bundle_scad.mjs` drops the font `use`s.
  Each text can have its own (`top_text_font`, `side_text_font`, `shank_text_font`,
  `ligature_text_font`, `cap_text_font`; "same" = `lettering_font`, via `font_name()`).
- **Shank band** (`SHANK_BAND`): the stretch at the neck end (round, unless the body is boxy), from 1mm past the socket's
  lead-in to where the width starts to flare (at least 7mm: the bari's and soprano's shanks flare
  from the end, so they get that much of the flare), short of the reed's heel. `shank_detail` cuts
  grooves into it (`rings`: half-round, as many as fit up to `shank_detail_count`, one at
  `shank_detail_position`; older files' `ring` = rings, 1; `flutes`: V grooves along it; `spiral`:
  1-4 half-round starts; `knurled`: V grooves both ways). Each is a tube swept over the surface
  (`sd_sweep`: a profile per slice, placed from the surface under each point, `sd_r` from the
  `SD_RGRID` of surface radii by station and angle): the band is only round on a round body, and
  details built around one circle cut deeper and wider at a boxy body's corners. Profiles reach
  only ~1mm past the surface (wide ones fold over themselves on a twisted path). And
  `shank_text` runs around it (2mm strips wedged out along the radius, as the wrapped picture; read
  with the tip up; `shank_text_around` turns it, + toward the right side). Both cut a skin
  (`exterior_relief`: `exterior_offset` with its own depth per station; grooves have 45-degree
  sides, so they print standing on the shank end) at most `SHANK_WALL - 1.2` deep. With text and a
  detail, the text takes the flare end of the band. The rings and flutes run from the end face
  (`SD_SPAN`, -1 on the axis): engraved, each is only as deep as `shank_room` allows (the socket's
  lead-in thins the wall there; 1.2mm stays), flutes open out through the face.
  `shank_detail_style = raised` adds them instead (`shank_raised`: square-sided rings or ribs,
  their tops `exterior_offset` outward by the depth, clipped at the end face; unioned with the
  exterior before the cuts).
- **Braces in strings**: OpenSCAD's parameter export stops at a string containing `{`, dropping
  every later parameter from the Customizer. Files write it `"{tip}"` (`make_variants.mjs`'s
  `fmt`, the app's `scadLiteral`); OpenSCAD reads the same string.

### Ligature

`part = ligature | ligature_seated | reed_model | ligature_clash`; `ligature_made` only records
that the design has one (no geometry reads it). A friction-fit ring made for the model, after
Windy City Woodwinds' printed ring: round inside, a band (`ligature_length`, 12mm; soprano 10) with a
tongue toward the shank (`ligature_tongue` +7mm; soprano 5), on top by default; 2mm wall. `ligature_shape`: "d"
(default: round over the top, following the reed underneath), "round", "conform" (follows the body).

- **The reed is the tight spot**: the reed counts `ligature_reed_grip` + `ligature_fit` thinner, so
  the band squeezes it by the grip (0.2) while the body keeps the fit gap (0.1). The band first
  touches the reed grip / taper mm in front of its seat (the readout says how far).
- **Support functions**: per station (1mm apart, band rear to tip) h(phi) over 1.5 x render_fn
  directions: the body's outline above the table (`ext_ring_pt`), the table edges, a reed (flat top
  at y = 0, arched bark: `LIG_REED_T` (3mm, any reed: the taper fit takes the difference) in the
  middle, 0.65 of it at the edges; the table's width), raised
  lettering's depth and a 0.03mm margin. A running max **from the tip back** makes each station
  contain everything in front of it, so the band always slides on over the beak. Inside = h +
  `ligature_fit`, outside = inside + `ligature_wall` (an outward offset of a convex shape: can't
  self-intersect). Round: the smallest midline-centred circle around the support (ternary search;
  R(c) is convex). D: max of the body+reed support and the upper half of the smallest circle around
  the body alone.
- The tongue makes the rear edge non-planar, so the band is one `tube_loft` polyhedron, intersected
  with a box so Manifold validates it and reports the genus.
- **Placement**: front edge `ligature_position` behind the window's rear end, clamped onto the reed
  (rear >= table_rear_z + 1) and behind the tip (front <= L - 8), shortening with a WARNING if
  needed. Echo: `LIGATURE <length> <front vs window> <inside W H rear> <W H front> <girth> <mm
  forward per 0.1mm thicker reed> <mm forward of the seat at first reed contact>`.
- `ligature` stands on its flat front edge for printing (tongue up); `ligature_seated` and
  `reed_model` get the mouthpiece's print transform so the app overlays them; `ligature_clash` =
  band ∩ mouthpiece, which `npm run check` requires to be empty. Module-local, so mouthpiece renders
  don't pay for it.
- **Lettering** (`ligature_text` (+ `_size`, `_angle`), `ligature_image` (+ `_width`, `_aspect`,
  `_angle`), `ligature_lettering_position`): on the band's top, in the mouthpiece's font, style and
  depth; picture toward the tip, text toward the shank, 2mm apart. Straight prisms
  (`lig_art_prisms`) from the band's widest line, acting in a skin = `tube_loft` between the band's
  rings at two offsets (engraved: outer + 1 down to outer - depth, depth clamped to leave 0.8mm of
  wall; raised: outer - 0.2 up to outer + depth), 0.8mm inside both edges (`lig_ring_t(.., inset)`).
  Two closed solids subtracted instead left a loose sliver. `art_2d(name, width, angle)` is the
  shared picture import. Without lettering the band is built exactly as before.

### Cap

`part = cap | cap_seated | cap_clash | metal_ligature_model`; `cap_made` only records that the design
has one (the app shows `cap_seated` see-through on the mouthpiece, like the ligature). A shell over
the tip, the reed and the ligature, as a store-bought cap: one smooth taper with a slot up from the
rim and air holes in the end; the rim clips onto the ligature. Built like the ligature from **support
functions**: per station (1mm, rim to tip) h(phi) = what the cap must clear: the whole body (behind
the table; above it plus the table's edges on it), **any reed** (`CAP_REED_T` = 4mm at the heel,
`CAP_REED_HW` = 0.5mm wider than the table a side), and the ligature: the printed one's outside (its
own `lig_h_at` + fit + wall) or a metal one's band (+ `cap_metal_proud`). A running max from the tip
back (inclusive) makes each station contain everything in front of it, so the cap slides on;
inside = that + `CAP_CLEARANCE` (0.5), shaped by `cap_shape` (conform, or `lig_round`).
- **Hull** (what makes it look like a moulded cap): per direction, the least concave majorant along z
  (`cap_majorant`, a monotone-chain upper hull over the stations and the dome's rings). That is the
  cross-section of the 3D convex hull of everything inside, so it is a valid support at every station
  and never grows toward the tip (the cap still slides on). Without it the running max stepped hard
  at the ligature's front edge (a drum, then a shoulder) and followed the beak's hollow top slope
  (a hooded look). It stops narrowing `CAP_HOLD` (6mm) behind the tip (the beak's rounded tip
  pinched it to a pencil point).
- **Collar** (over the ligature's band, inside only; the outside follows the hull: `pmax` + wall):
  inside = max(strictly-ahead running max + 0.05 - `CAP_FLEX`, own support - `cap_grip`), then
  `cap_tighten` (a few passes: support lines moved inward can stop touching the shape). The shell
  may be pushed out `CAP_FLEX` (0.4mm) on its way over what is ahead, so the full grip is reached (the
  readout's last number is the peak; a WARNING when under half the request).
- **Closed end**: a dome (`cap_end_dome` 0 = flat, 1 = full; `cap_end_gap` tall): the last ring scaled
  about its smallest-circle centre (`s = 1 - 0.7 dome (1 - cos psi)`, z = gap sin psi), the outside
  the same shifted by the wall (xy wall cos psi, z wall sin psi, so the wall never thins). Scaling a
  support function is always valid; an inward offset made neighbouring corners cross (genus -1..-5,
  "NotManifold") on the thin tip rings. The cap prints standing on its rim (the tip end is a poor base).
- **Slot**: from the rim on `cap_slot_side` (reed = under the reed, where a standard ligature's screws
  are; top = an inverted one's), `cap_slot_length` long, kept 3mm short of the dome; a prism from the
  table plane (y = 0 is inside the cap at every station) outward. Over a metal ligature it starts as a
  window `cap_metal_screw_width` + 1.6 wide, straight to 1.5mm past the screws' front end, then
  rounded. The screws are NOT in the support (they come in at the rim and ride in the window), so
  the cap stays the size of the band. `metal_ligature_model` is a stand-in (band, screw block, two
  screws) that `cap_clash` checks against.
- **End vents** (`cap_end_vents`, `cap_end_vent_size`): a row along x on the dome's centre line, each a
  cylinder along z from the dome's base out through the dome, within 55% of the ring's half-width;
  fewer fit = a WARNING. **EXPECTED GENUS** = the end vents (the slot starts at the rim: no genus).
- **Lettering**: as the ligature's, on a skin between the outer rings at two offsets.
- `cap_clash` = cap ∩ mouthpiece + cap ∩ the printed or stand-in metal ligature; `npm run check` runs it
  with `cap_grip=-0.05` (a squeeze of 0 touches the band's face exactly and leaves zero-thickness
  slivers) and accepts under 1mm³. `npm run sweep -- --part cap` sweeps the Cap and Ligature groups.
- Removed after review (2026-10-04): reed thickness / width (any reed now), a body fit (never
  gripped over the printed ligature), collar length and slits, room inside, side vents, ribs, the D
  shape: the slot and end holes do their jobs.
- Everything lives inside `cap_part()` (module-level values), so mouthpiece renders don't pay for it.

## Parameters

- **`*_points` overrides** are `[[z, value], ...]`, PCHIP-joined, prepared once (`pchip_prep`) and
  evaluated with `pchip_at` (binary search); add new ones the same way (and to
  `curve_editor_curves()`). The Customizer can't edit nested lists; the app's Curves panel can.
- **Renamed parameters** (2026-09-26): chamber_d -> chamber_width, bore_d -> bore_diameter,
  throat_z -> throat_position, throat_length -> throat_taper, chamber_position -> chamber_flare,
  chamber_length -> chamber_full_length (0 "all the way" -> 40), tip_thickness -> beak_tip_height,
  tip_round -> tip_curve, side_text_height -> side_text_vertical, baffle_rollover -> baffle_hump.
  The app rewrites old names in files, saved designs and links (`src/migrate.ts`); the base declares
  the old names undef and warns if a file sets one (`RENAMED_PARAMS`).

## Presets

- The four presets' sizes were measured from Windy City Woodwinds' "64" models (credited in
  README.md) and entered as coarse shape tables: ~6-14 stations per curve (z as a fraction of L to
  0.005, values to 0.1mm), smoothed by hand. Tip openings are the models' nominal sizes (.076" /
  .095" / .110" / .065"); every voice uses facing exponent 1.8 with the measured curve length.
- Chambers: `bore_diameter`, the throat settings, `chamber_width` and a few `floor_points` follow
  the measured floor, roof and width along the bore within ~0.3mm. `chamber_width` is the typical
  width under the baffle (alto 13.8, tenor 14.8, bari 15.4, soprano 11.6), not the maximum. The
  bari's bore is a cone: `bore_diameter` 16.9 + `throat_taper` 55.
- Inside air volume: alto 9.0, tenor 10.2, bari 17.0, soprano 2.9 cm³.

### Variants

`scad/variants/<voice>_<family>.scad`, generated by `scripts/make_variants.mjs` from the voice file
(re-run it, don't edit the files). Neutral names, no sound claims. **Settings only**: every
difference from the preset is a setting the app shows; the hidden shape tables stay the preset's,
so anyone can rebuild a variant (or take it further) in the app.

- **Ash** (big chamber): closer tip, arc facing, round chamber and throat with scooped sidewalls
  (`sidewall_angle` 8, soprano 6), concave baffle; slimmer (width x0.95), round, a smooth full beak with no
  shoulder (`shoulder_smoothness` 1, `beak_curve` -0.3, `beak_length` +8% of L); two rings on the
  shank; 3.4% shorter.
- **Birch** (small chamber): more open tip, square chamber and abrupt square throat, rollover
  baffle + hump, thin tip rail; boxy (squareness 3.2 / 3.0 / 2.2), lower, a crisp set-back shoulder
  (`beak_length` -3% of L) swept down the sides, wide flat beak top; flutes on the shank (soprano:
  knurled, its band is short); 3.4% longer (bari: the preset's length, as length adds air there).
- **Cedar** (all-round): close tip, short facing, flat baffle, 1.2mm rails; wider and soft, a
  softened shoulder into a scooped beak (`beak_curve` 0.7); a spiral on the shank.

Each carries side text (name / `{tip}`, a font per family). Sizes go as a fraction of the preset's
and `beak_length` as a fraction of L, so the four voices match. Guardrails: tip within ~.010" of
the preset, air within ±8% (baffle height is the main lever, ~±10% per mm; chamber width barely
moves it), thinnest wall >= ~1.2mm. The lengths go against each recipe's air (~5% per 3mm on the
alto), so all sit near the preset on the cork; a shorter Ash stops at what the reed needs (table
start >= 0.16 L) and moves the throat (and the bari's bore cone) with the window. The classic baffle
types add air on the smaller voices (soprano flat +21%), so those variants take a negative
`baffle_curve` and keep the preset's chamber/throat widths.
