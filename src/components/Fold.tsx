// A collapsible panel section: closed by default, its header shows a one-line summary (so the
// design reads without opening anything) and how many settings in it are changed. Open/closed is
// kept in this browser per id (uiPrefs).
import { track } from "../usage";
import type { ReactNode } from "react";
import { useSectionOpen } from "../uiPrefs";

interface Props {
  id: string;
  title: ReactNode;
  summary?: ReactNode;
  changed?: number; // settings changed from the file's values (a dot + count on the header)
  forceOpen?: boolean; // e.g. while a search matches inside
  className?: string;
  children: ReactNode;
}

export function Fold({ id, title, summary, changed = 0, forceOpen = false, className = "", children }: Props) {
  const [stored, setOpen] = useSectionOpen(id);
  const open = forceOpen || stored;
  return (
    <section className={`fold${open ? " open" : ""} ${className}`}>
      <button
        className="fold-head"
        aria-expanded={open}
        onClick={() => {
          if (!open) track("section", id);
          setOpen(!open);
        }}
        disabled={forceOpen}
      >
        <span className="fold-chevron" aria-hidden="true">
          ▸
        </span>
        <span className="fold-title">{title}</span>
        {changed > 0 && (
          <span className="fold-changed" title={`${changed} changed from the file's values`}>
            ● {changed}
          </span>
        )}
        {summary && <span className="fold-summary">{summary}</span>}
      </button>
      {open && <div className="fold-body">{children}</div>}
    </section>
  );
}
