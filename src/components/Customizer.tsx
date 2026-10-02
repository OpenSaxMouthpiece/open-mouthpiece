// Customizer panel built from OpenSCAD's own .param export, so it works for any file that uses
// Customizer annotations (/* [Group] */ tabs, // [min:step:max] sliders, // [a, b, c] dropdowns).
// Only values that differ from the file's defaults are sent to OpenSCAD (as -D overrides).
import { useEffect, useMemo, useState } from "react";
import { api, type ParamValue, type ScadParam } from "../api";
import { setSectionsOpen, usePref } from "../uiPrefs";
import { Fold } from "./Fold";
import { mmToThou, paramCaption, paramInactive, paramLabel, paramUnit, thouToMm, type DesignUnit } from "../design";

interface Props {
  title: string; // the file whose parameters these are
  params: ScadParam[];
  values: Record<string, ParamValue>;
  onChange(name: string, value: ParamValue | undefined): void; // undefined = back to the default
  onResetAll(): void;
  zoom: boolean; // zoom the view to the part a touched parameter shapes
  onZoomChange(on: boolean): void;
  onFocusParam(name: string): void;
  hideGroups?: string[]; // Customizer groups to leave out
  allowedOptions?: Record<string, string[]>; // dropdown values to offer, per parameter
  compact?: boolean; // no title line
  embedded?: boolean; // inside the Design panel: no head (its search, Zoom and Reset serve)
  filter?: string; // the search text when embedded
  showNames?: boolean; // each parameter's name in the file beside its label (while the code is open)
  notes?: string[]; // the generator's notes on the last render (a guarantee changed a value)
}

const same = (a: ParamValue, b: ParamValue) => JSON.stringify(a) === JSON.stringify(b);

export function Customizer({
  title,
  params,
  values,
  onChange,
  onResetAll,
  zoom,
  onZoomChange,
  onFocusParam,
  hideGroups = [],
  allowedOptions = {},
  compact = false,
  embedded = false,
  filter: outerFilter,
  showNames = false,
  notes = [],
}: Props) {
  const [ownFilter, setFilter] = useState("");
  const filter = outerFilter ?? ownFilter;
  const groups = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const map = new Map<string, ScadParam[]>();
    for (const p of params) {
      if (hideGroups.includes(p.group)) continue;
      if (f && ![p.name, paramLabel(p.name), p.caption ?? ""].some((t) => t.toLowerCase().includes(f))) continue;
      if (!map.has(p.group)) map.set(p.group, []);
      map.get(p.group)!.push(p);
    }
    return [...map.entries()];
  }, [params, filter, hideGroups]);
  const changed = Object.keys(values).length;
  // A parameter's current value (changed or the file's), for the "not used with this setting" hints.
  const current = (name: string) => {
    const q = params.find((x) => x.name === name);
    return name in values ? values[name] : q?.initial;
  };
  // Set another parameter of this file, if it has it (a picture's picker also sets its _aspect).
  const setParam = (name: string, v: ParamValue) => {
    const q = params.find((x) => x.name === name);
    if (q) onChange(name, same(v, q.initial) ? undefined : v);
  };

  if (params.length === 0) {
    return (
      <div className="customizer empty">
        No Customizer parameters in <b>{title}</b>. Top-level assignments like <code>size = 10; // [1:50]</code> show up
        here.
      </div>
    );
  }

  return (
    <div className="customizer">
      {!compact && !embedded && (
        <div
          className="customizer-title"
          title="Parameters declared in the rendered file (included files' parameters show only if this file declares them)"
        >
          Parameters of <b>{title}</b>
        </div>
      )}
      {!embedded && (
        <>
          <div className="customizer-head">
            <input
              className="filter"
              placeholder="Filter parameters"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <label
              className="zoom-toggle"
              title="When you touch a parameter, zoom the view to the part it shapes (and cut the model open for parts inside)"
            >
              <input type="checkbox" checked={zoom} onChange={(e) => onZoomChange(e.target.checked)} /> Zoom
            </label>
            <button disabled={!changed} onClick={onResetAll} title="Reset every parameter to the file's default">
              Reset{changed ? ` (${changed})` : ""}
            </button>
          </div>
          <PanelOptions ids={groups.map(([g]) => `p:${g}`)} />
        </>
      )}
      {notes.length > 0 && (
        <ul className="readout-notes customizer-notes">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      {groups.map(([group, ps]) => (
        <Fold
          key={group}
          id={`p:${group}`}
          title={group}
          forceOpen={!!filter.trim()}
          summary={`${ps.length} setting${ps.length > 1 ? "s" : ""}`}
          changed={ps.filter((p) => p.name in values).length}
        >
          {ps.map((p) => (
            <ParamRow
              key={p.name}
              p={p}
              value={values[p.name] ?? p.initial}
              changed={p.name in values}
              onFocus={() => onFocusParam(p.name)}
              onChange={(v) => onChange(p.name, same(v, p.initial) ? undefined : v)}
              setParam={setParam}
              options={allowedOptions[p.name]}
              unit={paramUnit(p.name)}
              caption={paramUnit(p.name) ? paramCaption(p.name) : undefined}
              showName={showNames}
              inactive={paramInactive(p.name, current)}
            />
          ))}
        </Fold>
      ))}
    </div>
  );
}

// Under a panel's head: open or close every section, and show every description (or each on its ⓘ).
export function PanelOptions({ ids }: { ids: string[] }) {
  const [captions, setCaptions] = usePref("captions", true);
  return (
    <div className="panel-options">
      <button className="link" onClick={() => setSectionsOpen(ids, true)}>
        Expand all
      </button>
      <button className="link" onClick={() => setSectionsOpen(ids, false)}>
        Collapse all
      </button>
      <label title="Show what each setting does under it (or tap its i)">
        <input type="checkbox" checked={captions} onChange={(e) => setCaptions(e.target.checked)} /> Descriptions
      </label>
    </div>
  );
}

export interface RowProps {
  p: ScadParam;
  value: ParamValue;
  changed: boolean;
  onChange(v: ParamValue): void;
  onFocus(): void;
  setParam(name: string, v: ParamValue): void;
  label?: string; // shown instead of paramLabel(name)
  showName?: boolean; // also show the parameter's name in the file
  unit?: DesignUnit;
  options?: string[]; // offer only these of a dropdown's values
  caption?: string; // shown instead of the file's description
  optionLabels?: Record<string, string>; // shown instead of a dropdown value
  inactive?: string | null; // why this parameter does nothing with the current settings (shown dimmed)
}

export function ParamRow({
  p,
  value,
  changed,
  onChange,
  onFocus,
  setParam,
  label,
  unit,
  options,
  caption,
  optionLabels,
  showName = false,
  inactive,
}: RowProps) {
  const [allCaptions] = usePref("captions", true);
  const [own, setOwn] = useState(false); // this row's ⓘ
  const text = caption ?? p.caption;
  return (
    <div
      className={`param${changed ? " changed" : ""}${inactive ? " inactive" : ""}`}
      onPointerDown={onFocus}
      onFocus={onFocus}
    >
      <div className="param-label">
        <span
          title={
            text
              ? `${text}
(${p.name})`
              : p.name
          }
        >
          {label ?? paramLabel(p.name)}
          {showName && <code className="param-name">{p.name}</code>}
        </span>
        {text && !allCaptions && (
          <button
            className={`info${own ? " on" : ""}`}
            aria-expanded={own}
            aria-label="What this does"
            title={own ? "Hide the description" : text}
            onClick={() => setOwn(!own)}
          >
            i
          </button>
        )}
        {changed && (
          <button className="reset" title={`Reset to ${JSON.stringify(p.initial)}`} onClick={() => onChange(p.initial)}>
            ↺
          </button>
        )}
      </div>
      {text && (allCaptions || own) && <div className="param-caption">{text}</div>}
      {inactive && <div className="param-inactive">Not used now: {inactive}</div>}
      <ParamInput
        p={p}
        value={value}
        onChange={onChange}
        setParam={setParam}
        unit={unit}
        options={options}
        optionLabels={optionLabels}
      />
    </div>
  );
}

function ParamInput({
  p,
  value,
  onChange,
  setParam,
  unit,
  options,
  optionLabels,
}: {
  p: ScadParam;
  value: ParamValue;
  onChange(v: ParamValue): void;
  setParam(name: string, v: ParamValue): void;
  unit?: DesignUnit;
  options?: string[];
  optionLabels?: Record<string, string>;
}) {
  if (p.options) {
    const idx = p.options.findIndex((o) => String(o.value) === String(value));
    const shown = p.options
      .map((o, i) => ({ o, i }))
      .filter(({ o, i }) => !options || options.includes(String(o.value)) || i === idx);
    return (
      <select value={idx} onChange={(e) => onChange(p.options![Number(e.target.value)].value)}>
        {idx < 0 && <option value={-1}>{String(value)}</option>}
        {shown.map(({ o, i }) => (
          <option key={i} value={i}>
            {optionLabels?.[String(o.value)] ?? o.name.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    );
  }
  if (unit === "thou" && typeof value === "number") return <ThouInput p={p} value={value} onChange={onChange} />;
  if (p.type === "boolean") {
    return <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />;
  }
  if (p.type === "string" && p.name.endsWith("_image")) {
    return <ImagePicker value={String(value)} onChange={onChange} onAspect={(a) => setParam(`${p.name}_aspect`, a)} />;
  }
  if (p.type === "string") {
    return <input type="text" value={String(value)} onChange={(e) => onChange(e.target.value)} />;
  }
  if (Array.isArray(value)) {
    const vec = value as number[]; // Customizer vectors are flat (point lists aren't parameters)
    return (
      <div className="vector">
        {vec.map((v, i) => (
          <NumberField key={i} p={p} value={v} onChange={(n) => onChange(vec.map((x, j) => (j === i ? n : x)))} />
        ))}
      </div>
    );
  }
  const n = Number(value);
  const slider = p.min !== undefined && p.max !== undefined;
  return (
    <div className="number">
      {slider && (
        <input
          type="range"
          min={p.min}
          max={p.max}
          step={p.step ?? "any"}
          value={n}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      )}
      <NumberField p={p} value={n} onChange={onChange} />
    </div>
  );
}

// A picture parameter (name ending in _image): pick one of the example SVGs in scad/art/ or add
// one from this device (phone included), which stays in this browser (userArt.ts) and is left out
// of share links; the value is the file name the generator imports. Picking
// one also sets <name>_aspect (height / width as OpenSCAD reads the drawing, measured by
// OpenSCAD in the browser), which the generator can't measure itself.
export function ImagePicker({
  value,
  onChange,
  onAspect,
}: {
  value: string;
  onChange(v: string): void;
  onAspect(a: number): void;
}) {
  const [files, setFiles] = useState<string[]>([]);
  const [aspects, setAspects] = useState<Record<string, number | null>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stamp, setStamp] = useState(0); // re-fetch the thumbnail after replacing a file
  const refresh = () =>
    api
      .art()
      .then((r) => {
        setFiles(r.files);
        setAspects(r.aspect ?? {});
      })
      .catch((e) => setError(String(e.message ?? e)));
  const pick = (name: string, aspect = aspects[name]) => {
    onChange(name);
    if (name && aspect) onAspect(aspect);
  };
  useEffect(() => {
    refresh();
  }, []);

  async function upload(file: File) {
    setError("");
    setBusy(true);
    try {
      if (!/\.svg$/i.test(file.name) && file.type !== "image/svg+xml")
        throw new Error("Pick an SVG file (.svg). Photos and PNGs need converting to an outline first.");
      const r = await api.uploadArt(file.name, await file.text());
      await refresh();
      setStamp(Date.now());
      pick(r.name, r.aspect);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="image-picker">
      <div className="image-picker-row">
        <select value={value} onChange={(e) => pick(e.target.value)}>
          <option value="">(none)</option>
          {value && !files.includes(value) && <option value={value}>{value} (missing)</option>}
          {files.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <label
          className={`button${busy ? " disabled" : ""}`}
          title="Use an SVG drawing from this device. It stays in this browser: it is not saved into the project or put in share links (one with the same name is replaced)"
        >
          {busy ? "Uploading…" : "Upload SVG…"}
          <input
            type="file"
            accept=".svg,image/svg+xml"
            hidden
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) upload(f);
            }}
          />
        </label>
      </div>
      {value && files.includes(value) && <img className="image-thumb" src={api.artUrl(value, stamp)} alt={value} />}
      {error && <div className="image-error">{error}</div>}
    </div>
  );
}

// Typed numbers stay inside the parameter's slider range (the range the generator is swept over).
const clamp = (p: ScadParam, n: number) => Math.min(p.max ?? Infinity, Math.max(p.min ?? -Infinity, n));
// Text typed into a number box, kept while the box has focus; dropped when the value changes
// from elsewhere (another design, Reset, the slider) so the box never shows a stale number.
function useTypedText(value: number) {
  const [text, setText] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(null);
  }, [value, focused]);
  return {
    text,
    setText,
    onFocus: () => setFocused(true),
    onBlur: () => {
      setFocused(false);
      setText(null);
    },
  };
}

// A length players quote in thousandths of an inch (tip opening): slider in mm, number box in
// thousandths ("76" = .076" = 1.93 mm), the mm value beside it. A number in the mm range typed
// instead ("1.93") is taken as mm: no tip opening is under 10 thousandths, and the file's own
// description is in mm. While typing, only a value inside the range is applied (so "7" on the way
// to "76" doesn't jump to the smallest tip); leaving the box applies the rest, clamped.
function ThouInput({ p, value, onChange }: { p: ScadParam; value: number; onChange(v: number): void }) {
  const { text, setText, onFocus, onBlur } = useTypedText(value);
  const thou = Math.round(mmToThou(value)); // whole thousandths, as players quote them (and the readout shows)
  const toMm = (n: number) => (n < 10 ? n : thouToMm(n));
  const inRange = (mm: number) => mm >= (p.min ?? -Infinity) && mm <= (p.max ?? Infinity);
  const typed =
    text !== null && text.trim() !== "" && Number.isFinite(Number(text)) && Number(text) > 0 ? Number(text) : null;
  const commit = (mm: number) => onChange(clamp(p, Math.round(mm * 1000) / 1000));
  return (
    <div className="number thou">
      {p.min !== undefined && p.max !== undefined && (
        <input
          type="range"
          min={p.min}
          max={p.max}
          step={p.step ?? "any"}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      )}
      <span className="unit-box">
        <span className="unit">.</span>
        <input
          type="number"
          step="any"
          value={text ?? String(thou)}
          aria-label="thousandths of an inch (or mm)"
          onChange={(e) => {
            setText(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value.trim() !== "" && Number.isFinite(n) && n > 0 && inRange(toMm(n))) commit(toMm(n));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          onFocus={onFocus}
          onBlur={() => {
            if (typed !== null) commit(toMm(typed));
            onBlur();
          }}
        />
        <span className="unit">"</span>
      </span>
      <span className="unit-alt">
        {typed !== null && typed < 10 ? "as mm: " : ""}
        {value.toFixed(2)} mm
      </span>
    </div>
  );
}

// Number box that allows transient text ("-", "1.") while typing and commits valid numbers.
function NumberField({ p, value, onChange }: { p: ScadParam; value: number; onChange(n: number): void }) {
  const { text, setText, onFocus, onBlur } = useTypedText(value);
  return (
    <input
      type="number"
      step={p.step ?? "any"}
      min={p.min}
      max={p.max}
      value={text ?? String(value)}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value.trim() !== "" && Number.isFinite(n)) onChange(clamp(p, n));
      }}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
}
