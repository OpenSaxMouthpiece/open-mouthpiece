# What's in the repository

A map of every folder and file, so you can find your way without opening them. Each source file
starts with a comment saying what it does; this page collects those in one place.

## Top level

| Path | What it is |
|---|---|
| `README.md` | What the project is, how to run it, credits, license |
| `CONTRIBUTING.md` | How to work on it: commands, rules, the generator's guarantees, lessons learned |
| `LICENSE` | GPL-3.0 |
| `package.json`, `package-lock.json` | npm scripts and dependencies (React, CodeMirror, three.js, Vite) |
| `index.html` | The page the app is built into |
| `vite.config.ts` | Vite build; also serves `scad/` live as `project/` during `npm run dev` |
| `tsconfig.json`, `tsconfig.node.json` | TypeScript settings (the app; the build scripts) |
| `eslint.config.js`, `.prettierrc.json`, `.prettierignore` | Lint and format settings |
| `.gitattributes` | Keeps `.scad` files LF-only (CRLF breaks the Customizer) |
| `.node-version` | Node version for the hosted build |
| `wrangler.jsonc` | Cloudflare config: serves `dist/` and runs `worker/` (docs/HOSTING.md is general) |
| `.github/workflows/ci.yml` | CI on every push: lint, format, unit tests, build |

## `scad/`: the mouthpiece generator (OpenSCAD)

| Path | What it is |
|---|---|
| `lib/mouthpiece_base.scad` | **The generator**: every parameter (alto defaults) and all geometry: mouthpiece, ligature, cap, lettering |
| `alto.scad`, `tenor.scad`, `baritone.scad`, `soprano.scad` | The presets: include the base, then set their own values |
| `variants/` | Three variants per preset (Flamma, Silva, Unda), written by `scripts/make_variants.mjs` |
| `extras/c_melody.scad` | C-melody preset, blended from alto and tenor by `scripts/blend_voices.mjs` |
| `experiments/dual_reed.scad` | A two-reed mouthpiece; its own model, not in the app |
| `art/` | Example SVG pictures to put on a part (its README: sizes, how to draw your own) |
| `lib/fonts/` | Lettering fonts, each with its SIL Open Font License file |
| `param_lists.json` | The presets' settings lists, made ahead so the app opens faster; refreshed by `npm run check` |

Every `.scad` file here opens in desktop OpenSCAD too (Customizer included).

## `src/`: the web app (React + TypeScript)

OpenSCAD runs in the browser as WebAssembly; there is no server. Start with `App.tsx` and
`api.ts`; docs/dev/APP.md explains how it fits together.

**Entry and state**

| File | What it does |
|---|---|
| `main.tsx` | Starts the app; marks the dev site |
| `App.tsx` | The app's state (open files, values, layout, compare B) and both layouts |
| `app/Workspace.tsx` | The desktop layout: icon rail, code column, settings panel, 3D view |
| `app/rail.ts` | The rail's places (desktop icon rail, phone bottom bar) |
| `app/files.ts` | Open files, names and labels, downloads |
| `app/session.ts` | What the browser keeps between visits |
| `fresh.ts` | `?fresh` (dev only): start with empty storage |
| `styles.css` | All styles, light and dark |

**Running OpenSCAD**

| File | What it does |
|---|---|
| `api.ts`, `browserApi.ts` | The app's interface to OpenSCAD and the project files, all in the browser |
| `wasm/runner.ts`, `wasm/openscad.worker.ts`, `wasm/types.ts` | Web workers that run OpenSCAD's WebAssembly build |
| `hooks/useModelRender.ts` | A quick draft render after each change, then the chosen quality |

**Settings and design files**

| File | What it does |
|---|---|
| `design.ts` | The settings panel's sections, labels, slider end words |
| `migrate.ts` | Keeps designs saved before a parameter rename working |
| `scadText.ts` | A design as one `.scad` file with its values written in |
| `bundle.ts` | "Download .scad": one self-contained file |
| `share.ts` | Share links (the design in the URL) |
| `curves.ts` | Point lists in a `.scad` file, for the "Exact points" editor |
| `shapeEdit.ts` | "Edit shape": dragging the outline and inside lines |
| `userArt.ts` | Pictures the user uploads (kept in their browser) |
| `printKit.ts` | "Download print kit": mouthpiece, test rings, check card |

**Readouts, views and compare**

| File | What it does |
|---|---|
| `readouts.ts` | The numbers (tip, facing, air...) read from what the generator echoes |
| `corkFit.ts` | Where a design sits on the cork, compared with its preset |
| `profile.ts` | The side profile cut from the model, for the charts |
| `focus.ts`, `hooks/useParamFocus.ts` | "Zoom to parameter": fly the camera to where a setting acts |
| `compare.ts`, `meshFrame.ts` | A/B compare; an uploaded STL lined up as B |
| `hooks/useValueHistory.ts` | Undo / redo |
| `hooks/useMediaQuery.ts` | Phone vs desktop |

**Settings, links and reports**

| File | What it does |
|---|---|
| `appearance.ts`, `uiPrefs.ts` | Theme, colours, small UI preferences |
| `links.ts` | Links shown in the app (guide, donate, preset sources) |
| `usage.ts`, `report.ts` | Anonymous usage and error reports (README: what is and isn't sent) |

**`components/`**: one panel or control each: `DesignPanel` (settings), `Customizer` (any file's
parameters), `Viewer` (3D view), `ProfileChart` and `ShapeDock` (shape charts), `FacingChart`,
`Readouts`, `ComparePanel`, `Rail`, `Editor`, `Console` and `TabBar` (code column), `CurveEditor`,
`FilePickers`, `SaveAsPanel`, `LigatureHead` / `CapHead` / `PartNote` (ligature and cap),
`BaffleSketches`, `TextField`, `About`, `Logo`, `Menu`, `Fold`, `AppearanceMenu`.

**Tests**: `*.test.ts` next to the code they test (`npm test`, Vitest).

## `scripts/`: tools run with Node

| Script | What it does |
|---|---|
| `check.mjs` | `npm run check`: renders every preset; one closed solid, matches `test/baselines.json` |
| `sweep.mjs` | `npm run sweep`: every setting at its extremes plus random mixes |
| `openscad.mjs`, `mesh_frame.mjs` | Shared helpers: find and run OpenSCAD; read STLs |
| `sync_voice_files.mjs`, `voice_file.mjs` | Copy the base file's parameter list into every preset |
| `make_variants.mjs` | Write the variant files |
| `blend_voices.mjs` | Write the C-melody preset |
| `bundle_scad.mjs` | Flatten a preset into one file |
| `param_lists.mjs` | Write `scad/param_lists.json` (run by `check`) |
| `param_docs.mjs` | `npm run docs:params`: docs/PARAMETERS.md and its pictures |
| `glossary_diagram.mjs` | The labelled pictures in docs/GLOSSARY.md |
| `fetch_openscad_wasm.mjs` | Downloads OpenSCAD's WebAssembly build into `public/openscad/` |
| `build_static_project.mjs`, `project_files.mjs` | Copy the files the app loads into `public/project/` |
| `usage.mjs` | Summary of the live site's anonymous usage (needs the site's Cloudflare login) |

## Everything else

| Path | What it is |
|---|---|
| `docs/GUIDE.md` | User guide (the app's "Documentation" link) |
| `docs/GLOSSARY.md` | The parts of a mouthpiece and the settings that change each |
| `docs/PARAMETERS.md` | Every setting with before/after pictures (generated: `npm run docs:params`) |
| `docs/PRINTING.md` | Printing, fitting and play-testing |
| `docs/HOSTING.md` | Putting your own copy online |
| `docs/dev/GEOMETRY.md`, `docs/dev/APP.md` | Developer notes on the generator and the app |
| `docs/images/` | Pictures for the docs (`params/` is generated) |
| `test/baselines.json` | What `npm run check` compares each preset with |
| `worker/index.js`, `worker/usage.sql` | The site's only server code: stores anonymous usage and error reports; the database table |
| `public/favicon.svg` | The site icon |

Not in the repository (made by scripts, gitignored): `node_modules/`, `dist/` (the built site),
`public/openscad/` and `public/project/` (the build fetches/copies them), `scad/_sweep/` (sweep
failures).
