// Where a design sits on the cork compared with its voice's preset. The air inside the mouthpiece
// stands in for the missing tip of the horn's cone, so two pieces play in tune on the same horn
// when they hold about the same air past the neck's end: a piece with more air goes further onto the
// cork (the neck fills the extra), one with less sits further out. The socket's depth moves the
// spot too. Rough (the reed, the player and the chamber's shape all shift it by a few mm), but the
// direction and the size are what players see.

export interface Socket {
  depth: number; // mm, from the shank end (where the neck's end sits when pushed on to the end)
  diameter: number; // mm, across the socket (the cork, squeezed)
  voice: string;
}

// Each preset's air (cm³, neck end to tip) and socket depth (mm). npm run check fails when a
// preset no longer renders these (after a retune: copy the new numbers from its message).
export const PRESET_AIR: Record<string, { air: number; depth: number }> = {
  Soprano: { air: 2.9, depth: 25.5 },
  Alto: { air: 9.1, depth: 22 },
  "C-melody": { air: 9.4, depth: 24.5 },
  Tenor: { air: 10.2, depth: 26 },
  Baritone: { air: 16.9, depth: 30 },
};

// "Socket: 22mm deep, 16mm across, voice Alto"
export function parseSocket(log: string): Socket | null {
  const m = /Socket: ([\d.]+)mm deep, ([\d.]+)mm across, voice ([^"\n]+)/.exec(log);
  return m ? { depth: Number(m[1]), diameter: Number(m[2]), voice: m[3].trim() } : null;
}

// How much further onto the cork (mm; negative = further out) than the voice's preset, or null
// for a voice without one. More air: the neck has to fill it; a deeper socket: the shank goes further on.
export function corkShift(air: number, socket: Socket): number | null {
  const ref = PRESET_AIR[socket.voice];
  if (!ref || socket.diameter <= 0) return null;
  const area = (Math.PI * socket.diameter * socket.diameter) / 4; // mm²
  return ((air - ref.air) * 1000) / area + (socket.depth - ref.depth);
}

// "about 3 mm further onto the cork than the Alto preset" (within a mm: "about where it sits").
export function corkShiftText(shift: number, voice: string): string {
  const mm = Math.round(Math.abs(shift));
  if (mm < 1) return `about where the ${voice} preset sits on the cork`;
  return `about ${mm} mm further ${shift > 0 ? "onto" : "out on"} the cork than the ${voice} preset`;
}
