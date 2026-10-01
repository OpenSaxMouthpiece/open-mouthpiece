# Open Mouthpiece

A parametric saxophone mouthpiece generator. Adjust real design parameters (tip opening, facing,
chamber, baffle, window, ...) and get a printable STL. OpenSCAD builds the geometry, and a web
app (editor, parameter sliders, 3D viewer) drives it on a desktop or on a phone.

Presets: alto, tenor, baritone and soprano (`scad/*.scad`).

## Quick start

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

Nothing is saved on a server: designs stay in the browser, in downloaded .scad files, or in share
links. The live site logs anonymous error reports (what failed, never your design; ⚙ turns them
off).

## Credits

- **Anatomy and design parameters** follow M. Ozdemir et al., *Acta Acustica* 5, 46 (2021),
  open access under CC BY 4.0:
  https://acta-acustica.edpsciences.org/articles/aacus/abs/2021/01/aacus210019/aacus210019.html
- **Preset dimensions** were measured from Windy City Woodwinds' mouthpiece models on Thingiverse
  (CC BY-NC-SA): the "64" soprano (https://www.thingiverse.com/thing:6645219), "64" alto
  (https://www.thingiverse.com/thing:6645230), "64" tenor (https://www.thingiverse.com/thing:6645238;
  the tenor's outline is still from their "72" tenor, https://www.thingiverse.com/thing:6645240) and
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
