# App notes (developer reference)

How the app works. Read before changing `src/` or `vite.config.ts`.

## How it runs (no server)

OpenSCAD runs in the browser, the project comes from the site, and the user's files and pictures
stay in their browser. Nothing may be saved on a server. `npm run dev` is plain Vite; a build is a
static site (docs/HOSTING.md).

- **Code map**: `src/api.ts` (the `Api` interface; `api` = `browserApi`). `App.tsx` holds the state
  (tabs, values, layout, B) and both layouts; `src/app/files.ts` (tabs, names, labels, downloads),
  `src/app/session.ts` (what is kept in this browser); hooks in `src/hooks/`: `useModelRender` (the
  render loop: draft then full quality, the readouts' reports, the ligature, download renders),
  `useParamFocus`, `useValueHistory` (undo/redo), `useMediaQuery`; toolbar and panel pieces in
  `src/components/`.
- **OpenSCAD**: the official WebAssembly build, pinned in `scripts/fetch_openscad_wasm.mjs` (version
  + SHA-256; bump together) into `public/openscad/` (gitignored; fetched once by `npm run dev`).
  `src/wasm/openscad.worker.ts` compiles the wasm once per worker and makes a fresh instance per job
  (main() runs once), files in MEMFS under `/scad` (cwd, so log paths are project-relative),
  outputs in `/tmp`. `src/wasm/runner.ts`: two lanes, "render" and "quick" (params, echo, picture
  measuring), one worker each, jobs in order; abort = terminate the worker. Every run gets the
  project, the user's files, their pictures (`art/<name>`) and the unsaved buffers; a file from the
  device is written at the root as `__local__<name>` so `include <lib/...>` still works. No
  COOP/COEP headers needed. The `-node.zip` build fails on Windows Node 21; the web build is the
  target.
- **Project files** = `scripts/project_files.mjs` (scad/ minus local folders; the presets list
  includes every `variants/*.scad`). Dev: the `liveProject` plugin in vite.config.ts serves them
  from scad/ at `project/` (manifest per request, so generator edits show on the next render).
  Build: `scripts/build_static_project.mjs` copies them to `public/project/` + `manifest.json` (+
  picture aspects measured natively when OpenSCAD is installed).
- **Settings lists made ahead**: `scad/param_lists.json` (committed; `npm run check` or
  `node scripts/param_lists.mjs` refreshes it) holds each preset's `.param` export with a hash of its
  text; `browserApi.params` uses it while the text matches (saves ~3s in the browser before the
  settings show), else asks OpenSCAD. A stale entry is just slower, never wrong.
- **Speed**: the browser takes ~2.5-3x native (alto ~2.5s, bari ~4.5s; a 4x-throttled CPU, like a
  phone, ~13s).

## Files and saving

- **Storage**: the user's files in localStorage `open-mouthpiece-files-v1` ({path: {text}});
  pictures in `open-mouthpiece-art-v1` (`userArt.ts`, shown via data: URLs); the session in
  `open-mouthpiece-session-v1` (was `scad-playground-v2`, read once). `files()` returns `{files,
  readOnly, own}`. On a phone over the LAN, storage is the phone browser's.
- **Save writes only the user's own files**; a project file (presets, `lib/`, ...) goes through
  Save as (`my_<name>`); a stored copy of a project path is ignored, so the site's project always
  wins. The base can be edited in the editor for live experiments (the unsaved text goes with every
  render), not saved.
- **Read-only presets** (`READ_ONLY` in scripts/project_files.mjs: the four voices and the variants,
  labelled "Alto Ash" by `voiceLabel`): Save disabled, CodeMirror read-only, 🔒 on the tab;
  Customizer values still apply as -D overrides. Unsaved preset text in localStorage is dropped on
  load (a broken curve edit once stopped the tenor rendering). The CLI scripts still write them.
- **A saved design is a document**: Save and Save as write the Customizer values into the file
  (`withValues`, src/scadText.ts; a name the file doesn't assign goes under `/* [Hidden] */`) and
  clear them, so Reset means "back to what I saved". Save as leaves a preset as published (Compare
  with a preset also uses it as published); your own design keeps its unsaved changes. Typed names
  are made file-safe (`scadFileName`); own designs show with spaces for `_`.
- **Save as panel** (`saveDesignAs`; the code column's Save as keeps a plain name box): any of a
  copy in this browser ("quick, not a backup"), the full .scad (`bundleDesign`), a settings-only
  .scad (`<name>_settings.scad`: the voice file with the values, `include <../lib/` rewritten to
  `include <lib/`), the part's STL and the ligature's (`partStl`, download quality), downloaded or
  zipped (fflate). The choices persist (`saveAs` pref).
- **Download .scad** writes one self-contained file that opens in any OpenSCAD (`bundleDesign`,
  src/bundle.ts, the method of scripts/bundle_scad.mjs): a header, the file with its values, then
  the base without the defaults the file sets (unsaved tab text wins). Lettering is text(); a
  picture stays a file imported from `art/<name>` next to it (the header says so; without it
  OpenSCAD makes the model without the picture). The font `use<>`s are dropped (the header names a
  non-built-in font); the app registers its fonts for any main file without an include or a .ttf
  use<> (browserApi `workspace`), since a missing font crashes the wasm build. Named
  `my_<preset>.scad`, ~85 KB. Renders identically in the nightly; OpenSCAD 2021.01 renders it too.
- **Open .scad…** (or drop) loads .scad files as tabs, listed under "Open files" in the voice
  picker; an opened file gets Save (to Your designs) and Close. "Download tab" = the editor text as
  is.
- **Download ▾** (`downloadItems` in App.tsx; desktop: the ▾ joined to Download, phone: the ☰ menu):
  everything to download in one list: the mouthpiece, a shank test ring at the design's squeeze
  (`downloadPart("ring")`), the ligature / cap once made, the print kit, the design file (.scad). The
  main button still downloads the part tab's part (and shows any download's progress).
- **Print kit** (`downloadKit` in App.tsx, src/printKit.ts; Printing section, Download ▾, phone ☰):
  one zip with the mouthpiece, shank test rings at squeeze 0.10 / 0.20 / 0.30 (plus the design's own),
  the ligature if made, and `<name>_check_card.txt` (tip, facing, length, air, thinnest wall, cork /
  socket, feeler-gauge stops) from one echo-only run (`kitReports`).
- **Top bar**: Save (own design), Save as… (always), Open…; a saved design also Close and Delete
  (`api.remove`). Discarding or deleting takes a second click. Switching voices closes the previous
  preset's tab when untouched; values stay in `valuesByKey`.
- **Old parameter names**: `src/migrate.ts` rewrites them in the session, stored files, opened and
  compare files, and share links. It must not touch the generator's own `RENAMED_PARAMS` block
  (that once hung the app on re-opening a download; `npm run check` guards it).

## The screen

- **One screen**: you go as deep as you open. Top bar = logo, voice picker (a design with unsaved
  settings shows "(edited)", so a changed preset isn't mistaken for the published one), file
  actions | Share, Download STL ▾, More ▾ (`components/Menu.tsx`), ⚙ (`AppearanceMenu.tsx`). Right panel
  (`DesignPanel`): readouts strip, "Find a setting" (opens matching sections, also searches All
  parameters), Undo/Redo, Auto-zoom, Reset, Expand/Collapse all, Descriptions, then folds (`Fold`,
  closed by default, summary from `DesignSection.summary`, ● count of changed settings): the
  curated sections, All parameters, Curves, Compare A/B (while a B is pinned). The panel's left
  edge drags (`panelW`). UI prefs in `src/uiPrefs.ts` (`open-mouthpiece-ui-v1`).
- **Code column** (left, closed by default): editor + console. Opening it (`coding`) brings back
  the Render button and Auto, the full status line, parameter names, every group and dropdown value
  in All parameters, and Save as acting on the editor's tab. Tabs are named by role (`tabLabel`):
  the design's name, or "Generator" for `lib/mouthpiece_base.scad`. One quiet line above the editor
  (`fileNote`) says which it is; keep such hints to one short line. Open project file… is grouped
  Presets / Variants / Your designs / Generator. A preset or variant on screen has no × (`canClose`:
  closing the only design left nothing to render); your own or an unsaved design closes to its
  voice's preset (`presetFor`, `replaceWithPreset`: loaded first, no flash).
- **Status**: render progress and errors are the status (`useModelRender`); what a user action did
  (saved, link copied, delete prompts) is a *notice* shown in its place for 4s. Errors clear it.
- **Settings**: `DesignPanel` = the curated controls in `src/design.ts` (labels, `caption`,
  `optionLabels`; `tip_opening` in thousandths via `ThouInput`, which takes mm too: a number under
  10; `part` limited to mouthpiece / test ring / ligature / cap unless the code is open; ranges and
  descriptions from the `.param` export). Typed numbers are clamped to the slider range. Labels from
  `paramLabel()`. A parameter that does nothing now is dimmed with the reason (`paramInactive`).
  Descriptions hide behind ⓘ unless "Descriptions" is on. A variant shows its file's header line
  (`fileAbout`; factual, no sound claims).
- **Lettering texts** (`*_text`, `side_text_*`): `components/TextField.tsx`, a box that takes
  several lines ("
" in the value) plus Variables (`{tip}`, `{title}`, `{voice}`, ...) with live
  values from the generator's `Text variables:` echo (`parseTextVariables`). `{title}` comes from
  `design_title`, which App sets from the design's name for renders and downloads (not in share links).
- **Customizer** (All parameters): from OpenSCAD's `.param` export (the rendered file's params
  only); the filter also searches descriptions; hides the "Not yet implemented" group. A string
  param named `*_image` gets `ImagePicker` (scad/art/ SVGs plus the user's own, "Upload SVG…");
  picking one also sets `<name>_aspect`.
- **Readouts**: cards from the render log (`parseSummary`: length/tip/facing/air) and two echo-only
  reports (`facing_report()` -> facing chart + feeler-gauge stops, `clearance_report()` -> thinnest
  wall). Facing has one meaning everywhere: the facing length, tip to the break (the Facing length
  setting, the Facing card, Compare, the check card); the feeler-gauge stops fold under the facing
  chart and are on the check card. The Wall card says "at the rails" beside the window and shows "…"
  until the new model is measured. The full-quality render appends the reports and zoom targets to
  its source (`REPORTS_ECHO`, +~40ms instead of two more runs; their lines are kept out of the
  console); separate runs only when the model on screen came without them (`ensureReports`).
- **Notes** (`Notes` in Readouts.tsx): validate() warnings that need the player in yellow; ones
  about a value adjusted automatically (`isAdjustment`) folded into "Adjusted automatically (n)".
- **Facing chart** (`FacingChart.tsx`, under "Tip & facing"): curve chips (`FACING_CHOICES`: As
  designed / Opens early / Even / Opens late / Radius); its points drag: the tip end =
  `tip_opening`, the flat end = `facing_length`, a point between = `facing_model = "gauge"` with
  `facing_gauge_points` as a *value* (`POINT_VALUES`: kept though not a Customizer param, so it
  works on presets, downloads and shares). The drag preview is the JS `pchip` through the same
  cleaned points as `GAUGE_PTS`.
- **Side section** (`ProfileChart.tsx`, `src/profile.ts`; under "Chamber & baffle" and "Body &
  beak"): the STL on screen cut at x = 0 (segments chained into loops, even-odd fill), true to
  scale, the tip right and the reed side down. "Before the last change" (dashed) is the previous
  final render with other settings (`sig`), reset per design; B dashed blue when its STL is in frame.
- **Curves panel** (`CurveEditor.tsx`, `curves.ts`): every single-line top-level `name = [[a, b],
  ...];` in the rendered file, named and grouped by part (`CURVE_GROUPS`; others under "Other"). PCHIP drawn exactly as the generator evaluates it; drag knots, click
  to add, Delete, typed values, Undo; edits are values (`setPointList`), so they work on presets,
  downloads and shares. Dashed = the model's curve from `curve_editor_curves()` (shows where a clamp
  holds a curve back). "Clear" only for overrides; "Reset" drops the value. The svg has
  `touch-action: none` (ignored on svg children).
- **Undo / redo** per design (`hist`): Ctrl+Z / Ctrl+Y outside text boxes, and ↶ ↷; a slider drag is
  one step.
- **Quality** (Draft 32 / Normal 64 / Fine 96 = `render_fn`; only for a file that declares it): a
  change renders Draft, then the chosen quality after 700ms quiet (`refineTimer`; a drag runs only
  drafts). Reports run after the final pass only. Download re-renders when the model on screen isn't
  at the chosen quality (Normal at least).
- **Share links** (`src/share.ts`): `#d=` + base64url(deflate-raw(JSON {v, file, values,
  source?})); presets carry only changed values, other files their text too. Read at startup, then
  dropped from the URL. The user's own pictures go along only with "Include picture" (`art: {name:
  svg}`); without it a `*_image` using one goes out as `""`. Received pictures are kept like uploads
  (`receiveArt`: a clash gets `_2`). When the clipboard is refused (plain http on the LAN) the link
  shows in a box.
- **Appearance** (`src/appearance.ts`): theme (`<html data-theme>`, CSS variables in styles.css: use
  `--accent-fg` for accent-coloured text and lines, `--overlay` for things over the viewer), model
  colour, viewer background (the WebGL canvas is transparent over the container's CSS background),
  grid, axes.
- **Phone/tablet** below 1024px (`useMediaQuery`): ☰ menu for file/compare/download actions, viewer
  on top with its tools behind ⋯ and the readouts as one line over it (`ReadoutLine`; a tap opens
  the cards; the generator's notes show at the top of the settings), then the settings. The code
  and the console open from ☰ > Code files, over the settings, with "← Design" back. All panels stay mounted
  (`display: none !important`) so editor state survives; `EditorHandle.refresh()` re-measures
  CodeMirror when shown; 16px inputs (no iOS zoom).

## Viewer

- Z-up, camera kept across re-renders. Floating tools: views 3D / Table / Top / Left / Right / Tip
  (left from +X, right from -X: the player's sides as the lettering names them), Quality, Show ▾
  (Edges, Wireframe, See-through, Ligature, Reed), A/B, a camera icon (PNG of the view).
- **Section view**: lengthwise clips x <= pos (x >= pos after the Right view, `secFlip`, so both
  side views look at the cut), across clips z <= pos; a BackSide flat-coloured cap
  mesh makes cut walls read solid. **See-through** (`applyLook`). Dev-only `window.__viewer` for
  scripted cameras.
- **Zoom to parameter** ("Auto-zoom", persisted): touching a parameter row or picking a Curves list
  uses `param_focus()` (fetched after each final render; a touch uses the latest data at once) and
  the camera flies there (450ms, cancelled by orbiting); parts inside turn the lengthwise section on
  until the next outside part, unless the user chose the section.
- **Ligature**: "Make a ligature for this mouthpiece" sets `ligature_made` (so saves, downloads and
  links keep it). `lig` in the session is only the view: on / beside / hidden ("made · hidden");
  the reed is its own toggle. After each non-draft render App runs `ligature_seated` and/or
  `reed_model`, whichever is shown (`loadLigature`); the viewer shows them in A's frame (`lig` red,
  `reed` pale; "beside" stands the band in front of A). Readout line from `parseLigature`.
- **Cap**: as the ligature: "Make a cap for this mouthpiece" sets `cap_made`; `capV` (session `cap`) is
  the view: on / beside. After each non-draft render App runs `cap_seated` (`loadCap`); the viewer shows
  it see-through teal on A (`capG`) or opaque beside it (+Y). `CapHead`: readout (`parseCap`, warnings),
  Hide / Beside / Download cap STL / Remove; the print kit and Save as take `<name>_cap.stl` when made.
  The Cap section's controls show once made. `part = cap` (an old link) still shows it alone, with
  `PartNote`. Items with `when` in `design.ts` show only for one value of another setting.
- **Part tabs** (Mouthpiece | Ligature | Cap, over the settings; `partTab` in the session): each
  `DesignSection` has a `tab` (default mouthpiece); All parameters hides the other tabs' groups
  (`PART_GROUPS`: Ligature, Cap); a search looks in every tab. Opening a tab sets the view toggles as
  a start (`openPartTab`: the ligature's shows the ligature, not the cap; the cap's shows the cap and the
  printed ligature under it, even before one is made; the mouthpiece's brings the mouthpiece back);
  the toggles change it from there. `showMp` (App) hides the mouthpiece: the view's Show menu
  ("Mouthpiece") or the heads' "Alone"; the viewer's `showModel` then overrides its A/B `showA`, and the
  ghost and the cap's see-through go with it. The tab also picks the Download button (`dlWhat`: the part
  once made) and the readouts (`PartNote` with the part's numbers; the heads show them only on the
  phone). Opening a part tab puts `part` back to the mouthpiece. "What to print" offers the mouthpiece
  and the test ring (an old link's value stays listed).
- **A/B compare**: "Compare with…" (a device STL / .scad, presets, your designs, open files); "Pin
  as B" freezes the current model; dropping an .stl pins it. B snapshots carry the summary and a
  facing report, so the cards show "B …", the facing chart draws B dashed, and the Compare section
  lists the numbers then the parameter diff. A legend chip (✕ clears B), "A"/"B" labels; a new B
  switches to side by side (+X; +Y in left/right views or with a lengthwise cut). View settings
  live in a module-level store (both layouts mount their own viewers), toggles in
  `open-mouthpiece-view-v1`. Phone: a drag bar under the view sets its height (20-85dvh, kept in
  `open-mouthpiece-phone-view-v1`).
- **An STL as B**: `meshFrame.ts` (the browser port of `mesh_frame.mjs`'s `toFrame`: reed table =
  largest flat face with the mesh on one side, long axis, thin end = tip) into the design frame,
  then the model's print rotation (`FRAME_ECHO`), stood on its lowest point. No table found: shown
  as uploaded. Not persisted (too big for localStorage).

## Reports

- **Error reports** (`src/report.ts` -> `worker/index.js` -> Workers Logs): status errors (with the
  render's first `ERROR:` line), renders still running after 45s, uncaught page errors (not the
  browser's "ResizeObserver loop" notice), and a render marker left by a visit that froze (reported
  on the next load). Kind, message, a preset's path or "own design", changed setting names, build,
  user agent; no values or text, no IP.
- **Usage** (`src/usage.ts` -> `POST /api/usage` -> D1, `worker/usage.sql`): visits, design,
  setting names, sections, features, quality, downloads with the design's numbers; never text,
  pictures or file names; a random per-page visit id. Sent every 5s.
- Both off on localhost and with ⚙ "Share anonymous usage".

## Development

- `npm run dev:lan` runs Vite with `--host` (open the machine's Wi-Fi address; ignore virtual and
  link-local adapters). Other devices only get the page; OpenSCAD runs on them.
- A second Vite on another port (`npx vite --port 5190 --strictPort`) is a separate origin with
  fresh storage; it listens on `localhost`, which may be IPv6, not 127.0.0.1.
- Screenshots from a script: headless Chrome over CDP (`--headless=new --remote-debugging-port`,
  `node --experimental-websocket`), `Runtime.evaluate` a click script, `Page.captureScreenshot` (a
  hidden tab stalls rAF/ResizeObserver). Keep such tools out of scad/_sweep/: `npm run sweep`
  deletes it.
- Phone layouts without resizing: replace the page body with an `<iframe src="/">` of the target
  width.
