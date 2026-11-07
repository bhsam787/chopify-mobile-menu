import type {
  ContainerNode,
  Node,
  ShapeNode,
  TabsNode,
} from "@chopi/menu-core";
import {
  cloneWithNewIds,
  isFreeTabs,
  newId,
  SIDE_TAB_GAP,
  SIDE_TAB_HEIGHT,
  TAB_BAR_HEIGHT,
  TAB_RAIL_WIDTH,
  tabPanelArea,
} from "@chopi/menu-core";
import {
  isList,
  layoutList,
  setItemLink,
  setItemTitle,
  type ListFrame,
} from "./items";
import { SAMPLE_LINK } from "./elements";

/**
 * Tabs moved between a bar on top and a column on the side. On a canvas the
 * panels change width, so their layers are fitted to it: lists lay their
 * items out again at the new width, other layers stretch or shrink across.
 */
export function placeTabs(
  node: TabsNode,
  placement: "top" | "side",
): Partial<TabsNode> {
  const side = placement === "side";
  const patch: Partial<TabsNode> = {
    placement,
    railWidth: side ? (node.railWidth ?? TAB_RAIL_WIDTH) : node.railWidth,
    barHeight: side ? SIDE_TAB_HEIGHT : TAB_BAR_HEIGHT,
  };
  // A plain boolean: the type guard would narrow `node` away in this branch.
  const free: boolean = isFreeTabs(node);
  if (!free) {
    // Beside the tab column a panel is narrower: one card fewer per row
    // (and one more again when the tabs go back on top).
    const step = side ? -1 : 1;
    return {
      ...patch,
      tabs: node.tabs.map((tab) => ({
        ...tab,
        child: fitGrids(tab.child as ContainerNode, step),
      })),
    };
  }
  if (!node.frame) return patch;

  const next = { ...node, ...patch };
  const before = tabPanelArea(node, node.frame);
  // Side tabs need room for the whole column of tabs.
  const railHeight = node.tabs.length * (SIDE_TAB_HEIGHT + SIDE_TAB_GAP);
  const frame = side
    ? { ...node.frame, h: Math.max(node.frame.h - before.y, railHeight) }
    : { ...node.frame, h: node.frame.h + TAB_BAR_HEIGHT + 14 };
  const after = tabPanelArea(next, frame);
  return {
    ...patch,
    frame,
    tabs: node.tabs.map((tab) =>
      tab.child.type === "shape"
        ? {
            ...tab,
            child: {
              ...tab.child,
              children: (tab.child.children ?? []).map((layer) =>
                fitAcross(layer, before.w, after.w),
              ),
            },
          }
        : tab,
    ),
  };
}

/** A layer of a panel that was `from` wide, fitted to `to`. */
function fitAcross(layer: Node, from: number, to: number): Node {
  if (!layer.frame || from <= 0) return layer;
  const scale = to / from;
  const frame = {
    ...layer.frame,
    x: Math.round(layer.frame.x * scale),
    w: Math.max(8, Math.round(layer.frame.w * scale)),
  };
  if (layer.type === "shape" && layer.list) {
    // The list places its items again; each item's own layers (photo,
    // title…) then stretch to the item's new width.
    const before = new Map(
      (layer.children ?? []).map((item) => [item.id, item.frame?.w ?? 0]),
    );
    const laid = layoutList({ ...layer, frame } as ListFrame);
    return {
      ...laid,
      children: (laid.children ?? []).map((item) =>
        stretchLayers(item, before.get(item.id) ?? 0),
      ),
    };
  }
  return stretchLayers({ ...layer, frame }, layer.frame.w);
}

/** A frame's inner layers stretched across from `fromWidth` to its current width. */
function stretchLayers(node: Node, fromWidth: number): Node {
  if (node.type !== "shape" || !node.children?.length || !node.frame)
    return node;
  if (fromWidth <= 0 || fromWidth === node.frame.w) return node;
  const scale = node.frame.w / fromWidth;
  return {
    ...node,
    children: node.children.map((child) => {
      if (!child.frame) return child;
      const frame = {
        ...child.frame,
        x: Math.round(child.frame.x * scale),
        w: Math.max(4, Math.round(child.frame.w * scale)),
      };
      return stretchLayers({ ...child, frame }, child.frame.w);
    }),
  };
}

/** Card grids in a tab panel with `step` more (or fewer) columns, 1–4. */
function fitGrids(panel: ContainerNode, step: number): ContainerNode {
  const fit = (grid: ContainerNode): ContainerNode => ({
    ...grid,
    columns: Math.max(1, Math.min(4, (grid.columns ?? 2) + step)) as
      1 | 2 | 3 | 4,
  });
  if (panel.layout === "grid") return fit(panel);
  return {
    ...panel,
    children: panel.children.map((child) =>
      child.type === "container" && child.layout === "grid"
        ? fit(child)
        : child,
    ),
  };
}

/**
 * Tabs with one more tab. Its panel starts as a copy of the first tab's
 * (same cards and style) with sample items to rename, rather than empty, so
 * the merchant only changes titles, photos and links. Side tabs grow so the
 * column of tabs keeps fitting.
 */
export function addTab(node: TabsNode): Partial<TabsNode> {
  const number = node.tabs.length + 1;
  const label = `Tab ${number}`;
  const first = node.tabs[0]?.child;
  const child: ContainerNode | ShapeNode = first
    ? withSampleItems({ ...cloneWithNewIds(first), name: label })
    : {
        id: newId("c"),
        type: "container",
        layout: "grid",
        columns: 2,
        gap: 12,
        children: [],
      };
  const patch: Partial<TabsNode> = {
    tabs: [...node.tabs, { id: newId("tab"), label, child }],
  };
  if (node.placement === "side" && node.frame) {
    const rail = number * ((node.barHeight ?? SIDE_TAB_HEIGHT) + SIDE_TAB_GAP);
    if (rail > node.frame.h) patch.frame = { ...node.frame, h: rail };
  }
  return patch;
}

/** An empty tab filled like the first one (same cards, sample items). */
export function fillLikeFirstTab(
  node: TabsNode,
  tabId: string,
): Partial<TabsNode> {
  const first = node.tabs[0]?.child;
  if (!first) return {};
  return {
    tabs: node.tabs.map((tab) =>
      tab.id === tabId
        ? {
            ...tab,
            child: withSampleItems({
              ...cloneWithNewIds(first),
              name: tab.label,
            }),
          }
        : tab,
    ),
  };
}

/** A copied panel whose items read "Item 1", "Item 2"… and link to a sample page. */
function withSampleItems<T extends Node>(panel: T): T {
  let count = 0;
  const rename = (item: Node) =>
    setItemLink(setItemTitle(item, `Item ${++count}`), { ...SAMPLE_LINK });
  const visit = (node: Node): Node => {
    if (isList(node))
      return { ...node, children: (node.children ?? []).map(rename) };
    if (node.type === "container" && node.children.every(isSectionItem))
      return { ...node, children: node.children.map(rename) };
    if (node.type === "shape" && node.children)
      return { ...node, children: node.children.map(visit) };
    if (node.type === "container")
      return { ...node, children: node.children.map(visit) };
    return node;
  };
  return visit(panel) as T;
}

const SECTION_ITEMS = new Set<Node["type"]>([
  "card",
  "row",
  "chip",
  "pill",
  "button",
]);
const isSectionItem = (node: Node) => SECTION_ITEMS.has(node.type);
