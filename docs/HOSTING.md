# Hosting the site (static)

The app is a static website: OpenSCAD runs in each visitor's browser (WebAssembly), and
nothing is saved on any server. Designs are kept in that browser's storage (Save / Save as), as
files on the visitor's device (Download .scad: one self-contained file that also opens in desktop
OpenSCAD; Open .scad… loads it again), or in share links.
Rendering an alto takes ~3 s on a desktop PC; phones are slower (roughly 5-15 s).

The build is what a free host like GitHub Pages, GitLab Pages, Cloudflare Pages or Netlify
serves. Nothing runs on the host: it only hands out files.

## Build it

```
npm run build
```

This downloads OpenSCAD's official WebAssembly build (pinned version, checksum verified) into
`public/openscad/`, copies the generator, presets, fonts and example pictures into
`public/project/` (not `scad/fits/` or `reference/`), and builds everything into **`dist/`**.
`dist/` is the whole website (~16 MB, mostly OpenSCAD itself; the largest file, openscad.wasm,
is 11 MB, under Cloudflare's 25 MB per-file limit). Paths are relative, so it works
from any address or sub-folder.

Try the built site locally: `npm run preview`, then open the address it prints.
While developing: `npm run dev` (serves `scad/` live, no build needed).

## Put it online

Any static host works: upload the contents of `dist/`, or point the host at the repository with
the build command `npm run build` and the output folder `dist`.

- **GitHub Pages**: free for public repositories; for a private repository it needs GitHub Pro,
  and the site itself is still public.
- **Cloudflare Workers** (what this project uses): free, and builds from the GitHub repository on
  every push to `master` (Workers Builds). Worker > Settings > Builds > Connect: the repository,
  production branch `master`, build command `npm run build`, deploy command `npx wrangler deploy`,
  root directory `/`, preview builds off (only `master` deploys). Node comes from `.node-version`
  (22). `wrangler.jsonc` serves `dist/` as static assets (without it wrangler tries to
  auto-configure Vite and needs Vite 6+) and runs `worker/index.js` for `/api/log`. The site gets
  a public `*.workers.dev` address besides its own domain; Cloudflare Access (free for up to 50
  people) can put a login in front.
  Security rules on the domain (free plan, Security > Security rules): block ports other than
  443/80; allow only GET/HEAD, plus POST to `/api/log`; block common scanner paths (`/wp-`,
  `.php`, `/.env`, `/.git`, `/cgi-bin`); rate-limit `/api/log` to 5 requests per 10s per IP. Also
  on: Bot Fight Mode, Always Use HTTPS, minimum TLS 1.2.
- **Cloudflare Pages**: the same build (`npm run build`, output `dist`), but without the Worker,
  so no error reports.
- **GitLab Pages / Netlify**: similar; point them at `npm run build` and `dist/`.

### Error reports (Cloudflare Worker)

On Cloudflare the site also runs a tiny Worker (`worker/index.js`, set up in `wrangler.jsonc`)
with one job: `POST /api/log` takes the app's anonymous error reports and writes each one as a
JSON line to **Workers Logs** (`"observability": { "enabled": true }`). Read them in the dashboard:
Workers & Pages > open-mouthpiece > Logs (filter on `report = app-error`; fields `kind`, `message`,
`design`, `changed`, `build`, `openscad`). Kinds: `error` (a render or file error the page
showed), `slow-render` (still running after 45s), `unfinished-render` (the last visit froze during
a render), `page-error` (an uncaught script error). Reports carry the kind of design and the names
of changed settings, never setting values, lettering or file text, and no IP address; visitors can
turn them off in the ⚙ menu. On any other host `/api/log` doesn't exist and the reports are simply
dropped.

## What visitors should know

- The first visit downloads ~4 MB compressed (OpenSCAD); after that the browser caches it.
- If something goes wrong, the site sends an anonymous error report (see above; ⚙ turns it off).
- Saved files and uploaded pictures live in that browser only. Download .scad keeps a design
  as a file (Open .scad… loads it again, on any device).
- Rendering happens on their device: phones are slower, so let a render finish before the next
  change.
