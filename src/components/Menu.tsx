// A toolbar button that opens a small panel under it (the "More" and ⚙ menus). Closes on a click
// outside, on Escape, or when an item calls close().
import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  label: ReactNode;
  title: string;
  className?: string;
  align?: "left" | "right";
  children: (close: () => void) => ReactNode;
}

export function Menu({ label, title, className = "", align = "right", children }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key); };
  }, [open]);
  return (
    <div className={`menu ${className}`} ref={ref}>
      <button className={open ? "active" : ""} aria-expanded={open} aria-haspopup="true" title={title} onClick={() => setOpen((o) => !o)}>{label}</button>
      {open && <div className={`menu-pop ${align}`} role="menu">{children(() => setOpen(false))}</div>}
    </div>
  );
}
