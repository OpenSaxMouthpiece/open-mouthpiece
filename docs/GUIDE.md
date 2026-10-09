# Open Mouthpiece user guide

Open Mouthpiece (https://opensaxmouthpiece.org) designs saxophone mouthpieces you can 3D-print. You
start from a soprano, alto, tenor or baritone piece, change it with settings named the way players
and refacers talk (tip opening, facing, baffle, chamber), and download a file ready to print. It
runs in your web browser: no account, nothing to install, and your designs are never stored on a
server.

![The app: the section buttons down the left, the readouts and settings, and the mouthpiece in the 3D view](images/app.png)

**Contents**

1. [Your first mouthpiece](#1-your-first-mouthpiece)
2. [Finding your way around](#2-finding-your-way-around)
3. [Choosing a starting point](#3-choosing-a-starting-point)
4. [Changing the design](#4-changing-the-design)
5. [The sections, one by one](#5-the-sections-one-by-one)
6. [Shape charts: drag the shape itself](#6-shape-charts-drag-the-shape-itself)
7. [The readouts](#7-the-readouts)
8. [The 3D view](#8-the-3d-view)
9. [Comparing two designs](#9-comparing-two-designs)
10. [A ligature and a cap](#10-a-ligature-and-a-cap)
11. [Saving, opening and sharing](#11-saving-opening-and-sharing)
12. [Downloading and printing](#12-downloading-and-printing)
13. [On a phone or tablet](#13-on-a-phone-or-tablet)
14. [For OpenSCAD users](#14-for-openscad-users)
15. [App settings and privacy](#15-app-settings-and-privacy)
16. [Questions and troubleshooting](#16-questions-and-troubleshooting)
17. [More reading](#17-more-reading)

## 1. Your first mouthpiece

1. Open https://opensaxmouthpiece.org. The alto preset appears in the 3D view.
2. **Pick your voice** in the list at the top left: Soprano, Alto, Tenor or Baritone (or one of
   their variants; see [section 3](#3-choosing-a-starting-point)).
3. **Fit it to your horn**: click **Fit** on the left and enter your neck cork's diameter, if you
   know it. The value already there suits a typical neck.
4. **Change what you want**: **Tip** for the tip opening and facing, **Chamber** for the inside,
   **Body** for the outside. The model redraws a moment after each change, and the readouts at
   the top of the panel follow.
5. **Print a test ring first**: open **Download ▾** (the arrow beside the yellow Download button)
   and pick **Shank test ring**. It's the socket end of the mouthpiece and prints in minutes; try it
   on your cork before printing the whole piece.
6. **Download the mouthpiece**: the yellow **Download mouthpiece STL** button. The file is already
   standing the right way for printing.
7. **Keep your design**: **Save as…** keeps a copy in this browser, and can also download a design
   file you can open again later.

The [printing guide](PRINTING.md) takes it from there: printer settings, finishing the table and
facing, checking the print, and what to change after you play it.

## 2. Finding your way around

On a computer the screen has four parts:

- **The top bar**: the design list, **Save as…** and **Open…** on the left; **Support**, **Share**,
  **Download** (with its **▾** list), **More ▾** and the **⚙** app settings on the right.
- **The rail** down the left edge: one button per section of settings (**Tip**, **Fit**,
  **Chamber**, **Body**, **Personalize**), then the extra parts (**Ligature**, **Cap**) and
  **Print**. At the bottom are the tools: **Compare**, **Points**, **Code** and **About**. A small
  dot or number on a button means you've changed something there.
- **The panel** beside the rail: the readouts at the top, then the settings of the section you
  picked.
- **The 3D view**: the mouthpiece itself, with the view tools along its top and the **Shape
  charts** button at its bottom left.

Picking a section also turns the view toward the part it shapes, so you can see what you're
changing. Drag the edges between the columns to make the panel wider or narrower.

## 3. Choosing a starting point

The design list at the top left has:

- **The four presets**: Soprano, Alto, Tenor and Baritone. Their dimensions were measured from
  well-known printed mouthpieces (credited in About). The alto, tenor and baritone have been
  printed and play-tested.
- **Variants**: each voice has three, named **Flamma**, **Silva** and **Unda**. Each one changes
  several settings at once, and comes with lettering, a picture and a shank decoration to show
  what Personalize can do. A one-line note above the settings says what the variant changes
  compared with its preset.
- **Extras**: a **C-melody** mouthpiece, blended between the alto and tenor.
- **Your designs**: everything you've kept with Save as… in this browser.
- **Open files**: .scad files you've opened (with **Open…** or by dropping them on the page).

Presets and variants can't be overwritten: change them as much as you like, then **Save as…** to
keep the result under your own name. "(edited)" after the name means you've changed it since it
was opened or saved.

## 4. Changing the design

Each setting has a slider, a box to type an exact value, and words at both ends of the slider
that say which way is which (Closed / Open, Short / Long, Narrow / Wide). A short description under
the label gives the unit; **Options ▾** -> **Show descriptions** hides them once you know them.

- **More settings**: every section shows its main settings first. The **More settings** chip at the
  bottom opens the rest; the number on it is how many there are.
- **Find a setting**: type in the box at the top of the panel (for example "baffle" or "window")
  to list every setting that matches, from any section.
- **Undo and redo**: the ↶ ↷ buttons, or Ctrl+Z / Ctrl+Y. Each design has its own history.
- **Reset**: back to the design as it was opened or last saved. The number on it is how many
  settings you've changed.
- **Auto-zoom** (**Options ▾**): when you touch a setting, the view flies to the part it shapes,
  and cuts the model open for parts inside it. Turn it off to keep the camera still.
- **Compare with the original** (**Options ▾**): puts the design as it was published or saved
  beside your changes (see [section 9](#9-comparing-two-designs)).

**The generator keeps it printable.** Walls, the socket and the window are limited by
construction, so no combination of settings breaks the model. When a setting is held back to
keep a wall thick enough, a note under the readouts says so and by how much.

## 5. The sections, one by one

Every setting, with pictures of its lowest and highest values, is in
[PARAMETERS.md](PARAMETERS.md); the [glossary](GLOSSARY.md) names each part of a mouthpiece and
the settings that change it. In short:

**Tip & facing (Tip)**: the tip opening (in thousandths of an inch; typing mm works too), the
facing length (from the tip back to the break, where the rails leave the flat table), and the tip
and side rails. Under More: the facing curve's shape, the tip's roundness, and the table's length,
widths and hollow.

**Fit on the horn (Fit)**: your neck cork's diameter, the **cork squeeze** (how much smaller than
the cork the socket is: bigger = tighter; 0.1-0.3 mm is usual) and how far the cork goes in.
**Download a shank test ring** prints just the socket end to check the fit. Under More: the
lead-in at the socket's mouth, the bore behind the cork and the table's angle to the neck.

**Chamber & baffle (Chamber)**: the inside. Chamber shape (round, square, horseshoe) and width,
throat width, the baffle's shape (with a sketch of each), height and hump, and the window's width.
Under More: chamber height and floor, how the chamber widens after the throat, throat position and
shape, where the baffle begins and its curve, the window's length and corners, and the side walls.

**Body & beak (Body)**: the outside. Length, the beak's height at the tip, its curve, length and
top (ridged or flat, narrow or wide), how crisp or smooth the shoulder is, the sides near the table,
and the body's width and height. Under More: the body's cross-section, the shoulder sweep, the
shank's outside diameter and the bore's height.

**Personalize**: text on top, on either side and around the shank; a picture on top (pick one of
the built-in pictures or upload your own SVG); and a shank decoration (rings, flutes, a spiral or
knurling, cut in or raised). **Variables ▾** next to each text box puts in values from the design,
such as `{tip}` (the tip opening), `{facing}`, `{title}` (the design's name) or `{voice_letter}`.
Text can have several lines. One font applies to all the lettering, and each text can have its
own under More. Lettering on the mouthpiece is always engraved, so the ligature can't catch on it.

**Print**: **What to print** (the mouthpiece or a shank test ring), **Extra to sand off** (a little
extra on the table and facing to sand flat; see the printing guide), and **Download print kit**.
Under More: the thinnest wall the generator allows, the smoothness of the model, and whether
downloads stand on the neck end.

## 6. Shape charts: drag the shape itself

![The Outside chart in Edit shape: the side view with dots on the top and underside, a slice across it, and the view from above](images/shape-charts.png)

**Shape charts** at the bottom left of the 3D view opens a card with three charts. It follows the
section you're in, and **Larger** / **Smaller** sizes it.

- **Facing curve**: the gap between the reed and the rails, from the tip back to the break.
  Pick a shape (**As designed**, **Opens early**, **Even**, **Opens late**, **Radius**), or drag the
  points: the tip end sets the tip opening, the flat end the facing length. Click the curve to add
  a point, double-click one to remove it. **Feeler gauge stops** lists where standard gauges
  should stop along a straightedge on the table, to check a print.
- **Outside**: the mouthpiece from the side, and a slice across it. Drag the line over the side
  view, or use the **Where to slice** slider, to choose where the slice is taken.
- **Inside**: the same for the inside: the baffle and the floor from the side, and the inside's
  width in the slice.

**Edit shape** (on Outside and Inside) puts dots on the lines: drag them to reshape the top, the
underside and the width (outside), or the baffle, the floor and the inside width (inside). A
readout shows the change in mm as you drag, and the model follows. Dragging a dot on the slice
changes the shape at that spot. **↶ Undo** steps back through your shape edits, **Reset shape**
removes them all, and **Done** hides the dots. Shape edits are saved, shared and downloaded with
the design like any other setting.

**Points** (on the rail) is the advanced version: every curve in the design as a list of exact
points, to drag or type. Most people never need it.

## 7. The readouts

The five boxes at the top of the panel:

- **Tip**: the tip opening, in thousandths of an inch.
- **Facing**: the facing length, to the break.
- **Length**: overall, from the neck end to the tip.
- **Air**: the air inside the mouthpiece, from the end of the neck to the tip. This mostly decides
  where the mouthpiece sits on the cork when it's in tune, so it's compared with the preset's
  ("as the preset", or how many mm further on or out).
- **Wall**: the thinnest wall, and where it is.

Click the readouts for the details. Notes from the generator (a setting it held back, something to
check) show under them.

## 8. The 3D view

Drag to turn the model, scroll or pinch to zoom, and right-drag (or two fingers) to move it.
The tools along the top:

- **3D, Table, Top, Left, Right, Tip**: standard views.
- **Show ▾**: edges, wireframe, see-through, and which parts are shown (the mouthpiece, the
  ligature, the reed, the cap). **Ghost after a change** shows the previous shape faintly after
  each change for a moment, so you can see what moved.
- **Last shape**: brings that previous shape back until you turn it off.
- **Cut open**: cuts the model lengthwise or across, to see the chamber, baffle and bore.
- **Quality**: **Draft** redraws fastest while you explore; **Normal** is the default; **Fine** is
  smoother. Downloads are always made at full quality.
- **📷**: saves the view as a picture (PNG).

When auto-zoom has flown in close, **Whole model** at the bottom right brings the whole piece back.
The "Ready" line at the bottom left shows how long the last redraw took.

## 9. Comparing two designs

**Compare** on the rail puts a second design, **B**, beside the one you're changing (**A**):

- **Pin this model as B** freezes the design as it is now; then change A and see the difference.
- **Compare with the original** pins the design as published or as last saved.
- **Compare with…** picks any preset, variant or saved design, a .scad file, or an **STL file** of a
  mouthpiece you already have (or drop an .stl on the page).

A and B show side by side or overlaid (the choice next to the A / B buttons over the view). The readouts show B's numbers under A's, the facing chart
draws B's curve dashed, and the Compare panel lists every setting that differs, with **← B** to
copy B's value into A. **Swap A ↔ B** and **Clear B** do what they say.

![A variant and the alto preset side by side, with the settings that differ](images/compare.png)

## 10. A ligature and a cap

![A mouthpiece with its reed, a printed ring ligature and a see-through cap](images/ligature.png)

**Ligature** on the rail -> **Make a ligature for this mouthpiece** builds a ring ligature from
the mouthpiece's own shape, so it fits whatever you change. It slides on over the tip with the
reed and grips it like a cork. You can set its shape, reed grip, band length, position, a tail
toward the shank, and text or a picture on its top.

**Cap** -> **Make a cap for this mouthpiece** builds a cap over the tip, the reed and the ligature
(the printed one, or a metal ligature whose size you give). It has a slot and air holes so the reed
can dry, and the rim clips onto the ligature.

Each section has a **Download … STL** button, a choice of showing the part on the mouthpiece or
beside it, **Hide** and **Remove**. Once made, they're saved and shared with the design, and the
ligature goes into the print kit. The
[printing guide](PRINTING.md#4b-a-ligature-made-for-it-optional) covers printing and fitting both.

## 11. Saving, opening and sharing

**Save as…** opens a small panel: a name, then any of

- **Keep a copy in this browser**: quick, and it then shows under **Your designs**. It's only in
  this browser on this device: clearing the site's data, or another browser, loses it.
- **Design file (.scad)**: one plain file with your settings and the generator. It opens here
  again with **Open…**, and in OpenSCAD. This is the way to really keep a design.
- **More formats -> Settings-only .scad**: just your settings, a few KB; it opens only on this site.
- **STL** files of the mouthpiece, the ligature and the cap, optionally zipped together.

**Open…** (or dropping files on the page) opens .scad files; an .stl dropped on the page is
pinned as B to compare with.

**Share** copies a link with the whole design in it: paste it in a message or a forum post, and
it opens the design for whoever clicks it. Nothing is uploaded: the design travels inside the
link itself. A picture you uploaded yourself goes along only if you choose to include it.

## 12. Downloading and printing

The yellow **Download** button saves the part you're working on: the mouthpiece, or the ligature or
cap while you're in their sections. **Download ▾** lists everything:

- **Mouthpiece (.stl)**, standing on its shank end, as printed.
- **Shank test ring (.stl)** at your cork squeeze.
- **Print kit (.zip)**: the mouthpiece, shank test rings at 0.10 / 0.20 / 0.30 mm squeeze, the
  ligature if made, and a check card with the numbers to measure the print against.
- **Design file (.scad)**.

Then follow the [printing guide](PRINTING.md): fit check, printer settings, finishing the table and
facing, checking the print, and play-testing one change at a time.

## 13. On a phone or tablet

The same app, laid out for a small screen:

- The sections are a bar along the bottom (**Tip**, **Fit**, **Chamber**, **Body**,
  **Personalize**, **Ligature**, **Cap**, **Print**); the settings scroll under the view.
- The readouts are one line over the view: tap it for the details.
- **☰** (top left) has the downloads, Quality, Save as, Open, Share, Compare, the printing guide,
  Appearance, the code editor, and About and help; **⋯** in the view has the views and Cut open.
- The shape charts show inside their sections.

Rendering on a phone takes longer than on a computer (several seconds per change); **Quality:
Draft** helps.

![The app on a phone](images/phone.png)

## 14. For OpenSCAD users

The generator is an ordinary OpenSCAD file. **Code** on the rail (or **More ▾** -> **Show the code
editor**) shows the design's source and OpenSCAD's console. Presets are read-only; your own designs
and opened files can be edited, and the model follows the text. A downloaded design file opens in
any OpenSCAD (its Customizer shows the settings), and the source of the whole project
is on [GitHub](https://github.com/OpenSaxMouthpiece/open-mouthpiece).

## 15. App settings and privacy

**⚙** (top right): the theme (system, dark, light), the model's colour, the background, the grid
and axes, and **Share anonymous usage**.

Your designs never leave your browser unless you download or share them. The live site counts
anonymous usage to improve the app: which designs and settings get used, what gets printed (its
numbers) and what fails. Never your lettering, pictures or file names, no cookies, no IP
addresses, and nothing that links one visit to the next. **Share anonymous usage** turns it off.

## 16. Questions and troubleshooting

**The model takes a while to redraw.** Every change rebuilds the whole mouthpiece in your browser:
about 2-5 seconds on a computer, longer on a phone. Use **Quality: Draft** while exploring.
Lettering and shank decorations add a little.

**A setting doesn't seem to do anything.** Some settings only matter when another one is set (the
chamber's widening needs a chamber wider than the throat; a ring's position needs a single ring).
Those show dimmed, with a note saying why. Others are held back to keep a wall printable; the note under
the readouts says so.

**The view looks broken.** In the 3D view you often see the inside through the window, which can
look like a hole. Try **Left** or **Cut open** to check.

**My saved design is gone.** Copies kept in the browser live only in that browser, on that device.
Clearing the site's data or using a private window removes them. Download a design file (.scad)
for anything you want to keep.

**My picture doesn't show.** Pictures are SVG files. Solid shapes work; thin line drawings don't.
If part of a picture is cut off, a warning says so: make it smaller or move it.

**It doesn't fit my cork.** Print shank test rings at a few squeezes (the print kit has three),
and measure your cork in two directions with calipers if none fits. See step 1 of the
[printing guide](PRINTING.md#1-check-the-cork-fit-15-minutes).

**Something is broken, or I have an idea.** Tell us on
[GitHub](https://github.com/OpenSaxMouthpiece/open-mouthpiece/issues).

## 17. More reading

- [Printing guide](PRINTING.md): printing, finishing, checking and play-testing.
- [Glossary](GLOSSARY.md): the parts of a mouthpiece, with labelled pictures.
- [Every setting](PARAMETERS.md): each setting, with pictures of what it changes.
- [Putting the app online](HOSTING.md) and [working on the code](../CONTRIBUTING.md).
