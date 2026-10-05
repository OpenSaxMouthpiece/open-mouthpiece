// Zoom to a parameter: the file's param_focus() says where each parameter acts; the viewer flies
// there. Files without it simply don't zoom. It's an OpenSCAD run of its own (seconds in the
// browser), so it's fetched after each final render (riding along with the readouts' run when that
// runs), and a touch uses the latest data for the file at once, even from a slightly older model
// state (parts barely move between changes), while the current state's data loads for later touches.
import { useCallback, useRef, useState, type RefObject } from "react";
import { api, type RenderTarget } from "../api";
import { FOCUS_ECHO, parseFocusEcho, toRequest, type FocusData, type FocusRequest } from "../focus";
import type { Values } from "../app/files";

export interface FocusState {
  target: RenderTarget | null;
  values: Values;
  zoom: boolean;
}

const sigOf = (t: RenderTarget, vals: Values) => JSON.stringify([t, vals]);

export function useParamFocus(state: RefObject<FocusState>) {
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const pending = useRef<{ sig: string; data: Promise<FocusData | null> } | null>(null);
  const latest = useRef<{ file: string; data: FocusData } | null>(null);
  const last = useRef({ name: "", at: 0, n: 0 });
  const prefetchAbort = useRef<AbortController | null>(null);

  // The focus data for this model state is on its way (from a run made anyway, or its own).
  const setFocusData = useCallback((t: RenderTarget, vals: Values, data: Promise<FocusData | null>) => {
    pending.current = { sig: sigOf(t, vals), data };
    data.then((d) => {
      if (d) latest.current = { file: t.path ?? t.name, data: d };
    });
  }, []);

  // A newer prefetch cancels the older one (which then resolves to null).
  const prefetchFocus = useCallback(
    (t: RenderTarget, vals: Values) => {
      prefetchAbort.current?.abort();
      const ac = (prefetchAbort.current = new AbortController());
      setFocusData(
        t,
        vals,
        api
          .echo({ ...t, source: t.source + FOCUS_ECHO }, vals, ac.signal)
          .then((r) => parseFocusEcho(r.log))
          .catch(() => null),
      );
    },
    [setFocusData],
  );

  const focusOn = useCallback(
    async (name: string) => {
      const { target: t, values: vals, zoom } = state.current!;
      if (!zoom || !t) return;
      const now = performance.now();
      if (last.current.name === name && now - last.current.at < 600) return; // pointerdown + focus of the same touch
      const n = last.current.n + 1;
      last.current = { name, at: now, n };
      if (pending.current?.sig !== sigOf(t, vals)) prefetchFocus(t, vals);
      const known = latest.current;
      const data = known && known.file === (t.path ?? t.name) ? known.data : await pending.current!.data;
      const item = data?.items[name];
      if (last.current.n !== n || !data || !item) return; // superseded, or nothing to show
      setFocus(toRequest(name, n, item, data.frame));
    },
    [state, prefetchFocus],
  );

  return { focus, focusOn, setFocusData, prefetchFocus };
}
