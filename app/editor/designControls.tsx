import {
  createContext,
  useContext,
  useId,
  useRef,
  type ReactNode,
} from "react";
import { ColorField } from "./controls";

/**
 * Visual controls for Design dialogs: grouped cards, picture choices,
 * sliders with exact values, presets and swatches. Built on native inputs
 * (React 18 wires their events) and styled to match the admin.
 */

/** A part of the selected item: a selector inside it (":scope" = the item). */
export interface DesignFocus {
  target: string;
  /** Shown on the phone's name tag, e.g. "Tab text". */
  label: string;
}

/**
 * Design dialogs: which part of the selected item the settings being used
 * change. Hovering shows it for a moment; touching (click, typing, slider)
 * keeps it highlighted until another part is touched.
 */
export const DesignFocusContext = createContext<{
  hover: (focus: DesignFocus | null) => void;
  touch: (focus: DesignFocus) => void;
}>({ hover: () => undefined, touch: () => undefined });

/** Handlers that report `focus` to the phone preview. */
function useFocusHandlers(focus: DesignFocus | undefined) {
  const { hover, touch } = useContext(DesignFocusContext);
  if (!focus) return {};
  return {
    onMouseEnter: () => hover(focus),
    onMouseLeave: () => hover(null),
    onPointerDown: () => touch(focus),
    onFocus: () => touch(focus),
  };
}

/** Any settings that change one part of the item (for fields outside cards). */
export function FocusArea({
  target,
  label,
  children,
}: DesignFocus & { children: ReactNode }) {
  return (
    <div className="chm-focusarea" {...useFocusHandlers({ target, label })}>
      {children}
    </div>
  );
}

/** A titled group of settings ("Spacing", "Look"…). */
export function DesignGroup({
  title,
  icon,
  hint,
  help,
  target,
  children,
}: {
  title: string;
  icon: ReactNode;
  hint?: string;
  /** What these settings change, in plain words (the ⓘ tooltip). */
  help?: string;
  /** The part these settings change, highlighted on the phone on hover. */
  target?: string;
  children: ReactNode;
}) {
  const tipId = useId();
  const handlers = useFocusHandlers(
    target ? { target, label: title } : undefined,
  );
  return (
    <section className="chm-dgroup" {...handlers}>
      <header className="chm-dgroup__head">
        <span className="chm-dgroup__icon" aria-hidden="true">
          {icon}
        </span>
        <span className="chm-dgroup__title">{title}</span>
        {help && (
          <span className="chm-dgroup__help">
            <s-icon type="info" tone="neutral" interestFor={tipId} />
            {/* Outside the header's layout: showing it never shifts anything. */}
            <span className="chm-tooltip-anchor">
              <s-tooltip id={tipId}>{help}</s-tooltip>
            </span>
          </span>
        )}
        {target && (
          <span className="chm-dgroup__seen" aria-hidden="true">
            Highlighted on the phone
          </span>
        )}
        {hint && <span className="chm-dgroup__hint">{hint}</span>}
      </header>
      <div className="chm-dgroup__body">{children}</div>
    </section>
  );
}

/**
 * The value a setting had when its dialog opened: what "Reset" goes back to
 * (for a fresh template menu, the template's own value).
 */
function useStartValue<T>(value: T): T {
  return useRef(value).current;
}

const sameValue = (a: unknown, b: unknown) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** "↺ Reset", shown once a setting differs from its value at the start. */
function ResetButton({
  shown,
  describe,
  onReset,
}: {
  shown: boolean;
  /** The value it goes back to, for the tooltip ("12 px", "Default"). */
  describe: string;
  onReset: () => void;
}) {
  if (!shown) return null;
  return (
    <button
      type="button"
      className="chm-reset"
      title={`Back to ${describe}`}
      aria-label={`Reset to ${describe}`}
      onClick={onReset}
    >
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
        <path
          d="M3.5 8a4.5 4.5 0 1 0 1.3-3.2M3.5 2.5v2.8h2.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Reset
    </button>
  );
}

/** Pick one of a few options shown as small pictures. */
export function ChoiceTiles<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; picture: ReactNode }[];
  onChange: (value: T) => void;
}) {
  const start = useStartValue(value);
  return (
    <div className="chm-field">
      <div className="chm-field__top chm-field__top--end">
        <ResetButton
          shown={!sameValue(value, start)}
          describe={
            options.find((option) => option.value === start)?.label ??
            "the start"
          }
          onReset={() => onChange(start)}
        />
      </div>
      <div className="chm-choices" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            className="chm-choice"
            onClick={() => onChange(option.value)}
          >
            <span className="chm-choice__picture" aria-hidden="true">
              {option.picture}
            </span>
            <span className="chm-choice__label">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** A row of small pill buttons for quick values (e.g. 1–4 columns). */
export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | undefined;
  /** `label` can be a picture; `title` then names it for screen readers. */
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (value: T) => void;
}) {
  const start = useStartValue(value);
  const startOption = options.find((option) => option.value === start);
  return (
    <div className="chm-field">
      <div className="chm-field__top">
        <span className="chm-field__label">{label}</span>
        <ResetButton
          shown={start !== undefined && !sameValue(value, start)}
          describe={
            startOption?.title ??
            (typeof startOption?.label === "string"
              ? startOption.label
              : String(start))
          }
          onReset={() => start !== undefined && onChange(start)}
        />
      </div>
      <div className="chm-segment" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            aria-label={option.title}
            title={option.title}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * A slider with its value in a pill and a box for an exact number. Empty
 * means "default" (the field shows the placeholder).
 */
export function SliderField({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  unit = "px",
  presets,
  placeholder = "Default",
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max: number;
  step?: number;
  unit?: string;
  /** Quick values shown as chips under the slider. */
  presets?: { label: string; value: number }[];
  placeholder?: string;
}) {
  const start = useStartValue(value);
  const shown = value ?? min;
  const sliderMax = Math.max(max, shown);
  const id = `chm-slider-${label.toLowerCase().replace(/\W+/g, "-")}`;
  const set = (raw: string) => {
    if (raw === "") return onChange(undefined);
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) onChange(Math.max(min, parsed));
  };
  return (
    <div className="chm-field">
      <div className="chm-field__top">
        <label className="chm-field__label" htmlFor={id}>
          {label}
        </label>
        <ResetButton
          shown={!sameValue(value, start)}
          describe={
            start === undefined ? placeholder.toLowerCase() : `${start} ${unit}`
          }
          onReset={() => onChange(start)}
        />
        <span className="chm-field__number">
          <input
            type="number"
            inputMode="numeric"
            aria-label={`${label} (${unit})`}
            value={value ?? ""}
            placeholder={placeholder}
            min={min}
            step={step}
            onChange={(event) => set(event.target.value)}
          />
          <span>{unit}</span>
        </span>
      </div>
      <input
        id={id}
        className="chm-slider"
        type="range"
        min={min}
        max={sliderMax}
        step={step}
        value={shown}
        style={
          {
            "--chm-fill": `${((shown - min) / (sliderMax - min || 1)) * 100}%`,
          } as React.CSSProperties
        }
        onChange={(event) => set(event.target.value)}
      />
      {presets && (
        <div className="chm-presets">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              aria-pressed={value === preset.value}
              onClick={() => onChange(preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const SWATCHES: { label: string; value: string }[] = [
  { label: "White", value: "#FFFFFF" },
  { label: "Soft gray", value: "#F4F4F5" },
  { label: "Warm", value: "#F3EFE8" },
  { label: "Mint", value: "#E4F5E1" },
  { label: "Blush", value: "#FDF2F6" },
  { label: "Sky", value: "#EAF4FF" },
  { label: "Ink", value: "#1A1A1A" },
];

/** The admin color picker plus one-click swatches and "None". */
export function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  const start = useStartValue(value);
  const current = value?.toUpperCase();
  return (
    <div className="chm-field">
      <ColorField
        label={label}
        value={value}
        onChange={(next) => onChange(next || undefined)}
      />
      <div
        className="chm-swatches"
        role="group"
        aria-label={`${label} presets`}
      >
        <button
          type="button"
          className="chm-swatch chm-swatch--none"
          aria-pressed={!value}
          title="None"
          aria-label="None"
          onClick={() => onChange(undefined)}
        />
        {SWATCHES.map((swatch) => (
          <button
            key={swatch.value}
            type="button"
            className="chm-swatch"
            aria-pressed={current === swatch.value}
            title={swatch.label}
            aria-label={swatch.label}
            style={{ background: swatch.value }}
            onClick={() => onChange(swatch.value)}
          />
        ))}
        <ResetButton
          shown={!sameValue(value, start)}
          describe={start ?? "no color"}
          onReset={() => onChange(start)}
        />
      </div>
    </div>
  );
}

/** Small line icons for the group headers. */
export const DESIGN_ICONS = {
  text: (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
      <path
        d="M3 15.5 7.2 4.5h1.1L12.5 15.5M4.6 11.5h6.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 15.5v-4.2a2.1 2.1 0 0 0-4.2 0M17 13.2c-2.6-.4-4.4.2-4.4 1.3 0 .7.6 1.1 1.4 1.1 1.6 0 3-1 3-2.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  layout: (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
      <rect
        x="3"
        y="3"
        width="6"
        height="6"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x="11"
        y="3"
        width="6"
        height="6"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x="3"
        y="11"
        width="14"
        height="6"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  ),
  spacing: (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
      <rect
        x="2.5"
        y="2.5"
        width="15"
        height="15"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeDasharray="2.5 2.5"
      />
      <rect
        x="6.5"
        y="6.5"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  ),
  look: (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
      <path
        d="M10 2.5a7.5 7.5 0 1 0 0 15c1.1 0 1.6-.8 1.2-1.7-.5-1 .2-2.1 1.3-2.1h1.6a3.4 3.4 0 0 0 3.4-3.4C17.5 5.6 14.2 2.5 10 2.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="6.5" cy="9" r="1.2" fill="currentColor" />
      <circle cx="9.5" cy="6" r="1.2" fill="currentColor" />
      <circle cx="13.2" cy="7.5" r="1.2" fill="currentColor" />
    </svg>
  ),
  border: (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
      <rect
        x="3"
        y="3"
        width="14"
        height="14"
        rx="4"
        stroke="currentColor"
        strokeWidth="2.2"
      />
    </svg>
  ),
};

/** Alignment pictures: lines aligned left, centered, right. */
const alignIcon = (offsets: [number, number, number]) => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
    <rect
      x={offsets[0]}
      y="3"
      width="12"
      height="1.6"
      rx=".8"
      fill="currentColor"
    />
    <rect
      x={offsets[1]}
      y="7.2"
      width="8"
      height="1.6"
      rx=".8"
      fill="currentColor"
    />
    <rect
      x={offsets[2]}
      y="11.4"
      width="10"
      height="1.6"
      rx=".8"
      fill="currentColor"
    />
  </svg>
);
export const ALIGN_ICONS = {
  left: alignIcon([2, 2, 2]),
  center: alignIcon([2, 4, 3]),
  right: alignIcon([2, 6, 4]),
};

/** Pictures for the layout choice: stacked rows, a grid, a sideways row. */
export const LAYOUT_PICTURES = {
  stack: (
    <svg viewBox="0 0 48 36" width="48" height="36">
      <rect x="6" y="5" width="36" height="7" rx="2" fill="currentColor" />
      <rect
        x="6"
        y="14.5"
        width="36"
        height="7"
        rx="2"
        fill="currentColor"
        opacity=".6"
      />
      <rect
        x="6"
        y="24"
        width="36"
        height="7"
        rx="2"
        fill="currentColor"
        opacity=".35"
      />
    </svg>
  ),
  grid: (
    <svg viewBox="0 0 48 36" width="48" height="36">
      <rect x="6" y="5" width="17" height="12" rx="2" fill="currentColor" />
      <rect
        x="25"
        y="5"
        width="17"
        height="12"
        rx="2"
        fill="currentColor"
        opacity=".6"
      />
      <rect
        x="6"
        y="19"
        width="17"
        height="12"
        rx="2"
        fill="currentColor"
        opacity=".6"
      />
      <rect
        x="25"
        y="19"
        width="17"
        height="12"
        rx="2"
        fill="currentColor"
        opacity=".35"
      />
    </svg>
  ),
  scroll: (
    <svg viewBox="0 0 48 36" width="48" height="36">
      <rect x="2" y="9" width="14" height="18" rx="2" fill="currentColor" />
      <rect
        x="18"
        y="9"
        width="14"
        height="18"
        rx="2"
        fill="currentColor"
        opacity=".6"
      />
      <rect
        x="34"
        y="9"
        width="14"
        height="18"
        rx="2"
        fill="currentColor"
        opacity=".35"
      />
    </svg>
  ),
};
