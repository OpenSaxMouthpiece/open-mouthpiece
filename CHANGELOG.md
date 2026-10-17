# Changelog

What changed in Open Mouthpiece, newest first. Dates are when a change went live on
[opensaxmouthpiece.org](https://opensaxmouthpiece.org). Changes still on the
[dev site](https://dev.opensaxmouthpiece.org) are listed under "Coming next".

## Coming next (on the dev site)

- When the model can't build a setting exactly as asked (a limit keeps a wall thick enough, for
  example), the Adjusted note says what you asked for and what the model has.
- Side rails keep their set width all the way to the tip, and the window controls set the rails;
  alto side rails 0.85 mm at the tip, widening 0.3 mm toward the back.
- Facing chart: feeler stops drawn over the points, and typed in to copy a mouthpiece you measured.
- Wall readout at the side rails warns only below 0.8 mm.
- Old design files open unchanged.
- Faster start for the first render and the print kit.
- Shorter hints for the floor shape, baffle and beak length.
- Clearer descriptions in the settings docs, with notes on units and on settings that override
  others.

## 2026-10-15

- Air space view: show the air inside the mouthpiece as its own part.
- Smoother window: a sloped scoop at the back of the window, a rounded table edge, a smoother
  inner rail wall; slimmer alto side rails.
- The tip roof curves into the tip rail in one smooth, arched sweep (no step or wall behind the
  reed's contact point); thinner tip rails on every preset and variant.
- The user guide matches the current settings layout.

## 2026-10-13

- Baffle: one Step slider for the step shape, a Baffle length setting (replaces where the baffle
  begins; old files and links convert), and a baffle height that reaches a nearly flat roof.
- The facing curve, tip roundness, table length and baffle hump are main rows (no longer under More).
- Faster baffle texture and shank decoration.
- A failed render is retried once; the settings panel scrolls as one list per section.

## 2026-10-12

- Sloped tip option, filling the corner behind the tip rail.
- Gill-style baffle grooves: width, reach, and a curved or V bend that can change toward the tip.
- Trapezoid chamber; side walls that lean in or out along the whole chamber.
- Each setting links to its entry in the settings docs.
- A guide to matching a mouthpiece you already have.
- View toolbar: Behavior menu (Auto-zoom, Render on change, Quality), Show menu (Last shape,
  Compare with original); Show descriptions is a checkbox under the settings search.
- More reliable loading: OpenSCAD is loaded once per page and retried after a failed download, and
  a new deploy can't break a page that's already open.

## 2026-10-10

- Chamber wider than the window: the walls lean out from the rails instead of leaving a shelf
  (fixes rough inside edges).
- Engraved baffle texture reaches the tip on a scooped beak.
- The shank test ring is cut square to the bore so it sits flat; alto bore 16.2 mm.
- Save as from a variant or extra makes a copy that opens correctly (older copies are repaired).
- Download buttons show when a file is waiting to be saved; the cap download reuses the preview.
- Without WebGL the site says so instead of failing to start.

## 2026-10-09

- User guide, linked from About as Documentation; About links to every setting.
- Settings in small groups per part (Baffle, Chamber, Throat, ...), each with its own More.
- Chamber width in mm, independent of the throat (older designs keep their shape).
- Baffle texture: grooves along, grooves across or dimples, engraved or raised.
- Shank spiral fades into the body; a setting for how far up the shank decoration reaches.
- Lettering and pictures are cut slanting toward the shank, so nothing floats or leaves a ledge
  when printed standing up.
- Ligature: rounded top edge, chamfered plate edge. Cap: rim bead, domed end that prints without
  supports, optional side vents; both use the mouthpiece's picture by default.
- Download menu: tick the files you want (STLs, test rings, design file, check card); more than
  one file comes as a zip, and the design file brings its pictures along.
- One render per change at the chosen quality; faster ligature, cap and test-ring renders.
- Variants show in their own colours; the ghost of the last shape is off by default.
- The project says up front that it is AI-generated.

## 2026-10-08

- About panel: what the app is, how it works, your designs, help, support, credits and version.
- Outside and Inside: the side view and a slice across it, both editable; From the tip is a tab of
  the shape charts.
- Shank decoration: rounded rings, V flutes, a spiral or knurling, raised or cut in.
- More pictures: clefs, beamed notes, star, heart, flame, skull, cat, bird, wave, lightning.
- Variants Flamma, Silva and Unda, each with an element badge and shank decoration.
- Shape card: Undo and Reset shape; shape edits are counted on the rail.
- Save as keeps the design in the browser; downloads are opt-in.
- Air readout: where it sits on the cork compared with the preset.

## 2026-10-07

- Desktop layout: a rail of sections, one panel, and the shape charts in a card over the view.
- Phone layout: the sections along the bottom, one at a time.
- Shape edits stay within sensible limits, say when a dot is at its limit, and warn about thin walls.
- Compare: B named apart from A and rendered in full.
- Glossary links and a plainer welcome.

## 2026-10-06

- Edit shape: drag the outline, baffle, floor and widths on the side section and a top view, with
  dots on the shoulder and where the shank flares into the body.
- Settings named by what you see, with words at both ends of every slider; a More per section
  instead of All parameters.
- Shoulder smoothness, from a crisp step to a smooth drop; Beak top width; a From the tip view.
- Personalise: a font per text, text around the shank, shank rings or flutes.
- Download menu and a side-section view.

## 2026-10-05

- Glossary of mouthpiece parts with labelled pictures.
- Lettering: several lines and variables (tip, title, voice); always engraved on the mouthpiece.
- reed_length renamed table_length (old files and links still work).
- Smoother shank flare and beak sides near the tip; beak curve and tip height move the sides with
  the top.
- Faster ligature, cap and interior; a Whole model button after auto-zoom.
- Phone: the view height is remembered.
- Printing guide: notes on tuning the octave.

## 2026-10-04

- Mouthpiece cap, made and shown like the ligature, with optional extra length toward the shank.
- Part tabs; simpler cap and ligature settings.
- C-melody draft preset in a new Extras group.
- Phone: drag to resize the view.

## 2026-10-03

- Phone layout: logo, menu header, roomier controls.
- Sizes in mm; chamber width compared with the throat.

## 2026-10-02

- Print kit download; text and pictures on the ligature; Auto-zoom.
- Shoulder sweep slider and a crisper alto shoulder.
- Ghost of the last shape, and Compare with the original.
- Anonymous usage counts (turn them off under ⚙).
- New logo; tenor preset remeasured.

## 2026-10-01

- First release: parametric soprano, alto, tenor and baritone mouthpieces in the browser, with a
  ligature, readouts and STL download.
