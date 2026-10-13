import { describe, expect, it } from "vitest";
import {
  CHAMBER_BEFORE,
  chamberBefore,
  migrateChamberValues,
  migratePath,
  migrateScad,
  migrateTextureValues,
  textureBefore,
} from "./migrate";

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

describe("chamber width in mm again (2026-10-10)", () => {
  const old = [
    "include <lib/mouthpiece_base.scad>",
    "// Chamber width vs the throat's (mm): 0 = as wide, + wider (a larger chamber), - narrower.",
    "chamber_width_extra = -0.4; // [-1:0.1:12]",
    "throat_width = 15; // [5:0.1:24]",
  ].join("\n");
  it("turns a file's width vs the throat into its width", () => {
    expect(chamberBefore(old)).toEqual([15, -0.4]);
    const text = migrateScad(old);
    expect(text).toContain("chamber_width = 14.6; // [4:0.1:36]");
    expect(text).not.toContain("chamber_width_extra");
    expect(text).not.toContain("vs the throat");
    expect(chamberBefore(text)).toBeNull();
  });
  it("leaves today's files and self-contained ones alone", () => {
    const today = "chamber_width = 13.8; // [4:0.1:36]\nthroat_width = 14.2;";
    expect(migrateScad(today)).toBe(today);
    expect(chamberBefore(old + "\nRENAMED_PARAMS = [];")).toBeNull();
  });
  it("gives changed values the chamber width they made", () => {
    const alto = CHAMBER_BEFORE["alto.scad"]; // [14.2, -0.4]
    expect(migrateChamberValues({ chamber_width_extra: 2 }, alto)).toEqual({ chamber_width: 16.2 });
    // a changed throat carried the chamber with it
    expect(migrateChamberValues({ throat_width: 12, tip_opening: 2 }, alto)).toEqual({
      throat_width: 12,
      tip_opening: 2,
      chamber_width: 11.6,
    });
    expect(migrateChamberValues({ throat_width: 12, chamber_width_extra: 1 }, alto)).toEqual({
      throat_width: 12,
      chamber_width: 13,
    });
    expect(migrateChamberValues({ tip_opening: 2 }, alto)).toEqual({ tip_opening: 2 });
    expect(migrateChamberValues({ chamber_width: 15, chamber_width_extra: 1 }, alto)).toEqual({ chamber_width: 15 });
    expect(migrateChamberValues({ throat_width: 12 }, null)).toEqual({ throat_width: 12 });
  });
});

describe("baffle texture width (2026-10-12)", () => {
  const old = [
    "include <lib/mouthpiece_base.scad>",
    'baffle_texture = "across"; // [none, along, across, dimples]',
    "// Distance between the grooves or dimples (mm).",
    "baffle_texture_spacing = 5; // [1.5:0.1:8]",
  ].join("\n");
  it("gives an older file the width it had", () => {
    expect(textureBefore(old)).toEqual([5, 0.4]);
    const text = migrateScad(old);
    expect(text).toContain("baffle_texture_spacing = 5; // [1.5:0.1:8]\n// Width of each groove");
    expect(text).toContain("baffle_texture_thickness = 3; // [0.3:0.05:4]");
    expect(textureBefore(text)).toBeNull();
    expect(migrateScad(text)).toBe(text);
  });
  it("gives older values the width they had, and leaves others alone", () => {
    expect(migrateTextureValues({ baffle_texture: "dimples" }, null)).toEqual({
      baffle_texture: "dimples",
      baffle_texture_thickness: 1.95,
    });
    expect(migrateTextureValues({ baffle_texture_depth: 1 }, [3, 0.4])).toEqual({
      baffle_texture_depth: 1,
      baffle_texture_thickness: 4,
    });
    expect(migrateTextureValues({ tip_opening: 2 }, null)).toEqual({ tip_opening: 2 });
    expect(migrateTextureValues({ baffle_texture_spacing: 4, baffle_texture_thickness: 1 }, null)).toEqual({
      baffle_texture_spacing: 4,
      baffle_texture_thickness: 1,
    });
  });
});
