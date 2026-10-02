// Page-side handle on the OpenSCAD workers. Two lanes, each one worker running one job at a time
// in order: "render" for geometry (seconds), "quick" for parameter lists, echo readouts and
// picture measurements (well under a second), so the Customizer, zoom-to-parameter and the Curves
// panel don't wait behind a render. Aborting a job terminates its worker (the only way to stop a
// running OpenSCAD) and the lane's next job starts a fresh one, like the local server killing its
// OpenSCAD process.
import type { WasmJob, WasmResult } from "./types";

export type Lane = "render" | "quick";
type Pending = { job: WasmJob; resolve(r: WasmResult): void; reject(e: unknown): void; signal?: AbortSignal };
interface LaneState {
  worker: Worker | null;
  running: Pending | null;
  queue: Pending[];
}

const BASE = new URL(import.meta.env.BASE_URL, location.href).href;
const lanes: Record<Lane, LaneState> = {
  render: { worker: null, running: null, queue: [] },
  quick: { worker: null, running: null, queue: [] },
};
let nextId = 1;

function getWorker(l: LaneState) {
  if (!l.worker) {
    const w = new Worker(new URL("./openscad.worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (e: MessageEvent<WasmResult>) => {
      const p = l.running;
      l.running = null;
      if (p && p.job.id === e.data.id) p.resolve(e.data);
      pump(l);
    };
    w.onerror = (e) => {
      const p = l.running;
      l.running = null;
      w.terminate();
      l.worker = null;
      p?.reject(new Error(`OpenSCAD worker failed: ${e.message}`));
      pump(l);
    };
    l.worker = w;
  }
  return l.worker;
}

function pump(l: LaneState) {
  while (!l.running && l.queue.length) {
    const p = l.queue.shift()!;
    if (p.signal?.aborted) {
      p.reject(new DOMException("Aborted", "AbortError"));
      continue;
    }
    l.running = p;
    getWorker(l).postMessage(p.job);
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
