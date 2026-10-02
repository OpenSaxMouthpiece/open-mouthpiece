# Geometry notes (developer reference)

How the generator works. Read before changing `scad/lib/mouthpiece_base.scad` or the presets.

## How the geometry is built (lib/mouthpiece_base.scad)

`exterior - interior - window_cutter - facing_cutter`; every main solid is a **ring-stitched
polyhedron** (`ring_loft`: same point count and order per ring, consecutive rings stitched by index,
quad diagonals mirrored on the two halves so the mesh is symmetric). No `hull()` anywhere.

- **Rings.** `exterior_ring_at(z)` -> `[hw, top, bot, widest_y, n_top, n_bot]` (indices `E_*`),
  computed once per station. Superellipse rings (`sring`) with separate upper/lower exponents that
  meet at the widest point; points by angle, blended toward arc-length spacing on ridged tops
  (exponent < 2) only. Resolution from `render_fn`: ring points `render_fn` (exterior) / ~0.75x
  (interior), spacing `Z_STEP = 64 / render_fn` (1mm at 64), plus 16 dense rings over the tip.
- **Exterior outline** = the file's **shape tables** (`shape_width`, `shape_top`, `shape_bottom`
  behind the table, `shape_widest`, `shape_top/bottom_squareness`, each `[[fraction of L, value]]`)
  joined by **PCHIP** (monotone cubic: C1, no overshoot); any `ext_*_points` override replaces a
  curve. Knobs: `body_width_scale`, `body_height_scale` (fade in across the flare so the tenon keeps
  its size), `beak_tip_height` (the top eases onto it over the last 40%), and the three squareness
  values (shift the squareness curves' start/end). Width times `tip_factor` (reed-tip quarter
  ellipse) at the tip.
  **Beak sliders** (2026-09-29, "Body & beak" in the app), both exact no-ops at 0 (baselines
  unchanged): the shoulder is `shoulder_f(shape_top)`, the start of the top's steepest drop (knots
  from 0.3 L on). `beak_length` (mm, + = longer beak) moves it to `SHOULDER_F2` and stretches the
  top, widest-point and top-squareness tables to follow (`beak_remap`: piecewise linear between an
  anchor 0.3 L behind the shoulder and the tip; an anchor 0.2 L back bunched the body into a bump
  at +15). `beak_curve` (-1..1, + = scooped / a "swoop") resamples the top from `SHOULDER_F2` to the
  tip (17 knots) and subtracts a half sine of 12% of the beak's drop, so shoulder and tip are
  unchanged; the interior's roof cap (guarantee 4) keeps the wall. Sweep: no holes. A top exponent < 2 (ridge) eases to 2 near the tip (`exterior_top_exp_final`).
- **Bore axis** is centred in the table's tenon (`eff_bah`); `bore_axis_height` only applies with
  `ext_top_points`. The shank end face is square to the tilted bore, built into the loft's first
  ring (no trimming boolean).
- **Shank outside**: `shank_scale` scales the tables' tenon (width, and heights about the bore
  axis), fading back to 1 across the flare (`shank_k`); the socket guarantee still grows it if thin.
- **Tooth-patch pocket** (`tooth_plate_recess` > 0): from 1.5mm behind the tip back
  `tooth_plate_length` (not past the facing break - 5), as wide as the top lettering zone less
  0.7mm a side; its floor follows the surface down the recess but keeps 0.8mm over the roof
  (`tooth_depth`), so it gets shallow toward the tip. Cut like engraving (zone minus the exterior
  shrunk by the depth, per ring).
- **Table**: a flat reed seat from the reed heel (`L - reed_length`) to the facing break, width set
  directly (`table_width_rear` -> `table_width_tip`): `table_bot_line` solves each ring's underside
  so the y = 0 chord is exactly that wide; a short scoop (`table_ramp`, 0.09 L) blends the underside
  from the tenon. `table_concavity` adds a half-sine hollow along it (reed heel to break) in the
  facing cutter. `facing_cutter` removes everything below the table plane and the facing curve
  (`facing_model` power/arc/gauge), lowered by `print_stock` when set. Gauge = PCHIP through
  `GAUGE_PTS`: [0, tip_opening], the user's points inside (0, facing_length) in order and never
  rising toward the break (clamped by construction), [facing_length, 0]; no points = power.
- **Window**: a slot (`window_width`, `window_taper`, `window_rear_radius`) whose front follows the
  reed-tip arc one `tip_rail_thickness` inside the tip; `window_cutter` (6-point rings) cuts it from
  below the table up to the interior's mid-height.
- **Socket**: `socket_d = neck_cork_diameter - shank_clearance` (so a bigger "clearance" is a
  TIGHTER fit: it is the cork's squeeze; the app calls it "Cork squeeze"; the description said
  "bigger = looser" until 2026-09-29), `eff_shank_depth` deep; it is the
  interior loft's first two rings (round square to the tilted bore), then a short cone to the bore.
  **Entry bevel** (`shank_bevel` wider per side at the mouth, `shank_bevel_depth` deep; 1 x 1mm =
  45° by default): two extra rings that follow the tilted end face (points moved onto
  `end_face_z(y) + d`), the cone continued 0.5mm past the face so it crosses it cleanly. Clamped:
  `shank_bevel_eff()` leaves 0.8mm of the tenon's real wall at the face (alto: up to 2.2mm),
  `shank_bevel_depth_eff()` 3mm of full-size socket; validate() says so. Printed standing on the end face, the bevel is
  an overhang at its angle from vertical: fine at 45°, steep above ~60°.
- **Interior** (`interior_ring_at(z)` -> `[hw, top, bot, n_top, n_bot, narrow_hw, narrow_top]`):
  bore -> throat -> chamber -> window region. The **chamber** (`chamber_hw`) is the space under the
  baffle from the throat to near the tip: throat width -> `chamber_width` at `chamber_peak_z` (throat +
  `chamber_flare` x (facing break - throat)), held to `chamber_end_z` (`chamber_full_length`; 40 = as
  far as it goes) and closing by `L - tip_curve - 1`. Under the window the walls rise straight from
  the window edge for 2mm (rails keep full thickness), then open out to the chamber width
  (`interior_points`); `sidewall_angle` (!= 0) instead leans them out or in from there at that angle
  (`sidewall_allowed`; leaning in, the window cutter's upper corners follow). The chamber is never
  narrower than the window under it (the window is the slot). On the presets the chamber peaks under
  the window, so `chamber_flare` / `chamber_full_length` only show when `chamber_width` is wider than
  the window. `chamber_height` (0 = round) acts between the throat and the window: full after the
  first 40% of that stretch, faded out over its last <= 4mm; where the baffle is already the roof the
  floor takes all of it (`chamber_roof_share`). The floor sits close to the table there, so its
  effect is modest (alto 8.7 -> 9.1 cm3 from 8 to 20mm). `floor_shape` bends the built-in floor from
  the throat to the window (`floor_t`, t^(2^(1.5 s))). `throat_shape` ("chamber" = as the chamber)
  gives the throat its own section, easing into the chamber's by the chamber peak or the window. The bore narrows into the throat over
  `throat_taper` (default 6; the soprano's is a 3mm step). Clamp order (the socket is the fit on
  the horn, so it gives way last): the window shortens (to >= 15mm) to leave the socket + cone + 6mm,
  the throat moves forward past the socket end and back before the window (`eff_throat_z`), the
  narrowing shortens to what's left (`eff_throat_length`, >= 1mm), and only then the socket
  (`eff_shank_depth`). Each is a validate() note. `socket_d` / `socket_cone` are defined before all
  of these: a top-level variable read before its assignment is undef (this once hung every render).
  `floor_points` can start before the throat (the bore's round floor is used until its first
  point): a flat floor under a throat that narrows from the top and sides, as in Soprano_64. The floor under the window is a 0.8mm
  skin above the facing that the window cutter removes.
- **Baffle** (roof over the reed): `baffle_points_custom` if given, else the measured
  `shape_baffle`, or a classic shape from `baffle_type` (flat / rollover / step / concave,
  `baffle_type_at`: between the base curve's start and tip heights; custom points win). Every
  shape descends toward the reed at a slope under ~0.85 (the step's face is a fixed 0.85 ramp):
  steeper would be an unsupported ledge inside the part when printed standing up. Sliders `baffle_height` (+ = closer to the reed = brighter; eases in over the first
  third), `baffle_start` (moves where it begins; the curve stretches so the tip end stays),
  `baffle_hump` (bell-shaped hump at 80% of the way to the tip), `baffle_curve` (bends any baffle,
  u -> u^(2^c); a bent one is held above a 0.85 descent from every point 16mm behind it,
  `baffle_shape_at`, so it prints like the others). Concave: a 0.22 x drop bell at 62%. The roof blends in from the
  bore/chamber over 4mm and is smooth-maxed to stay >= 0.4mm above the reed line (`baffle_roof`).
- **Shared interior rings**: `AIR_RINGS` (computed once) feeds the interior loft, the air-volume
  readout and the clearance report.
- **Renamed parameters** (2026-09-26): chamber_d -> chamber_width, bore_d -> bore_diameter,
  throat_z -> throat_position, throat_length -> throat_taper, chamber_position -> chamber_flare,
  chamber_length -> chamber_full_length (0 "all the way" -> 40), tip_thickness -> beak_tip_height,
  tip_round -> tip_curve, side_text_height -> side_text_vertical, baffle_rollover -> baffle_hump.
  The app rewrites old names in files, saved designs and links (`src/migrate.ts`); the base declares
  the old names undef and warns if a file sets one (`RENAMED_PARAMS`).
- **Readouts** (echoes): `validate()` warnings when a parameter was overridden by a guarantee
  (also: the chamber narrowed by the walls, Gauge without points, reed longer than the table allows,
  top text wider than the top / side text longer than the room, estimated at 0.62 x size a letter);
  "Inside air volume: X cm3" on every render (socket depth to tip, reed closing the window — sets
  tuning on the horn); echo-only parts `clearance_report` (thinnest wall) and `facing_report`
  (facing gap per mm from the tip). `part` also has `shank_test_ring`, `interior_only` and
  `debug_*` pieces.
- **Lettering** (tab "Lettering"): `top_text`, `side_text_right/left` (right = -X, the player's
  right looking down on the top with the tip away), `{tip}`/`{tip_mm}`/`{facing}`/`{chamber}`/`{length}`
  fill-ins (`fill_tokens`), engraved (default) or raised. Each text is a straight prism (down onto
  the top / in from a side) acting only in a skin that follows the surface: engraved = prism minus
  `exterior_offset(.., depth)` (the exterior loft shrunk inward), raised = prism inside the grown
  one. Everything is clipped by `lettering_zone` lofts to z in [2, L - lettering_tip_clearance]
  (clear of lip and teeth); the top zone sits above a split 55% up from the widest line and is only
  as wide as the body there; the side zone runs from max(3.5, underside + 1) to 0.5mm below the
  split. Top and side cuts touching along an edge made holes, and a raised letter over the bulge
  below the split floated loose; the zones prevent both. Engraving leaves >= 0.8mm of
  `interior_wall()`. Renders with lettering take ~1-3s.
- **Top picture**: `top_image` = an SVG file name in `scad/art/`, imported as `"../art/" + name`
  (relative to lib/), `center = true`, `resize([top_image_width, 0], auto = true)`, cut like the top
  text. OpenSCAD can't measure an import, so `top_image_aspect` (height / width) is filled in by the
  app's picker from OpenSCAD's measurement (`artAspect`: the viewBox of OpenSCAD's own SVG
  export of the import); it only spaces picture and text (with both, the pair centres on the default
  spot, picture toward the tip, 2mm apart). Strokes import unreliably (a stroked circle came out a
  disk): use filled shapes; holes must be subpaths of their shape (evenodd or reversed): colours are
  ignored, so a white shape on top cuts nothing. Examples in scad/art/ (saxophone, happy face,
  note; original, lines >= 0.5mm at the widths in scad/art/README.md). OpenSCAD
  quirk: several import()s of computed file names in one for loop all gave the first file.
  User uploads are not in scad/art/: the app keeps them in the browser and sends them per render.
- **Wrapped picture** (`top_image_wrap`): the flat picture's x becomes the distance around the body
  from the top centre, measured on the exterior ring at `top_image_z` (`WRAP_PTS`/`WRAP_CUM`,
  `wrap_frame(u)` = point + tangent). Cut into 1mm strips, each a prism along that point's inward
  normal (from 25mm outside to depth + 3 inside), clipped by `wrap_zone` down to `wrap_floor` (1mm
  above the underside; 3.5mm above the table from 2mm before the window, like side text). Strips
  are wedges fanned by the ring's curvature (`linear_extrude(scale = [..., 1])`): parallel strips
  left gaps further out, and where the body bulges past the measuring ring those became uncut
  slivers (genus 3-12). The mapping uses one ring, so a picture much taller than the body is even
  distorts toward its ends; a picture covering the whole body (90mm happy face on the bari) still
  gave genus 3: accepted as an extreme case.
- **Fonts**: `lettering_font` is a dropdown of 15 names mapped by `LETTERING_FONTS` (an unknown
  name is used as a font name as is, desktop only). All are SIL OFL fonts in `scad/lib/fonts/`
  (licence files alongside), registered by `use <fonts/...>` at the top of the base: Liberation
  (also bundled with desktop OpenSCAD, but NOT with the WebAssembly build) and Google Fonts. In
  the WebAssembly build a missing font, and some font files (Cinzel, Abril Fatface, Righteous,
  Titan One, Bungee, Russo One, Passion One, Monoton, Bowlby One), crash the render ("null
  function", even for one letter): test every new font there (all 15 give triangle counts
  identical to native). The app mirror copies .svg/.ttf/.otf too; `bundle_scad.mjs` drops
  the font `use`s (a single file can't carry them).
- `curve_editor_curves()`: every `*_points` override's curve as the model has it (override or
  built-in; interior curves sampled from `AIR_RINGS`, i.e. after the clamps). Only evaluated when
  echoed (the app's Curves panel); add new overrides to it.
- `param_focus()`: for "zoom to parameter" — per parameter/list a box (design frame, from
  `exterior_ring_at` over its z range), a view side and whether it's inside (cut), plus the print
  transform. Add new parameters to it.
- **Ligature** (section 8b; `ligature_made` (bool, the app's "Make a ligature") only records that
  the design has one, so saves, downloads and links keep it; no geometry reads it; `part = ligature | ligature_seated | reed_model | ligature_clash`): a
  friction-fit ring made for the model itself, modelled on Windy City Woodwinds' printed ring (round inside,
  12mm band rising to 19mm on one side: a "tongue" toward the shank, on top by default; 2mm
  wall). `ligature_shape`: "d" (default) = round over the top, following the reed
  underneath so it presses across the reed's width; "round"; "conform" = follows the whole body.
  **The reed is the tight spot:** the reed counts `ligature_reed_grip` + `ligature_fit` thinner, so
  the band squeezes it by the grip (0.2) while the body keeps the fit gap (0.1); the band first
  touches the reed grip / taper mm further forward and is pushed on from there (the readout says
  how far), so it fits any preset, variant or user design (store
  ligatures only fit bodies near the one they were made for; Windy City's printed "Baritone Ligature" STL,
  ID 28.8 -> 30.2mm over 19mm, matches our alto's taper and sits ~5mm too far forward on our bari).
  Per station (1mm apart, from the band's rear to the tip) a **support function** h(phi) over 1.5 x
  render_fn directions: the body's exact outline above the table plane (`ext_ring_pt`), the table
  edges, and a reed (flat top at y = 0, bark arched below: `ligature_reed_thickness` in the middle,
  0.65 of it at the edges, width = the table's unless `ligature_reed_width`), plus raised lettering's
  depth and a 0.03mm chord margin. A running max **from the tip back** makes each station contain
  everything in front of it: the band always slides on over the beak and stops where the body
  grows to fill it. Inside = h + `ligature_fit`, outside = inside + `ligature_wall` (an exact outward
  offset of a convex shape: can't self-intersect); ring corners = where neighbouring support lines
  meet (convex, just outside the hull). Round: the smallest circle centred on the midline around
  that support (R(c) = max(h - c sin phi) is convex in c: ternary search). D: max of the body+reed
  support and the support of the upper half of the smallest circle around the body alone (R + c
  sin above its centre line, R |cos| + c sin below): a max of support functions is the support of
  the hull of the union, so still valid and containing the body. The tongue makes the rear edge
  non-planar (each corner at its own z, height ((1 + cos(th - side)) / 2)^3), so the band is one
  `tube_loft` polyhedron (walls + triangulated end faces), passed through an intersection with a
  box so Manifold validates it and reports the genus. Measured on the Birch alto at fit 0: the
  D touches the body's top corners (>= 0.13mm gap with fit 0.1), squeezes the reed 0.16mm (grip 0.2
  less the 0.03 margin) and stands off up to ~2-3mm over the flat top; the plain alto: 0.13-0.25mm
  over the body. Echo adds a 9th number: mm forward of the seat where it first touches the reed. Placement: front edge `ligature_position` behind the
  window's rear end, clamped onto the reed (rear >= table_rear_z + 1) and behind the tip (front <=
  L - 8), shortening if needed (the band echoes a WARNING). Echo: `LIGATURE <length> <front vs
  window> <inside W H rear> <W H front> <girth> <mm forward per 0.1mm thicker reed>` (from the
  height's taper). `ligature` stands on its flat front edge for printing (tongue up); `ligature_seated` and
  `reed_model` get the mouthpiece's print transform so the app overlays them; `ligature_clash` =
  band ∩ mouthpiece, which `npm run check` requires to be empty. Only evaluated when a ligature part
  is rendered (module-local), so mouthpiece renders don't pay for it. Voices: 12mm band + 7mm
  tongue (as Windy City's bari ligature), soprano 10 + 5.
- **Braces in strings**: OpenSCAD's parameter export (native and wasm) stops at a string value
  containing `{`, dropping every later parameter from the Customizer (the variants' `side_text_left
  = "{tip}"` hid their Lettering rest, Ligature and Printing settings). Files write it `"\u007Btip}"`
  (`make_variants.mjs`'s `fmt`, the app's `scadLiteral`); OpenSCAD reads the same string.
- `SHAPE_TABLES_OK`: an empty `shape_*` table used to hang the render (squareness/baffle) or collapse
  the outline; it now stops with an assertion message. The tables have no fallback.

## Presets and measurements

- Measured (`fit_mouthpiece.mjs --json`) from Windy City **Alto_64_0.076** and **Bari_64_0.110**
  (their bari is 142mm long with a 17.8mm socket); Bari_72 is nearly identical to Bari_64.
- The tenor is **Tenor_64_0.095** throughout (2026-10-02; before, its outline was the "72"'s, whose
  high stepped baffle and .105" tip were hard to sound in the first test print, weak low D and
  below). Tenor_64 mis-fits in the fitter (socket at -5.5mm, tilt 0, tip read ~0.3mm large) and its
  frame comes out yawed 0.66° (centerline +0.2 -> -0.9mm in x along the length): straighten the
  frame before scoring. The fitter's width table read 1-1.6mm too wide from mid-body to the tip, so
  the outline (`shape_width/top/bottom/widest`) was measured directly from slices (top, underside
  and width at x = 0, widest-point height) and rounded to coarse stations. L 96.7, beak tip 3.6,
  window 16.2 / taper 4.3 / r 5.3, tip rail 1.4, table 17.6 / 14.7, `reed_length` 77.7,
  `chamber_width` 14.5, two `shape_baffle` stations where its baffle starts (z 40.5-44.5).
  Socket and bore are one 17mm tube in the mesh, so `shank_depth` 26 stays as set. IoU 0.907
  (0.937 against the straightened frame); interior floor/roof/width within ~0.3mm except the last
  ~8mm of the window (0.5mm narrower). Facing: nominal tip and measured curve length with the
  standard exponent 1.8, as every voice (not matched to the mesh, whose tip reading is unreliable).
  Left: the underside under the flare reaches the table ~4mm early (the generator's `table_ramp`
  scoop, the same on every preset).
  The soprano (2026-09-26) is **Soprano_64_.065**: shape tables resampled from its fit at a 0.15mm
  tolerance, engraving dents dropped, `shape_bottom` start lowered so the derived bore height
  matches (11.3mm), `beak_tip_height` 3.0 (thinner tip scored better than the fitter's 3.6), square
  chamber (round/horseshoe scored lower). Chamber matched with `scripts/interior_profile.mjs`
  (floor/roof/width along the bore, ref vs model): `throat_position` 34.5 (clamped to 1mm before the
  window), `throat_taper` 3, `chamber_width` 9.5 (no chamber wider than the window: the passage under
  the window is the slot itself), a 5-point `floor_points` (0.1mm) -> floor RMS 0.05, roof 0.10,
  width 0.52mm (the window cut's 0.3mm side clearance), IoU 0.913. Its bore is the socket's width, so `shank_depth` 25.5 is
  the fitter's reading, not visible in the mesh. Before it had no reference (alto tables scaled
  by 18.5/22, IoU 0.694).
- Chambers (2026-09-26), matched with `interior_profile.mjs` (floor, roof and width on the
  centerline every mm, ref vs model): alto `bore_diameter` 16.0 (was 15.6), `throat_taper` 9; tenor
  `bore_diameter` 17.0, throat 14.9mm at z 53 over 11mm, a 4-point flat `floor_points`; bari: its bore is
  a straight cone, 16.9 at the socket end -> 14.8 at the throat (`throat_taper` 55); tenor and bari
  `shape_bottom` starts raised (+0.4 / +0.6) to lift the derived bore axis ~0.2-0.3mm onto the
  references'. All within ~0.3mm RMS. The socket (neck fit) was left as printed.
- Shape tables have ~6-14 stations per curve (z as a fraction of L to 0.005, values to 0.1mm),
  smoothed by hand (engraving and mould seams dropped). `chamber_width` presets are the references'
  typical width under the baffle (alto 13.8, tenor 14.8, bari 15.4, soprano 11.6), not their max.
  Bari: `bore_diameter` 16.9 + `throat_taper` 55 model its conical bore. Tip openings are the files'
  nominal sizes (.076" / .095" / .110" / .065").
- Inside air volume: alto 9.0, tenor 10.2 (10.5 before the Tenor_64 outline), bari 17.0, soprano 2.9 cm³ (was alto 8.8, tenor 9.7, bari 17.4 before the chamber pass).
- Variants (2026-09-27): `scad/variants/<voice>_<family>.scad`, generated by
  `scripts/make_variants.mjs` from the voice file (re-run it, don't edit the files). Families with
  neutral names (no sound claims): **Ash** (the big-chamber recipe: closer tip, arc facing, round
  chamber and throat, concave baffle; slim round body, smooth convex beak), **Birch** (small-chamber:
  more open tip, square chamber and abrupt square throat, rollover baffle + hump, thin tip rail;
  flat-sided body, set-back shoulder, straight beak), **Cedar** (all-round: close tip, short facing,
  flat baffle, 1.2mm rails; soft body, concave beak). Each has its own `shape_top` / `shape_width` /
  `shape_top_squareness` (the squareness bump must sit at the family's own shoulder, or it shows as
  a band), side text (name / `{tip}`, engraved, a font per family). Guardrails: tip within ~.010" of
  the preset, air within ±8% (baffle height is the main lever, ~±10% per mm; chamber width barely
  moves it), beak height ±0.4mm, thinnest wall >= ~1.2mm. The alto's outlines are hand-made; the
  other voices' are derived from them (`deriveShapes`, `--derive alto` reproduces the alto's):
  landmarks [0, tenon end, body peak, shoulder, 1] map fractions voice to voice; the body is the
  voice's own table scaled by the family's alto ratio, the beak is the family's curve normalised
  from its start height to the voice's tip. The classic baffle types run straight between the
  measured baffle's ends, above the measured ones, so on smaller voices they add air (soprano:
  flat +21%, concave +28%): those variants take a negative `baffle_curve` and keep the preset's
  chamber/throat widths. Air vs preset: tenor +5/-7/+5%, bari +6.5/+3.5/+4%, soprano +7/0/+3%.
  On top of every family outline, `RESHAPE`: beak length (where the beak starts: Ash 3% of L
  earlier, a longer, gentler beak; Birch 2% later; the tip end stays put) and a flare floor (the top
  never below the tenon's top + 0.3mm; a scaled alto flare left a dip on the bari Birch). Body height
  is supported (`height`) but left at 1. `LENGTH`: Ash 3.4% shorter, Birch 3.4% longer, going against
  each recipe's air (~5% per 3mm on the alto), so all sit near the preset on the cork (air +7%..-2%).
  A shorter Ash stops at what the reed needs (table start >= 0.16 L: tenor 95.3, soprano stays 66)
  and moves the throat (and the bari's bore cone) with the window.
- Scoring a preset: `fit_mouthpiece.mjs ref.stl --frame ref_frame.stl`, render the preset with
  `-D print_orientation=false`, then `compare_sections.mjs ref_frame.stl preset.stl` (per-slice and
  overall volume IoU; `--png out.png --at z1,z2,..` draws overlays: dark both, orange ref only, blue
  model only). `npm run check` does this for the presets whose reference exists locally.

## Fitting other mouthpieces

The measuring scripts named here and above (`fit_mouthpiece.mjs`, `interior_profile.mjs`,
`compare_sections.mjs`) are local tools, not in the repository.

- `fit_mouthpiece.mjs ref.stl [--scad out.scad] [--frame ref_frame.stl] [--json out.json]` finds the
  table (largest supporting flat face), orients into the design frame, measures every 0.5mm and
  writes a param file with `*_points` overrides for exterior, table, chamber and baffle. Knots are
  chosen so the PCHIP curve (not a polyline) stays within tolerance. The top profile's running median
  only fills engraving dents (symmetric window at the ends) and is extended to the tip.
- `*_points` lists are `[[z, value], ...]`, PCHIP-joined, prepared once (`pchip_prep`) and evaluated
  with `pchip_at` (binary search) — add new overrides the same way. The Customizer can't edit nested
  lists; the app's Curves panel can (or set them in the file or with `-D`).
- Fits stay local (`scad/fits/` is gitignored; `npm run check` covers scad/*.scad only, name a fit
  to check it). The baritones80nc fit (IoU 0.971) missed only small features: engraving, a ridge
  on the bari beak, window-front detail.
- Squareness lists are smoothed and simplified in **fill-fraction** space (superellipse area / box:
  n = 8 and 12 look alike, so raw exponents jumped 12 -> 2.5 -> 12): exterior median +-1.5mm then
  mean +-2mm; interior median +-0.75mm only (the chamber really goes round -> square in ~2mm).
  Test harness pattern: fit each reference -> render -> `compare_sections.mjs` (IoU with it: bs80
  0.970, Windy City alto 0.954, tenor 0.952, bari 0.919). The bs80 fit predates this.

## History

- 2026-09-22/23: a hand-rolled three.js generator looked like a "bottle/vase"; moved to OpenSCAD.
  First OpenSCAD pass (hull lofts, pointed tip, "fish" window) rejected; rewritten with ring lofts.
- 2026-09-24: `*_points` overrides and the fitter; optimization pass, then the Manifold nightly
  (renders 20-120s -> ~1s); generic web UI; presets rebuilt from measurements (the old ones
  looked like "beluga whales"); base + voice files replaced the voice dropdown; genus/robustness
  fixes; git + regression check + sweep; plain-language parameter descriptions; baffle sliders and
  parameter cleanup; chamber model; print stock.
- 2026-09-25: print kit + printing guide, section view, air-volume readout; LAN mode and the
  phone/tablet layout; fitter squareness smoothing; Curves panel; zoom to parameter.
- 2026-09-27: Ash/Birch/Cedar variants (alto). Tip crease fixed on every model: the widest-point
  table ended before the tip and then held level while the crest kept descending, so the top of
  the section flattened over the last ~4mm (a lip line); it now keeps the table's end slope
  (`widest_table_at`). The ridge-to-round ease before the tip curve runs over 0.25 L, not 6mm
  (`tip_round_ease`; a band on low `beak_squareness`). Presets moved <0.25% in volume.
  Then: the front edge of the tip rounds over (`tip_nose` 1.2mm: the top eases down to the widest
  point), since the rings close to a vertical line at the tip and their facets fanned into a point
  on the crest; and the exterior's arc-length spacing weight is averaged over +-8mm
  (`exterior_arc_w`): pointwise it switched on and off where a preset's top squareness dips below
  2 and back, sliding crest points sideways into jagged triangles.
