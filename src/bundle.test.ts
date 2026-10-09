// The downloaded design file: one file, its part list trimmed to the printable parts, the parts and
// the picture named in its header.
import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bundleDesign, designPictures } from "./bundle";

const read = async (p: string) => readFileSync(`scad/${p}`, "utf8");
const bundle = async (path: string) =>
  bundleDesign({ source: await read(path), path, values: {}, readFile: read, date: "2026-01-01" });

describe("bundleDesign", () => {
  it("makes one file whose part list holds only the printable parts", async () => {
    const text = await bundle("alto.scad");
    expect(text).not.toMatch(/^\s*include\s*</m);
    expect(text).toMatch(/^part = "mouthpiece"; \/\/ \[mouthpiece, shank_test_ring, ligature, cap\]$/m);
    expect(text).toContain("// Parts: set part (Customizer, Output tab)");
    expect(text).not.toContain("Picture:");
    if (process.env.BUNDLE_OUT) writeFileSync(`${process.env.BUNDLE_OUT}/alto.scad`, text);
  });

  it("names the picture it needs beside it", async () => {
    const path = "variants/alto_silva.scad";
    const source = await read(path);
    expect(designPictures({}, source)).toEqual(["element_leaf.svg"]);
    const text = await bundle(path);
    expect(text).toContain("// Picture: element_leaf.svg is not in this file");
    if (process.env.BUNDLE_OUT) writeFileSync(`${process.env.BUNDLE_OUT}/alto_silva.scad`, text);
  });
});
