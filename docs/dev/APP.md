# App notes (developer reference)

How the app works. Read before changing `src/` or `vite.config.ts`.

## How it runs (no server)

There is no server (the local API server was removed on 2026-09-25: nothing may be saved on a
server). OpenSCAD runs in the browser, the project comes from the site, and the user's files and
pictures stay in their browser. `npm run dev` is plain Vite; a build is a static site (docs/HOSTING.md).

- `src/api.ts`: the `Api` interface + types; `api` = `browserApi` (src/browserApi.ts).
- OpenSCAD: the official WebAssembly build, pinned in `scripts/fetch_openscad_wasm.mjs` (version +
  SHA-256; bump together) into `public/openscad/` (gitignored; `npm run dev` fetches it once).
  `src/wasm/openscad.worker.ts` compiles the wasm once per worker and makes a fresh OpenSCAD
  instance per job (main() runs once), files laid into its MEMFS under `/scad`, cwd `/scad` (log
  paths come out project-relative), outputs in `/tmp`. `src/wasm/runner.ts`: two lanes, "render"
  and "quick" (params, echo, picture measuring), one worker each, jobs in order; abort = terminate
  the worker (the next job starts a new one). Every run gets the project, the user's files, their
  pictures (`art/<name>`) and the unsaved buffers; a file from the device is written at the root
  as `__local__<name>` so `include <lib/...>` still works.
- Project files = `scripts/project_files.mjs` (scad/ minus fits/, _sweep/; the presets list,
  which includes every `variants/*.scad`).
  `npm run dev`: the `liveProject` plugin in vite.config.ts serves them from scad/ at `project/`
  (manifest built per request, so edits to the generator show on the next render). Build:
  `scripts/build_static_project.mjs` copies them to `public/project/` + `manifest.json` (+ picture
  aspects measured natively when OpenSCAD is installed; the site measures missing ones).
- The user's files: localStorage `open-mouthpiece-files-v1` ({path: {text}}); pictures:
  `open-mouthpiece-art-v1` (userArt.ts, shown via data: URLs). `files()` returns `{files,
  readOnly (presets: not even edited), own}`. **Save writes only the user's own files**; a project
  file (presets, `lib/`, ...) goes through Save as (`my_<name>`); a stored copy of a project path
  is ignored, so the site's project always wins. Other project files (the base) can be edited in
  the editor for live experiments (the unsaved text goes with every render), not saved.
  **A saved design is a document** (2026-09-29): Save and Save as write the Customizer values into
  the file (`withValues`; a name the file doesn't assign is appended under `/* [Hidden] */`) and
  clear them, so Reset means "back to what I saved". Save as clears a preset's values (it stays as
  published; Compare with a preset also uses it as published); your own design keeps its unsaved
  changes. **Save as panel** (design only; the code's Save as keeps the plain name box):
  `saveDesignAs` makes any of: a copy in this browser (labelled "quick, not a backup"), the full
  .scad (`bundleDesign`), a settings-only .scad (`<name>_settings.scad`: the voice file with the
  values, `include <../lib/` rewritten to `include <lib/` so it opens on the site), the part's STL
  and the ligature's (if made; `partStl`, download quality), each downloaded or zipped (fflate).
  The choices persist (`saveAs` pref). Own designs show with spaces for `_` (`voiceLabel`). Typed names are made file-safe
  (`scadFileName`: spaces -> `_`, `.scad` added). Typed numbers are clamped to the slider range.
- **Open .scad… / Download .scad** (toolbar on both screens, phone ☰ menu). Download writes ONE
  self-contained file that opens in any OpenSCAD (`bundleDesign`, src/bundle.ts, the method of
  scripts/bundle_scad.mjs): a header, the rendered file with the Customizer values put into its own
  assignments (`withValues`, src/scadText.ts; values it doesn't assign go under `/* [Hidden] */`),
  then the included base (unsaved tab text wins) without the defaults the file sets. Plain
  OpenSCAD only: lettering is text(); a picture stays a file, imported from art/<name> next to
  the file ("../art/" becomes "art/"; the app has it there; elsewhere OpenSCAD reports it
  can't open the file and makes the model without it, and the header says so; the STL always has
  it). The font use<>s are dropped (a missing one is an ERROR line in desktop OpenSCAD; it has the
  Liberation faces and finds installed ones by name; the header names a
  non-built-in font); the app registers its fonts after the text of any main file without
  an include or a .ttf use<> (browserApi `workspace`), since a missing font crashes the wasm build.
  Named `my_<preset>.scad` for a preset, ~85 KB. Open (or drop) loads .scad files as tabs; the
  voice picker lists them under "Open files". "Download tab" (code column) = the editor text as is.
  Verified: rendered alone (another folder) by the nightly = the project render exactly (triangles,
  volume) with top + side text, and with a picture once its SVG is in art/ next to it; without it,
  the model without the picture; OpenSCAD 2021.01 renders it too (55s, CGAL); re-opened in the
  app, including with Lobster. (Pictures were once traced into polygon() data: dropped as
  not native, 2026-09-26.)
- Verified in headless Chrome (dev and built site): alto renders identical to native (18,372
  triangles), ~3s per render (native was ~1s); Download .scad with a changed tip opening -> Open
  .scad renders it with that tip; Save as + reload keeps the file; saving over a project file is
  refused; SVG upload, rapid changes (aborts), Curves panel, all fonts. The native `-node.zip`
  build fails on Windows Node 21; the test harness drives Chrome over CDP (see "The app").

## The app (src/)

- **One screen (2026-09-27; the Simple / Advanced switch is gone)**: you go as deep as you open.
  Top bar = logo, voice picker, file actions | Share, Download STL, "More ▾" (`components/Menu.tsx`:
  Open .scad, Compare with…, Pin as B, Download .scad, Quality, show/hide the code, printing guide),
  ⚙ (`AppearanceMenu.tsx`). Right panel (`DesignPanel`): readouts strip (fine print in tooltips),
  "Find a setting" (opens matching sections, also searches All parameters), Undo/Redo, Zoom, Reset,
  "Expand all / Collapse all / Descriptions", then folds (`Fold`, closed by default, one-line
  summary from `DesignSection.summary`, ● count of changed settings): the curated sections, All
  parameters, Curves, Compare A/B (while a B is pinned; pinning opens it). The facing chart sits
  under "Tip & facing" and its points always drag. The code editor + console is a column on the
  left, closed by default (the "Code" strip / More ▾ / ‹); `coding` (that column open, or the
  phone's Code/Console tab) brings back what was Advanced-only: the Render button and Auto (else
  every change renders), the full status line, parameter names, every group and dropdown value in
  All parameters, wireframe, and Save as acting on the editor's tab instead of the design on
  screen. Descriptions hide behind each row's ⓘ unless "Descriptions" is on. The panel's left edge
  drags (`panelW`). UI prefs (open sections, descriptions, panelW, codeOpen, look) live in
  `src/uiPrefs.ts`, localStorage `open-mouthpiece-ui-v1`. Phone: tabs Design (all the folds) /
  Readouts / Code / Console; the ☰ menu has the file actions, compare, Appearance and "Code files".
- **Appearance** (`src/appearance.ts`): theme dark / light / system (`<html data-theme>`, CSS
  variables in styles.css: use `--accent-fg` for accent-coloured text and lines, `--overlay` for
  things floating over the viewer), model colour (A; its cut colour and edges are derived),
  viewer background (theme / solid / gradient; the WebGL canvas is transparent over the
  container's CSS background), grid, axes (off by default). CodeMirror swaps One Dark for its
  light default. The phone's ☰ menus have the same panel under "Appearance".
- **Undo / redo** of setting changes per design (App's `hist`): Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z)
  outside the code editor and text boxes, and the panel's ↶ ↷; quick changes of the same setting
  (a slider drag) are one step.
- **Viewer tools**: a floating strip (wraps inside the viewer): views 3D / Table / Top / Left / Right
  / Tip (were iso / front / back / left / right / top), toggle buttons for Edges, Wireframe,
  See-through, Ligature, Reed, A, B; "Picture ⤓" saves the view as a PNG (background included).
- **Settings and readouts**: `DesignPanel` = the curated controls in `src/design.ts` (labels,
  `tip_opening` in thousandths of an inch via `ThouInput`, `part` limited to mouthpiece / test ring
  / ligature unless the code is open; ranges and descriptions from the `.param` export) + the deeper
  folds; `Readouts` = cards from the render log (`parseSummary`: length/tip/facing/air, validate()
  warnings as notes) and the two echo-only reports (`facing_report()` -> facing chart +
  feeler-gauge stops, `clearance_report()` -> thinnest wall): the full-quality render appends
  them (and the zoom targets) to its source (`REPORTS_ECHO`, +~40ms instead of two more
  evaluations; their lines are kept out of the console); separate runs only when the readouts
  come into view later (`loadReports`). The facing chart
  (`FacingChart.tsx`, under "Tip & facing") has curve chips (`FACING_CHOICES`: As designed / Free
  / Even / Focused / Radius = facing_model + facing_exponent values); its points drag: the tip end =
  `tip_opening`, the flat end = `facing_length` (the points between scale along), a point between =
  `facing_model = "gauge"` with `facing_gauge_points` as a *value* (App's `POINT_VALUES`: kept
  though not a Customizer param, so it works on presets, downloads and shares; Curves edits the same
  value). The drag preview is the JS `pchip` through the same cleaned points as the generator's
  `GAUGE_PTS`, until the next report arrives. Render-progress overlay; first-visit hint
  (`open-mouthpiece-hint-v1`). Labels come from `paramLabel()` (with the code open All parameters
  also shows the raw name); `tip_opening` is in thou everywhere. Reports run while the readouts can
  be seen (`reportsOn`: always on a desktop). The Customizer hides the "Not yet implemented" group.
  The printing-guide link waits for `REPO_URL` in `src/links.ts`.
- **Quality** (Draft 32 / Normal 64 / Fine 96 = `render_fn`, saved with the layout; only for a
  file that declares `render_fn` and when the Customizer hasn't set it): a change renders a Draft
  pass, then the chosen quality after 700ms quiet (`refineTimer`; a newer change cancels it, so a
  drag runs only drafts). Reports (echo) run after the final pass only. A quality change re-renders
  straight at it. Download re-renders when the model on screen isn't at the chosen quality (Normal
  at least). Alto: 32 = 0.5s, 64 = 0.9s, 96 = 1.5s; with a detailed picture wrapped ~3x that.
- **Share links** (`src/share.ts`): `#d=` + base64url(deflate-raw(JSON {v, file, values,
  source?})); presets carry only changed values (~100 chars), other files their text too. Read at
  startup (opens the file, applies the values, switches to Design) and then dropped from the URL.
  The user's own pictures go along only with the "Include picture" box (shown beside Share when
  the design uses one): `art: {name: svg}` (+1.7k-7k chars for typical drawings, no cap). Without
  it a `*_image` using one (in the values or a shared file's text) goes out as `""`. Received
  pictures are kept like uploads (`receiveArt`: a different picture by that name gets `_2`, and
  the values point at it). Example pictures always go by name.
  Portable between the dev server and the static site. When the clipboard is refused (plain http on
  the LAN) the link shows in a box to copy.
- **Files**: tabs, each with its own CodeMirror state (undo kept per tab). The render target is the
  last activated non-`lib/` tab (or the voice picker, which also lists other open files). Every render sends the unsaved text of
  all open project files, so editing the base re-renders the voice file that includes it. ● =
  unsaved; Save (Ctrl+S) / "Save as…" keep the user's own files in this browser; closing a tab with unsaved text
  needs a second click; Revert discards a tab's unsaved text. Customizer values are kept per file;
  localStorage key `open-mouthpiece-session-v1` (was `scad-playground-v2`, read once). An empty result says why (empty text, or the changed
  Customizer values, e.g. `part = "facing_report"`). On a phone over the LAN, the
  app's localStorage is the phone browser's, not the desktop's.
- **Read-only presets** (`READ_ONLY` in scripts/project_files.mjs: alto, tenor, baritone, soprano and
  the variants, shown as a "Variants" group in the pickers, labelled "Alto Ash" by `voiceLabel`): the
  app can't save over them (Save disabled, CodeMirror read-only,
  🔒 on the tab); Customizer values still apply as -D overrides; "Save as…" suggests `my_<name>`.
  Unsaved text a preset tab carried in localStorage is dropped on load (a broken curve edit made
  tenor stop rendering). The CLI scripts (sync, fitter) still write them.
- **Customizer** from OpenSCAD's `.param` export (params of the rendered file only); the filter box
  also searches descriptions (try "tone"). A string param named `*_image` gets `ImagePicker`: a
  list of scad/art/ SVGs plus the user's own, "Upload SVG…" (works from a phone; kept in this
  browser only), a thumbnail; picking one also sets `<name>_aspect`.
- **Customizer extras**: the tip opening's box is in thousandths but takes mm too (a number under 10;
  while typing only an in-range value applies, the rest on leaving the box); the generator's notes
  (validate() warnings) show above the parameters as on the Design tab; a parameter that does
  nothing with the current settings is dimmed with the reason (`paramInactive` in design.ts:
  facing exponent off Power, gauge points off Gauge, bore_axis_height without ext_top_points,
  lettering settings without text or picture, pocket length at depth 0).
- **Old parameter names** (renamed 2026-09-26): `src/migrate.ts` rewrites them in the saved session,
  stored files, opened .scad files, compare files and share links (values and file text).
- **Viewer**: Z-up, camera kept across re-renders; views (iso, front = table, back = top, left
  from +X, right from -X: the player's sides as the lettering names them), edges, wireframe; **section view**
  (lengthwise clips x <= pos, across clips z <= pos; a BackSide flat-coloured "cap" mesh makes cut
  walls read solid); **see-through** toggle (both screens; `applyLook`: both models translucent,
  B always when overlaid on A); dev-only `window.__viewer` handle for scripted cameras.
- **Ligature**: the "Ligature" section starts with "Make a ligature for this
  mouthpiece", which sets the design's `ligature_made` parameter (so saves, downloads and share
  links keep it) and shows it with a reed. `lig` in the saved session is only the view: on (shown
  when made) / beside / reed; Hide keeps it made ("made · hidden": Show it, download, Remove).
  The reed is its own toggle ("Show a reed", the tools' "reed"). Once made its settings show (the Customizer
  params `ligature_*`) with a readout line (`parseLigature`), an
  on/beside choice, "Download ligature STL" (renders `part = ligature` at full quality) and Hide.
  After each non-draft render App runs `ligature_seated` and/or `reed_model`, whichever is shown (`loadLigature`) and the
  Viewer shows them in their own groups (`lig` red, `reed` pale) in A's frame: see-through and
  section apply; "beside" stands the band on the plate in front of A (-Y). The viewer tools have a
  "Ligature" / "Reed" toggles. "What to print" offers Ligature too (the readouts then give
  printing and fitting advice).
- **Console**: ERROR/WARNING/ECHO colouring; "in file X, line N" jumps to that file and line.
- **Curves panel** (`CurveEditor.tsx`, `curves.ts`): every single-line top-level `name = [[a, b],
  ...];` in the rendered file (`*_points` and the hidden `shape_*` tables). PCHIP drawn exactly as
  the generator evaluates it; drag knots, click to add (near the curve = on it), Delete, typed
  values, panel Undo; edits are *values* like the Customizer's (App's `setPointList`; kept by the
  params prune because they are lists in the file), so they work on presets, downloads and shares;
  editing `facing_gauge_points` also sets `facing_model = "gauge"`. Dashed = the model's curve from `curve_editor_curves()` via an echo run; it
  shows where a clamp holds a curve back. "Start from current curve" simplifies it into knots.
  External text changes reach CodeMirror as a minimal diff (cursor/scroll kept). "Clear" only for
  overrides (not `shape_*`); "Reset" drops the value (back to the file's points). The svg has
  `touch-action: none` (it's ignored on svg children, and a touch drag became a scroll/pointercancel).
- **Zoom to parameter** (Customizer "Zoom" toggle, on by default, persisted): touching a parameter
  row or picking a Curves list uses `param_focus()` (an echo run, fetched after each final render, riding
  on the facing-report run when the readouts show; a touch uses the latest data for that file at
  once, even from a slightly older state, while the current one loads) and the viewer flies there (`focus` prop, 450ms tween, cancelled by orbiting); parts
  inside turn the lengthwise section on, and it goes off again at the next outside part unless the
  user chose the section.
- **A/B compare**: "Compare with…" (More ▾, phone ☰): from
  this device (STL / .scad), the presets by name, your designs, open unsaved files; "Pin as B"
  (More ▾) freezes the current model; dropping an .stl on the page pins it. B snapshots carry
  the render's summary (tip, facing length, length, air) and a facing_report echo, so: the
  readout cards show "B …" under each number, the facing chart draws B's curve dashed, and the
  Compare A/B section starts with those numbers (tip in thou), then the parameter diff
  with Design labels/units and "← B", other assignments (outline tables, point lists), generator
  internals of a self-contained download folded away, mesh stats folded. Viewer: a legend chip
  (A / B names, ✕ clears B) on every screen, "A"/"B" labels under the models side by side
  (projected on every draw), a new B switches to side by side and frames both; overlaid, B is a
  faint tint whose edges (window, table, tip) show through A. Side by side puts B beside A across
  the screen (+X; +Y in the "left"/"right" views or with a lengthwise cut, which would cut B away). View
  settings live in a module-level store (the desktop and phone layouts mount their own
  viewers) and the toggles in localStorage `open-mouthpiece-view-v1`.
- **An STL as B**: `meshFrame.ts` is the browser port of `mesh_frame.mjs`'s `toFrame` (reed table =
  largest flat face with the mesh on one side, long axis, thin end = tip) into the design frame,
  then the model's print rotation from an echo (`FRAME_ECHO`), stood on the plate by its own
  lowest point, re-run when the model changes; its length comes from the mesh. No table found:
  shown as uploaded. Not persisted (localStorage is too small; the panel says so). Rewritten
  STLs carry face normals (three's STLLoader shades with the file's normals; zeros render black).
  Loop over the triangles, never `Math.max(...points)`: ~100k points overflow the stack.
- **Files in the top bar**: Save (your own design; disabled with nothing to save), Save as…
  (always, also on presets) and Open… (a .scad from the device); an opened .scad gets Save (to Your
  designs, in this browser) and Close; a saved design Close and Delete (`api.remove`); discarding or deleting takes a second
  click, and the status line says so. Switching voices closes the previous preset's tab when it
  is untouched (the code column's tab bar stays short); values stay in `valuesByKey`.
- **Phone/tablet layout** below 1024px (`useMediaQuery`): ☰ menu for file/compare/download actions,
  viewer on top with its tools behind a ⋯ button, panels Parameters / Curves / Code / Console / Compare. All
  panels stay mounted (`display: none !important`) so editor state survives; `EditorHandle.refresh()`
  re-measures CodeMirror when shown; 16px inputs (no iOS zoom). Above 1024px the desktop toolbar wraps.
- **LAN**: `npm run dev:lan` runs Vite with `--host` (open the machine's Wi-Fi address, port 5173;
  ignore virtual-adapter and link-local addresses such as VirtualBox, WSL, 169.254.x). Other devices
  only get the page; OpenSCAD runs on them.
- Screenshots from a script (a hidden browser tab stalls rAF/ResizeObserver):
  headless Chrome over CDP (`--headless=new --remote-debugging-port`, `node --experimental-websocket`),
  `Runtime.evaluate` a click script, `Page.captureScreenshot`. Run a second Vite on another port
  (`npx vite --port 5190 --strictPort`; it listens on `localhost`, which is IPv6 here, not
  127.0.0.1) rather than restarting the one in use. Keep such test tools out of scad/_sweep/: `npm run sweep`
  deletes it on every run.
- Testing layouts without resizing the window: replace the page body with an `<iframe src="/">`
  of the target size; media queries inside it see the iframe's width.

- **Notes**: `Notes` (Readouts.tsx) shows the generator's warnings that need the player in
  yellow and folds the ones about a value it adjusted by itself (`isAdjustment`: "shortened /
  moved / limited to") into "Adjusted automatically (n): nothing to do". The Wall card shows "…"
  until the new model's wall is measured (it used to show the last model's number).
- **"How does your print play?"** (symptom buttons nudging settings) was removed 2026-09-29: the app
  makes no sound claims; the symptom table lives in docs/PRINTING.md step 5.
- **Error reports** (`src/report.ts` -> `worker/index.js` -> Workers Logs): status errors (with
  the render's first `ERROR:` line), renders still running after 45s, uncaught page errors, and a
  render marker left in localStorage by a visit that froze (reported on the next load; cleared on
  a normal close). Anonymous: kind, message, a preset's path or "own design", changed setting
  NAMES, build (commit), user agent; no values, lettering or file text; the Worker keeps only those
  fields and no IP. Off in dev / on localhost and with the ⚙ menu's "Send error reports".

## Hosting notes

The app is a static site (`npm run build` -> dist/), hosted on Cloudflare (docs/HOSTING.md).
  Early measurements, rendering
  in the browser with OpenSCAD's official WebAssembly build (files.openscad.org/snapshots/
  `OpenSCAD-<date>-WebAssembly-web.zip`: ES-module factory `openscad.js` + 11 MB `openscad.wasm`,
  3.3 MB zipped). Measured in headless Chrome with the real files in its FS (`FS.writeFile`,
  `callMain([... "-o", "/out.stl", "/scad/alto.scad"])`, a fresh instance per render, ~40-90ms):
  all genus 1, fonts and SVG import work, no COOP/COEP headers needed. Render times vs native on
  this PC: alto 2.3-2.8s (1.1s), alto with lettering + picture 3.5s (1.4s), tenor 2.9s, bari 4.5s
  (1.6s); with the CPU throttled 4x (rough phone) alto 13s, with lettering 16s. The -node.zip build
  failed on Windows Node 21 (numeric exception at start, even for a cube); the web build is the
  target anyway. Still open for phones: render on demand / lower render_fn previews.
