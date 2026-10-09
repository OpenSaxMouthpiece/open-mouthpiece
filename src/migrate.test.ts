import { describe, expect, it } from "vitest";
import { migratePath } from "./migrate";

describe("migratePath", () => {
  it("opens the variants under their new names", () => {
    expect(migratePath("variants/alto_ash.scad")).toBe("variants/alto_flamma.scad");
    expect(migratePath("variants/baritone_birch.scad")).toBe("variants/baritone_silva.scad");
    expect(migratePath("variants/soprano_cedar.scad")).toBe("variants/soprano_unda.scad");
  });
  it("rewrites every path in a stored session, and leaves other files alone", () => {
    expect(migratePath('{"activeKey":"variants/tenor_ash.scad","b":"alto.scad"}')).toBe(
      '{"activeKey":"variants/tenor_flamma.scad","b":"alto.scad"}',
    );
    expect(migratePath("my_ash.scad")).toBe("my_ash.scad");
  });
});
