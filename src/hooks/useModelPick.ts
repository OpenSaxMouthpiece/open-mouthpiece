// Click a spot on the model, go to the setting that shapes it (src/pick.ts finds which): the panel
// opens its section (and its More), scrolls the slider into view and flashes it; a small chip by the
// click names the spot and offers the other settings that shape it.
import { useCallback, useEffect, useRef, useState } from "react";
import type { FocusData } from "../focus";
import { pickRegion, placeOf, toDesign, type PickRegion } from "../pick";
import { muteSectionSpy } from "../components/DesignPanel";
import { setSectionsOpen } from "../uiPrefs";

export interface Pick {
  region: PickRegion;
  at: [number, number]; // px in the view
  shown: string; // the setting the panel went to
}

interface Options {
  getFocusData(): Promise<FocusData | null>;
  get(name: string): unknown;
  has(name: string): boolean; // the open file declares it
  isPhone: boolean;
  showSection(title: string): void; // the desktop rail's pick
  showDesign(): void; // the phone: the Design panel, on the mouthpiece's tab
}

export function useModelPick(o: Options) {
  const [pick, setPick] = useState<Pick | null>(null);
  const opts = useRef(o);
  opts.current = o;
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const reveal = useCallback((name: string) => {
    const { isPhone, showSection, showDesign } = opts.current;
    const place = placeOf(name);
    if (!place) return;
    muteSectionSpy(1200);
    showDesign();
    if (!isPhone) showSection(place.section);
    setSectionsOpen([...(isPhone ? [`d:${place.section}`] : []), ...(place.more ? [place.more] : [])], true);
    // once the panel has drawn the section: the slider to the middle of its list, flashed
    window.setTimeout(() => {
      const el = [...document.querySelectorAll<HTMLElement>(`[data-param="${CSS.escape(name)}"]`)].find(
        (e) => e.offsetParent !== null,
      );
      if (!el) return;
      muteSectionSpy(400);
      el.scrollIntoView({ block: "center" });
      el.classList.remove("param-flash");
      void el.offsetWidth; // restart the animation
      el.classList.add("param-flash");
      el.addEventListener("animationend", () => el.classList.remove("param-flash"), { once: true });
    }, 60);
  }, []);

  const onPick = useCallback(
    async (hit: {
      point: [number, number, number];
      normal: [number, number, number];
      inside: boolean;
      at: [number, number];
    }) => {
      const data = await opts.current.getFocusData();
      if (!data) return;
      const region = pickRegion(
        toDesign(hit.point, data.frame),
        toDesign(hit.normal, data.frame, true),
        data,
        opts.current.get,
        hit.inside,
      );
      const params = region?.params.filter((n) => opts.current.has(n) && placeOf(n)) ?? [];
      if (!region || !params.length) return setPick(null);
      setPick({ region: { ...region, params }, at: hit.at, shown: params[0] });
      reveal(params[0]);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setPick(null), 8000);
    },
    [reveal],
  );

  const goTo = useCallback(
    (name: string) => {
      setPick((p) => p && { ...p, shown: name });
      reveal(name);
    },
    [reveal],
  );

  return { pick, onPick, goTo, close: () => setPick(null) };
}
