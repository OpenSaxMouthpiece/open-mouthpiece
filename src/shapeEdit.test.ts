import { describe, expect, it } from "vitest";
import { handleFs, moved, offsetAt, parseShapeEcho, tidy, type ShapeLines } from "./shapeEdit";

// A made-up 100 mm outline with the landmarks the generator echoes.
const shape: ShapeLines = {
  L: 100,
  lines: {
    top: Array.from({ length: 21 }, (_, i) => [i * 5, 10] as [number, number]),
    width: Array.from({ length: 21 }, (_, i) => [i * 5, 28] as [number, number]),
    underside: Array.from({ length: 11 }, (_, i) => [i * 6, -12] as [number, number]),
    baffle: Array.from({ length: 11 }, (_, i) => [60 + i * 3, 4] as [number, number]),
  },
  landmarks: [
    ["flare_w0", 10],
    ["flare_w1", 20],
    ["flare_h0", 10],
    ["flare_h1", 22],
    ["shoulder", 45],
    ["shoulder_end", 55],
    ["top_end", 90],
    ["width_end", 92],
  ],
  frame: { print: false, tilt: 0, lift: 0 },
  values: {},
};

describe("handleFs", () => {
  it("puts the top's handles on the flare and shoulder corners, ending at top_end", () => {
    const fs = handleFs("top", shape, undefined);
    expect(fs[0]).toBe(0);
    for (const f of [0.1, 0.22, 0.45, 0.55]) expect(fs).toContain(f);
    expect(fs[fs.length - 1]).toBeCloseTo(0.9);
    expect([...fs].sort((a, b) => a - b)).toEqual(fs); // in order
  });

  it("keeps handles apart (no near-repeats)", () => {
    const fs = handleFs("top", shape, undefined);
    for (let i = 1; i < fs.length; i++) expect(fs[i] - fs[i - 1]).toBeGreaterThan(0.02);
  });

  it("spreads lines without landmarks evenly along themselves", () => {
    const fs = handleFs("baffle", shape, undefined);
    expect(fs).toHaveLength(5);
    expect(fs[0]).toBeCloseTo(0.6);
    expect(fs[4]).toBeCloseTo(0.9);
  });

  it("uses an edited line's own points, up to its end landmark", () => {
    const fs = handleFs("width", shape, [
      [0.3, 1],
      [0.92, 2],
      [1, 2],
    ]);
    expect(fs).toEqual([0.3, 0.92]); // the held end [1, ...] has no handle
  });

  it("gives nothing for a line that wasn't rendered", () => {
    expect(handleFs("floor", shape, undefined)).toEqual([]);
  });
});

describe("offsets", () => {
  it("are 0 with no edit and at the ends of the length", () => {
    expect(offsetAt(undefined, 0.5)).toBe(0);
    expect(offsetAt([[0.5, 2]], 0)).toBe(0);
    expect(offsetAt([[0.5, 2]], 0.5)).toBe(2);
    expect(offsetAt([[0.5, 2]], 1)).toBe(0);
  });

  it("move one handle and keep the others", () => {
    const fs = [0.2, 0.5, 0.8];
    const a = moved(undefined, fs, 1, 1.5);
    expect(a).toEqual([
      [0.2, 0],
      [0.5, 1.5],
      [0.8, 0],
    ]);
    const b = moved(a, fs, 0, -1);
    expect(b.map((p) => p[1])).toEqual([-1, 1.5, 0]);
  });

  it("stay within the line's limit", () => {
    expect(moved(undefined, [0.5], 0, 9, false, 4)).toEqual([[0.5, 4]]);
    expect(moved(undefined, [0.5], 0, -9, false, 4)).toEqual([[0.5, -4]]);
  });

  it("hold the last handle's offset to the end of the length when asked", () => {
    expect(moved(undefined, [0.3, 0.9], 1, 2, true)).toEqual([
      [0.3, 0],
      [0.9, 2],
      [1, 2],
    ]);
  });

  it("tidy to an empty list once every offset is back at 0", () => {
    expect(tidy([[0.5, 0.001]])).toEqual([]);
    expect(tidy([[0.5, 0.2]])).toEqual([[0.5, 0.2]]);
  });
});

describe("parseShapeEcho", () => {
  it("reads the generator's echo, with undef and inf as gaps", () => {
    const log =
      'ECHO: hello\nECHO: SHAPE_EDIT = [["L", 80], ["frame", [true, 12, 3]], ["landmarks", [["shoulder", 40]]], ["top", [[0, 5], [10, undef], [20, 6]]]]\n';
    const s = parseShapeEcho(log)!;
    expect(s.L).toBe(80);
    expect(s.frame).toEqual({ print: true, tilt: 12, lift: 3 });
    expect(s.landmarks).toEqual([["shoulder", 40]]);
    expect(s.lines.top).toEqual([
      [0, 5],
      [20, 6],
    ]);
  });

  it("gives null without the echo", () => {
    expect(parseShapeEcho("ECHO: nothing")).toBeNull();
  });
});
