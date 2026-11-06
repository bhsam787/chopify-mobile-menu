import type { TabsLook, TabsNode } from "./types";

/** The track color a tab bar gets when switched to the track look. */
const DEFAULT_TRACK = "#ECECEC";

/** How a tab bar looks; older designs have no `look` and follow their track color. */
export function tabsLook(node: TabsNode): TabsLook {
  return node.style?.look ?? (node.style?.track ? "track" : "pills");
}

/**
 * The tabs' style for another look, carrying the merchant's colors over:
 * the selected pill's color becomes the underline color and back again.
 */
export function applyTabsLook(
  node: TabsNode,
  look: TabsLook,
): TabsNode["style"] {
  const style = node.style ?? {};
  const from = tabsLook(node);
  if (from === look) return style;
  if (look === "underline")
    return {
      ...style,
      look,
      track: undefined,
      activeBackground: undefined,
      inactiveBackground: undefined,
      activeColor: style.activeBackground ?? style.activeColor,
    };
  // Back from underline: the underline color fills the selected pill again.
  const pill =
    from === "underline"
      ? {
          activeBackground: style.activeColor,
          activeColor: style.activeColor ? "#FFFFFF" : undefined,
        }
      : {};
  return look === "track"
    ? {
        ...style,
        ...pill,
        look,
        track: style.track || DEFAULT_TRACK,
        inactiveBackground: "transparent",
      }
    : {
        ...style,
        ...pill,
        look,
        track: undefined,
        inactiveBackground:
          style.inactiveBackground === "transparent"
            ? undefined
            : style.inactiveBackground,
      };
}
