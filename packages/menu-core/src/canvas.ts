import type { Frame, Node, TabsNode } from "./types";

/**
 * Layout rules of free canvases, shared by the renderer and the editor's
 * selection overlay so both always agree.
 */

/** Default height of the tab bar of free (canvas) tabs. */
export const TAB_BAR_HEIGHT = 36;
/** Space between the tab bar and the panel (matches `.chm-tabs` gap). */
export const TAB_GAP = 14;

/** Where a free tab panel starts, below the tab bar. */
export function tabPanelOffset(node: TabsNode): number {
  return (node.barHeight ?? TAB_BAR_HEIGHT) + TAB_GAP;
}

/** Whether tabs keep their panels as free canvases (shapes) instead of sections. */
export function isFreeTabs(node: Node): node is TabsNode {
  return (
    node.type === "tabs" && node.tabs.some((tab) => tab.child.type === "shape")
  );
}

/**
 * Positions of a canvas's (or frame's) children with collapsible frames in
 * their current state. The design is laid out with every collapsible in its
 * default state; opening one (or closing a default-open one) moves the
 * layers below its top part by the difference, like an accordion.
 */
export function canvasLayout(
  children: Node[],
  isOpen: (node: Node) => boolean,
): { frames: Map<string, Frame>; extra: number } {
  const frames = new Map<string, Frame>();
  const changes: { below: number; delta: number }[] = [];
  for (const child of children) {
    if (child.type !== "shape" || !child.collapsible || !child.frame) continue;
    const closed = Math.min(child.collapsible.height, child.frame.h);
    const size = (open: boolean) => (open ? child.frame!.h : closed);
    const delta = size(isOpen(child)) - size(Boolean(child.collapsible.open));
    if (delta) changes.push({ below: child.frame.y + closed, delta });
  }
  for (const child of children) {
    if (!child.frame) continue;
    const shift = changes.reduce(
      (sum, change) =>
        child.frame!.y >= change.below - 0.5 ? sum + change.delta : sum,
      0,
    );
    const height =
      child.type === "shape" && child.collapsible && !isOpen(child)
        ? Math.min(child.collapsible.height, child.frame.h)
        : child.frame.h;
    frames.set(child.id, {
      ...child.frame,
      y: child.frame.y + shift,
      h: height,
    });
  }
  return {
    frames,
    extra: changes.reduce((sum, change) => sum + change.delta, 0),
  };
}
