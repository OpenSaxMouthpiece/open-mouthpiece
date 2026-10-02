// The code editor's open files. ▶ marks the rendered file, 🔒 a read-only project file, ● unsaved text.
import { isDirty, isLibrary, type Tab } from "../app/files";

interface Props {
  tabs: Tab[];
  activeKey: string;
  mainKey: string;
  armedClose: string | null; // a tab whose close was clicked once (unsaved: click again to discard)
  isReadOnly: (t: Tab) => boolean;
  onActivate: (key: string) => void;
  onClose: (key: string) => void;
}

export function TabBar({ tabs, activeKey, mainKey, armedClose, isReadOnly, onActivate, onClose }: Props) {
  return (
    <div className="tabbar">
      {tabs.map((t) => {
        const main = t.key === mainKey;
        const armed = armedClose === t.key;
        const where = t.path ?? `${t.name} (from your computer — not saved)`;
        const role = main ? " · rendered" : isLibrary(t) ? " · included by other files" : "";
        return (
          <div
            key={t.key}
            className={`tab${t.key === activeKey ? " active" : ""}${main ? " main" : ""}`}
            title={where + role}
            onClick={() => onActivate(t.key)}
          >
            {main && (
              <span className="main-dot" title="This file is rendered">
                ▶
              </span>
            )}
            {isReadOnly(t) && (
              <span className="lock" title="Part of the project, read-only (Save as… for your own copy)">
                🔒
              </span>
            )}
            <span className="tab-name">{t.path && t.path.includes("/") ? t.path : t.name}</span>
            {(isDirty(t) || !t.path) && (
              <span className="dirty" title={t.path ? "Unsaved changes (used in renders)" : "Not saved"}>
                ●
              </span>
            )}
            <button
              className={`close${armed ? " armed" : ""}`}
              title={armed ? "Unsaved — click again to discard" : "Close"}
              onClick={(e) => {
                e.stopPropagation();
                onClose(t.key);
              }}
            >
              {armed ? "!" : "×"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
