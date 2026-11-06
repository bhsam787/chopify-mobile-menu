import type {
  Design,
  Frame,
  Node,
  ShapeNode,
  TabsNode,
} from "@chopify/menu-core";
import {
  CANVAS_WIDTH,
  childNodes,
  cloneWithNewIds,
  insertNode,
  locate,
  mapNode,
  newId,
  removeNode,
  tabPanelOffset,
  updateNode,
  walkDesign,
} from "@chopify/menu-core";

/**
 * Figma-style arrange operations on canvas layers. All are pure: they take a
 * design and return a new one.
 */

export type Align = "left" | "hcenter" | "right" | "top" | "vmiddle" | "bottom";

/** The common parent of `ids`, or undefined when they sit in different frames. */
export function sharedParent(design: Design, ids: string[]) {
  const parents = ids.map((id) => locate(design, id)?.parent);
  const first = parents[0];
  return first && parents.every((parent) => parent?.id === first.id)
    ? first
    : undefined;
}

function bounds(frames: Frame[]): Frame {
  const x = Math.min(...frames.map((frame) => frame.x));
  const y = Math.min(...frames.map((frame) => frame.y));
  const right = Math.max(...frames.map((frame) => frame.x + frame.w));
  const bottom = Math.max(...frames.map((frame) => frame.y + frame.h));
  return { x, y, w: right - x, h: bottom - y };
}

const framesOf = (design: Design, ids: string[]) =>
  ids
    .map((id) => locate(design, id)?.node)
    .filter((node): node is Node & { frame: Frame } => Boolean(node?.frame));

/**
 * Puts layers that share a parent into a new frame ("Group", ⌘G) sized to
 * fit them, in the place of the top-most one. They keep their position.
 */
export function groupLayers(
  design: Design,
  ids: string[],
): { design: Design; groupId: string } | null {
  const parent = sharedParent(design, ids);
  const nodes = framesOf(design, ids);
  if (!parent || nodes.length === 0) return null;
  const box = bounds(nodes.map((node) => node.frame));
  const siblings = childNodes(parent);
  // Keep the paint order of the grouped layers.
  const ordered = siblings.filter((child) => ids.includes(child.id));
  const top = Math.max(...ordered.map((child) => siblings.indexOf(child)));
  const group: ShapeNode = {
    id: newId("sh"),
    type: "shape",
    name: "Group",
    link: { type: "none" },
    frame: box,
    children: ordered.map((child) => ({
      ...child,
      frame: {
        ...child.frame!,
        x: child.frame!.x - box.x,
        y: child.frame!.y - box.y,
      },
    })),
  };
  let next = design;
  for (const id of ids) next = removeNode(next, id);
  const index = top - (ordered.length - 1);
  return {
    design: insertNode(next, parent.id, group, index),
    groupId: group.id,
  };
}

/**
 * Replaces a frame by its layers (⇧⌘G), placed where they were on screen.
 * The frame's own fill, border and link go away with it.
 */
export function ungroupLayer(
  design: Design,
  id: string,
): { design: Design; ids: string[] } | null {
  const location = locate(design, id);
  const node = location?.node;
  if (
    !location?.parent ||
    node?.type !== "shape" ||
    !node.children?.length ||
    !node.frame
  )
    return null;
  const origin = node.frame;
  const children = node.children.map((child) => ({
    ...child,
    frame: child.frame && {
      ...child.frame,
      x: child.frame.x + origin.x,
      y: child.frame.y + origin.y,
    },
  }));
  let next = removeNode(design, id);
  children.forEach((child, offset) => {
    next = insertNode(
      next,
      location.parent!.id,
      child,
      location.index + offset,
    );
  });
  return { design: next, ids: children.map((child) => child.id) };
}

/**
 * Aligns layers to each other (several selected) or to their parent (one
 * selected, `parentSize` = the canvas or frame size).
 */
export function alignLayers(
  design: Design,
  ids: string[],
  align: Align,
  parentSize: { w: number; h: number },
): Design {
  const nodes = framesOf(design, ids);
  if (nodes.length === 0) return design;
  const box =
    nodes.length === 1
      ? { x: 0, y: 0, w: parentSize.w, h: parentSize.h }
      : bounds(nodes.map((node) => node.frame));
  return nodes.reduce((next, node) => {
    const frame = { ...node.frame };
    if (align === "left") frame.x = box.x;
    if (align === "hcenter")
      frame.x = Math.round(box.x + (box.w - frame.w) / 2);
    if (align === "right") frame.x = box.x + box.w - frame.w;
    if (align === "top") frame.y = box.y;
    if (align === "vmiddle")
      frame.y = Math.round(box.y + (box.h - frame.h) / 2);
    if (align === "bottom") frame.y = box.y + box.h - frame.h;
    return updateNode(next, node.id, { frame });
  }, design);
}

/** Spaces 3+ layers evenly between the outer two (Figma's "Distribute"). */
export function distributeLayers(
  design: Design,
  ids: string[],
  axis: "x" | "y",
): Design {
  const nodes = framesOf(design, ids);
  if (nodes.length < 3) return design;
  const size = axis === "x" ? "w" : "h";
  const sorted = [...nodes].sort((a, b) => a.frame[axis] - b.frame[axis]);
  const first = sorted[0].frame;
  const last = sorted[sorted.length - 1].frame;
  const total = sorted.reduce((sum, node) => sum + node.frame[size], 0);
  const gap =
    (last[axis] + last[size] - first[axis] - total) / (sorted.length - 1);
  let position = first[axis];
  return sorted.reduce((next, node) => {
    const frame = { ...node.frame, [axis]: Math.round(position) };
    position += node.frame[size] + gap;
    return updateNode(next, node.id, { frame });
  }, design);
}

/** Pastes copies of `nodes` (fresh ids) into `parentId`, offset so they don't hide the originals. */
export function pasteLayers(
  design: Design,
  parentId: string,
  nodes: Node[],
  offset: number,
): { design: Design; ids: string[] } {
  let next = design;
  const ids: string[] = [];
  for (const node of nodes) {
    const copy = cloneWithNewIds(node);
    if (copy.frame)
      copy.frame = {
        ...copy.frame,
        x: copy.frame.x + offset,
        y: copy.frame.y + offset,
      };
    next = insertNode(next, parentId, copy);
    ids.push(copy.id);
  }
  return { design: next, ids };
}

/** Applies several frame changes at once (moving a multi-selection). */
export function setFrames(
  design: Design,
  frames: { id: string; frame: Frame }[],
): Design {
  return frames.reduce(
    (next, { id, frame }) => mapNode(next, id, (node) => ({ ...node, frame })),
    design,
  );
}

/** The free tabs whose panel is `panelId`, if it is a tab panel. */
export function tabsOfPanel(
  design: Design,
  panelId: string,
): TabsNode | undefined {
  let found: TabsNode | undefined;
  walkDesign(design, (node) => {
    if (
      !found &&
      node.type === "tabs" &&
      node.tabs.some((tab) => tab.child.id === panelId)
    )
      found = node;
  });
  return found;
}

/** Size of the area inside a canvas, frame or tab panel. */
export function areaOf(
  design: Design,
  parentId: string,
): { w: number; h: number } | undefined {
  const node = locate(design, parentId)?.node;
  if (node?.type === "canvas") return { w: CANVAS_WIDTH, h: node.height };
  if (node?.frame) return { w: node.frame.w, h: node.frame.h };
  const tabs = tabsOfPanel(design, parentId);
  if (tabs?.frame)
    return { w: tabs.frame.w, h: tabs.frame.h - tabPanelOffset(tabs) };
  return undefined;
}

const overlaps = (a: Frame, b: Frame) =>
  a.x < b.x + b.w - 1 &&
  a.x + a.w > b.x + 1 &&
  a.y < b.y + b.h - 1 &&
  a.y + a.h > b.y + 1;

/**
 * Where a copy of `frame` goes among `siblings`, like a grid filling up: to
 * its right when that's free and fits (always, in a sideways-scrolling
 * frame), else at the start of the next free row, else just below it.
 */
export function placeCopy(
  frame: Frame,
  siblings: Frame[],
  width: number,
  scrolls: boolean,
  gap = 12,
): Frame {
  const free = (candidate: Frame) =>
    !siblings.some((sibling) => overlaps(candidate, sibling));
  const right = { ...frame, x: frame.x + frame.w + gap };
  if (scrolls || (right.x + right.w <= width + 0.5 && free(right))) {
    if (scrolls) {
      // At the end of the row.
      const end = Math.max(
        frame.x + frame.w,
        ...siblings.map((sibling) => sibling.x + sibling.w),
      );
      return { ...frame, x: end + gap };
    }
    return right;
  }
  const rowStart = Math.min(
    frame.x,
    ...siblings
      .filter((sibling) => Math.abs(sibling.y - frame.y) < 2)
      .map((sibling) => sibling.x),
  );
  for (
    let y = frame.y + frame.h + gap;
    y < frame.y + 20 * (frame.h + gap);
    y += frame.h + gap
  ) {
    for (const x of [rowStart, frame.x]) {
      const candidate = { ...frame, x, y };
      if (free(candidate)) return candidate;
    }
  }
  return { ...frame, y: frame.y + frame.h + gap };
}

/**
 * Makes room for a layer that ends at `bottom` inside `parentId`: a tab
 * panel grows its tabs, a frame (not a sideways scroller) grows, the canvas
 * grows. Returns the design unchanged when it already fits.
 */
export function growToFit(
  design: Design,
  parentId: string,
  bottom: number,
  padding = 0,
): Design {
  const area = areaOf(design, parentId);
  if (!area || bottom + padding <= area.h) return design;
  const extra = Math.ceil(bottom + padding - area.h);
  const node = locate(design, parentId)?.node;
  if (node?.type === "canvas")
    return updateNode(design, node.id, { height: node.height + extra });
  // A frame or a tab panel's tabs grows; then its own parent may need to grow too.
  const grown =
    node?.type === "shape" && node.frame && !node.scroll
      ? node
      : node?.frame
        ? undefined
        : tabsOfPanel(design, parentId);
  if (!grown?.frame) return design;
  const frame = { ...grown.frame, h: grown.frame.h + extra };
  const next = updateNode(design, grown.id, { frame });
  const outer = locate(next, grown.id)?.parent;
  return outer ? growToFit(next, outer.id, frame.y + frame.h, padding) : next;
}

/** Pastes copies of `nodes` with their top-left corner at (x, y) inside `parentId`. */
export function pasteAt(
  design: Design,
  parentId: string,
  nodes: Node[],
  x: number,
  y: number,
): { design: Design; ids: string[] } {
  const frames = nodes
    .map((node) => node.frame)
    .filter((frame): frame is Frame => Boolean(frame));
  if (!frames.length) return pasteLayers(design, parentId, nodes, 0);
  const box = bounds(frames);
  const moved = nodes.map((node) =>
    node.frame
      ? {
          ...node,
          frame: {
            ...node.frame,
            x: node.frame.x - box.x + x,
            y: node.frame.y - box.y + y,
          },
        }
      : node,
  );
  return pasteLayers(design, parentId, moved, 0);
}
