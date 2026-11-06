import type { BoxStyle, Node, TextStyle } from "@chopify/menu-core";
import {
  ColorPicker,
  DESIGN_ICONS,
  DesignGroup,
  FocusArea,
} from "./designControls";

interface ColorSetting {
  key: string;
  label: string;
  /** The part of the item it colors, outlined on the phone. */
  target: string;
  value: string | undefined;
  patch: (color: string | undefined) => Partial<Node>;
}

/**
 * The colors one item of a list may have on its own (background, text…).
 * Everything that shapes the list (size, spacing, font, corners, border) is
 * shared and set in the section's Design, so items stay consistent.
 */
function colorSettings(node: Node): ColorSetting[] {
  const fields = node as unknown as {
    box?: BoxStyle;
    style?: TextStyle;
    titleStyle?: TextStyle;
    subtitleStyle?: TextStyle;
    subtitle?: string;
    variant?: string;
    arrow?: string;
  };
  const box = fields.box ?? {};
  const settings: ColorSetting[] = [];
  const background = (target = ":scope"): ColorSetting => ({
    key: "background",
    label: "Background",
    target,
    value: box.background,
    patch: (color) => ({ box: { ...box, background: color } }) as Partial<Node>,
  });
  const text = (
    styleKey: "style" | "titleStyle" | "subtitleStyle",
    label: string,
    target: string,
  ): ColorSetting => {
    const style = fields[styleKey] ?? {};
    return {
      key: styleKey,
      label,
      target,
      value: style.color,
      patch: (color) =>
        ({ [styleKey]: { ...style, color } }) as unknown as Partial<Node>,
    };
  };

  switch (node.type) {
    case "chip":
    case "pill":
      settings.push(background(), text("style", "Text", ":scope"));
      break;
    case "button":
      settings.push(
        {
          key: "background",
          label: "Background",
          target: ":scope",
          value: node.background,
          patch: (background) => ({ background }),
        },
        {
          key: "color",
          label: "Text",
          target: ":scope",
          value: node.color,
          patch: (color) => ({ color }),
        },
      );
      break;
    case "card":
    case "row":
    case "accordion":
      settings.push(
        background(),
        text("titleStyle", "Title", '[class*="__title"]'),
      );
      if (fields.subtitle)
        settings.push(
          text("subtitleStyle", "Subtitle", '[class*="__subtitle"]'),
        );
      if (node.type === "row" && node.variant === "thumb")
        settings.push({
          key: "thumbBackground",
          label: "Behind the image",
          target: ".chm-row__thumb",
          value: node.thumbBackground,
          patch: (thumbBackground) => ({ thumbBackground }),
        });
      if (node.type === "card" && node.arrow && node.arrow !== "none")
        settings.push(
          {
            key: "arrowBackground",
            label: "Arrow background",
            target: ".chm-arrow",
            value: node.arrowBackground,
            patch: (arrowBackground) => ({ arrowBackground }),
          },
          {
            key: "arrowColor",
            label: "Arrow icon",
            target: ".chm-arrow",
            value: node.arrowColor,
            patch: (arrowColor) => ({ arrowColor }),
          },
        );
      break;
    default:
      break;
  }
  if ((box.borderWidth ?? 0) > 0)
    settings.push({
      key: "borderColor",
      label: "Border",
      target: ":scope",
      value: box.borderColor,
      patch: (borderColor) =>
        ({ box: { ...box, borderColor } }) as Partial<Node>,
    });
  return settings;
}

/** Whether an item has colors of its own to set (else only shared design). */
export function hasItemColors(node: Node): boolean {
  return colorSettings(node).length > 0;
}

export function ItemColorFields({
  node,
  onChange,
}: {
  node: Node;
  onChange: (patch: Partial<Node>) => void;
}) {
  return (
    <DesignGroup
      title="Colors"
      icon={DESIGN_ICONS.look}
      help="Colors just for this item, e.g. to make one chip stand out. Everything else is shared by all items in the section."
    >
      {colorSettings(node).map((setting) => (
        <FocusArea
          key={setting.key}
          target={setting.target}
          label={setting.label}
        >
          <ColorPicker
            label={setting.label}
            value={setting.value}
            onChange={(color) => onChange(setting.patch(color))}
          />
        </FocusArea>
      ))}
    </DesignGroup>
  );
}
