<p>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/logo-dark.svg">
    <img src="docs/images/logo-light.svg" alt="" width="184">
  </picture>
</p>

# Open Mouthpiece

**Design your own saxophone mouthpiece in the browser, then 3D-print it.**
Try it: **https://opensaxmouthpiece.org** · [User guide](docs/GUIDE.md)

![The app: the section buttons down the left, the readouts and the tip and facing settings, and a variant with lettering and a knurled shank in the 3D view](docs/images/app.png)

Change real design parameters (tip opening, facing, chamber, baffle, window, body and beak) and
download a printable STL. Everything runs in your browser: no account, nothing to install, and
nothing is saved on a server.

## What it does

- **Start from a preset**: soprano, alto, tenor or baritone, each with three variants (Flamma,
  Silva, Unda), plus a C-melody.
- **Shape it in sax terms**: tip opening in thousandths, facing length and curve (drag it, or pick
  one), chamber, baffle, window, body and beak. Every slider says what each end does.
- **Drag the shape itself**: the shape charts under the view show the facing, the outside and the
  inside from the side and in a slice across; **Edit shape** lets you pull their lines.
- **See the numbers**: tip, facing, length, inside air volume (and where that sits on the cork) and
  thinnest wall, and where feeler gauges stop along the facing.
- **Fit your horn**: set your neck cork's diameter and how tight it should be; print a small test
  ring first to check.
- **Make a matching ligature and cap**: a ring ligature and a cap built from the mouthpiece's own
  shape.
- **Compare A/B** with another design, with the original, or with an STL of a mouthpiece you have.
- **Personalize it**: text and pictures on the top, sides and shank, and rings, flutes, a spiral or
  knurling around the shank.
- **Keep and share**: save in your browser, download a .scad (it opens in OpenSCAD), the STL or a
  whole print kit, or send a link.
- Works on phones and tablets too.

The generator keeps every realistic combination printable: walls, the socket and the window are
limited so that no setting breaks the model.

| Shape charts | Compare A/B |
|---|---|
| ![The outside chart in Edit shape: the side view with dots on the top and underside, a slice across it, and the view from above](docs/images/shape-charts.png) | ![A variant and the alto preset side by side, with the settings that differ](docs/images/compare.png) |
| **Ligature and cap** | **Phone** |
| ![A mouthpiece with its reed, a printed ring ligature and a see-through cap](docs/images/ligature.png) | ![The app on a phone: the view, the settings and the section bar along the bottom](docs/images/phone.png) |

## Status

Early but usable. The alto, tenor and baritone presets have been printed and played; the soprano,
the variants, the C-melody, the ligature and the cap haven't been printed yet.
[docs/PRINTING.md](docs/PRINTING.md) walks through printing, fitting and play-testing.
Feedback and prints are welcome (open an issue).

## Run it locally

The app needs only Node.js (OpenSCAD runs in the browser). The test scripts (`npm run check`,
`npm run sweep`) also need a recent OpenSCAD nightly (for the Manifold backend): set `OPENSCAD`
to its command-line program, or have `openscad` on the PATH.

```
npm install
npm run dev            # the app (OpenSCAD runs in the browser)
```

- **User guide**, from a first mouthpiece to every tool in the app: [docs/GUIDE.md](docs/GUIDE.md)
- The parts of a mouthpiece, and which settings change each: [docs/GLOSSARY.md](docs/GLOSSARY.md)
- Every setting, with pictures of what it changes: [docs/PARAMETERS.md](docs/PARAMETERS.md)
- Printing and play-testing: [docs/PRINTING.md](docs/PRINTING.md)
- Putting the app online: [docs/HOSTING.md](docs/HOSTING.md)
- Working on the code: [CONTRIBUTING.md](CONTRIBUTING.md)

The live site collects anonymous usage and error reports to improve the app: which designs and
settings get used, what gets printed (its numbers) and what fails. Never lettering, pictures or file
names, no cookies, no IP addresses, nothing that links one visit to the next; ⚙ "Share anonymous
usage" turns it off.

Open Mouthpiece is free, with no ads. If it made you a mouthpiece you like, you can
[support it on Ko-fi](https://ko-fi.com/opensaxmouthpiece).

## How this was made

Open Mouthpiece was vibe coded: most of the code (the OpenSCAD generator and this web app) was
written by Claude, Anthropic's AI model, in conversation with a saxophonist who set the direction,
made the design calls, and prints and plays the results. The geometry is checked by automated
tests: every preset must come out as one closed, printable solid that matches its stored
reference, and a sweep tries over a thousand extreme and random settings to make sure they still
print. Printed alto, tenor and baritone pieces have been play-tested; reports from your own prints
are welcome.

## Credits

- **Anatomy and design parameters** follow M. Ozdemir et al., *Acta Acustica* 5, 46 (2021),
  open access under CC BY 4.0:
  https://acta-acustica.edpsciences.org/articles/aacus/abs/2021/01/aacus210019/aacus210019.html
- **Preset dimensions** were measured from Windy City Woodwinds' mouthpiece models on Thingiverse
  (CC BY-NC-SA): the "64" soprano (https://www.thingiverse.com/thing:6645219), "64" alto
  (https://www.thingiverse.com/thing:6645230), "64" tenor (https://www.thingiverse.com/thing:6645238) and
  "64" bari (https://www.thingiverse.com/thing:6645244). Their outlines were measured as coarse
  tables (a few to about 15 points per curve, smoothed by hand; the soprano's more finely) and
  rebuilt in this generator; no mesh from those models is included here. The ligature follows the
  idea of their printed friction-fit ligature. The site credits them too.
- **Fonts** in `scad/lib/fonts/` are under the SIL Open Font License (licence files alongside).
- **OpenSCAD** (GPL-2.0-or-later, source at https://github.com/openscad/openscad) does the
  geometry; the app runs its official WebAssembly build.

## License

Copyright (C) 2026 OpenSaxMouthpiece contributors.

This program is free software: you can redistribute it and/or modify it under the terms of the
GNU General Public License as published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version. See [LICENSE](LICENSE).

- **Your designs are yours.** The license covers this code, not the mouthpieces you design with it:
  the STLs you export and the objects you print from them are yours to use, share or sell. (A
  full .scad download contains the generator's code, so sharing that file shares GPL code.)
- **Name:** "Open Mouthpiece" and opensaxmouthpiece.org are not licensed under the GPL; a fork
  is welcome, under its own name.
- Third-party parts keep their own licenses (see Credits).
