// The ⚙ menu: theme, model colour, viewer background, grid and axes (appearance.ts).
import { BG_COLORS, DEFAULT_LOOK, MODEL_COLORS, useLook, type Look, type ThemeChoice } from "../appearance";
import { usePref } from "../uiPrefs";
import { Menu } from "./Menu";

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: [T, string][];
  onChange(v: T): void;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} className={v === value ? "active" : ""} aria-pressed={v === value} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

function Swatches({
  value,
  colors,
  onChange,
  label,
}: {
  value: string;
  colors: [string, string][];
  onChange(c: string): void;
  label: string;
}) {
  const known = colors.some(([, c]) => c.toLowerCase() === value.toLowerCase());
  return (
    <div className="swatches" role="group" aria-label={label}>
      {colors.map(([name, c]) => (
        <button
          key={c}
          className={`swatch-btn${c.toLowerCase() === value.toLowerCase() ? " active" : ""}`}
          style={{ background: c }}
          title={name}
          aria-label={name}
          aria-pressed={c.toLowerCase() === value.toLowerCase()}
          onClick={() => onChange(c)}
        />
      ))}
      <label className={`swatch-btn custom${known ? "" : " active"}`} title="Your own colour">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label}: your own colour`}
        />
      </label>
    </div>
  );
}

// The settings themselves (the ⚙ menu on desktop, inside the ☰ menu on a phone).
export function AppearancePanel() {
  const [look, setLook] = useLook();
  const [reports, setReports] = usePref("errorReports", true);
  const changed = JSON.stringify(look) !== JSON.stringify(DEFAULT_LOOK);
  return (
    <div className="appearance">
      <div className="appearance-row">
        <span>Theme</span>
        <Segmented<ThemeChoice>
          label="Theme"
          value={look.theme}
          onChange={(theme) => setLook({ theme })}
          options={[
            ["system", "System"],
            ["dark", "Dark"],
            ["light", "Light"],
          ]}
        />
      </div>
      <div className="appearance-row col">
        <span>Model colour</span>
        <Swatches
          label="Model colour"
          value={look.model}
          colors={MODEL_COLORS}
          onChange={(model) => setLook({ model })}
        />
      </div>
      <div className="appearance-row col">
        <span>Background</span>
        <Segmented<Look["background"]>
          label="Background"
          value={look.background}
          onChange={(background) => setLook({ background })}
          options={[
            ["theme", "Theme"],
            ["solid", "Solid"],
            ["gradient", "Gradient"],
          ]}
        />
        {look.background !== "theme" && (
          <Swatches label="Background colour" value={look.bg} colors={BG_COLORS} onChange={(bg) => setLook({ bg })} />
        )}
      </div>
      <div className="appearance-row checks">
        <label>
          <input type="checkbox" checked={look.grid} onChange={(e) => setLook({ grid: e.target.checked })} /> Grid
        </label>
        <label>
          <input type="checkbox" checked={look.axes} onChange={(e) => setLook({ axes: e.target.checked })} /> Axes
        </label>
        <button className="link" disabled={!changed} onClick={() => setLook(DEFAULT_LOOK)}>
          Reset
        </button>
      </div>
      <div className="appearance-row checks">
        <label title="When something goes wrong (an error, a render that hangs), the site logs what failed: the kind of design and the names of changed settings, never your lettering or values">
          <input type="checkbox" checked={reports} onChange={(e) => setReports(e.target.checked)} /> Send error reports
          (anonymous)
        </label>
      </div>
    </div>
  );
}

export function AppearanceMenu() {
  return (
    <Menu
      className="appearance-menu"
      label={<span aria-hidden="true">⚙</span>}
      title="Appearance: light or dark, model colour, background; error reports"
    >
      {() => <AppearancePanel />}
    </Menu>
  );
}
