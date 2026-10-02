// In place of the readouts when the design shows another part than the mouthpiece: how to print and
// fit it.
import { ligatureText, parseLigature } from "../readouts";

export function PartNote({ part, log }: { part: string; log: string }) {
  return (
    <div className="readouts-note muted">
      {part === "ligature" ? (
        <>
          Ligature, as printed: standing on its flat front edge (the tongue points up), no supports (PETG or similar
          flexes without cracking). Slide it on over the tip with the reed in place and push it back until snug. The
          reed is the tight spot. Reed not held: raise <b>Reed grip</b>; it stops too far forward: lower it, or set{" "}
          <b>Reed thickness</b> to your reed.{ligatureText(parseLigature(log))}
        </>
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
