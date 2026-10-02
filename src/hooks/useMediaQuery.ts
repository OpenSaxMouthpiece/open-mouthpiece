import { useEffect, useState } from "react";

// True while the media query matches (e.g. a phone-sized screen); follows rotation/resizes.
export function useMediaQuery(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
}

// The window's width, kept current.
export function useWindowWidth() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return w;
}

// Follows a pointer drag from a pointerdown: onMove gets the horizontal distance moved so far.
export function startDrag(e: React.PointerEvent, onMove: (dx: number) => void) {
  const x0 = e.clientX;
  const move = (ev: PointerEvent) => onMove(ev.clientX - x0);
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}
