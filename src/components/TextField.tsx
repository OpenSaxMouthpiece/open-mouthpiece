// A lettering text: a box that takes several lines (each is a line of letters on the part), and a
// Variables list that puts {tip} etc. in at the cursor, with what each gives for this design now
// (from the generator's "Text variables:" echo, see readouts.ts).
import { createContext, useContext, useRef, useState } from "react";

export const TextVariables = createContext<[string, string][]>([]);

const MEANING: Record<string, string> = {
  "{tip}": "tip opening, inches",
  "{tip_mm}": "tip opening, mm",
  "{facing}": "facing length, mm",
  "{chamber}": "chamber width, mm",
  "{length}": "overall length, mm",
  "{title}": "the design's name",
  "{voice}": "Soprano, Alto, Tenor, ...",
  "{voice_letter}": "S, A, T, B or C",
};

export const isLetteringText = (name: string) => /_text(_right|_left)?$/.test(name);

export function TextField({ value, onChange }: { value: string; onChange(v: string): void }) {
  const live = useContext(TextVariables);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);
  const sel = useRef<[number, number] | null>(null); // where the cursor was (none yet: append)
  const vars: [string, string][] = Object.keys(MEANING).map((k) => [k, live.find(([t]) => t === k)?.[1] ?? ""]);
  const insert = (token: string) => {
    const el = box.current;
    const [at, end] = sel.current ?? [value.length, value.length];
    onChange(value.slice(0, at) + token + value.slice(end));
    sel.current = [at + token.length, at + token.length];
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + token.length, at + token.length);
    });
  };
  return (
    <div className="text-field">
      <textarea
        ref={box}
        rows={Math.min(3, Math.max(1, value.split("\n").length))}
        value={value}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onSelect={(e) => (sel.current = [e.currentTarget.selectionStart, e.currentTarget.selectionEnd])}
      />
      <button
        type="button"
        className={`text-vars-toggle${open ? " on" : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        title="Put a value of this design into the text (it follows the design when you change it)"
      >
        Variables ▾
      </button>
      {open && (
        <div className="text-vars">
          {vars.map(([k, v]) => (
            <button type="button" key={k} onClick={() => insert(k)} title={`Insert ${k}: ${MEANING[k]}`}>
              <code>{k}</code> {v && <b>{v}</b>} <span className="muted">{MEANING[k]}</span>
            </button>
          ))}
          <p className="muted">Enter starts a new line.</p>
        </div>
      )}
    </div>
  );
}
