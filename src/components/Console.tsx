// OpenSCAD output: ERROR / WARNING / ECHO lines colored; "in file X, line N" references jump to
// that file (opening it if needed) and line.
import { useEffect, useRef } from "react";

interface Props {
  log: string;
  onGoto(line: number, file: string | null): void;
  onClear(): void;
}

function lineClass(l: string) {
  if (/^ERROR|^Execution aborted|Can't parse/i.test(l)) return "error";
  if (/^WARNING|^DEPRECATED/i.test(l)) return "warning";
  if (/^ECHO/.test(l)) return "echo";
  if (/^TRACE/.test(l)) return "trace";
  return "";
}

export function Console({ log, onGoto, onClear }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [log]);
  const lines = log
    .replace(/\r/g, "")
    .split("\n")
    .filter((l) => l.trim() !== "");
  return (
    <div className="console">
      <div className="console-head">
        <span>Console</span>
        <button onClick={onClear}>Clear</button>
      </div>
      <div className="console-body" ref={ref}>
        {lines.map((l, i) => {
          const m = /(?:in file ([^,]*), )?line (\d+)/i.exec(l);
          const file = m?.[1]?.trim() || null;
          return (
            <div key={i} className={lineClass(l)}>
              {l}
              {m && (
                <button className="goto" onClick={() => onGoto(Number(m[2]), file)}>
                  → {file ? `${file.split("/").pop()}:` : "line "}
                  {m[2]}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
