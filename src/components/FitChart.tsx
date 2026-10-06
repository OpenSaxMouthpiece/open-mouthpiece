// "Fit on the horn"'s picture: the shank end cut through the middle with the neck cork in it, drawn
// from the settings (no render needed), since the socket can't be seen from outside. The squeeze is
// a fraction of a mm, so the cork's overlap with the wall is drawn bigger (SQUEEZE_X times).

const W = 300,
  H = 128,
  PAD = 10,
  CORK_OUT = 12, // mm of cork shown outside the mouthpiece
  BORE_SHOWN = 14, // mm of bore shown behind the socket
  SQUEEZE_X = 10;

export function FitChart({ get }: { get: (name: string) => unknown }) {
  const num = (n: string, d: number) => (typeof get(n) === "number" ? (get(n) as number) : d);
  const cork = num("neck_cork_diameter", 16),
    squeeze = num("shank_clearance", 0.2),
    depth = num("shank_depth", 22),
    bevel = num("shank_bevel", 1),
    bevelDepth = Math.min(num("shank_bevel_depth", 1), depth),
    bore = num("bore_diameter", 15),
    rSock = (cork - squeeze) / 2,
    rOut = Math.max(num("shank_diameter", cork + 7) / 2, rSock + bevel + 1.5),
    rCork = rSock + (squeeze * SQUEEZE_X) / 2,
    rBore = bore / 2;
  // mm -> px: one scale for both axes, so the picture keeps its proportions
  const spanZ = CORK_OUT + depth + BORE_SHOWN;
  const k = Math.min((W - 2 * PAD) / spanZ, (H - 2 * PAD - 20) / (2 * rOut));
  const X = (z: number) => PAD + (z + CORK_OUT) * k;
  const cy = PAD + rOut * k;
  const Y = (r: number) => cy - r * k;
  const zEnd = depth + BORE_SHOWN;
  // one wall (top; the bottom is the mirror): outside, then the inside from the far end back to the mouth
  const inside: [number, number][] = [
    [zEnd, rBore],
    [depth, rBore],
    [depth, rSock],
    [bevelDepth, rSock],
    [0, rSock + bevel],
  ];
  const wall = (s: 1 | -1) =>
    [[0, rOut] as [number, number], [zEnd, rOut] as [number, number], ...inside]
      .map(([z, r], i) => `${i ? "L" : "M"}${X(z).toFixed(1)},${(cy - s * (cy - Y(r))).toFixed(1)}`)
      .join("") + "Z";
  const corkPath = (s: 1 | -1) => {
    const y = (r: number) => (cy - s * (cy - Y(r))).toFixed(1);
    return `M${X(-CORK_OUT)},${y(rCork)}L${X(depth)},${y(rCork)}L${X(depth)},${cy}L${X(-CORK_OUT)},${cy}Z`;
  };
  const dimY = H - 6;
  const n = (v: number) => +v.toFixed(2);
  return (
    <div className="profile-chart fit-chart">
      <span className="readout-label">Shank end, cut through the middle</span>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="The neck cork in the mouthpiece's socket">
        <path className="cork" d={corkPath(1) + corkPath(-1)} />
        <path className="now" d={wall(1) + wall(-1)} />
        {squeeze > 0 && (
          <path
            className="squeeze"
            d={[1, -1]
              .map((s) => {
                const y0 = (cy - s * (cy - Y(rSock))).toFixed(1),
                  y1 = (cy - s * (cy - Y(rCork))).toFixed(1);
                return `M${X(bevelDepth)},${y0}L${X(depth)},${y0}L${X(depth)},${y1}L${X(bevelDepth)},${y1}Z`;
              })
              .join("")}
          />
        )}
        <text className="tick" x={X(-CORK_OUT) + 2} y={cy + 3.5}>
          Neck cork
        </text>
        <text className="tick" x={X(depth) + 4} y={cy + 3.5}>
          Bore
        </text>
        <path
          className="scale"
          d={`M${X(0)},${dimY - 4}V${dimY + 2}M${X(depth)},${dimY - 4}V${dimY + 2}M${X(0)},${dimY - 1}H${X(depth)}`}
        />
        <text className="tick" x={(X(0) + X(depth)) / 2} y={dimY - 3} textAnchor="middle">
          {n(depth)} mm in
        </text>
      </svg>
      <p className="fit-chart-note muted">
        Cork {n(cork)} mm, socket {n(cork - squeeze)} mm
        {squeeze > 0 ? ` (squeeze drawn ${SQUEEZE_X}× bigger)` : " (no squeeze: loose)"}
      </p>
    </div>
  );
}
