import { describe, expect, it } from "vitest";
import { optionLabel } from "./design";

describe("optionLabel", () => {
  it("prefers a section's own words for an option", () => {
    expect(optionLabel("shank_detail", "rings")).toBe("Rings (ribbed)");
  });
  it("then the shared option names", () => {
    expect(optionLabel("facing_model", "arc")).toBe("Radius");
    expect(optionLabel("side_text_font", "same")).toBe("Same as Font");
  });
  it("else the value in words, capitalised", () => {
    expect(optionLabel("anything", "half_round")).toBe("Half round");
    expect(optionLabel("anything", "x", "named_option")).toBe("Named option");
  });
});
