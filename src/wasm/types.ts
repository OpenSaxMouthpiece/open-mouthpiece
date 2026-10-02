// Messages between the page and the OpenSCAD worker (openscad.worker.ts).
export interface WasmJob {
  id: number;
  base: string; // site base URL, where openscad/ lives
  files: Record<string, string | Uint8Array>; // absolute paths in the worker's filesystem
  cwd: string; // OpenSCAD names files in its messages relative to this
  args: string[]; // OpenSCAD command line
  outputs: string[]; // files to send back after the run
}

export interface WasmResult {
  id: number;
  code: number;
  log: string;
  outputs: Record<string, Uint8Array | null>;
}
