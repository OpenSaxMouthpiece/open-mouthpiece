# Parameters

Every setting of the generator, as the app lists them under **All parameters** (and OpenSCAD's
Customizer shows them). The app's main panel shows a handful of these under friendlier names;
the name in brackets is the one in the `.scad` file. Lengths are in mm, angles in degrees.

Each picture is the alto preset at two values of one setting, the rest unchanged, seen where the
setting acts (a section when it acts inside):

- **gray**: in both
- **blue**: added going from the first value to the second
- **orange**: taken away going from the first value to the second

This page is made by `node scripts/param_docs.mjs` from `scad/lib/mouthpiece_base.scad`.

Sections: [Shank](#shank) · [Chamber](#chamber) · [Baffle](#baffle) · [Window](#window) · [Table](#table) · [Facing](#facing) · [Exterior](#exterior) · [Lettering](#lettering) · [Profile overrides](#profile-overrides) · [Manufacturing](#manufacturing) · [Ligature](#ligature) · [Cap](#cap) · [Output](#output)

## Shank

### Neck cork diameter (`neck_cork_diameter`)

Your neck cork's diameter (mm), measured with calipers.

Range: 10 to 27, step 0.05.

Presets: Alto `16.2` · Tenor `17.2` · Bari `18.0` · Soprano `13.8`.

![neck_cork_diameter: 15 → 17.5](images/params/neck_cork_diameter.png)

*15 → 17.5*

### Cork squeeze (`shank_clearance`)

How much smaller than your cork the socket is (mm): bigger = tighter. Try 0.1-0.3.

Range: 0 to 0.6, step 0.01.

Presets: Alto `0.2` · Tenor `0.2` · Bari `0.2` · Soprano `0.2`.

![shank_clearance: 0 → 0.5](images/params/shank_clearance.png)

*0 → 0.5*

### Shank entry bevel width (`shank_bevel`)

How much wider the socket's mouth is, per side (mm), to ease it onto the cork.

Range: 0 to 3, step 0.1.

Presets: Alto `1.0` · Tenor `1.0` · Bari `1.0` · Soprano `1.0`.

![shank_bevel: 0.3 → 1.8](images/params/shank_bevel.png)

*0.3 → 1.8*

### Bevel depth (`shank_bevel_depth`)

How far in the socket's bevel goes (mm); equal to its width = 45°.

Range: 0.2 to 20, step 0.1.

Presets: Alto `1.0` · Tenor `1.0` · Bari `1.0` · Soprano `1.0`.

![shank_bevel_depth: 0.2 → 6](images/params/shank_bevel_depth.png)

*0.2 → 6*

### Shank depth (`shank_depth`)

How far the cork goes in (mm). Other settings give way to keep it.

Range: 10 to 70, step 0.5.

Presets: Alto `22.0` · Tenor `26.0` · Bari `30.0` · Soprano `25.5`.

![shank_depth: 10 → 37](images/params/shank_depth.png)

*10 → 37*

### Bore diameter (`bore_diameter`)

Diameter of the tube behind the socket (mm), about your neck tip's inside diameter.

Range: 8 to 24, step 0.1.

Presets: Alto `16.0` · Tenor `17.0` · Bari `16.9` · Soprano `13.6`.

![bore_diameter: 12 → 20](images/params/bore_diameter.png)

*12 → 20*

### Bore tilt (`bore_tilt`)

Angle between the bore and the reed table (degrees); typically about 4.

Range: -3 to 8, step 0.1.

Presets: Alto `4.4` · Tenor `4.1` · Bari `4.8` · Soprano `4.1`.

![bore_tilt: 1.7 → 7.2](images/params/bore_tilt.png)

*1.7 → 7.2*

### Shank diameter (`shank_diameter`)

Outside diameter of the shank at the neck end (mm); grows if the wall gets too thin.

Range: 14 to 32, step 0.1.

Presets: Alto `22` · Tenor `23` · Bari `24.1` · Soprano `17.8`.

![shank_diameter: 19 → 25](images/params/shank_diameter.png)

*19 → 25*

## Chamber

### Chamber shape (`chamber_shape`)

Cross-section of the chamber after the throat.

Range: `round`, `square`, `horseshoe`.

Presets: Alto `horseshoe` · Tenor `round` · Bari `round` · Soprano `square`.

![chamber_shape: horseshoe (the alto's) → round](images/params/chamber_shape-round.png)

*`horseshoe` (the alto's) → `round`*

![chamber_shape: horseshoe (the alto's) → square](images/params/chamber_shape-square.png)

*`horseshoe` (the alto's) → `square`*

### Chamber width vs throat (`chamber_width_extra`)

Chamber width vs the throat's (mm): 0 = as wide, + wider (a larger chamber), - narrower.

Range: -1 to 12, step 0.1.

Presets: Alto `-0.4` · Tenor `-0.4` · Bari `0.6` · Soprano `0.2`.

![chamber_width_extra: -1 → 4](images/params/chamber_width_extra.png)

*-1 → 4*

### Chamber flare (`chamber_flare`)

How gradually the chamber widens after the throat: low = quickly, high = slowly.

Range: 0.1 to 0.9, step 0.05.

Presets: Alto `0.4` · Tenor `0.4` · Bari `0.4` · Soprano `0.4`.

![chamber_flare: 0.15 → 0.8](images/params/chamber_flare.png)

*0.15 → 0.8*

### Chamber full length (`chamber_full_length`)

How far the full width runs toward the tip (mm); 40 = as far as it can.

Range: 0 to 40, step 0.5.

Presets: Alto `40` · Tenor `40` · Bari `40` · Soprano `40`.

![chamber_full_length: 5 → 40](images/params/chamber_full_length.png)

*5 → 40*

### Chamber height (`chamber_height`)

Height before the window (mm); 0 = round. Taller lowers the floor, shorter raises it.

Range: 0 to 30, step 0.1.

Presets: Alto `0` · Tenor `0` · Bari `0` · Soprano `0`.

![chamber_height: 0 → 18](images/params/chamber_height.png)

*0 → 18*

### Floor shape (`floor_shape`)

Floor from throat to window: - drops early (deeper), + stays high (a ramp).

Range: -1 to 1, step 0.05.

Presets: Alto `0` · Tenor `0` · Bari `0` · Soprano `0`.

![floor_shape: -0.8 → 0.8](images/params/floor_shape.png)

*-0.8 → 0.8*

### Throat position (`throat_position`)

Where the throat (the narrowest point inside) sits, from the neck end (mm).

Range: 20 to 90, step 0.5.

Presets: Alto `43.5` · Tenor `53.0` · Bari `86.5` · Soprano `34.5`.

![throat_position: 26 → 61](images/params/throat_position.png)

*26 → 61*

### Throat width (`throat_width`)

Width of the throat, the narrowest point inside (mm).

Range: 5 to 24, step 0.1.

Presets: Alto `14.2` · Tenor `14.9` · Bari `14.8` · Soprano `9.3`.

![throat_width: 9.4 → 18.9](images/params/throat_width.png)

*9.4 → 18.9*

### Throat taper (`throat_taper`)

Length of the bore's narrowing into the throat (mm). Short = an abrupt step.

Range: 1 to 80, step 0.5.

Presets: Alto `9` · Tenor `11` · Bari `55` · Soprano `3`.

![throat_taper: 2 → 16](images/params/throat_taper.png)

*2 → 16*

### Throat shape (`throat_shape`)

Throat cross-section; "chamber" = the same as the chamber.

Range: `chamber`, `round`, `square`, `horseshoe`.

Presets: Alto `chamber` · Tenor `chamber` · Bari `chamber` · Soprano `chamber`.

![throat_shape: chamber (the alto's) → round](images/params/throat_shape-round.png)

*`chamber` (the alto's) → `round`*

![throat_shape: chamber (the alto's) → square](images/params/throat_shape-square.png)

*`chamber` (the alto's) → `square`*

![throat_shape: chamber (the alto's) → horseshoe](images/params/throat_shape-horseshoe.png)

*`chamber` (the alto's) → `horseshoe`*

## Baffle

### Baffle shape (`baffle_type`)

Roof above the reed: measured = the preset's own (Original); step = a ledge.

Range: `measured`, `flat`, `rollover`, `step`, `concave`.

Presets: Alto `measured` · Tenor `measured` · Bari `measured` · Soprano `measured`.

![baffle_type: measured (the alto's) → flat](images/params/baffle_type-flat.png)

*`measured` (the alto's) → `flat`*

![baffle_type: measured (the alto's) → rollover](images/params/baffle_type-rollover.png)

*`measured` (the alto's) → `rollover`*

![baffle_type: measured (the alto's) → step](images/params/baffle_type-step.png)

*`measured` (the alto's) → `step`*

![baffle_type: measured (the alto's) → concave](images/params/baffle_type-concave.png)

*`measured` (the alto's) → `concave`*

### Baffle height (`baffle_height`)

Moves the baffle toward the reed (+) or away from it (-) (mm).

Range: -3 to 4, step 0.1.

Presets: Alto `0` · Tenor `0` · Bari `0` · Soprano `0`.

![baffle_height: -1 → 1.5](images/params/baffle_height.png)

*-1 → 1.5*

### Baffle start (`baffle_start`)

Moves where the baffle begins, toward the tip (+) or the neck (-) (mm).

Range: -15 to 15, step 0.5.

Presets: Alto `0` · Tenor `0` · Bari `0` · Soprano `0`.

![baffle_start: -6 → 6](images/params/baffle_start.png)

*-6 → 6*

### Baffle curve (`baffle_curve`)

Bends the baffle: - comes down early, + stays up and drops late.

Range: -1 to 1, step 0.05.

Presets: Alto `0` · Tenor `0` · Bari `0` · Soprano `0`.

![baffle_curve: -0.6 → 0.6](images/params/baffle_curve.png)

*-0.6 → 0.6*

### Baffle hump (`baffle_hump`)

Height of a smooth hump on the baffle just behind the tip (mm).

Range: 0 to 3, step 0.1.

Presets: Alto `0` · Tenor `0` · Bari `0` · Soprano `0`.

![baffle_hump: 0 → 1.5](images/params/baffle_hump.png)

*0 → 1.5*

## Window

### Window length (`window_length`)

Length of the opening under the reed (mm).

Range: 8 to 70, step 0.5.

Presets: Alto `39.0` · Tenor `42.0` · Bari `54.3` · Soprano `28.3`.

![window_length: 23.5 → 54.5](images/params/window_length.png)

*23.5 → 54.5*

### Window width (`window_width`)

Width of the opening under the reed (mm); kept inside the rails automatically.

Range: 6 to 22, step 0.1.

Presets: Alto `15.1` · Tenor `16.2` · Bari `17.2` · Soprano `12.5`.

![window_width: 11.1 → 19.1](images/params/window_width.png)

*11.1 → 19.1*

### Window taper (`window_taper`)

How much narrower the window is at the back (mm).

Range: 0 to 12, step 0.1.

Presets: Alto `3.3` · Tenor `4.3` · Bari `4.3` · Soprano `2.7`.

![window_taper: 0.3 → 6.3](images/params/window_taper.png)

*0.3 → 6.3*

### Window rear radius (`window_rear_radius`)

Rounding of the window's back corners (mm).

Range: 0 to 10, step 0.1.

Presets: Alto `5.5` · Tenor `5.3` · Bari `6.3` · Soprano `4.8`.

![window_rear_radius: 1 → 8](images/params/window_rear_radius.png)

*1 → 8*

### Sidewall angle (`sidewall_angle`)

Chamber side walls over the window (degrees): + lean out (scooped), - lean in.

Range: -20 to 30, step 1.

Presets: Alto `0` · Tenor `0` · Bari `0` · Soprano `0`.

![sidewall_angle: -10 → 15](images/params/sidewall_angle.png)

*-10 → 15*

### Side rail width (`side_rail_width`)

Width of the side rails the reed seals on (mm).

Range: 0.8 to 2.5, step 0.05.

Presets: Alto `1.0` · Tenor `1.0` · Bari `1.0` · Soprano `1.0`.

![side_rail_width: 0.8 → 1.8](images/params/side_rail_width.png)

*0.8 → 1.8*

### Tip rail thickness (`tip_rail_thickness`)

Thickness of the tip rail (mm).

Range: 0.3 to 3, step 0.02.

Presets: Alto `2.0` · Tenor `1.4` · Bari `1.8` · Soprano `1.76`.

![tip_rail_thickness: 1 → 3](images/params/tip_rail_thickness.png)

*1 → 3*

### Tip curve (`tip_curve`)

How far back the tip's curve reaches (mm), outside and window. Match your reed.

Range: 0.5 to 12, step 0.1.

Presets: Alto `3.5` · Tenor `3.8` · Bari `4.3` · Soprano `3.5`.

![tip_curve: 2 → 6](images/params/tip_curve.png)

*2 → 6*

## Table

### Table width tip (`table_width_tip`)

Width of the reed seat at the tip (mm). Match your reed.

Range: 8 to 30, step 0.1.

Presets: Alto `16.8` · Tenor `17.6` · Bari `19.5` · Soprano `14.9`.

![table_width_tip: 11.3 → 22.3](images/params/table_width_tip.png)

*11.3 → 22.3*

### Table width rear (`table_width_rear`)

Width of the reed seat at the back (mm). Match your reed's heel.

Range: 8 to 30, step 0.1.

Presets: Alto `13.2` · Tenor `14.7` · Bari `13.9` · Soprano `11.3`.

![table_width_rear: 8 → 18.7](images/params/table_width_rear.png)

*8 → 18.7*

### Table length (`table_length`)

Length of the table, from the tip to its back end (mm), the facing included.

Range: 50 to 120, step 0.5.

Presets: Alto `71.8` · Tenor `77.7` · Bari `101.5` · Soprano `55.44`.

![table_length: 66 → 76](images/params/table_length.png)

*66 → 76*

### Table concavity (`table_concavity`)

A slight hollow along the reed seat (mm) so the reed seals at both ends.

Range: 0 to 0.1, step 0.005.

Presets: Alto `0` · Tenor `0` · Bari `0` · Soprano `0`.

## Facing

### Tip opening (`tip_opening`)

Gap at the tip, from the tip rail to a straightedge on the table (mm).

Range: 0.5 to 4.5, step 0.01.

Presets: Alto `1.93` · Tenor `2.41` · Bari `2.79` · Soprano `1.65`.

![tip_opening: 1.5 → 2.6 (heights stretched 6x)](images/params/tip_opening.png)

*1.5 → 2.6 (heights stretched 6x)*

### Facing curve length (`facing_length`)

From the tip back to the break, where the rails leave the flat table (mm).

Range: 10 to 45, step 0.1.

Presets: Alto `23.8` · Tenor `25.2` · Bari `28.0` · Soprano `20.0`.

![facing_length: 20 → 28 (heights stretched 6x)](images/params/facing_length.png)

*20 → 28 (heights stretched 6x)*

### Facing model (`facing_model`)

Facing curve: Power (shaped by the exponent), Arc (a true radius) or Gauge (your points).

Range: `power`, `arc`, `gauge`.

Presets: Alto `power` · Tenor `power` · Bari `power` · Soprano `power`.

![facing_model: power (the alto's) → arc (heights stretched 6x)](images/params/facing_model-arc.png)

*`power` (the alto's) → `arc` (heights stretched 6x)*

### Facing exponent (`facing_exponent`)

Power curve shape: 2 is an even curve; lower opens sooner, higher later.

Range: 1.5 to 3, step 0.05.

Presets: Alto `1.8` · Tenor `1.8` · Bari `1.8` · Soprano `1.8`.

![facing_exponent: 1.5 → 3 (heights stretched 6x)](images/params/facing_exponent.png)

*1.5 → 3 (heights stretched 6x)*

## Exterior

### Length (`overall_length`)

Total length, neck end to tip (mm). Also changes the inside volume.

Range: 55 to 160, step 0.1.

Presets: Alto `89.3` · Tenor `96.7` · Bari `142.0` · Soprano `66.0`.

![overall_length: 82 → 96](images/params/overall_length.png)

*82 → 96*

### Body width (`body_width`)

Widest outside width of the body, side to side (mm).

Range: 18 to 40, step 0.1.

Presets: Alto `29` · Tenor `30.7` · Bari `31.7` · Soprano `23.6`.

![body_width: 26 → 32](images/params/body_width.png)

*26 → 32*

### Body height (`body_height`)

Height of the body's top above the reed table, at its tallest (mm).

Range: 18 to 40, step 0.1.

Presets: Alto `27.6` · Tenor `29.3` · Bari `30.5` · Soprano `22.5`.

![body_height: 25 → 30](images/params/body_height.png)

*25 → 30*

### Beak height at the tip (`beak_tip_height`)

Height of the beak at the tip (mm).

Range: 2 to 8, step 0.1.

Presets: Alto `3.6` · Tenor `3.6` · Bari `4.8` · Soprano `3.0`.

![beak_tip_height: 2.8 → 5](images/params/beak_tip_height.png)

*2.8 → 5*

### Body squareness (`body_squareness`)

Body cross-section: 2 = round, higher = boxier, lower = pointed sides.

Range: 1.2 to 8, step 0.1.

Presets: Alto `2.0` · Tenor `2.0` · Bari `2.0` · Soprano `2.0`.

![body_squareness: 1.5 → 4](images/params/body_squareness.png)

*1.5 → 4*

### Beak top (`beak_squareness`)

Top of the beak: lower = ridged, higher = flat.

Range: 1.2 to 8, step 0.1.

Presets: Alto `1.6` · Tenor `1.5` · Bari `1.4` · Soprano `1.5`.

![beak_squareness: 1.2 → 4](images/params/beak_squareness.png)

*1.2 → 4*

### Beak curve (`beak_curve`)

Beak profile from the side: + concave (scooped), - convex (fuller).

Range: -1 to 1, step 0.05.

Presets: Alto `0` · Tenor `0` · Bari `0` · Soprano `0`.

![beak_curve: -0.8 → 0.8](images/params/beak_curve.png)

*-0.8 → 0.8*

### Beak length (`beak_length`)

Moves the shoulder where the beak starts (mm): + a longer, flatter beak, - shorter.

Range: -15 to 15, step 0.5.

Presets: Alto `0` · Tenor `0` · Bari `0` · Soprano `0`.

![beak_length: -8 → 8](images/params/beak_length.png)

*-8 → 8*

### Shoulder sweep (`shoulder_sweep`)

How far the shoulder line runs down the sides toward the tip (mm); 0 = straight across.

Range: 0 to 20, step 0.5.

Presets: Alto `0` · Tenor `0` · Bari `0` · Soprano `0`.

![shoulder_sweep: 0 → 12](images/params/shoulder_sweep.png)

*0 → 12*

### Underside squareness (`underside_squareness`)

Lower sides near the tip: 1.2 (lowest) = curved in, higher = boxier.

Range: 1.2 to 8, step 0.1.

Presets: Alto `1.2` · Tenor `1.2` · Bari `1.2` · Soprano `1.2`.

![underside_squareness: 1.2 → 4](images/params/underside_squareness.png)

*1.2 → 4*

## Lettering

Text and pictures on the outside. The app's **Personalise** section has the main ones.

### Text on top (`top_text`)

Text on top (empty = none). {tip}, {tip_mm}, {facing}, {chamber}, {length} fill in.

Range: text.

Presets: Alto `(empty)` · Tenor `(empty)` · Bari `(empty)` · Soprano `(empty)`.

### Text size (`top_text_size`)

Letter height (mm).

Range: 2 to 20, step 0.5.

Presets: Alto `5` · Tenor `5` · Bari `5` · Soprano `5`.

### Text direction (`top_text_angle`)

Text direction: 0 = along (toward the tip), 90 = across; 180, 270 = upside down.

Range: 0 to 270, step 90.

Presets: Alto `90` · Tenor `90` · Bari `90` · Soprano `90`.

### Text position (`top_text_position`)

Moves the top text toward the tip (+) or the shank (-) (mm).

Range: -50 to 50, step 0.5.

Presets: Alto `0` · Tenor `0` · Bari `0` · Soprano `0`.

### Picture on top (`top_image`)

SVG picture on top (empty = none). Use filled shapes, not strokes.

Range: text.

Presets: Alto `(empty)` · Tenor `(empty)` · Bari `(empty)` · Soprano `(empty)`.

### Picture size (`top_image_width`)

Picture width (mm).

Range: 4 to 90, step 0.5.

Presets: Alto `14` · Tenor `14` · Bari `14` · Soprano `14`.

### Top image aspect (`top_image_aspect`)

Picture height / width, for spacing (the app fills it in).

Range: 0.1 to 10, step 0.01.

Presets: Alto `1` · Tenor `1` · Bari `1` · Soprano `1`.

### Picture rotation (`top_image_angle`)

Picture rotation (degrees).

Range: 0 to 345, step 15.

Presets: Alto `0` · Tenor `0` · Bari `0` · Soprano `0`.

### Picture position (`top_image_position`)

Moves the picture toward the tip (+) or the shank (-) (mm).

Range: -50 to 50, step 0.5.

Presets: Alto `0` · Tenor `0` · Bari `0` · Soprano `0`.

### Wrap picture around to the table (`top_image_wrap`)

Wrap the picture around the body like a label.

Range: on / off.

Presets: Alto `false` · Tenor `false` · Bari `false` · Soprano `false`.

### Text, right side (`side_text_right`)

Text on the right side (seen from above, tip away). Same fill-ins as the top text.

Range: text.

Presets: Alto `(empty)` · Tenor `(empty)` · Bari `(empty)` · Soprano `(empty)`.

### Text, left side (`side_text_left`)

Text on the left side.

Range: text.

Presets: Alto `(empty)` · Tenor `(empty)` · Bari `(empty)` · Soprano `(empty)`.

### Side text size (`side_text_size`)

Side letter height (mm).

Range: 1.5 to 10, step 0.5.

Presets: Alto `3.5` · Tenor `3.5` · Bari `3.5` · Soprano `3.5`.

### Side text position (`side_text_position`)

Moves the side text toward the tip (+) or the shank (-) (mm).

Range: -50 to 50, step 0.5.

Presets: Alto `0` · Tenor `0` · Bari `0` · Soprano `0`.

### Side text vertical (`side_text_vertical`)

Moves the side text up (+) or down (-) (mm).

Range: -10 to 10, step 0.5.

Presets: Alto `0` · Tenor `0` · Bari `0` · Soprano `0`.

### Lettering style (`lettering_style`)

Range: `engraved`, `raised`.

Presets: Alto `engraved` · Tenor `engraved` · Bari `engraved` · Soprano `engraved`.

### Lettering depth (`lettering_depth`)

How deep the letters go, or how far they stand out (mm).

Range: 0.2 to 1.5, step 0.05.

Presets: Alto `0.5` · Tenor `0.5` · Bari `0.5` · Soprano `0.5`.

### Font (`lettering_font`)

Typeface. Keep script faces 5mm or taller.

Range: `Sans Bold`, `Sans`, `Serif Bold`, `Serif`, `Serif Italic`, `Mono Bold`, `Bebas Neue`, `Marcellus SC`, `Rozha One`, `Alfa Slab One`, `Audiowide`, `Black Ops One`, `Lobster`, `Pacifico`, `Kaushan Script`.

Presets: Alto `Sans Bold` · Tenor `Sans Bold` · Bari `Sans Bold` · Soprano `Sans Bold`.

### Lettering tip clearance (`lettering_tip_clearance`)

Keeps lettering this far back from the tip (mm).

Range: 5 to 60, step 0.5.

Presets: Alto `22` · Tenor `22` · Bari `22` · Soprano `22`.

## Profile overrides

Point lists that replace a built-in curve: `[[distance from the shank end, value], ...]`, `[]` = the built-in one. Edit them in the app's **Curves** panel (OpenSCAD's Customizer can't edit lists).

### Bore axis height (`bore_axis_height`)

Only with your own top outline: bore height at the neck end (mm).

Range: 4 to 30, step 0.1.

Presets: Alto `14.5` · Tenor `14.5` · Bari `14.5` · Soprano `14.5`.

### Ext width points (`ext_width_points`)

Advanced: outside width along the length, [[distance, width], ...]; [] = built-in.

Range: text.

Presets: Alto `[]` · Tenor `[]` · Bari `[]` · Soprano `[]`.

### Ext top points (`ext_top_points`)

Advanced: top outline along the length, [[distance, height], ...].

Range: text.

Presets: Alto `[]` · Tenor `[]` · Bari `[]` · Soprano `[]`.

### Ext bottom points (`ext_bottom_points`)

Advanced: underside behind the table, [[distance, height], ...].

Range: text.

Presets: Alto `[]` · Tenor `[]` · Bari `[]` · Soprano `[]`.

### Ext widest points (`ext_widest_points`)

Advanced: height of each section's widest point, [[distance, height], ...].

Range: text.

Presets: Alto `[]` · Tenor `[]` · Bari `[]` · Soprano `[]`.

### Ext top squareness points (`ext_top_squareness_points`)

Advanced: squareness of the upper outside, [[distance, squareness], ...].

Range: text.

Presets: Alto `[]` · Tenor `[]` · Bari `[]` · Soprano `[]`.

### Ext bottom squareness points (`ext_bottom_squareness_points`)

Advanced: squareness of the lower outside, [[distance, squareness], ...].

Range: text.

Presets: Alto `[]` · Tenor `[]` · Bari `[]` · Soprano `[]`.

### Table width points (`table_width_points`)

Advanced: reed seat width along the length, [[distance, width], ...].

Range: text.

Presets: Alto `[]` · Tenor `[]` · Bari `[]` · Soprano `[]`.

### Interior width points (`interior_width_points`)

Advanced: inside width along the length, [[distance, width], ...].

Range: text.

Presets: Alto `[]` · Tenor `[]` · Bari `[]` · Soprano `[]`.

### Interior top squareness points (`interior_top_squareness_points`)

Advanced: squareness of the upper inside, [[distance, squareness], ...].

Range: text.

Presets: Alto `[]` · Tenor `[]` · Bari `[]` · Soprano `[]`.

### Interior bottom squareness points (`interior_bottom_squareness_points`)

Advanced: squareness of the lower inside, [[distance, squareness], ...].

Range: text.

Presets: Alto `[]` · Tenor `[]` · Bari `[]` · Soprano `[]`.

### Floor points (`floor_points`)

Advanced: floor to the window (can start before the throat), [[distance, height], ...].

Range: text.

Presets: Alto `[]` · Tenor `[[40, 3.4], [46, 3.2], [52, 2.9], [54, 1.8]]` · Bari `[]` · Soprano `[[29, 2.3], [31, 2.2], [33, 2.9], [35, 2.7], [37, 2.0]]`.

### Baffle points custom (`baffle_points_custom`)

Advanced: your own baffle, [[distance, height above the table], ...]; wins over the shape.

Range: text.

Presets: Alto `[]` · Tenor `[]` · Bari `[]` · Soprano `[]`.

### Facing gauge points (`facing_gauge_points`)

Advanced: your own facing (Gauge), [[mm from the tip, gap], ...].

Range: text.

Presets: Alto `[]` · Tenor `[]` · Bari `[]` · Soprano `[]`.

## Manufacturing

### Min wall (`min_wall`)

Thinnest wall allowed (mm). The inside shrinks to keep it.

Range: 1.2 to 4, step 0.1.

Presets: Alto `2.0` · Tenor `2.0` · Bari `2.0` · Soprano `2.0`.

### Extra stock for finishing (`print_stock`)

Extra on the table and facing to sand flat after printing (mm); try 0.1-0.2.

Range: 0 to 0.5, step 0.01.

Presets: Alto `0` · Tenor `0` · Bari `0` · Soprano `0`.

![print_stock: 0 → 0.3 (heights stretched 6x)](images/params/print_stock.png)

*0 → 0.3 (heights stretched 6x)*

## Ligature

A ligature made to fit this mouthpiece (the app's **Ligature** section). See [the printing guide](PRINTING.md).

![A ligature on the alto](images/ligature.png)

### Ligature made (`ligature_made`)

A ligature is made for this design (the app shows it and offers its download).

Range: on / off.

Presets: Alto `false` · Tenor `false` · Bari `false` · Soprano `false`.

### Band length (`ligature_length`)

Length of the ligature band along the mouthpiece (mm), on its short side.

Range: 6 to 30, step 0.5.

Presets: Alto `12` · Tenor `12` · Bari `12` · Soprano `10`.

### Position (`ligature_position`)

Band's front edge, mm behind the window's back end; negative is over the window.

Range: -10 to 25, step 0.5.

Presets: Alto `2` · Tenor `2` · Bari `2` · Soprano `2`.

### Wall (`ligature_wall`)

Band thickness (mm): thinner flexes onto it more easily, thicker grips harder.

Range: 1.2 to 5, step 0.1.

Presets: Alto `2.0` · Tenor `2.0` · Bari `2.0` · Soprano `2.0`.

### Shape (`ligature_shape`)

D = round on top, flat under the reed; conform = follows the body.

Range: `d`, `round`, `conform`.

Presets: Alto `d` · Tenor `d` · Bari `d` · Soprano `d`.

### Tongue (`ligature_tongue`)

Extra length on one side, running toward the shank (mm); 0 = a straight band.

Range: 0 to 15, step 0.5.

Presets: Alto `7` · Tenor `7` · Bari `7` · Soprano `5`.

### Tongue side (`ligature_tongue_side`)

Which side the tongue runs along: the top, or under the reed.

Range: `top`, `reed`.

Presets: Alto `top` · Tenor `top` · Bari `top` · Soprano `top`.

### Gap to the body (`ligature_fit`)

Gap between the band and the mouthpiece's body (mm); the reed is squeezed instead.

Range: -0.4 to 0.5, step 0.05.

Presets: Alto `0.1` · Tenor `0.1` · Bari `0.1` · Soprano `0.1`.

### Reed grip (`ligature_reed_grip`)

How much it squeezes the reed against the table (mm): the reed is the tight spot.

Range: 0 to 0.6, step 0.05.

Presets: Alto `0.2` · Tenor `0.2` · Bari `0.2` · Soprano `0.2`.

### Text on the ligature (`ligature_text`)

Text on the ligature's top (empty = none). Same fill-ins as the top text.

Range: text.

Presets: Alto `(empty)` · Tenor `(empty)` · Bari `(empty)` · Soprano `(empty)`.

### Text size (`ligature_text_size`)

Ligature letter height (mm).

Range: 2 to 12, step 0.5.

Presets: Alto `4` · Tenor `4` · Bari `4` · Soprano `4`.

### Text direction (`ligature_text_angle`)

Ligature text direction: 0 = along (toward the tip), 90 = across; 180, 270 = upside down.

Range: 0 to 270, step 90.

Presets: Alto `90` · Tenor `90` · Bari `90` · Soprano `90`.

### Picture on the ligature (`ligature_image`)

SVG picture on the ligature's top (empty = none). Use filled shapes, not strokes.

Range: text.

Presets: Alto `(empty)` · Tenor `(empty)` · Bari `(empty)` · Soprano `(empty)`.

### Picture size (`ligature_image_width`)

Ligature picture width (mm).

Range: 3 to 30, step 0.5.

Presets: Alto `8` · Tenor `8` · Bari `8` · Soprano `8`.

### Ligature image aspect (`ligature_image_aspect`)

Picture height / width, for spacing (the app fills it in).

Range: 0.1 to 10, step 0.01.

Presets: Alto `1` · Tenor `1` · Bari `1` · Soprano `1`.

### Picture rotation (`ligature_image_angle`)

Ligature picture rotation (degrees).

Range: 0 to 345, step 15.

Presets: Alto `0` · Tenor `0` · Bari `0` · Soprano `0`.

### Text and picture position (`ligature_lettering_position`)

Moves the ligature's text and picture toward the tip (+) or the shank (-) (mm).

Range: -15 to 15, step 0.5.

Presets: Alto `0` · Tenor `0` · Bari `0` · Soprano `0`.

## Cap

### Cap made (`cap_made`)

A cap is made for this design (the app shows it and offers its download).

Range: on / off.

Presets: Alto `false` · Tenor `false` · Bari `false` · Soprano `false`.

### Goes over (`cap_ligature`)

What the cap goes over: the ligature made for this design, or a metal one.

Range: `printed`, `metal`.

Presets: Alto `printed` · Tenor `printed` · Bari `printed` · Soprano `printed`.

### Grip squeeze (`cap_grip`)

How hard the rim squeezes the ligature (mm): bigger = tighter; 0 = no squeeze.

Range: 0 to 0.5, step 0.05.

Presets: Alto `0.15` · Tenor `0.15` · Bari `0.15` · Soprano `0.15`.

### Screws and slot (`cap_slot_side`)

Side of the slot up from the rim, and of a metal ligature's screws: under the reed or on top.

Range: `reed`, `top`.

Presets: Alto `reed` · Tenor `reed` · Bari `reed` · Soprano `reed`.

### Slot length (`cap_slot_length`)

Slot up from the rim, for air and so the rim clips on: length (mm); 0 = none.

Range: 0 to 80, step 1.

Presets: Alto `30` · Tenor `30` · Bari `30` · Soprano `30`.

### Slot width (`cap_slot_width`)

Slot width (mm).

Range: 1 to 8, step 0.5.

Presets: Alto `3` · Tenor `3` · Bari `3` · Soprano `3`.

### Air holes in the end (`cap_end_vents`)

Air holes through the closed end, in a row (0 = none).

Range: 0 to 7, step 1.

Presets: Alto `3` · Tenor `3` · Bari `3` · Soprano `3`.

### End hole size (`cap_end_vent_size`)

End hole diameter (mm).

Range: 1 to 4, step 0.5.

Presets: Alto `2` · Tenor `2` · Bari `2` · Soprano `2`.

### Wall (`cap_wall`)

Wall thickness (mm).

Range: 1.2 to 4, step 0.1.

Presets: Alto `1.6` · Tenor `1.6` · Bari `1.6` · Soprano `1.6`.

### Shape (`cap_shape`)

Follows the mouthpiece (smoothed), or round.

Range: `conform`, `round`.

Presets: Alto `conform` · Tenor `conform` · Bari `conform` · Soprano `conform`.

### Extra length (toward the shank) (`cap_extend`)

Lengthens the cap toward the shank (mm); the most covers the whole mouthpiece.

Range: 0 to 120, step 1.

Presets: Alto `0` · Tenor `0` · Bari `0` · Soprano `0`.

### Space at the end (`cap_end_gap`)

Space between the tip and the inside of the closed end (mm).

Range: 1 to 20, step 0.5.

Presets: Alto `4` · Tenor `4` · Bari `4` · Soprano `4`.

### End shape (`cap_end_dome`)

Closed end's shape: 0 = flat, 1 = a full dome as tall as the end gap.

Range: 0 to 1, step 0.1.

Presets: Alto `1` · Tenor `1` · Bari `1` · Soprano `1`.

### Text on the cap (`cap_text`)

Text on the cap's top (empty = none). Same fill-ins as the top text.

Range: text.

Presets: Alto `(empty)` · Tenor `(empty)` · Bari `(empty)` · Soprano `(empty)`.

### Text size (`cap_text_size`)

Cap letter height (mm).

Range: 2 to 14, step 0.5.

Presets: Alto `5` · Tenor `5` · Bari `5` · Soprano `5`.

### Text direction (`cap_text_angle`)

Cap text direction: 0 = along (toward the tip), 90 = across; 180, 270 = upside down.

Range: 0 to 270, step 90.

Presets: Alto `0` · Tenor `0` · Bari `0` · Soprano `0`.

### Picture on the cap (`cap_image`)

SVG picture on the cap's top (empty = none). Use filled shapes, not strokes.

Range: text.

Presets: Alto `(empty)` · Tenor `(empty)` · Bari `(empty)` · Soprano `(empty)`.

### Picture size (`cap_image_width`)

Cap picture width (mm).

Range: 3 to 40, step 0.5.

Presets: Alto `10` · Tenor `10` · Bari `10` · Soprano `10`.

### Cap image aspect (`cap_image_aspect`)

Picture height / width, for spacing (the app fills it in).

Range: 0.1 to 10, step 0.01.

Presets: Alto `1` · Tenor `1` · Bari `1` · Soprano `1`.

### Picture rotation (`cap_image_angle`)

Cap picture rotation (degrees).

Range: 0 to 345, step 15.

Presets: Alto `0` · Tenor `0` · Bari `0` · Soprano `0`.

### Text and picture position (`cap_lettering_position`)

Moves the cap's text and picture toward the tip (+) or the shank (-) (mm).

Range: -30 to 30, step 0.5.

Presets: Alto `0` · Tenor `0` · Bari `0` · Soprano `0`.

### Band length (`cap_metal_length`)

Metal ligature: band length along the mouthpiece (mm).

Range: 6 to 30, step 0.5.

Presets: Alto `16` · Tenor `16` · Bari `16` · Soprano `16`.

### Band position (`cap_metal_position`)

Metal ligature: front edge, mm behind the window's back end.

Range: -10 to 25, step 0.5.

Presets: Alto `2` · Tenor `2` · Bari `2` · Soprano `2`.

### Band thickness (`cap_metal_proud`)

Metal ligature: how far the band stands out of the body all round (mm).

Range: 0 to 4, step 0.1.

Presets: Alto `1.2` · Tenor `1.2` · Bari `1.2` · Soprano `1.2`.

### Screws, width across (`cap_metal_screw_width`)

Metal ligature: width of its screws and their posts, across (mm); the slot widens to clear it.

Range: 4 to 30, step 0.5.

Presets: Alto `14` · Tenor `14` · Bari `14` · Soprano `14`.

### Screws, length along (`cap_metal_screw_length`)

Metal ligature: length of the screw block along the mouthpiece (mm).

Range: 4 to 30, step 0.5.

Presets: Alto `12` · Tenor `12` · Bari `12` · Soprano `12`.

## Output

What the file makes. The debug parts show the pieces the mouthpiece is built from.

### What to print (`part`)

What to make: the mouthpiece, a shank test ring, a ligature, a cap, or debug pieces.

Range: `mouthpiece`, `shank_test_ring`, `ligature`, `cap`, `ligature_seated`, `cap_seated`, `reed_model`, `ligature_clash`, `cap_clash`, `metal_ligature_model`, `interior_only`, `debug_exterior`, `debug_interior`, `debug_window_cutter`, `debug_window_only`, `debug_window_planform`, `debug_facing_cutter`, `debug_facing_only`, `debug_ext_minus_interior`, `debug_ext_minus_window`, `debug_ext_minus_facing`, `clearance_report`, `facing_report`.

Presets: Alto `mouthpiece` · Tenor `mouthpiece` · Bari `mouthpiece` · Soprano `mouthpiece`.

### Render fn (`render_fn`)

Smoothness: higher is smoother but slower. 64 is fine for printing.

Range: 16 to 128, step 8.

Presets: Alto `64` · Tenor `64` · Bari `64` · Soprano `64`.

### Print orientation (`print_orientation`)

Stand it on its neck end, as printed. Off: lie it on the reed table.

Range: on / off.

Presets: Alto `true` · Tenor `true` · Bari `true` · Soprano `true`.
