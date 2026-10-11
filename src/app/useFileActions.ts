// File and tab actions used by the app shell: open, switch, close, edit, and save designs.
import { useCallback, type Dispatch, type RefObject, type SetStateAction } from "react";
import { api } from "../api";
import { migrateScad } from "../migrate";
import { withValues } from "../scadText";
import type { Status } from "../hooks/useModelRender";
import {
  isDirty,
  isLibrary,
  localTab,
  presetFor,
  projectTab,
  rebaseGenerator,
  scadFileName,
  voiceLabel,
  type Tab,
  type Values,
} from "./files";

type FileActionState = {
  tabs: Tab[];
  readOnly: Set<string>;
  ownFiles: Set<string>;
  valuesByKey: Record<string, Values>;
};

interface Options {
  state: RefObject<FileActionState>;
  tabs: Tab[];
  setTabs: Dispatch<SetStateAction<Tab[]>>;
  setFiles: Dispatch<SetStateAction<string[]>>;
  setReadOnly: Dispatch<SetStateAction<Set<string>>>;
  setOwnFiles: Dispatch<SetStateAction<Set<string>>>;
  activeKey: string;
  setActiveKey: Dispatch<SetStateAction<string>>;
  mainKey: string;
  setMainKey: Dispatch<SetStateAction<string>>;
  valuesByKey: Record<string, Values>;
  setValuesByKey: Dispatch<SetStateAction<Record<string, Values>>>;
  activeTab: Tab | undefined;
  armedClose: string | null;
  setArmedClose: Dispatch<SetStateAction<string | null>>;
  setSaveAs: Dispatch<SetStateAction<string | null>>;
  notify: (status: Status) => void;
  fail: (status: Status) => void;
}

export function useFileActions({
  state,
  tabs,
  setTabs,
  setFiles,
  setReadOnly,
  setOwnFiles,
  activeKey,
  setActiveKey,
  mainKey,
  setMainKey,
  valuesByKey,
  setValuesByKey,
  activeTab,
  armedClose,
  setArmedClose,
  setSaveAs,
  notify,
  fail,
}: Options) {
  const refreshFiles = useCallback(async () => {
    const r = await api.files();
    setFiles(r.files);
    setReadOnly(new Set(r.readOnly ?? []));
    setOwnFiles(new Set(r.own ?? []));
    return r;
  }, [setFiles, setReadOnly, setOwnFiles]);

  const activate = useCallback(
    (key: string, tabsNow?: Tab[]) => {
      setActiveKey(key);
      const t = (tabsNow ?? state.current?.tabs ?? []).find((x) => x.key === key);
      if (t && !isLibrary(t)) setMainKey(key); // library files render through whichever file includes them
    },
    [setActiveKey, setMainKey, state],
  );

  const openTab = useCallback(
    (t: Tab) => {
      setTabs((old) => {
        const next = old.some((x) => x.key === t.key) ? old : [...old, t];
        activate(t.key, next);
        return next;
      });
    },
    [activate, setTabs],
  );

  const openProjectFile = useCallback(
    async (p: string): Promise<boolean> => {
      if (state.current?.tabs.some((t) => t.key === p)) {
        activate(p);
        return true;
      }
      try {
        openTab(projectTab(p, (await api.file(p)).source));
        return true;
      } catch (err) {
        fail({ text: `Could not open ${p}: ${(err as Error).message}`, kind: "error" });
        return false;
      }
    },
    [state, activate, openTab, fail],
  );

  const openLocalFile = useCallback(
    async (file: File) => {
      const taken = (key: string) => !!state.current?.tabs.some((t) => t.key === key);
      openTab(localTab(file.name, migrateScad(await file.text()), taken));
    },
    [state, openTab],
  );

  const replaceWithPreset = useCallback(
    async (key: string, source: string) => {
      const p = presetFor(source);
      const open = state.current?.tabs.find((x) => x.key === p);
      const next = open ?? projectTab(p, (await api.file(p)).source);
      setTabs((old) => {
        const rest = [...old.filter((x) => x.key !== key), ...(open ? [] : [next])];
        activate(next.key, rest);
        return rest;
      });
    },
    [state, setTabs, activate],
  );

  const closeTab = useCallback(
    (key: string) => {
      const t = tabs.find((x) => x.key === key);
      if (!t) return;
      if ((isDirty(t) || (t.path === null && t.source.trim() !== "")) && armedClose !== key) {
        setArmedClose(key);
        notify({
          text: `${t.name} isn't saved: close it again to discard it (or Save it first)`,
          short: `Close again to discard ${t.name}`,
          kind: "idle",
        });
        return;
      }
      setArmedClose(null);
      if (key === mainKey) {
        replaceWithPreset(key, t.source).catch((err) =>
          fail({ text: `Close failed: ${(err as Error).message}`, kind: "error" }),
        );
        return;
      }
      const rest = tabs.filter((x) => x.key !== key);
      setTabs(rest);
      if (activeKey === key) activate(mainKey, rest);
    },
    [tabs, armedClose, setArmedClose, notify, mainKey, replaceWithPreset, fail, setTabs, activeKey, activate],
  );

  const updateSource = useCallback(
    (key: string, text: string) => {
      if (state.current?.readOnly.has(key)) return; // presets (project files are keyed by path)
      setTabs((old) => old.map((t) => (t.key === key && t.source !== text ? { ...t, source: text } : t)));
    },
    [state, setTabs],
  );

  const revertTab = useCallback(
    (t: Tab) => {
      if (t.saved === null) return;
      setTabs((old) => old.map((x) => (x.key === t.key ? { ...x, source: x.saved ?? x.source } : x)));
      notify({ text: `Reverted ${t.path} to the saved file`, kind: "ok" });
    },
    [setTabs, notify],
  );

  const dropValues = useCallback(
    (key: string) =>
      setValuesByKey((v) => {
        const n = { ...v };
        delete n[key];
        return n;
      }),
    [setValuesByKey],
  );

  const saveTab = useCallback(
    async (t: Tab) => {
      if (!t.path) {
        setSaveAs(t.name.endsWith(".scad") ? t.name : `${t.name}.scad`);
        return;
      }
      const current = state.current;
      if (!current?.ownFiles.has(t.path)) {
        setSaveAs(t.path.replace(/([^/]+)$/, "my_$1"));
        notify({ text: `${t.path} is part of the project: save your own copy (kept in this browser)`, kind: "idle" });
        return;
      }
      const vals = current.valuesByKey[t.key] ?? {};
      const source = Object.keys(vals).length ? withValues(t.source, vals) : t.source;
      try {
        await api.save(t.path, source);
        setTabs((old) => old.map((x) => (x.key === t.key ? { ...x, source, saved: source } : x)));
        dropValues(t.key);
        notify({ text: `Saved ${voiceLabel(t.path)} in this browser`, kind: "ok" });
      } catch (err) {
        fail({ text: `Save failed: ${(err as Error).message}`, kind: "error" });
      }
    },
    [state, setSaveAs, notify, setTabs, dropValues, fail],
  );

  // Saving as turns the current values into a new browser-local design file.
  const doSaveAs = useCallback(
    async (rel: string, t: Tab | undefined = activeTab) => {
      const p = scadFileName(rel);
      if (!t || !p) {
        fail({ text: "Save as: give the design a name", kind: "error" });
        return;
      }
      const fromPreset = !!t.path && !!state.current?.readOnly.has(t.path);
      const source = rebaseGenerator(withValues(t.source, valuesByKey[t.key] ?? {}), p);
      try {
        await api.save(p, source);
        setSaveAs(null);
        const moved = projectTab(p, source);
        setTabs((old) => [...old.filter((x) => x.key !== t.key && x.key !== p), moved]);
        setValuesByKey((v) => {
          const n = { ...v };
          delete n[p];
          if (fromPreset) delete n[t.key];
          return n;
        });
        setActiveKey(p);
        if (mainKey === t.key || !isLibrary(moved)) setMainKey(p);
        refreshFiles().catch(() => {});
        notify({ text: `Saved as “${voiceLabel(p)}” in this browser`, kind: "ok" });
      } catch (err) {
        fail({ text: `Save failed: ${(err as Error).message}`, kind: "error" });
      }
    },
    [
      activeTab,
      fail,
      mainKey,
      notify,
      refreshFiles,
      setActiveKey,
      setMainKey,
      setSaveAs,
      setTabs,
      setValuesByKey,
      state,
      valuesByKey,
    ],
  );

  return {
    refreshFiles,
    activate,
    openTab,
    openProjectFile,
    openLocalFile,
    replaceWithPreset,
    closeTab,
    updateSource,
    revertTab,
    dropValues,
    saveTab,
    doSaveAs,
  };
}
