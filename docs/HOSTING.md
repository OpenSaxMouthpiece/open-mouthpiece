# Hosting the site

The app is a static website: OpenSCAD runs in the visitor's browser (WebAssembly) and no design
is saved on a server. Any static host works.

## Build it

```
npm run build      # -> dist/ (the whole site)
npm run preview    # try the built site locally
npm run dev        # while developing: serves scad/ live, no build needed
```

The build fetches OpenSCAD's WebAssembly build (pinned, checksum verified) and copies the
generator, presets, fonts and example pictures alongside the app. `dist/` is ~16 MB (the largest
file, openscad.wasm, is 11 MB). Paths are relative, so it works from any address or sub-folder.

## Put it online

Upload `dist/`, or point the host at the repository with build command `npm run build` and output
folder `dist`.

## Anonymous reports (optional)

The app sends anonymous error reports to `POST /api/log` and usage events to `POST /api/usage`.
On a plain static host these addresses don't exist and the reports are simply dropped. The live
site handles them with a small Cloudflare Worker (`worker/index.js`, `wrangler.jsonc`, table
`worker/usage.sql`).

What's sent: the kind of design, setting names, sections opened, features used and downloads (a
mouthpiece download carries its numeric settings and readouts). Never lettering, pictures, file
names or text; no cookie, no IP address; nothing links one visit to another. Nothing is sent from
localhost, and visitors can turn it off in ⚙ ("Share anonymous usage").
