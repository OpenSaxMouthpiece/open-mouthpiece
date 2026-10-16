// Page-side handle on the OpenSCAD workers. Three lanes, each one worker running one job at a time
// in order: "render" for geometry (seconds), "parts" for the ligature, reed and cap beside it, "quick" for parameter lists, echo readouts and
// picture measurements (well under a second), so the Customizer, zoom-to-parameter and the Curves
// panel don't wait behind a render. Aborting a job terminates its worker (the only way to stop a
// running OpenSCAD) and the lane's next job starts a fresh one, like the local server killing its
// OpenSCAD process.
import type { WasmJob, WasmResult } from "./types";
// Inlined into the page's bundle: a fresh worker (after an abort) needs no file from the server, so a
// deploy that replaces the hashed assets can't break a page that is already open.
import OpenscadWorker from "./openscad.worker.ts?worker&inline";

// kit0..kit2: extra workers for the print kit's files, so they are made side by side
export type Lane = "render" | "quick" | "parts" | "kit0" | "kit1" | "kit2";
type Pending = {
  job: WasmJob;
  resolve(r: WasmResult): void;
  reject(e: unknown): void;
  signal?: AbortSignal;
  retried?: boolean;
};
interface LaneState {
  worker: Worker | null;
  running: Pending | null;
  queue: Pending[];
  done: number; // jobs this lane's current worker has answered (0 = it died before doing any work)
}

const BASE = new URL(import.meta.env.BASE_URL, location.href).href;
const lanes: Record<Lane, LaneState> = {
  render: { worker: null, running: null, queue: [], done: 0 },
  quick: { worker: null, running: null, queue: [], done: 0 },
  parts: { worker: null, running: null, queue: [], done: 0 },
  kit0: { worker: null, running: null, queue: [], done: 0 },
  kit1: { worker: null, running: null, queue: [], done: 0 },
  kit2: { worker: null, running: null, queue: [], done: 0 },
};
let nextId = 1;

function getWorker(l: LaneState) {
  if (!l.worker) {
    const w = new OpenscadWorker();
    w.onmessage = (e: MessageEvent<WasmResult>) => {
      const p = l.running;
      l.running = null;
      l.done++;
      if (p && p.job.id === e.data.id) p.resolve(e.data);
      pump(l);
    };
    w.onerror = (e) => {
      const p = l.running;
      l.running = null;
      w.terminate();
      l.worker = null;
      const done = l.done;
      l.done = 0;
      // One automatic retry on a fresh worker: most of these deaths are one-off (a dropped load).
      if (p && !p.retried && !p.signal?.aborted) {
        p.retried = true;
        l.queue.unshift(p);
      } else {
        // e.message is empty when the worker never started (script blocked or failed to load)
        const where = e.filename ? ` @ ${e.filename.slice(-40)}:${e.lineno}` : "";
        p?.reject(
          new Error(`OpenSCAD worker failed: ${e.message || "no message"}${where} (${done} jobs done, retried)`),
        );
      }
      pump(l);
    };
    l.worker = w;
  }
  return l.worker;
}

// The 11 MB wasm is fetched and compiled once here and handed to every worker, so a lane's fresh
// worker (after an abort) starts without fetching or compiling it again. A failed fetch isn't kept
// (the next job tries again); that job runs with the worker's own load.
let compiled: Promise<WebAssembly.Module | undefined> | null = null;
function sharedModule() {
  compiled ??= WebAssembly.compileStreaming(fetch(`${BASE}openscad/openscad.wasm`)).catch(() => {
    compiled = null;
    return undefined;
  });
  return compiled;
}

function pump(l: LaneState) {
  while (!l.running && l.queue.length) {
    const p = l.queue.shift()!;
    if (p.signal?.aborted) {
      p.reject(new DOMException("Aborted", "AbortError"));
      continue;
    }
    l.running = p;
    void sharedModule().then((module) => {
      // aborted while the module was loading: the abort handler has already settled the job
      if (l.running !== p) return;
      getWorker(l).postMessage(module ? { ...p.job, module } : p.job);
    });
  }
}

export function runOpenscad(
  job: Omit<WasmJob, "id" | "base">,
  signal?: AbortSignal,
  lane: Lane = "render",
): Promise<WasmResult> {
  const l = lanes[lane];
  return new Promise((resolve, reject) => {
    const p: Pending = { job: { ...job, id: nextId++, base: BASE }, resolve, reject, signal };
    signal?.addEventListener(
      "abort",
      () => {
        const i = l.queue.indexOf(p);
        if (i >= 0) l.queue.splice(i, 1);
        if (l.running === p) {
          l.worker?.terminate();
          l.worker = null;
          l.running = null;
          pump(l);
        }
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
    l.queue.push(p);
    pump(l);
  });
}
