// CodeMirror 6 editor for OpenSCAD source (C-like highlighting), one document per open tab: each
// tab keeps its own EditorState (text, undo history, selection, scroll). Ctrl/Cmd+Enter, F5 or F6
// renders.
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { keymap } from "@codemirror/view";
import { Compartment, EditorState, Prec, type Extension } from "@codemirror/state";
import { cpp } from "@codemirror/lang-cpp";
import { oneDark } from "@codemirror/theme-one-dark";
import { useTheme } from "../appearance";

export interface EditorHandle {
  gotoLine(line: number): void;
  refresh(): void; // re-measure after being hidden (e.g. the phone layout's panels)
}

interface Props {
  docKey: string;   // which tab is shown
  doc: string;      // that tab's text (external changes — reload, swap — are applied to the editor)
  readOnly?: boolean; // that tab can't be edited (a preset)
  onChange(key: string, text: string): void;
  onRun(): void;
}

export const Editor = forwardRef<EditorHandle, Props>(function Editor({ docKey, doc, readOnly = false, onChange, onRun }, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const states = useRef(new Map<string, EditorState>());
  const shownKey = useRef(docKey);
  // Latest callbacks, so the editor (created once) never calls stale closures.
  const cb = useRef({ onChange, onRun });
  cb.current = { onChange, onRun };

  const extensions = useRef<Extension[]>([]);
  const ro = useRef(new Compartment());
  const look = useRef(new Compartment()); // dark (One Dark) or CodeMirror's light default, with the app's theme
  const theme = useTheme();
  if (!extensions.current.length) {
    const run = () => {
      cb.current.onRun();
      return true;
    };
    extensions.current = [
      basicSetup,
      ro.current.of([]),
      cpp(),
      look.current.of(theme === "dark" ? oneDark : []),
      Prec.highest(keymap.of([{ key: "Mod-Enter", run }, { key: "F6", run }, { key: "F5", run }])),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) cb.current.onChange(shownKey.current, u.state.doc.toString());
      }),
      EditorView.theme({ "&": { height: "100%" }, ".cm-scroller": { fontFamily: "var(--mono)" } }),
    ];
  }

  useEffect(() => {
    const view = new EditorView({ state: EditorState.create({ doc, extensions: extensions.current }), parent: hostRef.current! });
    viewRef.current = view;
    return () => view.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch tabs (keeping each tab's state), and apply external text changes.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (docKey !== shownKey.current) {
      states.current.set(shownKey.current, view.state);
      shownKey.current = docKey;
      view.setState(states.current.get(docKey) ?? EditorState.create({ doc, extensions: extensions.current }));
    }
    view.dispatch({ effects: look.current.reconfigure(theme === "dark" ? oneDark : []) });
    view.dispatch({ effects: ro.current.reconfigure(readOnly ? [EditorState.readOnly.of(true), EditorView.editable.of(false)] : []) });
    const cur = view.state.doc.toString();
    if (cur !== doc) { // replace only the changed span, so the cursor and scroll stay put
      let a = 0, b = 0;
      while (a < cur.length && a < doc.length && cur[a] === doc[a]) a++;
      while (b < cur.length - a && b < doc.length - a && cur[cur.length - 1 - b] === doc[doc.length - 1 - b]) b++;
      view.dispatch({ changes: { from: a, to: cur.length - b, insert: doc.slice(a, doc.length - b) } });
    }
  }, [docKey, doc, readOnly, theme]);

  useImperativeHandle(ref, () => ({
    refresh() {
      viewRef.current?.requestMeasure();
    },
    gotoLine(line) {
      const view = viewRef.current;
      if (!view) return;
      const l = view.state.doc.line(Math.max(1, Math.min(line, view.state.doc.lines)));
      view.dispatch({ selection: { anchor: l.from, head: l.to }, scrollIntoView: true });
      view.focus();
    },
  }));

  return <div className="editor" ref={hostRef} />;
});
