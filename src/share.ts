// Share links: a design's file and changed parameter values in the URL (#d=...), deflated and
// base64url-encoded. A preset only needs its path and the changed values; a user's own file also
// carries its text, since it exists only in their browser (or on their computer). The user's own
// pictures go along only when they ask (art: {name: svg text}); otherwise they are left out.
import type { ParamValue } from "./api";
import { migratePath, migrateScad, migrateValues } from "./migrate";

export interface SharedDesign {
  v: 1;
  file: string; // project path (e.g. "alto.scad") or a file name
  values: Record<string, ParamValue>;
  source?: string; // the file's text, when it isn't a preset
  art?: Record<string, string>; // the user's own pictures, when they chose to include them
}

const KEY = "d=";

async function pipe(
  data: Uint8Array<ArrayBuffer>,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array<ArrayBuffer>> {
  const out = new Blob([data]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function encodeShare(d: Omit<SharedDesign, "v">): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify({ v: 1, ...d }));
  const packed = await pipe(json, new CompressionStream("deflate-raw"));
  const url = new URL(location.href);
  url.hash = KEY + toBase64Url(packed);
  return url.href;
}

// The design in this page's URL, if any (throws on a damaged link).
export async function readShare(): Promise<SharedDesign | null> {
  const h = location.hash.replace(/^#/, "");
  if (!h.startsWith(KEY)) return null;
  const json = await pipe(fromBase64Url(h.slice(KEY.length)), new DecompressionStream("deflate-raw"));
  const d = JSON.parse(new TextDecoder().decode(json)) as SharedDesign;
  if (d?.v !== 1 || typeof d.file !== "string" || typeof d.values !== "object" || d.values === null)
    throw new Error("not a design link");
  // links made before the parameter renames (migrate.ts)
  return {
    ...d,
    file: migratePath(d.file),
    values: migrateValues(d.values),
    source: d.source === undefined ? undefined : migrateScad(d.source),
  };
}

// Drop the design from the address bar once loaded, so later edits don't disagree with it.
export function clearShare() {
  history.replaceState(null, "", location.pathname + location.search);
}
