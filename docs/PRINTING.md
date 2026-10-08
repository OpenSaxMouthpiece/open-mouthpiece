# Test-printing a mouthpiece

A first print answers the questions no measurement can: does it fit the neck, does the facing come
out accurate, and how does it play. This is the order that wastes the least plastic.

Everything happens in the app (https://opensaxmouthpiece.org/): design your mouthpiece, then
download its STL. The settings come in three tabs: **Mouthpiece**, **Ligature** and **Cap**; the
Download button saves the part whose tab is open. In the Mouthpiece tab, the **Printing** section's
**What to print** picks the mouthpiece or a shank test ring. Every download is already oriented for
printing.

Or take everything at once: **Download print kit** (Printing section, or More) makes one zip with
the mouthpiece, the three shank test rings below, the ligature if you made one, and a check card
with the numbers to measure the print against (tip opening, facing stops).

## 1. Check the cork fit (15 minutes)

Print three shank test rings (the print kit has them): set **What to print** to *Shank test ring*,
then download one at each **Cork squeeze** (Fit on the horn) of 0.10, 0.20 and 0.30 mm. Each is the
socket end of the mouthpiece, with a socket that much smaller than the cork, so a bigger number is
a tighter fit. **Mark each one with a pen as it comes off the plate**, since they look alike.

Try them on your neck cork (lightly greased, as usual):

- Too tight to push on: too much squeeze (try a smaller one).
- Slides on with a firm, even push and doesn't wobble: that's yours.
- Wobbles or feels loose: not enough squeeze (try a bigger one).

Set **Cork squeeze** to the one that fit. If none fits, measure your cork with calipers in two
directions (corks are often slightly oval), set the cork diameter and print the rings again.

The socket's mouth has a bevel so it doesn't catch on the cork (**Shank entry bevel width** and
**Bevel depth**, 1 mm each). A bevel much wider than it is deep gets hard to print without supports.

## 2. Print the mouthpiece

Set **What to print** back to *Mouthpiece*. Two ways to print it (Printing -> **Extra stock for
finishing**):

- **0 (as designed):** try this first if your printer is accurate (resin, or a well-tuned FDM
  printer at fine layers).
- **0.15 mm:** extra on the reed table and facing, to sand flat (step 3). Use this if prints from
  your printer come out slightly warped or rough.

Suggested settings (a starting point, not gospel):

| | FDM (filament) | Resin (MSLA) |
|---|---|---|
| Orientation | as exported: standing on the neck end | as exported, or tilted slightly; supports only on the neck end face |
| Layer height | 0.08–0.12 mm | 0.03–0.05 mm |
| Walls / infill | solid: 100% infill, or 6+ perimeters | solid (no hollowing) |
| Supports | none needed (see below) | on the neck end face only |
| Seam | on the top (beak side), never on the table or rails | — |
| Material | PETG or PLA for testing | a tough, food-contact / biocompatible resin |

**Supports:** measured on the presets, surfaces steeper than 45° are under 0.5% of each
mouthpiece: the tip rail bridging over the window at the very top, a small ledge at the beak
shoulder on the tenor, and a few mm² inside the bore. Your slicer may flag them, but they print
fine without supports, and supports inside the bore would be hard to remove.

**Materials in your mouth:** filament and resin makers' food-contact claims vary. For play-testing,
PETG or a biocompatible resin is a sensible choice. Wash the piece before playing, and don't treat
a test print as a permanent mouthpiece.

## 3. Finish the table and facing

The reed must seal on a flat table and even rails. Check the table on a flat glass plate: no
rocking, and no light under it when you look along it.

If you printed the stock version, or the table isn't flat:

1. Tape wet-and-dry paper (400 grit, then 600, then 1000) to glass or a stone countertop.
2. **Table:** hold the mouthpiece flat, table down, and sand with light strokes along its length,
   turning it around every few strokes, until the table is evenly matte right to its edges. On
   the stock version, that's about when the extra 0.15 mm is gone.
3. **Facing (the curved part of the rails and the tip):** carefully. Roll the mouthpiece from the
   table up onto the tip in one smooth motion, pressing lightly and evenly on both rails. A few
   passes, then check (step 4). Uneven rails leak air and make it stuffy or squeaky, so it's
   better to stop early than to overdo it.

Sanding changes the facing. If you can't get it right, the as-designed print (no stock) is the
fairer test of the design.

## 4. Check it against the design

The app's readouts give the targets:

- **Tip opening:** the readout's tip opening, in mm and thousandths of an inch.
- **Facing:** the facing chart lists where standard feeler gauges should stop along the facing, if
  you want to check a print against it.
- **Air volume:** if you know your current mouthpiece's chamber volume, a similar volume will sit
  at a similar spot on the cork to play in tune. The air inside the mouthpiece stands in for the
  missing tip of the horn's cone, so it also sets how wide the octaves are
  ([saxophone acoustics, UNSW](https://www.phys.unsw.edu.au/jw/saxacoustics.html)).

## 4b. A ligature made for it (optional)

Store-bought ligatures fit only mouthpieces close to the one they were made for. The app can make
one from your design: the **Ligature** tab -> **Make a ligature for this mouthpiece**. It shows in grey on the
mouthpiece; **Download ligature STL** gives the print. It's a ring, round over the top and shaped
to the reed underneath, with a longer side (the tab) on top, toward the shank. The **reed** is
the tight spot: it squeezes the reed 0.2 mm (**Reed grip**) and keeps a hair of gap to the body.

- **Print** it standing on its flat front edge, tab up (as downloaded), no supports. PETG or another material
  that flexes a little is better than PLA, which can crack when it's pushed tight.
- **Fit:** put the reed on, slide the ligature on over the tip until it touches the reed, then push
  it back the last mm or so (the app says how far) so it grips. It's a taper fit, like a cork.
- **Any reed fits:** it's a taper fit, so a thicker reed seats it a little further forward and a
  thinner one further back (the app says how far 0.1 mm of reed moves it).
- **Reed not held** (it moves or buzzes): raise **Reed grip** (try 0.3). **Stops too far forward**
  (over the window): lower it. Printing grips of 0.1, 0.2 and 0.3 side by side is a quick way to
  find yours.
- **Band length**, **Tab toward the shank**, **Position** and **Wall thickness** change how much of the reed it holds,
  where, and how stiff it is; **Shape** can also be fully round or follow the whole mouthpiece.
- **Text on the ligature** / **Picture on the ligature** put lettering or a picture on its top, in
  the font, style (engraved or raised) and depth set under Personalize. Keep it short: the band's
  top is only about as long as the band plus the tab.

## 4c. A cap made for it (optional)

A cap keeps the tip and reed safe in a bag. The **Cap** tab -> **Make a cap for this mouthpiece** builds one
around your mouthpiece, reed and ligature, shown see-through (teal) on the mouthpiece; **Download
cap STL** gives the print. Like a store-bought cap it is one smooth shell, tapering from its rim to
a rounded tip, with a slot up from the rim and air holes in the end so the reed can dry; it slides
on over the tip and the rim clips onto the ligature.

- **Print** it standing on its rim, open end down (as downloaded), no supports; the closed end is a dome.
- **Goes over:** the ligature made here (the **Ligature** tab) or a metal one. As on
  store-bought caps, a metal ligature's screws ride in the slot: it starts at the rim as a window as
  wide as the screws, so the cap needn't be big enough to cover them. Give the band's length,
  position and thickness and the screws' width and length, and set **Screws and slot** to the side
  they're on: under the reed (a standard ligature) or on top (an inverted one).
- **Air:** the **slot** (length and width) and the **air holes in the end** let air through, so a
  wet reed dries instead of staying damp in a closed cap.
- **Grip:** the rim clips onto the ligature's band; **Grip squeeze** sets how hard. Too loose: raise
  it (try 0.2-0.3); too tight: lower it, or make the slot longer so the rim flexes more. Printing
  0.1, 0.2 and 0.3 side by side finds yours.
- **Any reed fits:** the cap leaves room for a reed up to 4 mm thick and a little wider than the table.
- **Wall**, **Shape** (follows the mouthpiece, or round), **Space at the end** and **End shape**
  change how it looks and how it sits in the hand. **Text on the cap** and **Picture on the cap**
  work like the ligature's.

## 5. Play-test and adjust

Play it next to your usual mouthpiece, with the same reed. Notice where it sits on the cork to play
in tune (a tuner at A = 440). Then change one thing at a time:

| What you hear or feel | Try |
|---|---|
| Too bright, harsh, edgy | lower `baffle_height` (negative), a positive `baffle_curve`, or a wider `chamber_width_extra` / positive `sidewall_angle` |
| Too dark, dull, doesn't project | raise `baffle_height`, add `baffle_hump`, or a negative `baffle_curve` |
| Stuffy, resistant | wider `throat_width`; check the facing for leaks first |
| Too free, spread, hard to control | a slightly smaller `tip_opening` or a shorter `facing_length` |
| Low notes hard to get out | a longer `facing_length`; check the rails seal (step 4) |
| Squeaks, reed chirps | the facing is uneven: check both rails; then `tip_rail_thickness` |
| Plays flat: pushed far onto the cork | less inside air (smaller chamber, or raise the baffle) |
| Plays sharp: pulled far out | more inside air (bigger chamber, or lower the baffle) |
| Upper register sharp when the low one is in tune (octaves wide) | more inside air, or a softer reed |
| Upper register flat when the low one is in tune (octaves narrow) | less inside air, or a harder reed |
| Wobbles on the neck | re-do step 1 |

After each change, compare the new version against the one you played: pin the old one as B in
the app ("Pin as B") and look at the Compare tab (the air volume row) and the section view.
