// In place of the readouts when the design shows another part than the mouthpiece: how to print and
// fit it.
import { useState, type ReactNode } from "react";
import { capText, ligatureText, parseCap, parseLigature, type CapInfo, type LigatureInfo } from "../readouts";

// made = false: a part tab whose part isn't made yet. ligInfo / capInfo: the numbers when the part is
// shown on the mouthpiece (its own render), else they come from the log (the part alone).
export function PartNote({
  part,
  log,
  made = true,
  ligInfo,
  capInfo,
}: {
  part: string;
  log: string;
  made?: boolean;
  ligInfo?: LigatureInfo | null;
  capInfo?: CapInfo | null;
}) {
  const cap = capInfo ?? parseCap(log);
  return (
    <div className="readouts-note muted">
      {!made ? (
        <>
          No {part} yet. <b>Make</b> one below: it is built from this mouthpiece's own shape and follows every change to
          it.
        </>
      ) : part === "ligature" ? (
        <HowItFits line="Ligature: prints standing on its flat front edge, no supports.">
          The tongue points up; PETG or similar flexes without cracking. Slide it on over the tip with the reed in place
          and push it back until snug. The reed is the tight spot. Reed not held: raise <b>Reed grip</b>; it stops too
          far forward: lower it.
          {ligatureText(ligInfo ?? parseLigature(log))}
        </HowItFits>
      ) : part === "cap" ? (
        <HowItFits line="Cap: prints standing on its rim, open end down, no supports.">
          Slide it on over the tip, reed and ligature until the rim clips onto the ligature. Too loose: raise{" "}
          <b>Grip squeeze</b>; too tight: lower it, or make the <b>Slot</b> longer.
          {capText(cap)}
          {cap?.notes.map((n) => (
            <div key={n}>{n}</div>
          ))}
        </HowItFits>
      ) : part === "shank_test_ring" ? (
        <>
          Shank test ring: print it first and push it onto your neck cork. It should go on snugly with a slight twist,
          like a mouthpiece. Too tight: lower <b>Cork squeeze</b>; too loose: raise it (or set <b>Neck cork diameter</b>{" "}
          to your cork).
        </>
      ) : (
        <>
          Showing <b>{part.replace(/_/g, " ")}</b>, not the mouthpiece: the readouts come back with “What to print” set
          to mouthpiece.
        </>
      )}
    </div>
  );
}

// One line, with the fitting details and numbers behind a toggle (the note sits above the part tabs).
function HowItFits({ line, children }: { line: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {line}{" "}
      <button className="link" aria-expanded={open} onClick={() => setOpen(!open)}>
        How it fits {open ? "▾" : "▸"}
      </button>
      {open && <div className="part-note-more">{children}</div>}
    </>
  );
}
