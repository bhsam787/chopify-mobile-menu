import type {
  CanvasNode,
  Design,
  ListLayout,
  Node,
  ShapeNode,
} from "@chopi/menu-core";
import {
  addScreen,
  CANVAS_WIDTH,
  cloneWithNewIds,
  insertNode,
  locate,
  mapNode,
  newId,
  removeNode,
} from "@chopi/menu-core";
import { areaOf, growToFit } from "./arrange";
import { CANVAS_ELEMENTS, SIDE_MARGIN } from "./elements";
import {
  isList,
  itemTitle,
  layoutList,
  orderByPosition,
  setItemLink,
  setItemTitle,
  styleLike,
  type ListFrame,
} from "./items";

/**
 * Smart list operations for the canvas editor. All pure: a design in, a new
 * design out. After every change the list is laid out again and its frame,
 * tab or canvas grows to fit.
 */

/** Where new sample items go until the merchant picks a link. */
export const SAMPLE_LINK = {
  type: "route",
  route: "all_products",
  sample: true,
} as const;

/** Lays a list out again (and makes room for it). */
export function relayout(design: Design, listId: string): Design {
  const location = locate(design, listId);
  const list = location?.node;
  if (!isList(list)) return design;
  const laid = layoutList(list);
  let next = mapNode(design, listId, () => laid);
  if (location?.parent && laid.frame && list.frame) {
    // Keep the space there was below the list (e.g. an accordion's padding).
    const area = areaOf(design, location.parent.id);
    const below = area
      ? Math.max(0, area.h - (list.frame.y + list.frame.h))
      : 0;
    next = growToFit(
      next,
      location.parent.id,
      laid.frame.y + laid.frame.h,
      Math.min(below, 48),
    );
  }
  return next;
}

/** The list an item belongs to, if it is in one. */
export function listOf(design: Design, itemId: string): ListFrame | undefined {
  const parent = locate(design, itemId)?.parent;
  return isList(parent) ? parent : undefined;
}

/**
 * Adds an item to a list: a copy of `afterId` (or of the last item), named
 * "New item" with a sample link, placed right after it.
 */
export function addItem(
  design: Design,
  listId: string,
  afterId?: string,
): { design: Design; itemId?: string } {
  const list = locate(design, listId)?.node;
  if (!isList(list) || !list.children?.length) return { design };
  const index = afterId
    ? list.children.findIndex((child) => child.id === afterId)
    : list.children.length - 1;
  const source = list.children[Math.max(0, index)];
  const item = setItemLink(setItemTitle(cloneWithNewIds(source), "New item"), {
    ...SAMPLE_LINK,
  });
  const next = insertNode(design, listId, item, Math.max(0, index) + 1);
  return { design: relayout(next, listId), itemId: item.id };
}

export function removeItem(design: Design, itemId: string): Design {
  const list = listOf(design, itemId);
  if (!list) return removeNode(design, itemId);
  return relayout(removeNode(design, itemId), list.id);
}

/** Moves an item one place earlier (-1) or later (+1) in its list. */
export function moveItem(
  design: Design,
  itemId: string,
  delta: -1 | 1,
): Design {
  const list = listOf(design, itemId);
  if (!list?.children) return design;
  const items = [...list.children];
  const from = items.findIndex((child) => child.id === itemId);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= items.length) return design;
  [items[from], items[to]] = [items[to], items[from]];
  return relayout(
    mapNode(design, list.id, () => ({ ...list, children: items })),
    list.id,
  );
}

/** A copy of a list item right after it (same title and link); the list re-flows. */
export function duplicateItem(
  design: Design,
  itemId: string,
): { design: Design; itemId?: string } {
  const list = listOf(design, itemId);
  const index = list?.children?.findIndex((child) => child.id === itemId) ?? -1;
  if (!list?.children || index < 0) return { design };
  const copy = cloneWithNewIds(list.children[index]);
  const next = insertNode(design, list.id, copy, index + 1);
  return { design: relayout(next, list.id), itemId: copy.id };
}

/** After a list item was dragged: the order follows where it was dropped. */
export function reorderByPosition(design: Design, listId: string): Design {
  const list = locate(design, listId)?.node;
  if (!isList(list)) return design;
  return relayout(
    mapNode(design, listId, () => orderByPosition(list)),
    listId,
  );
}

/** After a list item was resized: every item takes that size. */
export function resizeAll(design: Design, itemId: string): Design {
  const list = listOf(design, itemId);
  const source = locate(design, itemId)?.node;
  if (!list?.children || !source?.frame) return design;
  const { w, h } = source.frame;
  // In a row each item keeps its width (chips fit their labels).
  const size = list.list.direction === "row" ? { h } : { w, h };
  const children = list.children.map((child) =>
    child.frame ? { ...child, frame: { ...child.frame, ...size } } : child,
  );
  return relayout(
    mapNode(design, list.id, () => ({ ...list, children })),
    list.id,
  );
}

/** "Make all items look like this one": design from `sourceId`, content kept. */
export function styleAllLike(design: Design, sourceId: string): Design {
  const list = listOf(design, sourceId);
  const source = locate(design, sourceId)?.node;
  if (!list?.children || !source) return design;
  const children = list.children.map((child) =>
    child.id === sourceId
      ? child
      : {
          ...styleLike(source, child),
          frame:
            child.frame && source.frame
              ? { ...child.frame, w: source.frame.w, h: source.frame.h }
              : child.frame,
        },
  );
  return relayout(
    mapNode(design, list.id, () => ({ ...list, children })),
    list.id,
  );
}

export function setListLayout(
  design: Design,
  listId: string,
  patch: Partial<ListLayout>,
): Design {
  const list = locate(design, listId)?.node;
  if (!isList(list)) return design;
  const layout = { ...list.list, ...patch };
  // Rows scroll sideways; the others don't.
  const next = mapNode(design, listId, () => ({
    ...list,
    list: layout,
    scroll: layout.direction === "row" ? ("x" as const) : undefined,
  }));
  return relayout(next, listId);
}

/** The Elements panel's Link list, placed like a list on a fresh canvas. */
function defaultLinkList(): ListFrame | undefined {
  const element = CANVAS_ELEMENTS.find(
    (candidate) => candidate.key === "link-list",
  );
  const node = element?.create();
  return isList(node)
    ? { ...node, frame: { x: 20, y: 64, w: 350, h: element!.size.h } }
    : undefined;
}

/** A new sub-menu screen whose content is a canvas. */
export function addCanvasScreen(
  design: Design,
  title: string,
  children: Node[] = [],
  height = 640,
): { design: Design; screenId: string; canvasId: string } {
  const { design: withScreen, screenId } = addScreen(design, title);
  const screen = withScreen.screens.find(
    (candidate) => candidate.id === screenId,
  )!;
  const canvas: CanvasNode = {
    id: newId("cv"),
    type: "canvas",
    name: "Canvas",
    height,
    background: "",
    children,
  };
  const next = mapNode(
    withScreen,
    screen.root.id,
    (root) =>
      ({
        ...root,
        gap: 0,
        box: { padding: 0 },
        children: [canvas],
      }) as Node,
  );
  return { design: next, screenId, canvasId: canvas.id };
}

/**
 * "Add sub-menu" on an item: a new sub-menu screen named after it, with a
 * title and a list that looks like the item's own list (three sample
 * items to rename), and the item now opens it. Works at any depth, so
 * sub-menus can have their own sub-menus.
 */
export function createSubMenu(
  design: Design,
  itemId: string,
): { design: Design; screenId: string; canvasId: string } | null {
  const item = locate(design, itemId)?.node;
  if (!item) return null;
  const title = itemTitle(item) || "Sub-menu";
  // Inside a list: the sub-menu's list looks like it. Otherwise a link list.
  const list = listOf(design, itemId) ?? defaultLinkList();
  if (!list?.frame) return null;
  const model = listOf(design, itemId) ? item : list.children?.[0];
  if (!model) return null;

  const items = [1, 2, 3].map((number) =>
    setItemLink(setItemTitle(cloneWithNewIds(model), `Item ${number}`), {
      ...SAMPLE_LINK,
    }),
  );
  // The parent list may sit inside a frame; on the new screen it starts
  // with the usual side margins. A sideways row runs to the edges and
  // starts its first item at the margin, so it can still scroll.
  const inner = CANVAS_WIDTH - SIDE_MARGIN * 2;
  const row = list.list?.direction === "row";
  const subList: ShapeNode = {
    ...cloneWithNewIds({ ...list, children: [] }),
    children: row
      ? items.map((child, index) =>
          index === 0 && child.frame
            ? { ...child, frame: { ...child.frame, x: SIDE_MARGIN } }
            : child,
        )
      : items,
    frame: row
      ? { ...list.frame, x: 0, y: 64, w: CANVAS_WIDTH }
      : { ...list.frame, x: SIDE_MARGIN, y: 64, w: inner },
  };
  const heading: Node = {
    id: newId("hd"),
    type: "heading",
    text: title,
    style: { size: 22, weight: 700 },
    frame: { x: SIDE_MARGIN, y: 16, w: inner, h: 32 },
  };
  const laid = layoutList(subList as ListFrame);
  const height = Math.max(
    240,
    (laid.frame?.y ?? 64) + (laid.frame?.h ?? 0) + 40,
  );
  const created = addCanvasScreen(design, title, [heading, laid], height);
  const next = mapNode(created.design, itemId, (node) =>
    setItemLink(node, { type: "screen", screenId: created.screenId }),
  );
  return { ...created, design: next };
}
