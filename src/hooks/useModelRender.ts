// Rendering the design on screen: one run per change at the chosen quality (a newer change cancels
// it; no quick lower-resolution pass first: it saves only ~20%, as most of a run is evaluating the
// generator, and made the final model arrive about twice as late). The run also makes the readouts' reports and the zoom targets (one OpenSCAD run instead of three:
// each run evaluates the whole generator again). After it: the ligature, a model reed and the cap, while shown.
import { useCallback, useRef, useState, type RefObject } from "react";
import { api, base64ToBuffer, type RenderResult, type RenderTarget, type ScadParam } from "../api";
import { parseAirVolume } from "../compare";
import { FOCUS_ECHO, parseFocusEcho, type FocusData } from "../focus";
import type { Lane } from "../wasm/runner";
import { AIR_ECHO, buildAirStl, parseAirEcho } from "../airMesh";
import { parseShapeEcho, SHAPE_ECHO, type ShapeLines } from "../shapeEdit";
import {
  parseCap,
  parseClearance,
  parseFacing,
  parseLigature,
  type CapInfo,
  type LigatureInfo,
  type Wall,
} from "../readouts";
import { renderEnded, renderStarted, report } from "../report";
import { reportDesign, type Values } from "../app/files";
import { QUALITY_FN, type CapView, type LigatureView, type Quality } from "../app/session";

// action: a button beside the text (a finished download that needs a click of its own).
export type Status = {
  text: string;
  short?: string;
  kind: "idle" | "busy" | "ok" | "error";
  action?: { label: string; run: () => void };
};

export interface RenderState {
  target: RenderTarget | null;
  values: Values;
  params: ScadParam[];
  quality: Quality;
  reportsOn: boolean; // the readouts are on screen
  zoom: boolean; // zoom to parameter is on
  lig: LigatureView; // what of the ligature is shown
  ligOK: boolean; // the file can make a ligature
  cap: CapView; // whether the cap is shown
  capOK: boolean; // the file can make a cap
  air: boolean; // the air space (negative space) is shown
}

interface Options {
  state: RefObject<RenderState>;
  setStatus: (s: Status) => void;
  setFocusData: (t: RenderTarget, vals: Values, data: Promise<FocusData | null>) => void;
  prefetchFocus: (t: RenderTarget, vals: Values) => void;
}

const SLOW_RENDER_S = 45; // reported to the site's log when a render takes longer
// The "Edit shape" lines ride along with the reports (no measurable cost).
const REPORTS_ECHO = "\nfacing_report();\nclearance_report();\n" + SHAPE_ECHO + AIR_ECHO;
const FACING_ECHO = "\nfacing_report();\n" + SHAPE_ECHO + AIR_ECHO;
// The reports' lines stay out of the console, and so do the WebAssembly build's harmless startup
// complaints (no locale files, no fontconfig file: the generator registers its fonts itself).
const NOISE = /^(Could not initialize localization|Fontconfig error: Cannot load default config file)/;
const withoutNoise = (log: string) =>
  log
    .split("\n")
    .filter((l) => !NOISE.test(l))
    .join("\n");
const withoutReports = (log: string) =>
  withoutNoise(log)
    .split("\n")
    .filter((l) => !/^ECHO: (PARAM_FOCUS|SHAPE_EDIT|AIR_SOLID|"(FACING|CLEARANCE))/.test(l))
    .join("\n");
// Settings that only the accessories read: changing them leaves the mouthpiece as it is (checked by
// rendering the alto with ligature_made, cap_made and several ligature_* / cap_* values changed: the
// mouthpiece STL was byte-identical).
const ACCESSORY_KEY = /^(ligature_|cap_)/;
// Mouthpiece-interior settings the ligature and cap don't read (checked by rendering ligature_seated
// and cap_seated with baffle_, chamber_, throat_ and floor_ settings changed: byte-identical).
export const INTERIOR_PREFIXES = ["baffle_", "chamber_", "throat_", "floor_"];
const withoutKeys = (vals: Values, drop: (k: string) => boolean) =>
  Object.fromEntries(Object.entries(vals).filter(([k]) => !drop(k)));
const targetSig = (t: RenderTarget) =>
  JSON.stringify([t.path, t.name, t.source, Object.entries(t.files).map(([k, v]) => [k, v.length, v])]);
// The other accessories' settings each part ignores (checked the same way: the ligature with cap_*
// changed, the reed with ligature_* and cap_* changed, byte-identical). The cap reads ligature_*.
const IGNORES: Record<string, RegExp> = {
  ligature_seated: /^cap_/,
  reed_model: ACCESSORY_KEY,
  air_model: ACCESSORY_KEY,
};
const partSignature = (t: RenderTarget, vals: Values, fn: number | null, part: string) =>
  JSON.stringify([
    targetSig(t),
    part,
    fn,
    withoutKeys(
      vals,
      (k) => (part !== "air_model" && INTERIOR_PREFIXES.some((p) => k.startsWith(p))) || !!IGNORES[part]?.test(k),
    ),
  ]);
const sameValues = (a: Values, b: Values) => {
  const ka = Object.keys(a);
  return (
    ka.length === Object.keys(b).length && ka.every((k) => k in b && JSON.stringify(a[k]) === JSON.stringify(b[k]))
  );
};
const shownIsCurrent = (last: { tsig: string; vals: Values } | null, t: RenderTarget, vals: Values) =>
  !!last && last.tsig === targetSig(t) && sameValues(last.vals, vals);
const withFn = (vals: Values, fn: number | null): Values => (fn === null ? vals : { ...vals, render_fn: fn });

function translateStlZ(stl: ArrayBuffer, dz: number): ArrayBuffer {
  const out = stl.slice(0);
  if (!dz) return out;
  const view = new DataView(out);
  if (out.byteLength < 84) throw new Error("the cap preview isn't a binary STL");
  const triangles = view.getUint32(80, true);
  if (84 + triangles * 50 > out.byteLength) throw new Error("the cap preview STL is incomplete");
  for (let i = 0; i < triangles; i++)
    for (let v = 0; v < 3; v++) {
      const at = 84 + i * 50 + 12 + v * 12 + 8;
      view.setFloat32(at, view.getFloat32(at, true) + dz, true);
    }
  return out;
}

export function useModelRender({ state, setStatus, setFocusData, prefetchFocus }: Options) {
  const [stl, setStl] = useState<ArrayBuffer | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [log, setLog] = useState("");
  const [facing, setFacing] = useState<[number, number][] | null>(null);
  const [wall, setWall] = useState<Wall | null>(null);
  const [shape, setShape] = useState<ShapeLines | null>(null);
  const [air, setAir] = useState<number | null>(null); // inside air volume of the last render
  const [ligStl, setLigStl] = useState<ArrayBuffer | null>(null);
  const [reedStl, setReedStl] = useState<ArrayBuffer | null>(null);
  // The negative space: made from the main render's echo of the interior rings (airEchoStl), else by a render of its own.
  const [airPartStl, setAirPartStl] = useState<ArrayBuffer | null>(null);
  const [airEchoStl, setAirEchoStl] = useState<ArrayBuffer | null>(null);
  const airEchoed = useRef(false);
  const [ligInfo, setLigInfo] = useState<LigatureInfo | null>(null);
  const [capStl, setCapStl] = useState<ArrayBuffer | null>(null);
  const [capInfo, setCapInfo] = useState<CapInfo | null>(null);
  const readyCapSig = useRef<string | null>(null);

  const renderAbort = useRef<AbortController | null>(null);
  const reportsAbort = useRef<AbortController | null>(null);
  const shownFn = useRef<number | null>(null); // render_fn of the model on screen (null: the file's own)
  // The model on screen has its readouts' reports (or they are on their way).
  const shownReports = useRef(false);
  // What the mouthpiece on screen was last rendered from, and whether a render of it is running.
  const lastMain = useRef<{ tsig: string; vals: Values } | null>(null);
  // The reports (summary, facing, wall) that came with the last main render, for the print kit's
  // check card: what they were made from, so a kit for other settings runs its own.
  const lastReports = useRef<{ tsig: string; vals: Values; fn: number | null; log: string } | null>(null);
  const mainBusy = useRef(false);

  // The render_fn the quality selector puts in, or null when the file has no render_fn parameter
  // or the user set it themselves.
  const qualityFn = useCallback(
    (q: Quality, vals: Values) =>
      state.current!.params.some((p) => p.name === "render_fn") && !("render_fn" in vals) ? QUALITY_FN[q] : null,
    [state],
  );

  const restart = (ref: React.MutableRefObject<AbortController | null>) => {
    ref.current?.abort();
    ref.current = new AbortController();
    return ref.current;
  };

  // Accessory renders (ligature, reed, cap) run on their own worker lane beside the mouthpiece's, each
  // with its own abort and a signature of what it was made from: asked again for the same thing it
  // does nothing (it's running, or done). A cleared signature (aborted, failed, new design) re-runs.
  const sigs = useRef<Record<string, string>>({});
  const aborts = useRef<Record<string, AbortController | null>>({});
  const [partsBusy, setPartsBusy] = useState<string[]>([]);
  const busyOf = (name: string, on: boolean) =>
    setPartsBusy((b) => (on ? (b.includes(name) ? b : [...b, name]) : b.filter((x) => x !== name)));
  // Stops the accessory renders still running (they re-run when asked again); finished ones keep
  // their signature, so a later pass for the same thing (e.g. after an interior change) skips them.
  const stopParts = () => {
    for (const [k, ac] of Object.entries(aborts.current)) {
      if (!ac) continue;
      ac.abort();
      delete sigs.current[k];
    }
    aborts.current = {};
    setPartsBusy([]);
  };
  const runPart = useCallback(
    async (
      name: string,
      part: string,
      t: RenderTarget,
      vals: Values,
      fn: number | null,
      apply: (r: RenderResult) => void,
    ) => {
      const sig = partSignature(t, vals, fn, part);
      if (sigs.current[name] === sig) return;
      sigs.current[name] = sig;
      aborts.current[name]?.abort();
      const ac = (aborts.current[name] = new AbortController());
      busyOf(name, true);
      try {
        const r = await api.render(t, withFn({ ...vals, part }, fn), ac.signal, "parts");
        if (ac.signal.aborted) return;
        if (!r.ok) delete sigs.current[name];
        apply(r);
      } catch {
        // superseded or failed: the last one stays
        if (!ac.signal.aborted) delete sigs.current[name];
      } finally {
        if (aborts.current[name] === ac) {
          aborts.current[name] = null; // done: nothing to stop
          busyOf(name, false);
        }
      }
    },
    [],
  );

  // The ligature for the model (seated, in the model's frame) and/or a reed: small renders (the band
  // and the reed are simple lofts), each only while shown.
  const loadLigature = useCallback(
    async (t: RenderTarget, vals: Values, fn: number | null) => {
      const { on, reed } = state.current!.lig;
      await Promise.all([
        on &&
          runPart("ligature", "ligature_seated", t, vals, fn, (r) => {
            setLigInfo(parseLigature(r.log));
            setLigStl(r.ok && r.stl ? base64ToBuffer(r.stl) : null);
          }),
        reed &&
          runPart("reed", "reed_model", t, vals, fn, (r) => setReedStl(r.ok && r.stl ? base64ToBuffer(r.stl) : null)),
      ]);
    },
    [state, runPart],
  );

  // The cap for the model, seated on it (the model's frame), only while shown.
  const loadCap = useCallback(
    (t: RenderTarget, vals: Values, fn: number | null) => {
      const sig = partSignature(t, vals, fn, "cap_seated");
      return runPart("cap", "cap_seated", t, vals, fn, (r) => {
        const info = parseCap(r.log);
        const mesh = r.ok && r.stl ? base64ToBuffer(r.stl) : null;
        setCapInfo(info);
        setCapStl(mesh);
        readyCapSig.current = mesh && info ? sig : null;
      });
    },
    [runPart],
  );

  // The accessories that are shown, for these values.
  // skipAir: the main render brings the air space (its echo), so it needs no render of its own.
  const loadParts = (t: RenderTarget, vals: Values, fn: number | null, skipAir = airEchoed.current) => {
    const s = state.current!;
    if ((s.lig.on || s.lig.reed) && s.ligOK) loadLigature(t, vals, fn);
    if (s.cap.on && s.capOK) loadCap(t, vals, fn);
    if (s.air && s.ligOK && !skipAir)
      runPart("air", "air_model", t, vals, fn, (r) => setAirPartStl(r.ok && r.stl ? base64ToBuffer(r.stl) : null));
  };

  // The air space from a render's echo of the interior rings.
  const takeAirEcho = useCallback((log: string) => {
    const rings = parseAirEcho(log);
    airEchoed.current = !!rings;
    setAirEchoStl(rings ? buildAirStl(rings) : null);
  }, []);

  // The readouts' reports on their own (facing curve, thinnest wall), for when the readouts come
  // into view after a render made without them: one echo run.
  const loadReports = useCallback(
    async (t: RenderTarget, vals: Values) => {
      const ac = restart(reportsAbort);
      shownReports.current = true;
      setWall(null); // "…" while the new model's wall is measured (not the last model's number)
      try {
        // the zoom targets ride along (param_focus() doesn't depend on part): no extra run
        const zoomToo = state.current!.zoom;
        const fp = api.echo(
          { ...t, source: t.source + FACING_ECHO + (zoomToo ? FOCUS_ECHO : "") },
          { ...vals, part: "clearance_report" },
          ac.signal,
        );
        if (zoomToo)
          setFocusData(
            t,
            vals,
            fp.then((r) => parseFocusEcho(r.log)).catch(() => null),
          );
        const f = await fp;
        if (ac.signal.aborted) return;
        setFacing(parseFacing(f.log));
        setWall(parseClearance(f.log));
        setShape(parseShapeEcho(f.log, vals));
        takeAirEcho(f.log);
        lastReports.current = { tsig: targetSig(t), vals, fn: null, log: f.log };
      } catch {
        // superseded or failed: the cards keep their last values
      }
    },
    [state, setFocusData, takeAirEcho],
  );

  const renderPass = useCallback(
    async () => {
      const s = state.current!;
      const { target: t, values: vals, quality: q } = s;
      if (!t) return;
      const ac = restart(renderAbort);
      mainBusy.current = true;
      lastMain.current = null;
      lastReports.current = null;
      const fn = qualityFn(q, vals);
      // The accessories start with the render, on their own lane (not behind it).
      if (s.ligOK || s.capOK) loadParts(t, vals, fn, s.reportsOn);
      setStatus({ text: `Rendering ${t.name}…`, short: "Rendering…", kind: "busy" });
      renderStarted(reportDesign(t.path));
      // Time spent in the background doesn't count (a phone pauses the page while another app is
      // up, and the timer fires on return); a slow render also reports how long it took in the end.
      const began = performance.now();
      let wasHidden = document.hidden;
      let wasSlow = false;
      const onVisibility = () => {
        if (document.hidden) wasHidden = true;
      };
      document.addEventListener("visibilitychange", onVisibility);
      const slow = window.setTimeout(() => {
        if (wasHidden || document.hidden) return;
        wasSlow = true;
        report("slow-render", `a render is still running after ${SLOW_RENDER_S}s`);
      }, SLOW_RENDER_S * 1000);
      const withReports = s.reportsOn;
      const focusToo = withReports && s.zoom;
      const source = withReports ? t.source + REPORTS_ECHO + (focusToo ? FOCUS_ECHO : "") : t.source;
      try {
        const run = api.render(source === t.source ? t : { ...t, source }, withFn(vals, fn), ac.signal).finally(() => {
          clearTimeout(slow);
          document.removeEventListener("visibilitychange", onVisibility);
          renderEnded();
          if (wasSlow)
            report(
              "slow-render",
              `the slow render ${ac.signal.aborted ? "was cancelled" : "finished"} after ` +
                `${Math.round((performance.now() - began) / 1000)}s${wasHidden ? " (page hidden meanwhile)" : ""}`,
            );
        });
        if (focusToo)
          setFocusData(
            t,
            vals,
            run.then((r) => (r.ok ? parseFocusEcho(r.log) : null)).catch(() => null),
          );
        const r = await run;
        if (ac.signal.aborted) return;
        setLog(withReports ? withoutReports(r.log) : withoutNoise(r.log));
        if (withReports && r.ok) {
          reportsAbort.current?.abort(); // an older separate run must not overwrite these
          setFacing(parseFacing(r.log));
          setWall(parseClearance(r.log));
          setShape(parseShapeEcho(r.log, vals));
          takeAirEcho(r.log);
        }
        const airCm3 = r.ok ? parseAirVolume(r.log) : null;
        setAir(airCm3);
        const secs = `${(r.ms / 1000).toFixed(2)}s`;
        if (!r.ok) {
          setStatus({
            text: `${t.name}: error (${secs}) — see console`,
            short:
              "This design didn't render (the model shown is the last one that did). Show the code editor (More ▾) to see why in its console.",
            kind: "error",
          });
        } else if (r.kind === "3d" && r.stl) {
          const buf = base64ToBuffer(r.stl);
          const tris = buf.byteLength >= 84 ? new DataView(buf).getUint32(80, true) : 0;
          setStl(buf);
          setSvg(null);
          shownFn.current = fn;
          shownReports.current = withReports;
          const airText = airCm3 !== null ? ` · air ${airCm3.toFixed(1)} cm³` : "";
          const label = fn === null ? "" : ` · ${q}`;
          setStatus({
            text: `${t.name} · 3D · ${tris.toLocaleString()} triangles${airText} · ${secs}${label}`,
            short: `Ready · ${secs}`,
            kind: "ok",
          });
          lastMain.current = { tsig: targetSig(t), vals };
          if (withReports) lastReports.current = { tsig: targetSig(t), vals, fn, log: r.log };
          if (!withReports && s.zoom) prefetchFocus(t, vals);
        } else if (r.kind === "2d" && r.svg) {
          setSvg(r.svg);
          setStl(null);
          setStatus({ text: `${t.name} · 2D · ${secs}`, kind: "ok" });
        } else {
          setStl(null);
          setSvg(null);
          // say why, so an emptied buffer or a report-only setting isn't a mystery
          const changed = Object.entries(vals).map(([k, v]) => `${k} = ${JSON.stringify(v)}`);
          const why = !t.source.trim()
            ? "the file's text is empty (Revert reloads it)"
            : changed.length
              ? `empty top-level object — changed values: ${changed.slice(0, 3).join(", ")}${changed.length > 3 ? " …" : ""}`
              : "empty top-level object";
          setStatus({ text: `${t.name}: nothing to show: ${why} · ${secs}`, kind: "error" });
        }
      } catch (err) {
        if (ac.signal.aborted) return;
        setStatus({ text: `OpenSCAD error: ${(err as Error).message}`, kind: "error" });
      } finally {
        if (renderAbort.current === ac) mainBusy.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadParts only uses refs and state setters
    [state, qualityFn, setStatus, setFocusData, prefetchFocus],
  );

  // A change: a render. When only accessory settings changed since the
  // mouthpiece on screen was rendered, the mouthpiece stays and just the accessories re-run.
  const render = useCallback(() => {
    const s = state.current!;
    const last = lastMain.current;
    if (last && s.target && !mainBusy.current && last.tsig === targetSig(s.target)) {
      const keys = new Set([...Object.keys(last.vals), ...Object.keys(s.values)]);
      const part = (v: Values) => v.part ?? "mouthpiece";
      const same =
        part(last.vals) === "mouthpiece" &&
        part(s.values) === "mouthpiece" &&
        [...keys].every(
          (k) => ACCESSORY_KEY.test(k) || k === "part" || JSON.stringify(last.vals[k]) === JSON.stringify(s.values[k]),
        );
      if (same) {
        loadParts(s.target, s.values, shownFn.current);
        return;
      }
    }
    return renderPass();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadParts only uses refs and state setters
  }, [state, renderPass]);

  // The model on screen (part null) or another part, for a download: at the chosen quality, Normal
  // at least; the model on screen when it already is that. extra: settings on top
  // (the print kit's test rings at other clearances).
  const partStl = useCallback(
    async (part: string | null, extra?: Values, lane?: Lane): Promise<ArrayBuffer> => {
      const { target: t, values: vals, quality: q } = state.current!;
      if (!t) throw new Error("no model yet");
      const fn = qualityFn(q === "draft" ? "normal" : q, vals);
      // the model on screen only when it was rendered from exactly these settings (a newer render may be pending)
      if (
        !part &&
        !extra &&
        stl &&
        (fn === null || fn === shownFn.current) &&
        shownIsCurrent(lastMain.current, t, vals)
      )
        return stl;
      const r = await api.render(t, withFn({ ...vals, ...extra, ...(part ? { part } : {}) }, fn), undefined, lane);
      if (!r.ok || !r.stl) throw new Error("the render failed (the console says why)");
      return base64ToBuffer(r.stl);
    },
    [state, qualityFn, stl],
  );

  // Several parts for a download at once, on up to three workers of their own (fewer on a phone or
  // a machine with few cores: each worker holds a whole OpenSCAD). Results come back in order.
  const partStls = useCallback(
    async (jobs: [string | null, Values?][]): Promise<ArrayBuffer[]> => {
      const phone = window.matchMedia?.("(pointer: coarse)").matches;
      const n = Math.max(1, Math.min(3, phone ? 1 : (navigator.hardwareConcurrency || 2) - 1, jobs.length));
      const lanes: Lane[] = ["kit0", "kit1", "kit2"];
      const out: ArrayBuffer[] = new Array(jobs.length);
      let next = 0;
      await Promise.all(
        lanes.slice(0, n).map(async (lane) => {
          while (next < jobs.length) {
            const i = next++;
            out[i] = await partStl(jobs[i][0], jobs[i][1], lane);
          }
        }),
      );
      return out;
    },
    [partStl],
  );

  // The cap preview is the same shell as the printable cap, still at its seated z position.
  // Reusing it avoids a second expensive render after the user's click; shift the rim to z=0 just
  // as part="cap" does when print_orientation is on.
  const capPrintStl = useCallback((): ArrayBuffer | null => {
    const s = state.current!;
    const t = s.target;
    if (!t || !capStl || !capInfo) return null;
    const previewFn = qualityFn(s.quality, s.values);
    const exportFn = qualityFn(s.quality === "draft" ? "normal" : s.quality, s.values);
    if (previewFn !== exportFn || readyCapSig.current !== partSignature(t, s.values, previewFn, "cap_seated"))
      return null;
    const orient = s.values.print_orientation ?? s.params.find((p) => p.name === "print_orientation")?.initial ?? true;
    return translateStlZ(capStl, orient ? -capInfo.rearZ : 0);
  }, [state, qualityFn, capStl, capInfo]);

  // The numbers for the print kit's check card, fresh for the settings now: one echo-only run
  // (the summary, the facing and the thinnest wall).
  const kitReports = useCallback(async () => {
    const { target: t, values: vals, params } = state.current!;
    if (!t) throw new Error("no model yet");
    // The main render already carried these reports when it was made from the same settings at the
    // file's own resolution (the echo below runs without a render_fn of its own).
    const have = lastReports.current;
    if (
      have &&
      have.tsig === targetSig(t) &&
      sameValues(have.vals, vals) &&
      (have.fn === null || have.fn === (params.find((p) => p.name === "render_fn")?.initial ?? null))
    )
      return { log: have.log, facing: parseFacing(have.log), wall: parseClearance(have.log) };
    const r = await api.echo(
      { ...t, source: t.source + "\nfacing_report();\n" },
      { ...vals, part: "clearance_report" },
    );
    return { log: r.log, facing: parseFacing(r.log), wall: parseClearance(r.log) };
  }, [state]);

  // The readouts are showing but the model on screen came without their reports (it was rendered
  // before they showed, e.g. before the file's parameters had loaded at startup): fetch them.
  const ensureReports = useCallback(() => {
    const s = state.current!;
    if (s.reportsOn && s.target && !shownReports.current) loadReports(s.target, s.values);
  }, [state, loadReports]);

  // The accessories shown but not made for the model on screen (they were turned on, or the model was
  // rendered before the file's parameters said it has them, as after a reload): make them. Asked
  // again for the same thing it does nothing (runPart's signatures).
  const ensureParts = useCallback(() => {
    const s = state.current!;
    if (s.target && !mainBusy.current && (s.ligOK || s.capOK)) loadParts(s.target, s.values, shownFn.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadParts only uses refs and state setters
  }, [state]);

  // A model shown without rendering it (B swapped in as A).
  const showModel = (buf: ArrayBuffer | null) => {
    setStl(buf);
    setSvg(null);
  };
  const clearLigature = () => {
    stopParts();
    sigs.current = {};
    setLigStl(null);
    setReedStl(null);
    setAirPartStl(null);
    setAirEchoStl(null);
    airEchoed.current = false;
    setLigInfo(null);
    setCapStl(null);
    setCapInfo(null);
    stopParts();
  };

  return {
    stl,
    svg,
    log,
    setLog,
    facing,
    wall,
    shape,
    air,
    ligStl,
    reedStl,
    airStl: airEchoStl ?? airPartStl,
    ligInfo,
    capStl,
    capInfo,
    partsBusy,
    loadCap,
    shownFn,
    render,
    renderPass,
    loadLigature,
    ensureReports,
    ensureParts,
    partStl,
    partStls,
    capPrintStl,
    kitReports,
    showModel,
    clearLigature,
  };
}
