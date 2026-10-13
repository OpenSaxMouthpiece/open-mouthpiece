# Matching a mouthpiece you have

How to measure a mouthpiece you own and set the app up to match it. Work from the reed side
inward: the tip and facing first, then the inside, then the outside. Lengths are in mm unless
said otherwise. The [glossary](GLOSSARY.md) shows where each part is.

A copy made from caliper readings is close, not identical. Print it, play it next to the
original with the same reed, and adjust ([play-test and adjust](PRINTING.md#5-play-test-and-adjust)).

**Contents**

1. [What you need](#1-what-you-need)
2. [Start from the closest preset](#2-start-from-the-closest-preset)
3. [Tip and facing](#3-tip-and-facing)
4. [Table, window and rails](#4-table-window-and-rails)
5. [Inside: throat, chamber and baffle](#5-inside-throat-chamber-and-baffle)
6. [Outside](#6-outside)
7. [Air volume](#7-air-volume)
8. [Check and compare](#8-check-and-compare)
9. [Worksheet](#9-worksheet)

## 1. What you need

- Calipers (digital is easiest), with a depth rod.
- A flat sheet of glass (a picture-frame glass or a mirror tile will do).
- Feeler gauges: 0.0015", 0.010", 0.024", 0.034" and 0.050" (these are the ones the app's
  **Feeler gauge stops** list uses). A strip of 0.0015" is the important one.
- A set of drill bits (to gauge the throat and bore by their shanks).
- A syringe or measuring cylinder in ml, and tape (for the air volume).
- A pencil, and a photo of the mouthpiece from the side and from the tip.

## 2. Start from the closest preset

Pick your voice (soprano, alto, tenor or baritone) in the picker, then **Save as…** under a new
name. Then enter your neck cork in **Fit on the horn** first ([check the cork fit](PRINTING.md#1-check-the-cork-fit-15-minutes)),
so the shank is right before you change anything else.

Click **Compare** -> **Pin this model as B** now: B stays the preset, and the readouts and charts
show how far your design has moved from it.

## 3. Tip and facing

These matter most and are the easiest to measure well.

**Tip opening.** Lay a straightedge (or the glass) on the table so it reaches past the tip and
measure the gap to the inside edge of the tip rail with feeler gauges or a tapered gauge. If you
can't measure it, use the maker's published opening. Makers usually give it in thousandths of an
inch (.076" = 76 thou = 1.93 mm); their own tip numbers (5, 7\*, ...) mean different openings from
maker to maker, so look up the opening itself. Enter it in **Tip & facing** -> **Tip opening**
(thousandths, or type mm).

**Facing length.** Put the mouthpiece table-down on the glass. Slide the 0.0015" strip in from the
tip between the glass and one side rail until it stops. Mark the stop and measure from it to the
tip: that is the facing length. Do both rails; they should agree within about 0.5 mm. Enter it in
**Facing length**.

**Facing curve.** For a close copy, measure where each thicker gauge stops too (0.010", 0.024",
0.034", 0.050"), as distances from the tip. Then either:

- open **Shape charts** (bottom left of the 3D view) -> **Facing curve**, try the ready-made
  curves (Opens early, Even, Opens late, Radius) and pick the one whose **Feeler gauge stops**
  are closest to yours, or
- copy the stops in exactly: set **Facing curve** (under Tip & facing's More) to **Gauge points**,
  then in **Points** (icon bar) -> **Facing (gauge)** enter one point per gauge: the distance
  back from the tip (mm) and the gauge's thickness in mm (thou x 0.0254: 0.010" = 0.254 mm).

## 4. Table, window and rails

Measure on the reed side with the calipers:

| Measure | From / to | Setting (app section) |
|---|---|---|
| Table length | tip to the back end of the flat table | **Table length** (Tip & facing, Table) |
| Table width | across the table at the window's back and at the back end | **Table width at the tip / at the back** (Table) |
| Window length | the opening under the reed, tip rail to its back edge | **Window length** (Chamber & baffle, Window, More) |
| Window width | across the opening at its widest | **Window width** (Window) |
| Side rail width | the flat of one rail, near the middle of the window | **Side rail width** (Tip & facing, Rails) |
| Tip rail thickness | the flat of the tip rail, tip to window | **Tip rail thickness** (Rails) |

A table longer than the reed is normal.

## 5. Inside: throat, chamber and baffle

**Bore.** Find the largest drill bit whose shank slides into the bore behind where the cork ends.
Enter its size in **Bore (behind the cork)** (Fit on the horn, More).

**Throat.** The throat is the narrowest point between the bore and the chamber. Find the largest
drill bit that passes through it from the shank end: that is **Throat width**. Then slide the next
size up in from the shank until it stops, and mark the bit at the shank's end: the depth it
reached is **Throat position** (measured from the neck end; Chamber & baffle, Throat, More). If
the throat isn't round, pick **Throat shape** to match what you see from the shank end.

**Chamber.** Look through the window and the shank: is the chamber's cross-section round, square
or horseshoe (flat roof, round floor)? Set **Chamber shape**. Measure its width across, through the
window, with the calipers' inside jaws, a few mm behind the window's back edge: **Chamber width**.
If the walls lean in toward the roof (a trapezoid), or out, set **Chamber side walls**.

**Baffle.** Pick the **Baffle shape** that looks most like yours from the side: flat, rollover
(rounded), step (a ledge) or concave (scooped). Then, with the calipers' depth rod through the
window, measure how far the baffle is below the table plane at a few points behind the tip rail
(for example 5, 10 and 20 mm back). Open **Shape charts** -> **Inside**: the side view shows the
baffle and floor against the reed. Use **Cut open** on the 3D view with the Left view to see the
same thing on the model.

- **Baffle height** raises (+) or lowers (-) the whole baffle from the chosen shape (0 = the shape
  as drawn), **Where the baffle begins** moves it toward the tip or the neck, **Baffle curve**
  makes it come down early (-) or late (+), and **Baffle hump** adds a rise just behind the tip.
- For anything the sliders can't reach, **Edit shape** on the Inside chart lets you drag the baffle
  and floor lines; the change in mm shows while you drag.

The app doesn't yet print the baffle's depth below the table as a number at a given point, so match
it by eye on the chart and the cut-open view, against your measurements and side photo.

## 6. Outside

The outside affects how the mouthpiece sits in the mouth and which ligature and cap fit. In
**Body & beak**:

| Measure | Setting |
|---|---|
| Length, neck end to tip | **Length** (Size) |
| Widest width of the body | **Body width** (Size) |
| Tallest height of the body above the table plane | **Body height** (Size) |
| Outside diameter at the shank end | **Shank outside diameter** (Size, More) |
| Height of the beak at the tip, above the table plane | **Beak height at the tip** (Beak) |

Changing the length also changes the inside air (see below). For the beak's profile and the
shoulder, compare the **Outside** chart with your side photo, and use **Beak curve**, **Beak
length**, **Shoulder smoothness** or **Edit shape** on the Outside chart.

## 7. Air volume

The inside air volume (from where the neck ends to the tip, with the reed closed) mostly decides how
far onto the cork the mouthpiece sits to play in tune. To measure your mouthpiece's:

1. Tape the window shut from the outside (the tape stands in for the reed).
2. Mark the inside of the shank at the depth your neck reaches.
3. Stand it tip down and fill it from the shank end with water up to that mark, from a syringe.
   The ml of water is the volume in cm³.

The **Air** readout shows your design's volume. Bring it close with the chamber, baffle and length
settings, or with **How far the cork goes in**. More about this in
[check it against the design](PRINTING.md#4-check-it-against-the-design).

## 8. Check and compare

- The readouts (**Tip**, **Facing**, **Length**, **Air**) should match what you measured.
- **Compare** shows every setting that differs from B, and both designs side by side or overlaid.
- Print it, check the print against the design ([printing guide, step 4](PRINTING.md#4-check-it-against-the-design)),
  then play it next to the original and adjust ([step 5](PRINTING.md#5-play-test-and-adjust)).
  Change one thing at a time.

## 9. Worksheet

Copy this and fill it in as you measure.

| Measure | Yours | Setting |
|---|---|---|
| Neck cork diameter | | Neck cork diameter |
| Tip opening (thou or mm) | | Tip opening |
| Facing length | | Facing length |
| Gauge stops 0.010 / 0.024 / 0.034 / 0.050" (mm from the tip) | | Facing (gauge) points |
| Table length | | Table length |
| Window length / width | | Window length / Window width |
| Side rail / tip rail | | Side rail width / Tip rail thickness |
| Bore | | Bore (behind the cork) |
| Throat width / position | | Throat width / Throat position |
| Chamber shape / width | | Chamber shape / Chamber width |
| Baffle shape; depth at 5 / 10 / 20 mm | | Baffle shape, height, curve, hump |
| Length / body width / body height | | Length / Body width / Body height |
| Beak height at the tip | | Beak height at the tip |
| Air volume (cm³) | | (readout) Air |
