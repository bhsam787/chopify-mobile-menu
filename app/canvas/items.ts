import type {
  Frame,
  ImageRef,
  LinkRef,
  ListLayout,
  Node,
  ShapeNode,
} from "@chopify/menu-core";
import { childNodes, nodeLabel } from "@chopify/menu-core";

/**
 * Items of smart lists (link lists, card grids, chip rows, carousels): what
 * the merchant edits in the Items panel and the Menu tree. An item is a
 * widget (card, row, chip, button, banner) or a frame of layers; these
 * helpers read and change its title, image and link either way.
 */

export type ListFrame = ShapeNode & { list: ListLayout };

export const isList = (node: Node | undefined): node is ListFrame =>
  node?.type === "shape" && Boolean(node.list);

/** The first text in a frame of layers (depth-first, in layer order). */
function firstText(node: Node): Node | undefined {
  if (node.type === "text" || node.type === "heading") return node;
  for (const child of childNodes(node)) {
    const found = firstText(child);
    if (found) return found;
  }
  return undefined;
}

function firstImage(node: Node): Node | undefined {
  if (node.type === "image") return node;
  for (const child of childNodes(node)) {
    const found = firstImage(child);
    if (found) return found;
  }
  return undefined;
}

/** Plain title of an item (bold/italic markers removed). */
export function itemTitle(node: Node): string {
  switch (node.type) {
    case "card":
    case "row":
    case "banner":
    case "countdown":
      return node.title;
    case "chip":
    case "button":
      return node.label;
    case "pill":
      return node.text;
    default: {
      const text = firstText(node);
      return text?.type === "text" || text?.type === "heading"
        ? text.text.replace(/\*\*|_|\[|\]\([^)]*\)/g, "")
        : nodeLabel(node);
    }
  }
}

/** The item with a new title; frames change their first text and their layer name. */
export function setItemTitle(node: Node, title: string): Node {
  switch (node.type) {
    case "card":
    case "row":
    case "banner":
    case "countdown":
      return { ...node, title };
    case "chip":
    case "button":
      return { ...node, label: title };
    case "pill":
      return { ...node, text: title };
    default: {
      const text = firstText(node);
      if (!text) return { ...node, name: title };
      const replace = (current: Node): Node => {
        if (current.id === text.id) return { ...current, text: title } as Node;
        if (current.type === "shape" && current.children)
          return { ...current, children: current.children.map(replace) };
        return current;
      };
      return { ...replace(node), name: title };
    }
  }
}

export function itemLink(node: Node): LinkRef | undefined {
  return "link" in node ? node.link : undefined;
}

export function setItemLink(node: Node, link: LinkRef): Node {
  return "link" in node ? ({ ...node, link } as Node) : node;
}

export function itemImage(node: Node): ImageRef | undefined {
  if ("image" in node && node.image && typeof node.image === "object")
    return node.image as ImageRef;
  const image = firstImage(node);
  return image?.type === "image" ? image.image : undefined;
}

/**
 * Places a list's items one after another, like Figma's auto layout:
 * a column (items as wide as the list), a row (sideways; the list scrolls)
 * or a grid of equal cells. Item sizes come from the first item (all items
 * look alike); the list hugs its content in the direction it grows.
 */
export function layoutList(list: ListFrame): ListFrame {
  const items = list.children ?? [];
  const frame = list.frame;
  if (!frame || !items.length) return list;
  const { direction, gap } = list.list;
  const first = items[0].frame ?? { x: 0, y: 0, w: frame.w, h: 48 };
  const placed: Node[] = [];

  if (direction === "column") {
    let y = 0;
    for (const item of items) {
      const h = item.frame?.h ?? first.h;
      placed.push({ ...item, frame: { x: 0, y, w: frame.w, h } });
      y += h + gap;
    }
    return {
      ...list,
      children: placed,
      frame: { ...frame, h: Math.max(8, y - gap) },
    };
  }

  if (direction === "row") {
    // Rows start where the first item is (often a left margin) and may scroll.
    let x = Math.max(0, Math.min(first.x, frame.w));
    for (const item of items) {
      // Each keeps its own width (chips fit their labels); heights match.
      const w = item.frame?.w ?? first.w;
      placed.push({ ...item, frame: { x, y: 0, w, h: first.h } });
      x += w + gap;
    }
    return { ...list, children: placed, frame: { ...frame, h: first.h } };
  }

  const columns = Math.max(1, list.list.columns ?? 2);
  const cell = Math.floor((frame.w - gap * (columns - 1)) / columns);
  items.forEach((item, index) => {
    placed.push({
      ...item,
      frame: {
        x: (index % columns) * (cell + gap),
        y: Math.floor(index / columns) * (first.h + gap),
        w: cell,
        h: first.h,
      },
    });
  });
  const rows = Math.ceil(items.length / columns);
  return {
    ...list,
    children: placed,
    frame: { ...frame, h: rows * first.h + (rows - 1) * gap },
  };
}

/** Order of a list's items by where they are now (after one was dragged). */
export function orderByPosition(list: ListFrame): ListFrame {
  const items = [...(list.children ?? [])];
  const key = (frame: Frame | undefined) =>
    !frame
      ? 0
      : list.list.direction === "row"
        ? frame.x + frame.w / 2
        : list.list.direction === "column"
          ? frame.y + frame.h / 2
          : // Grid: row first, then column.
            Math.round((frame.y + frame.h / 2) / Math.max(1, frame.h)) *
              100000 +
            frame.x +
            frame.w / 2;
  items.sort((a, b) => key(a.frame) - key(b.frame));
  return { ...list, children: items };
}

/**
 * "Make all items look like this one": the other items take `source`'s
 * design (sizes, colors, radius, text styles, effects) but keep their own
 * title, image and link. Frames of layers copy layer by layer when they're
 * built the same way.
 */
export function styleLike(source: Node, target: Node): Node {
  const content = {
    title: itemTitle(target),
    image: itemImage(target),
    link: itemLink(target),
  };
  if (source.type !== target.type) return target;
  // Start from the source's design, then put the target's content back.
  const copy = (from: Node, to: Node): Node => {
    if (from.type !== to.type) return to;
    const merged = {
      ...from,
      id: to.id,
      frame: to.frame,
      name: to.name,
    } as Node;
    if (from.type === "shape" && to.type === "shape") {
      const fromChildren = from.children ?? [];
      const toChildren = to.children ?? [];
      const sameShape =
        fromChildren.length === toChildren.length &&
        fromChildren.every(
          (child, index) => child.type === toChildren[index].type,
        );
      (merged as ShapeNode).children = sameShape
        ? fromChildren.map((child, index) => ({
            ...copy(child, toChildren[index]),
            frame: child.frame,
          }))
        : toChildren;
    }
    // Content stays the target's own: every text and image.
    if (to.type === "image" && merged.type === "image") merged.image = to.image;
    if ((to.type === "text" || to.type === "heading") && "text" in merged)
      merged.text = to.text;
    return merged;
  };
  let result = copy(source, target);
  result = setItemTitle(result, content.title);
  if (content.link) result = setItemLink(result, content.link);
  // Widgets keep their own picture (frames already did, layer by layer).
  if (content.image && "image" in result)
    result = { ...result, image: content.image } as Node;
  return result;
}
