// The app's API. There is no server: OpenSCAD runs in this browser (WebAssembly, in a
// worker), the project comes from the site's project/ folder, and the user's own files and
// pictures stay in this browser (browserApi.ts, userArt.ts).
import { browserApi } from "./browserApi";

export type ParamValue = number | string | boolean | number[] | number[][];

// One Customizer parameter, exactly as OpenSCAD's .param export describes it.
export interface ScadParam {
  name: string;
  caption?: string;
  group: string;
  type: "number" | "string" | "boolean";
  initial: ParamValue;
  min?: number;
  max?: number;
  step?: number;
  options?: { name: string; value: number | string }[];
}

export interface RenderResult {
  ok: boolean;
  kind?: "3d" | "2d" | "empty";
  stl?: string; // base64 binary STL
  svg?: string;
  log: string;
  ms: number;
}

// What to render: the main file (a project path, or just a name for a file from the computer)
// and its text, plus the unsaved text of other project files it may include.
export interface RenderTarget {
  path: string | null;
  name: string;
  source: string;
  files: Record<string, string>;
}

export interface Api {
  health(): Promise<{ ok: boolean; backend: string; openscadPath: string }>;
  // readOnly: the presets (not even edited); own: the user's saved files (the only ones Save writes)
  files(): Promise<{ files: string[]; readOnly?: string[]; own?: string[] }>;
  file(path: string): Promise<{ source: string; readOnly?: boolean }>;
  save(path: string, source: string): Promise<{ ok: boolean }>;
  remove(path: string): Promise<{ ok: boolean }>; // one of the user's saved files
  params(t: RenderTarget, signal?: AbortSignal): Promise<{ parameters: ScadParam[]; log: string }>;
  render(
    t: RenderTarget,
    values: Record<string, ParamValue>,
    signal?: AbortSignal,
    lane?: "render" | "parts",
  ): Promise<RenderResult>;
  // Evaluate without geometry; the log holds the ECHO lines.
  echo(
    t: RenderTarget,
    values: Record<string, ParamValue>,
    signal?: AbortSignal,
  ): Promise<{ ok: boolean; log: string }>;
  // Pictures for *_image parameters: the project's examples (art/) plus the user's own.
  art(): Promise<{ files: string[]; aspect: Record<string, number | null> }>;
  uploadArt(name: string, svg: string): Promise<{ ok: boolean; name: string; aspect: number | null }>;
  artUrl(name: string, stamp?: number): string;
}

export const api: Api = browserApi;

export function base64ToBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}
