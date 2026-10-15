import { describe, expect, it } from "vitest";
import { buildAirStl, parseAirEcho } from "./airMesh";

describe("air mesh", () => {
  const ring = (z: number, r: number) =>
    Array.from({ length: 8 }, (_, k): [number, number, number] => [
      r * Math.cos((k / 8) * 2 * Math.PI),
      r * Math.sin((k / 8) * 2 * Math.PI),
      z,
    ]);
  it("parses the echo and rejects a ragged one", () => {
    const rings = [ring(0, 1), ring(5, 2)];
    expect(parseAirEcho(`ECHO: AIR_SOLID = ${JSON.stringify(rings)}\n`)).toEqual(rings);
    expect(parseAirEcho(`ECHO: AIR_SOLID = ${JSON.stringify([ring(0, 1), ring(5, 2).slice(1)])}\n`)).toBeNull();
    expect(parseAirEcho("ECHO: nothing")).toBeNull();
  });
  it("closes the loft with outward normals", () => {
    const buf = buildAirStl([ring(0, 1), ring(5, 2)]);
    const v = new DataView(buf);
    const count = v.getUint32(80, true);
    expect(count).toBe(2 * 8 + 2 * 8);
    // the end cap at z = 0 faces -z, the one at z = 5 faces +z
    let down = 0,
      up = 0;
    for (let i = 0; i < count; i++) {
      const nz = v.getFloat32(84 + i * 50 + 8, true);
      if (nz < -0.99) down++;
      if (nz > 0.99) up++;
    }
    expect(down).toBe(8);
    expect(up).toBe(8);
  });
});
