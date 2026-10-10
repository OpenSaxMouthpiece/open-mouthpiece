import { describe, expect, it } from "vitest";
import { projectTab, rebaseGenerator } from "./files";

const variant = "include <../lib/mouthpiece_base.scad>  // keep first\ntip_opening = 1.8;\n";

describe("rebaseGenerator", () => {
  it("points a copied variant's include at the generator from its new folder", () => {
    expect(rebaseGenerator(variant, "my_c_melody.scad")).toBe(variant.replace("../lib/", "lib/"));
    expect(rebaseGenerator(variant, "variants/alto_unda.scad")).toBe(variant);
    expect(rebaseGenerator(variant, "a/b/c.scad")).toMatch(/^include <\.\.\/\.\.\/lib\/mouthpiece_base\.scad>/);
  });
  it("repairs an already-saved copy when it opens", () => {
    const t = projectTab("my_c_melody.scad", variant);
    expect(t.source.startsWith("include <lib/mouthpiece_base.scad>")).toBe(true);
    expect(t.saved).toBe(t.source);
  });
  it("leaves files without the include alone", () => {
    expect(rebaseGenerator("cube(1);", "x.scad")).toBe("cube(1);");
  });
});
