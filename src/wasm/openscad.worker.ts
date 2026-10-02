// Runs OpenSCAD's WebAssembly build (public/openscad/, fetched by scripts/fetch_openscad_wasm.mjs)
// off the main thread. Each job gets a fresh OpenSCAD instance — its main() can only run once —
// but the 11 MB wasm is compiled once per worker and reused. A job lays its files into the
// instance's in-memory filesystem, runs OpenSCAD with the given arguments and returns the log
// and the output files it asked for.
import type { WasmJob, WasmResult } from "./types";

type Factory = (opts: Record<string, unknown>) => Promise<{
  FS: {
    mkdirTree(p: string): void;
    writeFile(p: string, data: string | Uint8Array): void;
    readFile(p: string): Uint8Array;
    chdir(p: string): void;
  };
  callMain(args: string[]): number;
}>;

let ready: Promise<{ factory: Factory; module: WebAssembly.Module }> | null = null;

function load(base: string) {
  ready ??= (async () => {
    const [mod, module] = await Promise.all([
      import(/* @vite-ignore */ `${base}openscad/openscad.js`) as Promise<{ default: Factory }>,
      WebAssembly.compileStreaming(fetch(`${base}openscad/openscad.wasm`)),
    ]);
    return { factory: mod.default, module };
  })();
  return ready;
}

self.onmessage = async (e: MessageEvent<WasmJob>) => {
  const job = e.data;
  const log: string[] = [];
  try {
    const { factory, module } = await load(job.base);
    const inst = await factory({
      noInitialRun: true,
      print: (s: string) => log.push(s),
      printErr: (s: string) => log.push(s),
      instantiateWasm: (imports: WebAssembly.Imports, done: (i: WebAssembly.Instance) => void) => {
        WebAssembly.instantiate(module, imports).then(done);
        return {};
      },
    });
    for (const [p, data] of Object.entries(job.files)) {
      inst.FS.mkdirTree(p.slice(0, p.lastIndexOf("/")) || "/");
      inst.FS.writeFile(p, data);
    }
    inst.FS.mkdirTree(job.cwd);
    inst.FS.chdir(job.cwd);
    let code: number;
    try {
      code = inst.callMain(job.args);
    } catch (err) {
      // exit() and aborts surface as exceptions; a numeric one is an uncaught C++ exception
      code = typeof (err as { status?: number }).status === "number" ? (err as { status: number }).status : 1;
      if (typeof (err as { status?: number }).status !== "number")
        log.push(`ERROR: OpenSCAD stopped unexpectedly (${String(err)})`);
    }
    const outputs: Record<string, Uint8Array | null> = {};
    for (const p of job.outputs) {
      try {
        outputs[p] = inst.FS.readFile(p);
      } catch {
        outputs[p] = null;
      }
    }
    const result: WasmResult = { id: job.id, code, log: log.join("\n"), outputs };
    (self as unknown as Worker).postMessage(
      result,
      Object.values(outputs)
        .filter((o): o is Uint8Array => !!o)
        .map((o) => o.buffer),
    );
  } catch (err) {
    const result: WasmResult = {
      id: job.id,
      code: -1,
      log: [...log, `ERROR: could not run OpenSCAD in the browser: ${String(err)}`].join("\n"),
      outputs: {},
    };
    (self as unknown as Worker).postMessage(result);
  }
};
