# Rendering performance review — 2026-10-15

The largest delay is evaluating the OpenSCAD generator. The current viewer's STL parsing and
edge generation are much smaller costs. Print kits also repeat expensive work that previews
have already performed.

## How this was measured

`scripts/benchmark.mjs` runs the project's pinned web OpenSCAD build (2026.09.23) under Node,
with the same fresh instance, project filesystem, Manifold backend and binary STL output as
the app. Each case has one warm-up followed by three measured runs; figures below are medians.
Jobs run sequentially. It also measures the viewer's actual Three.js STL loader and edge builder.

This isolates the geometry engine: it excludes network downloads, worker startup/messaging,
base64 conversion, React, shape charts, air-mesh construction and GPU drawing. These are local
measurements, not a browser or phone benchmark. CSG export approximates evaluation cost; it
also includes CSG serialization, so subtracting it from STL time is not an exact internal profile.

```powershell
node scripts/benchmark.mjs --engine wasm --runs 3 --voices alto,baritone
node scripts/benchmark.mjs --engine native --runs 3 --voices alto,baritone --cases normal,evaluation
```

The native command needs the nightly CLI described in CONTRIBUTING.md. JSON samples and the
last log for each case go to `test/out/performance/` (gitignored). A filtered run overwrites that
engine's JSON report, so keep a copy when comparing runs. Do not benchmark engines concurrently.

## Measurements

Measured on an AMD Ryzen 7 5800X3D, Windows, Node 21.7.3. Times are engine jobs unless
the row explicitly names a Three.js operation. The app adds its debounce and browser overhead.

| Operation | Alto | Baritone |
| --- | ---: | ---: |
| Draft mesh (`render_fn=32`) | 1.72 s | 2.13 s |
| Normal mesh (`64`), without appended reports | 3.43 s | 4.85 s |
| Fine mesh (`96`) | 5.64 s | 8.92 s |
| Evaluation / CSG export (`64`) | 2.96 s | 4.40 s |
| Normal mesh + reports, shape and focus | 3.93 s | 5.67 s |
| Normal mesh + reports, shape, focus and air (desktop app path) | 4.18 s | 5.90 s |
| Check-card readouts alone (`64`) | 2.57 s | 2.54 s |
| Seated ligature preview (`64`) | 2.77 s | 2.26 s |
| Seated cap preview (`64`) | 3.59 s | 4.30 s |
| One fit ring (`64`) | 3.42 s | 4.87 s |
| Three.js STL parsing, normal main mesh | 7 ms | 15 ms |
| Three.js edge generation, normal main mesh | 62 ms | 82 ms |
| Native CLI normal mesh (`64`), without appended reports | 1.46 s | 1.89 s |
| Native CLI evaluation / CSG export (`64`) | 1.43 s | 1.79 s |

WASM factory initialization took roughly 6–10 ms per job; copying all 53 project files
(4.54 MB) into the fresh filesystem took roughly 2–6 ms. The initial local WASM compile/import
took 31 ms; downloading the module is excluded. Normal meshes had 20,986 / 31,578 triangles.
Fine meshes had 40,092 / 62,766 triangles; their edge generation took 131 / 184 ms.

Evaluation/CSG cost was about 86–91% of plain normal-STL time. Reports and preview data
added about 0.75–1.04 s compared with plain mesh output; the air echo portion was approximately
0.23–0.26 s. These are differences between separate median runs, not precise internal stage
timings. Main app logs including air were about 116 / 168 KB.

Draft cut plain mesh time by about 50–56%. That is an existing quality tradeoff, not an
optimization preserving identical triangles. Each unnecessary check-card evaluation costs about
2.5 s here. Three default fit-ring jobs alone total about 10.3 / 14.6 s, before other kit files.

A temporary copy of `interior_points()` hoisted its rail-width, rail fade and blend-span constants
outside the point loop. Alternating baseline/prototype runs (one warm-up each, three measured
each) gave medians of 3.47 / 3.51 s for alto and 4.97 / 4.71 s for baritone. Triangle counts and
binary STL triangle data were byte-identical in both presets. This is a small and inconsistent
timing benefit (baritone about 5%); it does not establish a general speedup. The prototype was
kept under `test/out/performance/`, not applied to the generator, and was not swept across designs.

## Work to prioritize

1. **Reuse completed results when preparing downloads.** `App.tsx:downloadFiles` invokes
   `partStl("cap")` and `partStl("ligature")` for the kit, although matching preview meshes may
   already exist. Single-cap download already uses `capPrintStl()`; the kit bypasses it.
   `kitReports()` unconditionally starts another OpenSCAD evaluation for the check card even
   when the main render already returned facing and clearance reports. Reuse reports only for
   the matching design and required resolution. Convert seated accessory coordinates to print
   coordinates exactly as the SCAD export does. Cache keys must include source, included files,
   values, quality and imported artwork revisions. Bound any multi-result cache by memory.
   First tighten `partStl()`'s main-preview reuse: it currently checks resolution but does not
   verify that the shown STL matches the current target and values while a newer render is pending.

2. **Build fit rings from just the shank.** `shank_test_ring()` calls `mouthpiece_body()` and
   intersects the full mouthpiece with a box. This pays for the entire chamber, window and facing
   even though the ring retains only the socket end. A kit repeats this for every squeeze value.
   Introduce a shank-bounded construction path, preserving its exterior, socket, bevel, print
   frame and applicable decoration. Simply skipping `AIR_RINGS` would be incorrect with the
   existing implementation, because it still builds the full mouthpiece first. Compare resulting
   rings against the existing implementation for all presets and decorated shanks.

3. **Reduce repeated calculations inside the generator's point loops.** Start with
   `interior_points()`, `interior_fit()`, `WIN_FIT_TAB` and `clearance_rows()` in
   `scad/lib/mouthpiece_base.scad`. `rail_wall_x()` recomputes quantities that are constant across
   an interior ring, including `int_hw_at_y(I, I[6])`. Hoist those outside the per-point loop.
   Consider sharing exterior-ring calculations at matching stations. Retain every wall clamp
   and the smoothing fit. Timing individual expressions has not been done; these are code-based
   targets, not a claim that every one is expensive. Run geometry regression checks before and
   after any production change; sweep changes affecting clamps or sampling.

4. **Use the existing quality control deliberately.** Draft substantially reduces current engine
   time. The hook's old comment that a lower-resolution pass saves only about 20% no longer
   describes these measurements. Keep final export at Normal or better. If changing interaction,
   test drafting during a drag and doing one final render after release, alongside the current
   single-render behavior. Running two complete passes after every edit can delay the final
   model; the current cancellation behavior already terminates obsolete workers. Slider changes
   currently wait 250 ms before starting a render; code edits wait 900 ms. Repeated pauses during
   a drag can start renders that the next change cancels.

5. **Make optional preview work conditional.** Full renders append `AIR_SOLID`, and
   `takeAirEcho()` builds an air STL even with Air space only off. This avoids a later OpenSCAD
   run, but does have an upfront cost. At least defer JS STL construction until air is shown;
   retain the ring data. Evaluate the tradeoff of deferring the echo itself, particularly on phones,
   since requesting it later repeats generator evaluation. Preserve reports in the main render
   rather than restoring independent readout and focus jobs for every edit.

6. **Optimize viewer interaction separately.** `Viewer.tsx:fill()` constructs `EdgesGeometry`
   even when edges are hidden; create it lazily if needed. Cap pixel ratio on high-density mobile
   screens if browser measurements show GPU pressure (DPR 3 to 2 reduces pixel count by 56%).
   `flyTo()` calls both `controls.update()` and `draw()`, while controls changes also call `draw()`;
   coalesce draws per animation frame. Keep the existing on-demand drawing: there is no perpetual
   idle animation loop to remove. Browser profiling is still needed for these changes.

7. **Reduce cold-start downloads.** The existing local production build has one 1.42 MB JS
   entry bundle (435 KB gzipped). `App.tsx` eagerly imports CodeMirror through `Editor`, including
   when code is closed. Load the editor on its first use, then keep it mounted to preserve state.
   The first geometry job also fetches every project file, including all fonts, before starting;
   the WASM alone is 11 MB uncompressed. Audit transfer compression and caching locally, then
   consider a prebuilt dependency list for presets and conditional font registration so unused
   fonts and art load on demand (the base currently registers every font with `use<>`).
   Preserve the complete-files fallback for arbitrary uploaded SCAD and dynamically named imports.
   Network speed was not measured, and these sizes are not actual wire-transfer measurements.

## Existing optimizations to preserve

- Manifold and binary STL output are already enabled.
- The WASM module is compiled once and shared among workers, including after cancellation.
- Main renders, accessories and quick queries have separate worker lanes.
- Readouts, shape data and focus data already accompany the main render when appropriate.
- Preset parameter lists are precomputed and checked against the source hash.
- Accessory-only changes can skip the mouthpiece; interior-only changes can skip accessories.
- Downloads already reuse the main preview in some cases, and single-cap downloads have a reuse path.

Filesystem copying and WASM instantiation measured in milliseconds. Reworking them, changing
React memoization, or removing base64 should follow the larger generator and duplicate-run work.
No production rendering or geometry behavior was changed by this review.

## Additional notes for Claude

- **Fix download freshness before expanding caching.** In `src/hooks/useModelRender.ts`,
  `partStl()` can return the displayed main STL when its resolution matches, without checking
  that it belongs to the current target and values. Changing a setting and downloading before
  the next render finishes could therefore export the previous shape. This is a code-review
  finding; the interaction has not been reproduced in a browser. Reuse only a result with a
  matching input signature; otherwise await or start the correct render. Verify the case where
  settings change immediately before Download, including when the new render fails.
- **Refresh outdated performance comments after measuring changes.** The hook's estimate
  that Draft saves only about 20% differs from the measured 50–56% reduction for plain meshes.
  Keep the distinction between plain mesh timing and the complete app preview, and avoid
  promising that reduction on every design or device.
- **Preserve the current architecture.** Workers, cancellation, Manifold, shared WASM
  compilation and combined readouts already address major sources of delay. This investigation
  provides no evidence that a framework rewrite would improve the dominant generator cost.
- **Treat startup and editing as separate performance tasks.** Startup includes downloading
  project assets and eagerly loading the editor; repeated editing primarily pays for geometry
  evaluation. Measure first usable preview separately from subsequent parameter changes so
  improvements to one are not mistaken for improvements to the other.
- **Validate on phones before settling interaction defaults.** These benchmarks used desktop
  hardware and Node, not an actual mobile browser. Check CPU time, memory, touch interactions,
  screen density and cancellation while dragging. Distinguish slow geometry generation from
  slow camera movement or display updates.

Recommended first implementation: fix download freshness, then reuse matching preview meshes
and readouts during print-kit generation. This addresses correctness and removes repeated
evaluations without changing the mouthpiece geometry. Tackle the dedicated fit-ring construction
path next, with geometry comparisons against the existing implementation.

Validation: the full WASM benchmark completed for both presets; the native benchmark completed
for normal STL and CSG output. All 42 app tests passed, TypeScript typechecking passed, and
the benchmark passed ESLint and Prettier. Geometry regression/sweep checks were not run because
the production generator was unchanged.

## Follow-up measurements and changes (2026-10-15)

Checked in the browser (dev server, alto) and with native OpenSCAD.

- **Overriding included variables costs ~1.3 ms each** (a voice file resets ~190 of the library's
  settings: ~0.25 s per run natively). Writing the values into the library's own lines gave
  byte-identical STLs but saved only 100-250 ms per run, ~4-10% on the slow variants and ~0.1 s in the
  browser. Dropped as not worth a text-rewriting hack; if the presets are ever restructured so
  nothing is set twice, the saving comes for free.
- **Fit rings:** skipping the air rings saved only ~14% natively and broke the socket (genus 0);
  not worth it. Hoisting constants in `interior_points()` is within noise.
- **Print kit:** the files are made on up to three extra workers (`kit0..kit2`); three rings take
  4.4 s together against 9.4 s one after another. The cap preview and the main render's reports are
  reused when they match the current settings.
- **Tried and dropped:** running the readout reports on a second worker beside the main render made
  the mesh *slower* (4.3-4.6 s vs 3.9-4.1 s: two OpenSCAD runs contend). Draft quality while a slider
  is held only helps if the user pauses, which they don't.
- Slider change to the "Rendering…" indicator: 290 -> 175 ms (debounce 250 -> 120 ms).

### Why the variants are slow (browser, baritone Silva, render_fn 64)

Whole render 10.3 s, against 5.3 s for the plain baritone preset. Removing one feature at a time
(they overlap, so the savings don't add up): baffle texture -2.4 s, shank detail (16 knurls) -2.6 s,
top picture -1.1 s, side text -0.8 s; all four off 6.3 s (the rest of the gap is the variant's other
settings). Native OpenSCAD hides most of this (multi-threaded Manifold: Silva 2.3 s vs 1.4 s), so time
variants in the browser. Native detail: the shank tables (`SD_EROWS`, `SD_RGRID`) cost ~0.15 s whenever
a shank detail or shank text is on; the geometry (32 helical sweeps for knurls) is the rest.
The baffle texture is already tuned ($fn 16, nested hulls). Ideas not tried: coarser shank tables,
fewer/simpler knurl sweeps, building decoration separately from the body.
