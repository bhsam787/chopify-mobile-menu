import type { ReactNode } from "react";
import type { Badge, BoxStyle, Spacing, TextStyle } from "@chopi/menu-core";
import { ColorField, FieldRow } from "./controls";
import {
  ALIGN_ICONS,
  ColorPicker,
  DESIGN_ICONS,
  DesignGroup,
  Segmented,
  SliderField,
} from "./designControls";

function toVH(
  padding: Spacing | undefined,
): [number | undefined, number | undefined] {
  if (padding === undefined) return [undefined, undefined];
  if (typeof padding === "number") return [padding, padding];
  return [padding[0], padding[1]];
}

const RADIUS_PRESETS = [
  { label: "Square", value: 0 },
  { label: "Soft", value: 8 },
  { label: "Round", value: 16 },
  { label: "Pill", value: 999 },
];

/** Background, padding, corner radius and border of a box, in visual groups. */
export function BoxFields({
  value,
  onChange,
  background = true,
  padding = true,
  border = true,
}: {
  value: BoxStyle | undefined;
  onChange: (box: BoxStyle) => void;
  background?: boolean;
  padding?: boolean;
  border?: boolean;
}) {
  const box = value ?? {};
  const [vertical, horizontal] = toVH(box.padding);
  const set = (patch: Partial<BoxStyle>) => onChange({ ...box, ...patch });
  const setPadding = (v: number | undefined, h: number | undefined) =>
    set({
      padding:
        v === undefined && h === undefined
          ? undefined
          : [v ?? 0, h ?? 0, v ?? 0, h ?? 0],
    });

  return (
    <div className="chm-dgroups">
      <DesignGroup
        title="Look"
        icon={DESIGN_ICONS.look}
        target=":scope"
        help="The box itself: its background color and how rounded its corners are."
      >
        {background && (
          <ColorPicker
            label="Background"
            value={box.background}
            onChange={(next) => set({ background: next })}
          />
        )}
        <SliderField
          label="Corner radius"
          value={box.radius}
          max={48}
          presets={RADIUS_PRESETS}
          onChange={(radius) => set({ radius })}
        />
      </DesignGroup>
      {padding && (
        <DesignGroup
          title="Spacing"
          icon={DESIGN_ICONS.spacing}
          hint="Space inside the box"
          target=":scope"
          help="Room between the edge of the box and what's inside it. More space makes it feel lighter."
        >
          <SliderField
            label="Top and bottom"
            value={vertical}
            max={64}
            onChange={(v) => setPadding(v, horizontal)}
          />
          <SliderField
            label="Sides"
            value={horizontal}
            max={64}
            onChange={(h) => setPadding(vertical, h)}
          />
        </DesignGroup>
      )}
      {border && (
        <DesignGroup
          title="Border"
          icon={DESIGN_ICONS.border}
          target=":scope"
          help="A line around the box. 0 means no line."
        >
          <SliderField
            label="Width"
            value={box.borderWidth}
            max={8}
            placeholder="None"
            onChange={(borderWidth) => set({ borderWidth })}
          />
          {(box.borderWidth ?? 0) > 0 && (
            <ColorPicker
              label="Border color"
              value={box.borderColor}
              onChange={(borderColor) => set({ borderColor })}
            />
          )}
        </DesignGroup>
      )}
    </div>
  );
}

const WEIGHTS = [
  { value: "", label: "Auto" },
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra bold" },
];

const FONTS: {
  value: TextStyle["font"] | "";
  label: string;
  family: string;
}[] = [
  { value: "", label: "Theme", family: "inherit" },
  {
    value: "sans",
    label: "Sans",
    family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  {
    value: "serif",
    label: "Serif",
    family: "Georgia, 'Times New Roman', serif",
  },
  {
    value: "rounded",
    label: "Rounded",
    family: "ui-rounded, 'SF Pro Rounded', Nunito, sans-serif",
  },
  {
    value: "mono",
    label: "Mono",
    family: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },
];

const SIZE_PRESETS = [
  { label: "S", value: 12 },
  { label: "M", value: 14 },
  { label: "L", value: 18 },
  { label: "XL", value: 24 },
];

/** Which text a style applies to: its card title, help and place on the phone. */
const TEXT_PARTS: Record<
  string,
  { title: string; help: string; target: string }
> = {
  titleStyle: {
    title: "Title text",
    help: "The look of the title: the biggest, first line of text.",
    target: '[class*="__title"]',
  },
  subtitleStyle: {
    title: "Subtitle text",
    help: "The look of the smaller line under the title.",
    target: '[class*="__subtitle"]',
  },
  textStyle: {
    title: "Body text",
    help: "The look of the description text.",
    target: '[class*="__text"]:not(.chm-row__text)',
  },
  quoteStyle: {
    title: "Quote text",
    help: "The look of the customer's quote.",
    target: ".chm-review__quote",
  },
  labelStyle: {
    title: "Label text",
    help: "The look of the names under the circles.",
    target: ".chm-story__label",
  },
  productTitleStyle: {
    title: "Product name",
    help: "The look of the product names.",
    target: ".chm-product__title",
  },
  priceStyle: {
    title: "Price",
    help: "The look of the prices.",
    target: ".chm-product__price",
  },
  contactStyle: {
    title: "Button text",
    help: "The look of the text on the contact buttons.",
    target: ".chm-contact__item",
  },
  "style.text": {
    title: "Tab text",
    help: "The look of the text on the tab buttons.",
    target: "[data-chm-tab]",
  },
  style: {
    title: "Text",
    help: "The look of this item's text.",
    target: ":scope",
  },
};

/** Font, size, weight, case, alignment, color and spacing. */
export function TextStyleFields({
  value,
  onChange,
  part = "style",
}: {
  value: TextStyle | undefined;
  onChange: (style: TextStyle) => void;
  /** Which of the item's texts this styles (its style property). */
  part?: string;
}) {
  const style = value ?? {};
  const set = (patch: Partial<TextStyle>) => onChange({ ...style, ...patch });
  const text = TEXT_PARTS[part] ?? TEXT_PARTS.style;
  return (
    <DesignGroup
      title={text.title}
      icon={DESIGN_ICONS.text}
      help={text.help}
      target={text.target}
    >
      <Segmented
        label="Font"
        value={style.font ?? ""}
        options={FONTS.map((font) => ({
          value: font.value ?? "",
          title: font.label,
          label: (
            <span className="chm-fontchip">
              <span style={{ fontFamily: font.family }}>Aa</span>
              <small>{font.label}</small>
            </span>
          ),
        }))}
        onChange={(font) =>
          set({ font: (font || undefined) as TextStyle["font"] })
        }
      />

      <SliderField
        label="Size"
        value={style.size}
        min={8}
        max={48}
        presets={SIZE_PRESETS}
        onChange={(size) => set({ size })}
      />

      <Segmented
        label="Weight"
        value={style.weight ? String(style.weight) : ""}
        options={WEIGHTS.map((weight) => ({
          value: weight.value,
          title: weight.label,
          label: (
            <span style={{ fontWeight: Number(weight.value) || undefined }}>
              {weight.label}
            </span>
          ),
        }))}
        onChange={(weight) =>
          set({
            weight: weight
              ? (Number(weight) as TextStyle["weight"])
              : undefined,
          })
        }
      />

      <div className="chm-fieldrow">
        <Segmented
          label="Case"
          value={style.transform ?? "none"}
          options={[
            { value: "none", label: "Aa", title: "As typed" },
            { value: "uppercase", label: "AA", title: "Uppercase" },
          ]}
          onChange={(transform) => set({ transform })}
        />
        <Segmented
          label="Align"
          value={style.align ?? "left"}
          options={(["left", "center", "right"] as const).map((align) => ({
            value: align,
            label: ALIGN_ICONS[align],
            title: `Align ${align}`,
          }))}
          onChange={(align) =>
            set({ align: align === "left" ? undefined : align })
          }
        />
        <div className="chm-field">
          <span className="chm-field__label">Style</span>
          <div className="chm-segment">
            <button
              type="button"
              aria-pressed={Boolean(style.italic)}
              title="Italic"
              onClick={() => set({ italic: !style.italic })}
            >
              <em>I</em>
            </button>
            <button
              type="button"
              aria-pressed={Boolean(style.underline)}
              title="Underline"
              onClick={() => set({ underline: !style.underline })}
            >
              <u>U</u>
            </button>
          </div>
        </div>
      </div>

      <ColorPicker
        label="Color"
        value={style.color}
        onChange={(color) => set({ color })}
      />

      <SliderField
        label="Letter spacing"
        value={style.letterSpacing}
        min={-2}
        max={10}
        step={0.1}
        onChange={(letterSpacing) => set({ letterSpacing })}
      />
      <SliderField
        label="Line height"
        value={style.lineHeight}
        min={0.8}
        max={3}
        step={0.05}
        unit="×"
        onChange={(lineHeight) => set({ lineHeight })}
      />
    </DesignGroup>
  );
}

export function BadgeFields({
  value,
  onChange,
  text,
}: {
  value: Badge | undefined;
  onChange: (badge: Badge | undefined) => void;
  /** Rendered text field (translation-aware), supplied by the inspector. */
  text: ReactNode;
}) {
  return (
    <s-stack gap="small-300">
      {text}
      {value?.text ? (
        <FieldRow>
          <ColorField
            label="Badge background"
            value={value.background}
            onChange={(background) => onChange({ ...value, background })}
          />
          <ColorField
            label="Badge text"
            value={value.color}
            onChange={(color) => onChange({ ...value, color })}
          />
        </FieldRow>
      ) : null}
    </s-stack>
  );
}
