import type { LayerEffects } from "@chopify/menu-core";
import {
  ColorField,
  FieldRow,
  NumberField,
  SelectField,
  SwitchField,
} from "../editor/controls";

const SHADOW_OPTIONS = [
  { value: "", label: "None" },
  { value: "soft", label: "Soft" },
  { value: "medium", label: "Medium" },
  { value: "strong", label: "Strong" },
  { value: "custom", label: "Custom" },
];

const BLEND_OPTIONS = [
  { value: "", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "overlay", label: "Overlay" },
  { value: "darken", label: "Darken" },
  { value: "lighten", label: "Lighten" },
];

/**
 * Settings every canvas layer has, like Figma's layer and effects panels:
 * opacity, rotation, flip, drop shadow (presets or custom), layer blur,
 * background blur (frosted glass) and blend mode.
 */
export function LayerEffectsFields({
  value,
  onChange,
}: {
  value: LayerEffects | undefined;
  onChange: (effects: LayerEffects | undefined) => void;
}) {
  const effects = value ?? {};
  const set = (patch: Partial<LayerEffects>) => {
    const next: LayerEffects = { ...effects, ...patch };
    // Drop defaults so untouched layers stay small in the stored design.
    (Object.keys(next) as (keyof LayerEffects)[]).forEach(
      (key) => next[key] === undefined && delete next[key],
    );
    onChange(Object.keys(next).length ? next : undefined);
  };
  const custom = effects.shadow === "custom";

  return (
    <s-stack gap="small-300">
      <FieldRow>
        <NumberField
          label="Opacity"
          value={
            effects.opacity === undefined
              ? 100
              : Math.round(effects.opacity * 100)
          }
          min={0}
          max={100}
          suffix="%"
          onChange={(opacity) =>
            set({
              opacity:
                opacity === undefined || opacity >= 100
                  ? undefined
                  : opacity / 100,
            })
          }
        />
        <NumberField
          label="Rotation"
          value={effects.rotate ?? 0}
          min={-360}
          max={360}
          suffix="°"
          onChange={(rotate) => set({ rotate: rotate || undefined })}
        />
      </FieldRow>
      <FieldRow>
        <SelectField
          label="Shadow"
          value={effects.shadow ?? ""}
          options={SHADOW_OPTIONS}
          onChange={(shadow) =>
            set(
              shadow === "custom"
                ? {
                    shadow: "custom",
                    shadowX: effects.shadowX ?? 0,
                    shadowY: effects.shadowY ?? 4,
                    shadowBlur: effects.shadowBlur ?? 12,
                    shadowColor: effects.shadowColor ?? "rgba(0,0,0,0.2)",
                  }
                : {
                    shadow: (shadow || undefined) as LayerEffects["shadow"],
                    shadowX: undefined,
                    shadowY: undefined,
                    shadowBlur: undefined,
                    shadowColor: undefined,
                  },
            )
          }
        />
        <SelectField
          label="Blend"
          value={effects.blend ?? ""}
          options={BLEND_OPTIONS}
          onChange={(blend) =>
            set({ blend: (blend || undefined) as LayerEffects["blend"] })
          }
        />
      </FieldRow>
      {custom && (
        <>
          <FieldRow>
            <NumberField
              label="Shadow X"
              value={effects.shadowX ?? 0}
              min={-100}
              max={100}
              suffix="px"
              onChange={(shadowX) => set({ shadowX: shadowX ?? 0 })}
            />
            <NumberField
              label="Shadow Y"
              value={effects.shadowY ?? 0}
              min={-100}
              max={100}
              suffix="px"
              onChange={(shadowY) => set({ shadowY: shadowY ?? 0 })}
            />
          </FieldRow>
          <FieldRow>
            <NumberField
              label="Shadow blur"
              value={effects.shadowBlur ?? 0}
              min={0}
              max={100}
              suffix="px"
              onChange={(shadowBlur) => set({ shadowBlur: shadowBlur ?? 0 })}
            />
            <ColorField
              label="Shadow color"
              value={effects.shadowColor}
              onChange={(shadowColor) => set({ shadowColor })}
            />
          </FieldRow>
        </>
      )}
      <FieldRow>
        <NumberField
          label="Layer blur"
          value={effects.blur ?? 0}
          min={0}
          max={40}
          suffix="px"
          onChange={(blur) => set({ blur: blur || undefined })}
        />
        <NumberField
          label="Background blur"
          value={effects.backdropBlur ?? 0}
          min={0}
          max={40}
          suffix="px"
          onChange={(backdropBlur) =>
            set({ backdropBlur: backdropBlur || undefined })
          }
        />
      </FieldRow>
      <SwitchField
        label="Flip horizontally"
        checked={Boolean(effects.flipX)}
        onChange={(flipX) => set({ flipX: flipX || undefined })}
      />
    </s-stack>
  );
}
