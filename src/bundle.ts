// "Download .scad": the design as ONE self-contained file of plain OpenSCAD that opens in any
// OpenSCAD. The file's own block comes first (header, Customizer tabs, hidden shape tables) with
// the Customizer values written in, then the included generator with the default assignments for
// those parameters removed (in a single file a variable must be assigned before the code that uses
// it, and assigning twice only produces "overwritten" warnings). Same method as
// scripts/bundle_scad.mjs. Lettering is text() as usual; a picture stays a file: it's imported
// from art/<name> next to this file (the app has it; elsewhere it's left out with a
// warning unless the SVG is put there). The STL always has it.
import { withValues } from "./scadText";
import { imageRefs } from "./userArt";
import type { ParamValue } from "./api";

interface Options {
  source: string;
  path: string | null; // the file's project path (null: from the device)
  values: Record<string, ParamValue>;
  readFile(path: string): Promise<string>; // a project file's text (unsaved text wins)
  date: string;
}

const ASSIGN = /^([A-Za-z_]\w*) = (.*?);(\s*\/\/.*)?$/;
const readAssignments = (text: string) =>
  Object.fromEntries(
    text
      .split("\n")
      .map((l) => ASSIGN.exec(l))
      .filter((m) => m)
      .map((m) => [m![1], m![2]]),
  );

// Fonts that come with desktop OpenSCAD (the Liberation faces); the others need installing.
const BUILT_IN_FONTS = ["Sans Bold", "Sans", "Serif Bold", "Serif", "Serif Italic", "Mono Bold"];

const dirOf = (p: string | null) => (p && p.includes("/") ? p.slice(0, p.lastIndexOf("/") + 1) : "");
function joinPath(dir: string, rel: string) {
  const out: string[] = [];
  for (const part of (dir + rel).split("/")) {
    if (part === "..") out.pop();
    else if (part && part !== ".") out.push(part);
  }
  return out.join("/");
}

export async function bundleDesign(o: Options): Promise<string> {
  const text = withValues(o.source, o.values).replace(/\r\n/g, "\n");
  const inc = /^\s*include\s*<([^>]+)>.*$/m.exec(text);
  if (!inc) return text; // already one file (e.g. a design downloaded before)
  const basePath = joinPath(dirOf(o.path), inc[1]);
  const base = (await o.readFile(basePath)).replace(/\r\n/g, "\n");
  const own = readAssignments(text);

  // The base without the assignments the design sets itself (and their description comments;
  // the design's own block carries the annotated versions).
  const keep: string[] = [];
  for (const line of base.split("\n")) {
    const m = /^([A-Za-z_]\w*) = .*;/.exec(line);
    if (m && m[1] in own) {
      while (keep.length && /^\/\/ /.test(keep[keep.length - 1]) && !/^\/\/ =+/.test(keep[keep.length - 1])) keep.pop();
      continue;
    }
    keep.push(line);
  }
  // A single file can't carry the lettering fonts (lib/fonts/): their use<>s go (elsewhere each
  // missing one is an ERROR line). Desktop OpenSCAD has the Liberation faces built in and finds
  // the others by name once installed; the app adds its fonts itself (browserApi.ts).
  // Pictures were imported relative to lib/ ("../art/"): now relative to this file ("art/").
  // The legacy-name block goes above the settings (where the include was): an old name pasted
  // into the settings must come after its `= undef` to win (and get its rename warning).
  const LEGACY = /^\/\/ \(legacy names: begin[^\n]*\n(?:[^\n]*\n)*?\/\/ \(legacy names: end\)\n/m;
  const legacy = LEGACY.exec(keep.join("\n"))?.[0] ?? "";
  const tabFirst = /^\s*(\/\/[^\n]*\n\s*)*\/\* \[/.test(text.slice(inc.index + inc[0].length)); // settings open with a tab
  const body = keep
    .join("\n")
    .replace(LEGACY, "")
    .replace(/^\/\/ Lettering fonts \(see LETTERING_FONTS\)[^\n]*\n(\/\/[^\n]*\n)*(use <fonts\/[^>]+>\n)+/m, "")
    .replace(/^use <fonts\/[^>]+>\n/gm, "")
    .replace(/import\(str\("\.\.\/art\/", /g, 'import(str("art/", ')
    .replace(/^\/\* \[(?!Hidden)[^\]]*\] \*\/\n(\n|$)/gm, ""); // now-empty tab markers

  const font = String(o.values.lettering_font ?? JSON.parse(own.lettering_font ?? '""'));
  const pictures = [...new Set(Object.values(imageRefs(o.values, text)).filter((n) => n))];
  const header = [
    `// Open Mouthpiece design, self-contained (downloaded ${o.date}): the settings come first,`,
    `// then the whole generator (${basePath}). Opens in any OpenSCAD (the Customizer shows the`,
    `// settings; a recent version with the Manifold backend renders in about a second) and in the`,
    `// Open Mouthpiece (Open .scad…).`,
    `// Fonts for lettering: Sans, Serif and Mono come with OpenSCAD. The others are free Google Fonts;`,
    `// install the one you pick, or OpenSCAD uses its default font.${font && !BUILT_IN_FONTS.includes(font) ? ` This design uses ${font}.` : ""}`,
    ...(pictures.length
      ? [
          `// Picture: ${pictures.join(", ")} is not in this file (a .scad can't hold an SVG). Put it in an`,
          `// art/ folder next to this file, or the model is made without it. The STL always has it.`,
        ]
      : []),
    "",
  ].join("\n");
  return [
    header +
      text.replace(
        inc[0],
        `// (self-contained: ${basePath} is included at the end of this file)` +
          (legacy ? `\n/* [Hidden] */\n${legacy}${tabFirst ? "" : "/* [Parameters] */\n"}` : ""),
      ),
    "",
    "/* [Hidden] */",
    `// ======================== ${basePath} (included) ========================`,
    body,
  ].join("\n");
}
