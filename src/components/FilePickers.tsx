// The dropdowns that pick a mouthpiece: which one to design (the voice picker) and which one to
// compare with. Both list presets, variants and the user's own designs.
import { baseName, isExtra, isVariant, voiceLabel, type Tab } from "../app/files";

// Files of the site, sorted for the pickers.
export interface FileGroups {
  presets: string[]; // read-only project files, variants and extras excluded
  variants: string[];
  extras: string[];
  own: string[]; // kept in this browser
}

// Voices in pitch order (soprano, alto, C-melody, tenor, baritone), the way players list them.
const VOICES = ["soprano", "alto", "c_melody", "tenor", "baritone"];
const voiceRank = (p: string) => {
  const b = baseName(p);
  const i = VOICES.findIndex((v) => b === v || b.startsWith(v + "_"));
  return i < 0 ? VOICES.length : i;
};
const byVoice = (a: string, b: string) => voiceRank(a) - voiceRank(b) || a.localeCompare(b);

export function groupFiles(files: string[], readOnly: Set<string>, own: Set<string>): FileGroups {
  const ro = files.filter((f) => readOnly.has(f)).sort(byVoice);
  return {
    presets: ro.filter((f) => !isVariant(f) && !isExtra(f)),
    variants: ro.filter(isVariant),
    extras: ro.filter(isExtra),
    own: files.filter((f) => own.has(f)),
  };
}

// value: the path, after `prefix`
const options = (paths: string[], prefix: string) =>
  paths.map((f) => (
    <option key={f} value={prefix + f}>
      {voiceLabel(f)}
    </option>
  ));

function GroupOptions({ groups, prefix = "" }: { groups: FileGroups; prefix?: string }) {
  return (
    <>
      <optgroup label="Presets">{options(groups.presets, prefix)}</optgroup>
      {groups.variants.length > 0 && <optgroup label="Variants">{options(groups.variants, prefix)}</optgroup>}
      {groups.extras.length > 0 && <optgroup label="Extras">{options(groups.extras, prefix)}</optgroup>}
      {groups.own.length > 0 && <optgroup label="Your designs">{options(groups.own, prefix)}</optgroup>}
    </>
  );
}

// Which mouthpiece to design (the file that is rendered). `others`: open files not in the groups.
export function VoicePicker(props: {
  value: string;
  groups: FileGroups;
  others: Tab[];
  onPick: (key: string) => void;
}) {
  return (
    <select
      className="voice-picker"
      value={props.value}
      title="Which mouthpiece to design (the file that is rendered)"
      onChange={(e) => props.onPick(e.target.value)}
    >
      <GroupOptions groups={props.groups} />
      {props.others.length > 0 && (
        <optgroup label="Open files">
          {props.others.map((t) => (
            <option key={t.key} value={t.key}>
              {voiceLabel(t.path ?? t.name)}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}

export type ComparePick =
  | { kind: "stl" } // an STL from this device
  | { kind: "scad" } // a .scad from this device
  | { kind: "file"; path: string } // a preset, variant or saved design
  | { kind: "tab"; key: string }; // an open, unsaved file

// Compare with another mouthpiece (it becomes model B).
export function CompareSelect(props: { groups: FileGroups; unsaved: Tab[]; onPick: (p: ComparePick) => void }) {
  return (
    <select
      value=""
      className="compare-select"
      onChange={(e) => {
        const v = e.target.value;
        if (!v) return;
        const i = v.indexOf(":");
        const kind = v.slice(0, i),
          rest = v.slice(i + 1);
        props.onPick(
          kind === "stl" || kind === "scad"
            ? { kind }
            : kind === "tab"
              ? { kind, key: rest }
              : { kind: "file", path: rest },
        );
      }}
      title="Compare with another mouthpiece: a preset, one of your designs, or a file from this device (an STL of a mouthpiece you own a model of, or a .scad). You can also drop a file on the page."
    >
      <option value="">Compare with…</option>
      <optgroup label="From this device">
        <option value="stl:">STL file…</option>
        <option value="scad:">.scad file…</option>
      </optgroup>
      <GroupOptions groups={props.groups} prefix="file:" />
      {props.unsaved.length > 0 && (
        <optgroup label="Open files (not saved)">
          {props.unsaved.map((t) => (
            <option key={t.key} value={`tab:${t.key}`}>
              {t.name}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
