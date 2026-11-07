/**
 * React wrappers for Polaris web component form fields. Polaris dispatches
 * native `input`/`change` events on custom elements, which React 18 doesn't
 * wire through `onChange`, so each wrapper listens with a ref.
 */
import { useEffect, useRef, type ReactNode } from "react";

type FieldElement = HTMLElement & { value: string; checked?: boolean };

function useFieldEvents(
  value: string | boolean,
  onValue: (element: FieldElement) => void,
  events: ("input" | "change")[],
) {
  // Polaris element types differ per component; this hook only touches value/checked.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>(null);
  const handler = useRef(onValue);
  handler.current = onValue;

  useEffect(() => {
    const element: FieldElement | null = ref.current;
    if (!element) return;
    const listener = () => handler.current(element);
    events.forEach((event) => element.addEventListener(event, listener));
    return () =>
      events.forEach((event) => element.removeEventListener(event, listener));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the element in sync without stealing the caret from the user.
  useEffect(() => {
    const element: FieldElement | null = ref.current;
    if (!element) return;
    if (typeof value === "boolean") {
      if (element.checked !== value) element.checked = value;
    } else if (element.value !== value) {
      element.value = value;
    }
  }, [value]);

  return ref;
}

interface BaseProps {
  label: string;
  details?: string;
  labelAccessibilityVisibility?: "visible" | "exclusive";
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  details,
  multiline,
  rows = 3,
  labelAccessibilityVisibility,
}: BaseProps & {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  /** Height of a multiline field, in lines. */
  rows?: number;
}) {
  const ref = useFieldEvents(value, (element) => onChange(element.value), [
    "input",
  ]);
  if (multiline) {
    return (
      <s-text-area
        ref={ref}
        label={label}
        labelAccessibilityVisibility={labelAccessibilityVisibility}
        value={value}
        placeholder={placeholder}
        details={details}
        rows={rows}
      />
    );
  }
  return (
    <s-text-field
      ref={ref}
      label={label}
      labelAccessibilityVisibility={labelAccessibilityVisibility}
      value={value}
      placeholder={placeholder}
      details={details}
    />
  );
}

export function SearchField({
  label,
  value,
  onChange,
  placeholder,
  onKeyDown,
  focusOnMount,
}: BaseProps & {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onKeyDown?: (event: KeyboardEvent) => void;
  /** Focus when shown, e.g. the search that opens from a menu. */
  focusOnMount?: boolean;
}) {
  const ref = useFieldEvents(value, (element) => onChange(element.value), [
    "input",
  ]);
  // Not a typed prop on the web component: listen on the element (keydown is composed).
  const keyHandler = useRef(onKeyDown);
  keyHandler.current = onKeyDown;
  useEffect(() => {
    const element = ref.current as HTMLElement | null;
    if (!element) return;
    const listener = (event: KeyboardEvent) => keyHandler.current?.(event);
    element.addEventListener("keydown", listener);
    return () => element.removeEventListener("keydown", listener);
  }, [ref]);
  useEffect(() => {
    if (focusOnMount) (ref.current as HTMLElement | null)?.focus();
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <s-search-field
      ref={ref}
      label={label}
      labelAccessibilityVisibility="exclusive"
      value={value}
      placeholder={placeholder}
    />
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: BaseProps & {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  const ref = useFieldEvents(
    value === undefined ? "" : String(value),
    (element) => {
      const parsed = element.value === "" ? undefined : Number(element.value);
      onChange(
        parsed === undefined || Number.isNaN(parsed) ? undefined : parsed,
      );
    },
    ["input"],
  );
  return (
    <s-number-field
      ref={ref}
      label={label}
      value={value === undefined ? "" : String(value)}
      min={min}
      max={max}
      step={step}
      suffix={suffix}
    />
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: BaseProps & {
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  const ref = useFieldEvents(
    value ?? "",
    (element) => onChange(element.value),
    ["change"],
  );
  return (
    <s-color-field
      ref={ref}
      label={label}
      value={value ?? ""}
      alpha
      placeholder="Default"
    />
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  details,
  labelAccessibilityVisibility,
}: BaseProps & {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const ref = useFieldEvents(value, (element) => onChange(element.value as T), [
    "change",
  ]);
  return (
    <s-select
      ref={ref}
      label={label}
      labelAccessibilityVisibility={labelAccessibilityVisibility}
      value={value}
      details={details}
    >
      {options.map((option) => (
        <s-option key={option.value} value={option.value}>
          {option.label}
        </s-option>
      ))}
    </s-select>
  );
}

export function SwitchField({
  label,
  checked,
  onChange,
  details,
  labelAccessibilityVisibility,
}: BaseProps & { checked: boolean; onChange: (checked: boolean) => void }) {
  const ref = useFieldEvents(
    checked,
    (element) => onChange(Boolean(element.checked)),
    ["change"],
  );
  return (
    <s-switch
      ref={ref}
      label={label}
      labelAccessibilityVisibility={labelAccessibilityVisibility}
      checked={checked}
      details={details}
    />
  );
}

/** Two fields side by side. */
export function FieldRow({ children }: { children: ReactNode }) {
  return (
    <s-grid gridTemplateColumns="1fr 1fr" gap="small-300">
      {children}
    </s-grid>
  );
}
