// Save as, for a design: keep a copy under a new name in this browser. Files to download (the
// design file, STLs) are in Download ▾ (DownloadPanel.tsx).
import { scadFileName } from "../app/files";

interface Props {
  name: string;
  onName: (name: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function SaveAsPanel({ name, onName, onSubmit, onCancel }: Props) {
  return (
    <form
      className="save-as-panel"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
    >
      <label className="save-name">
        Name <input autoFocus value={name} placeholder="Name" onChange={(e) => onName(e.target.value)} />
      </label>
      <p className="save-warn">Only in this browser. To really keep it: Download ▾, Design file.</p>
      <div className="save-buttons">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={!scadFileName(name)}>
          Save
        </button>
      </div>
    </form>
  );
}
