import type { Design, Spacing } from "@chopi/menu-core";
import { DESIGN_ICONS, DesignGroup, SliderField } from "./designControls";

/** [top/bottom, sides] of a padding value. */
function verticalHorizontal(padding: Spacing | undefined): [number, number] {
  if (padding === undefined) return [0, 0];
  if (typeof padding === "number") return [padding, padding];
  return [padding[0], padding[1]];
}

/**
 * Spacing of a whole screen (the main menu or a sub-menu): the space between
 * its top-level sections and the margins around them. Stored on the screen's
 * root container (gap and padding), so the storefront needs nothing new.
 */
export function ScreenSpacingFields({
  design,
  sourceScreenId,
  targetScreenIds,
  onChange,
  hint,
}: {
  design: Design;
  /** The screen whose values are shown. */
  sourceScreenId: string;
  /** The screens a change applies to (e.g. the main menu and all sub-menus). */
  targetScreenIds: string[];
  onChange: (design: Design) => void;
  hint?: string;
}) {
  const source = design.screens.find((screen) => screen.id === sourceScreenId);
  if (!source) return null;
  const root = source.root;
  const [vertical, horizontal] = verticalHorizontal(root.box?.padding);
  const targets = new Set(targetScreenIds);

  const apply = (
    update: (
      gap: number | undefined,
      v: number,
      h: number,
    ) => {
      gap?: number;
      vertical?: number;
      horizontal?: number;
    },
  ) =>
    onChange({
      ...design,
      screens: design.screens.map((screen) => {
        if (!targets.has(screen.id)) return screen;
        const [v, h] = verticalHorizontal(screen.root.box?.padding);
        const next = update(screen.root.gap, v, h);
        const nextV = next.vertical ?? v;
        const nextH = next.horizontal ?? h;
        return {
          ...screen,
          root: {
            ...screen.root,
            gap: next.gap ?? screen.root.gap,
            box: {
              ...screen.root.box,
              padding: [nextV, nextH, nextV, nextH],
            },
          },
        };
      }),
    });

  return (
    <DesignGroup
      title="Spacing"
      icon={DESIGN_ICONS.spacing}
      hint={hint}
      target=":scope"
      help="The space between the menu's sections, and the margin between them and the edges of the phone."
    >
      <SliderField
        label="Space between sections"
        value={root.gap ?? 0}
        max={48}
        onChange={(gap) => apply(() => ({ gap: gap ?? 0 }))}
      />
      <SliderField
        label="Side margin"
        value={horizontal}
        max={40}
        onChange={(value) => apply(() => ({ horizontal: value ?? 0 }))}
      />
      <SliderField
        label="Top and bottom margin"
        value={vertical}
        max={40}
        onChange={(value) => apply(() => ({ vertical: value ?? 0 }))}
      />
    </DesignGroup>
  );
}
