import type { LayerBox, Spacing } from "@chopi/menu-core";
import { ColorField, FieldRow, NumberField } from "../editor/controls";
import { AlignIcon } from "./AlignBar";

type Side = 0 | 1 | 2 | 3;
const SIDES: { side: Side; label: string }[] = [
  { side: 0, label: "Top" },
  { side: 1, label: "Right" },
  { side: 2, label: "Bottom" },
  { side: 3, label: "Left" },
];

const sides = (
  padding: Spacing | undefined,
): [number, number, number, number] =>
  padding === undefined
    ? [0, 0, 0, 0]
    : typeof padding === "number"
      ? [padding, padding, padding, padding]
      : padding;

const ALIGN_X = [
  { value: "start", icon: "left", label: "Align content left" },
  { value: "center", icon: "hcenter", label: "Center content horizontally" },
  { value: "end", icon: "right", label: "Align content right" },
] as const;
const ALIGN_Y = [
  { value: "start", icon: "top", label: "Align content to the top" },
  { value: "center", icon: "vmiddle", label: "Center content vertically" },
  { value: "end", icon: "bottom", label: "Align content to the bottom" },
] as const;

/**
 * The box of any canvas layer, like Figma's frame settings: where the
 * content sits (left/center/right, top/middle/bottom), fill, corner radius,
 * border and padding on each side.
 */
export function LayerBoxFields({
  value,
  onChange,
}: {
  value: LayerBox | undefined;
  onChange: (layer: LayerBox | undefined) => void;
}) {
  const layer = value ?? {};
  const set = (patch: Partial<LayerBox>) => {
    const next: LayerBox = { ...layer, ...patch };
    // Drop defaults so untouched layers stay small in the stored design.
    (Object.keys(next) as (keyof LayerBox)[]).forEach(
      (key) =>
        (next[key] === undefined || next[key] === "") && delete next[key],
    );
    onChange(Object.keys(next).length ? next : undefined);
  };
  const padding = sides(layer.padding);
  const setPadding = (side: Side, amount: number) => {
    const next = [...padding] as [number, number, number, number];
    next[side] = Math.max(0, amount);
    set({ padding: next.every((part) => part === 0) ? undefined : next });
  };

  const toggles = (
    options: typeof ALIGN_X | typeof ALIGN_Y,
    current: LayerBox["alignX"],
    apply: (value: LayerBox["alignX"]) => void,
  ) =>
    options.map((option) => (
      <button
        key={option.value}
        type="button"
        className="cve-align__button"
        title={option.label}
        aria-label={option.label}
        aria-pressed={current === option.value}
        // Clicking the active one again goes back to "fill the box".
        onClick={() =>
          apply(current === option.value ? undefined : option.value)
        }
      >
        <AlignIcon glyph={option.icon} />
      </button>
    ));

  return (
    <s-stack gap="small-300">
      <s-text>Content position</s-text>
      <div className="cve-align" role="group" aria-label="Content position">
        {toggles(ALIGN_X, layer.alignX, (alignX) => set({ alignX }))}
        <span className="cve-align__sep" />
        {toggles(ALIGN_Y, layer.alignY, (alignY) => set({ alignY }))}
      </div>
      <FieldRow>
        <ColorField
          label="Background"
          value={layer.background}
          onChange={(background) =>
            set({ background: background || undefined })
          }
        />
        <NumberField
          label="Corner radius"
          value={layer.radius}
          min={0}
          max={999}
          suffix="px"
          onChange={(radius) => set({ radius: radius || undefined })}
        />
      </FieldRow>
      <FieldRow>
        <NumberField
          label="Border"
          value={layer.borderWidth}
          min={0}
          max={20}
          suffix="px"
          onChange={(borderWidth) =>
            set({ borderWidth: borderWidth || undefined })
          }
        />
        {layer.borderWidth ? (
          <ColorField
            label="Border color"
            value={layer.borderColor}
            onChange={(borderColor) =>
              set({ borderColor: borderColor || undefined })
            }
          />
        ) : (
          <span />
        )}
      </FieldRow>
      <s-text>Padding</s-text>
      <div className="cve-padding">
        {SIDES.map(({ side, label }) => (
          <NumberField
            key={side}
            label={label}
            value={padding[side]}
            min={0}
            max={200}
            suffix="px"
            onChange={(amount) => setPadding(side, amount ?? 0)}
          />
        ))}
      </div>
    </s-stack>
  );
}
