import fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { listProjectFiles, READ_ONLY, SCAD_DIR } from "./scripts/project_files.mjs";

// The app has no server: OpenSCAD runs in the browser (WebAssembly, public/openscad/) and
// loads the project from project/. A build copies scad/ into public/project/
// (scripts/build_static_project.mjs); in `npm run dev` this serves scad/ itself, so edits to the
// generator show on the next render without rebuilding. Relative paths (base "./") let the site
// live in any sub-folder (e.g. a GitHub or Cloudflare Pages project path).
function liveProject(): Plugin {
  const TYPES: Record<string, string> = { ".svg": "image/svg+xml", ".ttf": "font/ttf", ".otf": "font/otf" };
  return {
    name: "live-project",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const m = /^(?:.*\/)?project\/(.+)$/.exec(decodeURIComponent((req.url ?? "").split("?")[0]));
        if (!m) return next();
        const files: string[] = listProjectFiles();
        if (m[1] === "manifest.json") {
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-cache");
          return res.end(JSON.stringify({ files, readOnly: READ_ONLY.filter((f: string) => files.includes(f)) }));
        }
        if (!files.includes(m[1])) return next();
        res.setHeader("Content-Type", TYPES[path.extname(m[1]).toLowerCase()] ?? "text/plain; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
        res.end(fs.readFileSync(path.join(SCAD_DIR, m[1])));
      });
    },
  };
}

// The build's commit, for error reports (src/report.ts): Cloudflare's Workers Builds sets it, else git.
const BUILD = (() => {
  try { return (process.env.WORKERS_CI_COMMIT_SHA ?? execSync("git rev-parse HEAD").toString()).trim().slice(0, 7); }
  catch { return "dev"; }
})();

export default defineConfig({
  base: "./",
  define: { __BUILD__: JSON.stringify(BUILD) },
  plugins: [react(), liveProject()],
  worker: { format: "es" },
});
