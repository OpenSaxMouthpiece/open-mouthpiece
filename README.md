# Open Mouthpiece

**Design your own saxophone mouthpiece in the browser, then 3D-print it.**
Try it: **https://opensaxmouthpiece.org**

![The app: a mouthpiece, its readouts, and the tip and facing settings with the facing curve](docs/images/app.png)

Change real design parameters (tip opening, facing, chamber, baffle, window, body and beak) and
download a printable STL. Everything runs in your browser: no account, nothing to install, and
nothing is saved on a server.

## What it does

- **Start from a preset**: soprano, alto, tenor or baritone, each with three variants.
- **Shape it in sax terms**: tip opening in thousandths, facing length and curve (drag it, or pick
  one), chamber, baffle, window, body and beak.
- **See the numbers**: tip, facing, length, inside air volume and thinnest wall, and where
  feeler gauges stop along the facing.
- **Fit your horn**: set your neck cork's diameter and how tight it should be; print a small test
  ring first to check.
- **Make a matching ligature**: a ring ligature built from the mouthpiece's own shape.
- **Compare A/B** with another design, or with an STL of a mouthpiece you have.
- **Personalise it** with text or a picture on the body.
- **Keep and share**: save in your browser, download a .scad (it opens in OpenSCAD) or the STL, or
  send a link.
- Works on phones and tablets too.

The generator keeps every realistic combination printable: walls, the socket and the window are
limited so that no setting breaks the model.

| Compare A/B | Ligature | Phone |
|---|---|---|
| ![Two mouthpieces side by side, with both facing curves](docs/images/compare.png) | ![A mouthpiece with a reed and a printed ring ligature](docs/images/ligature.png) | ![The app on a phone](docs/images/phone.png) |

## Status

Early but usable. The alto and baritone presets have been printed and played; the tenor is being
reworked after its first print, and the variants and the ligature haven't been printed yet.
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

- Printing and play-testing: [docs/PRINTING.md](docs/PRINTING.md)
- Putting the app online: [docs/HOSTING.md](docs/HOSTING.md)
- Working on the code: [CONTRIBUTING.md](CONTRIBUTING.md)

The live site logs anonymous error reports (what failed, never your design; ⚙ turns them off).

Open Mouthpiece is free, with no ads. If it made you a mouthpiece you like, you can
[support it on Ko-fi](https://ko-fi.com/opensaxmouthpiece).

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
- Third-party parts keep their own licenses: fonts (SIL OFL), OpenSCAD (GPL-2.0-or-later, source
  at https://github.com/openscad/openscad).
