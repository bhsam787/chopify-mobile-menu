import type { CanvasNode, Frame, Node, ShapeNode } from "@chopi/menu-core";
import {
  CANVAS_WIDTH,
  canvasLayout,
  childNodes,
  isFreeTabs,
  tabPanelArea,
} from "@chopi/menu-core";

/**
 * Font for "theme font" texts in the editor (the storefront uses the theme's
 * own). Off-screen measuring renders use it too, so measured layers match.
 */
export const PREVIEW_FONT = `-apple-system, BlinkMacSystemFont, "San Francisco", "Segoe UI", Roboto, "Helvetica Neue", sans-serif`;

/** A layer on the canvas with its absolute position (canvas units). */
export interface LayerEntry {
  node: Node;
  /** Position on the canvas (frames are relative to the parent layer). */
  abs: Frame;
  /** The canvas or the shape holding this layer. */
  parentId: string;
  /** Ids of the shapes above this layer, outermost first (the canvas excluded). */
  ancestors: string[];
  /** Visible area when a parent cuts the layer off (clip, scroll, closed accordion, tab panel). */
  clip?: Frame;
  /** A tab panel: placed by its tabs, so it can't be moved or resized itself. */
  fixed?: boolean;
}

/** What the editor shows: the tab picked for each tabs layer and accordions shown open. */
export interface CanvasView {
  activeTabs: Record<string, string>;
  expanded: string[];
  /** How far each sideways-scrolling frame is scrolled in the editor. */
  scroll?: Record<string, number>;
}

export const isOpenIn = (view: CanvasView) => (node: Node) =>
  node.type === "shape" &&
  Boolean(node.collapsible?.open || view.expanded.includes(node.id));

const intersect = (a: Frame, b: Frame | undefined): Frame => {
  if (!b) return a;
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  return {
    x,
    y,
    w: Math.max(0, Math.min(a.x + a.w, b.x + b.w) - x),
    h: Math.max(0, Math.min(a.y + a.h, b.y + b.h) - y),
  };
};

/** Shapes hold layers, like Figma frames. */
export const isFrameLayer = (node: Node): node is ShapeNode =>
  node.type === "shape";

/**
 * Every layer in paint order (parents before their children, later siblings
 * on top), positioned as the renderer places them: accordions push the
 * layers below, free tabs show the active tab's panel below their bar.
 */
export function flattenLayers(
  canvas: CanvasNode,
  view: CanvasView = { activeTabs: {}, expanded: [] },
): LayerEntry[] {
  const entries: LayerEntry[] = [];
  const isOpen = isOpenIn(view);
  const visit = (
    children: Node[],
    parentId: string,
    origin: { x: number; y: number },
    ancestors: string[],
    clip: Frame | undefined,
  ) => {
    const { frames } = canvasLayout(children, isOpen);
    for (const node of children) {
      const frame = frames.get(node.id);
      if (!frame) continue;
      const abs = { ...frame, x: origin.x + frame.x, y: origin.y + frame.y };
      entries.push({ node, abs, parentId, ancestors, clip });
      if (isFrameLayer(node)) {
        const cuts = node.clip || node.scroll || node.collapsible;
        const scrolled = node.scroll ? (view.scroll?.[node.id] ?? 0) : 0;
        visit(
          childNodes(node),
          node.id,
          { x: abs.x - scrolled, y: abs.y },
          [...ancestors, node.id],
          cuts ? intersect(abs, clip) : clip,
        );
      } else if (isFreeTabs(node)) {
        const tab =
          node.tabs.find(
            (candidate) => candidate.id === view.activeTabs[node.id],
          ) ?? node.tabs[0];
        const area = tabPanelArea(node, abs);
        const panelAbs = {
          x: abs.x + area.x,
          y: abs.y + area.y,
          w: area.w,
          h: area.h,
        };
        const panelClip = intersect(panelAbs, clip);
        entries.push({
          node: tab.child,
          abs: panelAbs,
          parentId: node.id,
          ancestors: [...ancestors, node.id],
          clip: panelClip,
          fixed: true,
        });
        visit(
          childNodes(tab.child),
          tab.child.id,
          panelAbs,
          [...ancestors, node.id, tab.child.id],
          panelClip,
        );
      }
    }
  };
  visit(canvas.children, canvas.id, { x: 0, y: 0 }, [], undefined);
  return entries;
}

/** Whether a click at (x, y) lands on the visible part of a layer. */
export const hits = (entry: LayerEntry, x: number, y: number) =>
  contains(entry.abs, x, y) && (!entry.clip || contains(entry.clip, x, y));

export const contains = (frame: Frame, x: number, y: number) =>
  x >= frame.x &&
  x <= frame.x + frame.w &&
  y >= frame.y &&
  y <= frame.y + frame.h;

/** The size of a layer's parent, used for snapping and centering. */
export function parentSize(
  canvas: CanvasNode,
  entries: LayerEntry[],
  parentId: string,
): { w: number; h: number } {
  if (parentId === canvas.id) return { w: CANVAS_WIDTH, h: canvas.height };
  const parent = entries.find((entry) => entry.node.id === parentId);
  return parent
    ? { w: parent.abs.w, h: parent.abs.h }
    : { w: CANVAS_WIDTH, h: canvas.height };
}

/** Absolute origin of a parent (the canvas is at 0,0). */
export function parentOrigin(
  entries: LayerEntry[],
  parentId: string,
): { x: number; y: number } {
  const parent = entries.find((entry) => entry.node.id === parentId);
  return parent ? { x: parent.abs.x, y: parent.abs.y } : { x: 0, y: 0 };
}

/**
 * The deepest visible frame under a point, where a dropped or moved layer
 * goes. `exclude` (the moved layer) and everything inside it are skipped.
 */
export function frameAt(
  canvas: CanvasNode,
  entries: LayerEntry[],
  x: number,
  y: number,
  exclude?: string,
): string {
  for (let index = entries.length - 1; index >= 0; index--) {
    const entry = entries[index];
    if (!isFrameLayer(entry.node) || entry.node.hidden) continue;
    if (
      exclude &&
      (entry.node.id === exclude || entry.ancestors.includes(exclude))
    )
      continue;
    if (hits(entry, x, y)) return entry.node.id;
  }
  return canvas.id;
}

/**
 * Figma-like click selection. The top-most layer under the point is found;
 * then the layer chosen is the one at the level being worked in: siblings of
 * the selection, or of any of its ancestors. A first click on a frame selects
 * the frame; double-click goes inside (see `enterAt`); `deep` selects the
 * innermost layer directly (Cmd/Ctrl-click).
 */
export function pickAt(
  entries: LayerEntry[],
  canvasId: string,
  selectedId: string | null,
  x: number,
  y: number,
  deep: boolean,
): LayerEntry | null {
  let hit: LayerEntry | null = null;
  for (let index = entries.length - 1; index >= 0; index--) {
    const entry = entries[index];
    if (!entry.node.hidden && hits(entry, x, y)) {
      hit = entry;
      break;
    }
  }
  if (!hit || deep) return hit;
  const selected = entries.find((entry) => entry.node.id === selectedId);
  const levels = new Set([canvasId, ...(selected?.ancestors ?? [])]);
  const chain = [...hit.ancestors, hit.node.id];
  for (let depth = chain.length - 1; depth >= 0; depth--) {
    const entry = entries.find(
      (candidate) => candidate.node.id === chain[depth],
    )!;
    if (levels.has(entry.parentId)) return entry;
  }
  return entries.find((candidate) => candidate.node.id === chain[0]) ?? hit;
}

/** Double-click: the layer one level inside the selected frame, under the point. */
export function enterAt(
  entries: LayerEntry[],
  selectedId: string,
  x: number,
  y: number,
): LayerEntry | null {
  for (let index = entries.length - 1; index >= 0; index--) {
    const entry = entries[index];
    if (entry.node.hidden || !hits(entry, x, y)) continue;
    const position = entry.ancestors.indexOf(selectedId);
    if (position === -1) continue;
    // Tab panels are skipped: double-clicking tabs goes straight to the layers in the tab.
    const fixed = new Set(
      entries
        .filter((candidate) => candidate.fixed)
        .map((candidate) => candidate.node.id),
    );
    const childId =
      entry.ancestors.slice(position + 1).find((id) => !fixed.has(id)) ??
      entry.node.id;
    return entries.find((candidate) => candidate.node.id === childId) ?? null;
  }
  return null;
}
