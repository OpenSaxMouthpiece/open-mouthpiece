// The app's API (see api.ts), all in the browser: OpenSCAD runs as WebAssembly in a worker
// (wasm/), the project files come from the site (project/: public/project/ from
// scripts/build_static_project.mjs, or scad/ itself under `npm run dev`), and what the user saves
// or uploads is kept in this browser's localStorage (pictures: userArt.ts). Nothing is saved
// anywhere else. The presets are read-only, renders fall back to SVG for 2D results, log paths are
// project-relative.
import type { Api, ParamValue, RenderResult, RenderTarget, ScadParam } from "./api";
import { migrateScad } from "./migrate";
import { scadLiteral } from "./scadText";
import { runOpenscad } from "./wasm/runner";
import { checkArt, NO_SHAPES, saveUserArt, userArtAspect, userArtFiles, userArtNames, userArtUrl } from "./userArt";

const BASE = import.meta.env.BASE_URL;
const ROOT = "/scad"; // the project's scad/ folder inside OpenSCAD's filesystem
const STORE_KEY = "open-mouthpiece-files-v1";

interface Manifest {
  files: string[];
  readOnly: string[];
  aspect?: Record<string, number | null>;
}
interface Stored {
  text: string;
}

// ---- project files (from the site) and the user's files (localStorage) ------------------------

let manifest: Promise<Manifest> | null = null;
const getManifest = () =>
  (manifest ??= fetch(`${BASE}project/manifest.json`, { cache: "no-cache" }).then((r) => {
    if (!r.ok) throw new Error(`project manifest: ${r.status}`);
    return r.json() as Promise<Manifest>;
  }));

const projectData = new Map<string, Promise<Uint8Array>>();
function projectFile(rel: string): Promise<Uint8Array> {
  let p = projectData.get(rel);
  if (!p) {
    p = fetch(`${BASE}project/${rel}`).then(async (r) => {
      if (!r.ok) throw new Error(`${rel}: ${r.status}`);
      return new Uint8Array(await r.arrayBuffer());
    });
    projectData.set(rel, p);
    p.catch(() => projectData.delete(rel));
  }
  return p;
}

function loadStore(): Record<string, Stored> {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}") as Record<string, Stored>;
    // files saved before the parameter renames (migrate.ts); rewritten on their next save
    for (const f of Object.values(s)) if (f && typeof f.text === "string") f.text = migrateScad(f.text);
    return s;
  } catch {
    return {};
  }
}
// The user's files; a stored copy of a project file (from an older version) is ignored, so the
// project on the site always wins.
async function ownFiles(): Promise<Record<string, Stored>> {
  const m = await getManifest();
  return Object.fromEntries(Object.entries(loadStore()).filter(([p]) => !m.files.includes(p)));
}
function saveStore(s: Record<string, Stored>) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {
    throw new Error(
      "This browser's storage is full or blocked, so the file can't be saved here. Use Download to keep a copy.",
    );
  }
}

const decoder = new TextDecoder();

// Every file OpenSCAD may need: the project, the user's saved files over it, then unsaved buffers.
async function workspace(t: RenderTarget) {
  const m = await getManifest();
  const files: Record<string, string | Uint8Array> = {};
  await Promise.all(
    m.files.map(async (rel) => {
      files[`${ROOT}/${rel}`] = await projectFile(rel);
    }),
  );
  for (const [rel, s] of Object.entries(await ownFiles())) files[`${ROOT}/${rel}`] = s.text;
  for (const [rel, text] of Object.entries(userArtFiles())) files[`${ROOT}/${rel}`] = text;
  for (const [rel, text] of Object.entries(t.files ?? {})) if (safeRel(rel)) files[`${ROOT}/${rel}`] = text;
  let mainRel = t.path && safeRel(t.path) ? t.path : null;
  const display = mainRel ?? (t.name || "untitled.scad");
  if (!mainRel) {
    mainRel = "__local__" + display.replace(/[^\w.-]/g, "_");
    if (!mainRel.endsWith(".scad")) mainRel += ".scad";
  }
  // A self-contained file (Download .scad) can't register the lettering fonts, and a font this
  // OpenSCAD can't find crashes it: register the project's fonts after its text (use<> works
  // anywhere in a file; at the end the line numbers in messages stay right).
  const source = t.source ?? "";
  const fonts =
    /^\s*include\s*</m.test(source) || /\.ttf>/.test(source)
      ? []
      : m.files.filter((f) => /\.(ttf|otf)$/i.test(f)).map((f) => `use <${ROOT}/${f}>`);
  files[`${ROOT}/${mainRel}`] = fonts.length ? `${source}\n${fonts.join("\n")}\n` : source;
  const clean = (log: string) => log.split(`${ROOT}/`).join("").split(mainRel!).join(display);
  return { files, main: `${ROOT}/${mainRel}`, clean };
}

const safeRel = (rel: string) => /^[\w.-]+(\/[\w.-]+)*$/.test(rel) && !rel.split("/").includes("..");

// ---- OpenSCAD runs -----------------------------------------------------------------------------

const defineArgs = (values: Record<string, ParamValue> = {}) =>
  Object.entries(values)
    .filter(([n]) => /^[A-Za-z_$][A-Za-z0-9_]*$/.test(n))
    .flatMap(([n, v]) => ["-D", `${n}=${scadLiteral(v)}`]);

function toBase64(bytes: Uint8Array) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

const BACKEND = ["--backend=manifold"];

// Height / width of a drawing as OpenSCAD imports it (the viewBox of its own SVG export).
async function measureArt(svg: string): Promise<number | null> {
  const r = await runOpenscad(
    {
      files: { "/tmp/art.svg": svg, "/tmp/m.scad": 'import("/tmp/art.svg", center = true);\n' },
      cwd: "/tmp",
      args: ["-o", "/tmp/m_out.svg", "/tmp/m.scad"],
      outputs: ["/tmp/m_out.svg"],
    },
    undefined,
    "quick",
  );
  const out = r.outputs["/tmp/m_out.svg"];
  const box = out && /viewBox="([-\d.e ]+)"/.exec(decoder.decode(out));
  const [, , w, h] = box ? box[1].trim().split(/\s+/).map(Number) : [];
  return w > 0 && h > 0 ? Math.round((h / w) * 1000) / 1000 : null;
}
const artAspects = new Map<string, Promise<number | null>>();

export const browserApi: Api = {
  health: async () => ({ ok: true, backend: "WebAssembly (in this browser)", openscadPath: "browser" }),

  files: async () => {
    const m = await getManifest();
    const own = Object.keys(await ownFiles())
      .filter((p) => p.endsWith(".scad"))
      .sort();
    return {
      files: [...new Set([...m.files.filter((f) => f.endsWith(".scad")), ...own])].sort(),
      readOnly: m.readOnly,
      own,
    };
  },

  file: async (path: string) => {
    const m = await getManifest();
    const own = (await ownFiles())[path];
    if (own) return { source: own.text, readOnly: false };
    if (!m.files.includes(path)) throw new Error("not found");
    return { source: decoder.decode(await projectFile(path)), readOnly: m.readOnly.includes(path) };
  },

  save: async (path: string, source: string) => {
    const m = await getManifest();
    if (!safeRel(path) || !path.endsWith(".scad"))
      throw new Error("need a .scad path like my_alto.scad or folder/name.scad");
    if (m.files.includes(path)) throw new Error(`${path} is part of the project: use "Save as…" to make your own copy`);
    const s = loadStore();
    s[path] = { text: source };
    saveStore(s);
    return { ok: true };
  },

  remove: async (path: string) => {
    const s = loadStore();
    if (!(path in s)) throw new Error(`${path} isn't one of your saved files`);
    delete s[path];
    saveStore(s);
    return { ok: true };
  },

  params: async (t: RenderTarget, signal?: AbortSignal) => {
    const w = await workspace(t);
    const r = await runOpenscad(
      { files: w.files, cwd: ROOT, args: ["-o", "/tmp/out.param", w.main], outputs: ["/tmp/out.param"] },
      signal,
      "quick",
    );
    const out = r.outputs["/tmp/out.param"];
    let parameters: ScadParam[] = [];
    try {
      parameters = out ? (JSON.parse(decoder.decode(out)).parameters ?? []) : [];
    } catch {
      /* no parameters */
    }
    return { parameters, log: w.clean(r.log) };
  },

  render: async (t: RenderTarget, values: Record<string, ParamValue>, signal?: AbortSignal): Promise<RenderResult> => {
    const t0 = performance.now();
    const w = await workspace(t);
    const defs = defineArgs(values);
    const r3 = await runOpenscad(
      {
        files: w.files,
        cwd: ROOT,
        args: [...BACKEND, "--export-format=binstl", "-o", "/tmp/out.stl", ...defs, w.main],
        outputs: ["/tmp/out.stl"],
      },
      signal,
    );
    const ms = () => Math.round(performance.now() - t0);
    const stl = r3.outputs["/tmp/out.stl"];
    if (r3.code === 0 && stl && stl.length > 84)
      return { ok: true, kind: "3d", stl: toBase64(stl), log: w.clean(r3.log), ms: ms() };
    if (/not a 3D object/i.test(r3.log)) {
      const r2 = await runOpenscad(
        {
          files: w.files,
          cwd: ROOT,
          args: [...BACKEND, "-o", "/tmp/out.svg", ...defs, w.main],
          outputs: ["/tmp/out.svg"],
        },
        signal,
      );
      const svg = r2.outputs["/tmp/out.svg"];
      if (r2.code === 0 && svg)
        return { ok: true, kind: "2d", svg: decoder.decode(svg), log: w.clean(r2.log), ms: ms() };
      return { ok: false, log: w.clean(r2.log), ms: ms() };
    }
    if (/top level object is empty|no top.level geometry/i.test(r3.log))
      return { ok: true, kind: "empty", log: w.clean(r3.log), ms: ms() };
    return { ok: false, log: w.clean(r3.log), ms: ms() };
  },

  echo: async (t: RenderTarget, values: Record<string, ParamValue>, signal?: AbortSignal) => {
    const w = await workspace(t);
    const r = await runOpenscad(
      {
        files: w.files,
        cwd: ROOT,
        args: ["-o", "/tmp/out.echo", ...defineArgs(values), w.main],
        outputs: ["/tmp/out.echo"],
      },
      signal,
      "quick",
    );
    const out = r.outputs["/tmp/out.echo"];
    return { ok: r.code === 0, log: w.clean(r.log + "\n" + (out ? decoder.decode(out) : "")) };
  },

  art: async () => {
    const m = await getManifest();
    const project = m.files.filter((f) => f.startsWith("art/") && f.endsWith(".svg")).map((f) => f.slice(4));
    const own = new Set(userArtNames());
    const files = [...new Set([...project, ...own])].sort();
    const aspect: Record<string, number | null> = {};
    await Promise.all(
      files.map(async (n) => {
        if (own.has(n)) aspect[n] = userArtAspect(n);
        else if (m.aspect && n in m.aspect) aspect[n] = m.aspect[n];
        else {
          if (!artAspects.has(n))
            artAspects.set(
              n,
              projectFile(`art/${n}`)
                .then((d) => measureArt(decoder.decode(d)))
                .catch(() => null),
            );
          aspect[n] = await artAspects.get(n)!;
        }
      }),
    );
    return { files, aspect };
  },

  uploadArt: async (name: string, svg: string) => {
    const n = checkArt(name, svg);
    const aspect = await measureArt(svg);
    if (aspect === null) throw new Error(NO_SHAPES);
    saveUserArt(n, svg, aspect);
    return { ok: true, name: n, aspect };
  },

  artUrl: (name: string, stamp = 0) => userArtUrl(name) ?? `${BASE}project/art/${encodeURIComponent(name)}?t=${stamp}`,
};
