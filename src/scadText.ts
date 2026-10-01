// A design as one .scad file: the file's text with the Customizer values written into its own
// assignments, so the downloaded file reproduces the design by itself (opened here again, or in
// OpenSCAD next to the project's lib/).
import type { ParamValue } from "./api";

export function scadLiteral(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(scadLiteral).join(", ")}]`;
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "0";
  if (typeof v === "boolean") return v ? "true" : "false";
  // "{" written as \u007B: OpenSCAD's parameter export stops at a string with a brace in it
  // (so the "{tip}" fill-ins would hide every setting after it)
  return JSON.stringify(String(v)).replace(/{/g, "\\u007B");
}

export function withValues(source: string, values: Record<string, ParamValue>): string {
  let text = source;
  const missing: string[] = [];
  for (const [name, v] of Object.entries(values)) {
    if (!/^[A-Za-z_]\w*$/.test(name)) continue;
    // the file's top-level assignment (keeps its // [range] and description)
    const re = new RegExp(`^(${name}\\s*=\\s*)([^;]*)(;)`, "m");
    if (re.test(text)) text = text.replace(re, (_m, a: string, _old: string, b: string) => `${a}${scadLiteral(v)}${b}`);
    else missing.push(`${name} = ${scadLiteral(v)};`);
  }
  // A value the file doesn't assign itself: the last assignment wins in OpenSCAD.
  if (missing.length) text = `${text.replace(/\s*$/, "")}\n\n/* [Hidden] */\n${missing.join("\n")}\n`;
  return text;
}
