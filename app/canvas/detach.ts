import type {
  CanvasNode,
  Design,
  Frame,
  LinkRef,
  Node,
  ShapeIcon,
  ShapeNode,
  TextStyle,
} from "@chopify/menu-core";
import {
  CANVAS_WIDTH,
  newId,
  nodeLabel,
  SHAPE_ICONS,
} from "@chopify/menu-core";
import {
  MENU_CSS,
  renderFragment,
  shapeIcon,
  type RenderContext,
} from "@chopify/menu-renderer";
import { toMarkup } from "../editor/RichTextField";
import { PREVIEW_FONT } from "./layers";

/** Widgets that can be split into editable layers (image, texts, shapes). */
const DETACHABLE = new Set<Node["type"]>([
  "banner",
  "card",
  "row",
  "review",
  "pill",
  "chip",
  "button",
  "social-proof",
]);

export const canDetach = (node: Node) =>
  DETACHABLE.has(node.type) && Boolean(node.frame);

/** Inline tags that stay part of one text layer (bold, italic, links). */
const INLINE = new Set(["STRONG", "B", "EM", "I", "A", "BR", "SPAN"]);

const px = (value: string) => Math.round(parseFloat(value) || 0);
const visibleColor = (value: string) =>
  value && value !== "transparent" && !/rgba\([^)]*,\s*0\)$/.test(value)
    ? value
    : undefined;

/** The renderer asks Shopify's CDN for a sized copy; keep the original. */
function originalUrl(src: string): string {
  if (!/[?&]width=/.test(src)) return src;
  const [path, query] = src.split("?");
  const params = new URLSearchParams(query);
  params.delete("width");
  return params.size ? `${path}?${params}` : path;
}

function linkOf(node: Node): LinkRef {
  return "link" in node && node.link ? node.link : { type: "none" };
}

function hasBox(style: CSSStyleDeclaration): boolean {
  return Boolean(
    visibleColor(style.backgroundColor) ||
    (style.backgroundImage !== "none" &&
      !style.backgroundImage.startsWith("url")) ||
    px(style.borderTopWidth) > 0,
  );
}

const WEIGHTS = [400, 500, 600, 700, 800] as const;

function textStyleOf(style: CSSStyleDeclaration): TextStyle {
  const size = parseFloat(style.fontSize) || 14;
  const weight = WEIGHTS.reduce(
    (best, candidate) =>
      Math.abs(candidate - Number(style.fontWeight)) <
      Math.abs(best - Number(style.fontWeight))
        ? candidate
        : best,
    400 as TextStyle["weight"] & number,
  );
  const lineHeight = parseFloat(style.lineHeight);
  const letterSpacing = parseFloat(style.letterSpacing);
  return {
    size: Math.round(size * 10) / 10,
    weight,
    color: style.color,
    italic: style.fontStyle === "italic" || undefined,
    transform: style.textTransform === "uppercase" ? "uppercase" : undefined,
    letterSpacing: letterSpacing
      ? Math.round(letterSpacing * 10) / 10
      : undefined,
    align:
      style.textAlign === "center"
        ? "center"
        : style.textAlign === "right" || style.textAlign === "end"
          ? "right"
          : undefined,
    lineHeight: lineHeight
      ? Math.round((lineHeight / size) * 100) / 100
      : undefined,
  };
}

/** Which icon an inline SVG is, by comparing it with the renderer's icons. */
function iconOf(svg: SVGElement): ShapeIcon | undefined {
  const scratch = document.createElement("template");
  for (const name of SHAPE_ICONS) {
    scratch.innerHTML = shapeIcon(name);
    if (scratch.content.firstElementChild?.innerHTML === svg.innerHTML)
      return name;
  }
  return undefined;
}

function isTextLeaf(element: Element): boolean {
  if (!element.textContent?.trim()) return false;
  for (const child of element.querySelectorAll("*")) {
    const style = getComputedStyle(child);
    if (
      !INLINE.has(child.tagName) ||
      style.display !== "inline" ||
      hasBox(style)
    )
      return false;
  }
  return true;
}

/**
 * Measures a rendered element and turns what's inside it into layers placed
 * relative to it: images, texts (with bold/italic/links), colored boxes and
 * known icons. The element's own background is not included.
 */
export function layersFromElement(root: Element): Node[] {
  const origin = root.getBoundingClientRect();
  const layers: Node[] = [];

  const frameOf = (rect: DOMRect, slack = 0): Frame => ({
    x: Math.round(rect.left - origin.left),
    y: Math.round(rect.top - origin.top),
    w: Math.max(4, Math.ceil(rect.width) + slack),
    h: Math.max(4, Math.ceil(rect.height)),
  });
  const textLayer = (
    text: string,
    style: CSSStyleDeclaration,
    rect: DOMRect,
  ) => {
    if (!text.trim() || rect.width === 0) return;
    // A little extra width so the text doesn't wrap differently once on its own.
    layers.push({
      id: newId("tx"),
      type: "text",
      text: text.trim(),
      style: textStyleOf(style),
      frame: frameOf(rect, 4),
    });
  };

  const visit = (element: Element) => {
    for (const child of element.childNodes) {
      if (child instanceof Text) {
        // Loose text next to other elements (e.g. "NEW!" before a badge).
        const range = document.createRange();
        range.selectNodeContents(child);
        textLayer(
          child.textContent ?? "",
          getComputedStyle(element),
          range.getBoundingClientRect(),
        );
        continue;
      }
      if (!(child instanceof Element)) continue;
      const style = getComputedStyle(child);
      const rect = child.getBoundingClientRect();
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        rect.width === 0 ||
        rect.height === 0
      )
        continue;

      if (child instanceof HTMLImageElement) {
        layers.push({
          id: newId("im"),
          type: "image",
          image: {
            url: originalUrl(child.getAttribute("src") ?? ""),
            alt: child.alt,
          },
          radius: px(style.borderTopLeftRadius) || undefined,
          link: { type: "none" },
          frame: frameOf(rect),
        });
        continue;
      }
      if (child instanceof SVGElement) {
        const icon = iconOf(child);
        if (icon)
          layers.push({
            id: newId("ic"),
            type: "shape",
            name: "Icon",
            icon,
            iconColor: style.color,
            link: { type: "none" },
            frame: frameOf(rect),
          });
        continue;
      }
      if (hasBox(style)) {
        layers.push({
          id: newId("sh"),
          type: "shape",
          fill: visibleColor(style.backgroundColor),
          gradient:
            style.backgroundImage !== "none"
              ? style.backgroundImage
              : undefined,
          radius: px(style.borderTopLeftRadius) || undefined,
          borderWidth: px(style.borderTopWidth) || undefined,
          borderColor: px(style.borderTopWidth)
            ? style.borderTopColor
            : undefined,
          link: { type: "none" },
          frame: frameOf(rect),
        });
      }
      if (isTextLeaf(child)) {
        textLayer(toMarkup(child), style, rect);
        continue;
      }
      visit(child);
    }
  };
  visit(root);
  return layers;
}

/**
 * Splits a widget on the canvas into layers, like Figma's "Detach instance":
 * the widget is rendered off-screen at its size, then its images, texts,
 * colored boxes and icons are measured and become layers inside a shape that
 * keeps the widget's background and link. The result looks the same, and
 * every part can be moved, edited or replaced. Runs in the browser.
 */
export function detachToLayers(
  design: Design,
  node: Node,
  context: Omit<RenderContext, "editor">,
): ShapeNode | null {
  const frame = node.frame;
  if (!frame || !canDetach(node)) return null;

  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${CANVAS_WIDTH}px;opacity:0;pointer-events:none;font-family:${PREVIEW_FONT}`;
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });
  const stage: CanvasNode = {
    id: newId("cv"),
    type: "canvas",
    height: frame.h,
    children: [
      { ...node, hidden: false, frame: { x: 0, y: 0, w: frame.w, h: frame.h } },
    ],
  };
  shadow.innerHTML = `<style>${MENU_CSS} .chm-fragment{padding:0}</style>${renderFragment(design, [stage], { ...context, editor: true })}`;

  try {
    const root = shadow.querySelector<HTMLElement>(
      `[data-chm-node="${CSS.escape(node.id)}"]`,
    );
    if (!root) return null;
    const rootStyle = getComputedStyle(root);
    const layers = layersFromElement(root);

    return {
      id: newId("sh"),
      type: "shape",
      name: nodeLabel(node),
      fill: visibleColor(rootStyle.backgroundColor),
      gradient:
        rootStyle.backgroundImage !== "none" &&
        !rootStyle.backgroundImage.startsWith("url")
          ? rootStyle.backgroundImage
          : undefined,
      radius: px(rootStyle.borderTopLeftRadius) || undefined,
      borderWidth: px(rootStyle.borderTopWidth) || undefined,
      borderColor: px(rootStyle.borderTopWidth)
        ? rootStyle.borderTopColor
        : undefined,
      clip: true,
      link: linkOf(node),
      frame,
      children: layers,
    };
  } finally {
    host.remove();
  }
}
