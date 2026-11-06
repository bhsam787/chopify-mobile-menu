/**
 * Pure, immutable edit operations on a design (used by the editor). Every
 * function returns a new design and leaves its input untouched.
 */
import {
  childNodes,
  designRoots,
  isParentNode,
  newId,
  type ParentNode,
} from "./tree";
import type { ContainerNode, Design, Node } from "./types";

export interface NodeLocation {
  node: Node;
  /** Container, canvas or shape holding the node (not for roots, tab panels or accordion bodies). */
  parent?: ParentNode;
  index: number;
  /** Ids from the root down to the node's parent. */
  path: string[];
}

export function locate(design: Design, id: string): NodeLocation | undefined {
  const search = (node: Node, path: string[]): NodeLocation | undefined => {
    if (isParentNode(node)) {
      const children = childNodes(node);
      for (let index = 0; index < children.length; index++) {
        const child = children[index];
        if (child.id === id)
          return { node: child, parent: node, index, path: [...path, node.id] };
        const found = search(child, [...path, node.id]);
        if (found) return found;
      }
      return undefined;
    }
    for (const child of childNodes(node)) {
      if (child.id === id)
        return { node: child, index: 0, path: [...path, node.id] };
      const found = search(child, [...path, node.id]);
      if (found) return found;
    }
    return undefined;
  };
  for (const root of designRoots(design)) {
    if (root.id === id) return { node: root, index: 0, path: [] };
    const found = search(root, []);
    if (found) return found;
  }
  return undefined;
}

/** Applies `update` to the node with `id` anywhere in the design. */
export function mapNode(
  design: Design,
  id: string,
  update: (node: Node) => Node,
): Design {
  const visit = <T extends Node>(node: T): T => {
    if (node.id === id) return update(node) as T;
    switch (node.type) {
      case "container":
      case "canvas":
      case "shape": {
        if (!node.children) return node;
        const current = node.children;
        const children = current.map(visit);
        return children.some((child, index) => child !== current[index])
          ? { ...node, children }
          : node;
      }
      case "tabs": {
        const tabs = node.tabs.map((tab) => {
          const child = visit(tab.child);
          return child === tab.child ? tab : { ...tab, child };
        });
        return tabs.some((tab, index) => tab !== node.tabs[index])
          ? { ...node, tabs }
          : node;
      }
      case "accordion": {
        const child = visit(node.child);
        return child === node.child ? node : { ...node, child };
      }
      default:
        return node;
    }
  };
  const header = visit(design.header);
  const footer = design.footer ? visit(design.footer) : undefined;
  const screens = design.screens.map((screen) => {
    const root = visit(screen.root);
    return root === screen.root ? screen : { ...screen, root };
  });
  return { ...design, header, footer, screens };
}

export function updateNode<T extends Node>(
  design: Design,
  id: string,
  patch: Partial<T>,
): Design {
  return mapNode(design, id, (node) => ({ ...node, ...patch }) as Node);
}

function isAncestor(design: Design, ancestorId: string, id: string): boolean {
  return locate(design, id)?.path.includes(ancestorId) ?? false;
}

/** Removes a node from its container. Roots and tab/accordion bodies can't be removed. */
export function removeNode(design: Design, id: string): Design {
  const location = locate(design, id);
  if (!location?.parent) return design;
  const parent = location.parent;
  return mapNode(design, parent.id, () => ({
    ...parent,
    children: childNodes(parent).filter((child) => child.id !== id),
  }));
}

/** Inserts `node` into container (or canvas/shape) `containerId` at `index` (end when omitted). */
export function insertNode(
  design: Design,
  containerId: string,
  node: Node,
  index?: number,
): Design {
  return mapNode(design, containerId, (container) => {
    if (!isParentNode(container)) return container;
    const children = [...childNodes(container)];
    children.splice(index ?? children.length, 0, node);
    return { ...container, children };
  });
}

/** Moves a node into a container at an index. Refuses moves into its own subtree. */
export function moveNode(
  design: Design,
  id: string,
  containerId: string,
  index: number,
): Design {
  const location = locate(design, id);
  if (
    !location?.parent ||
    id === containerId ||
    isAncestor(design, id, containerId)
  )
    return design;
  let target = index;
  if (location.parent.id === containerId && location.index < index) target -= 1;
  return insertNode(removeNode(design, id), containerId, location.node, target);
}

/** Moves a node one step up or down within its container. */
export function shiftNode(design: Design, id: string, delta: -1 | 1): Design {
  const location = locate(design, id);
  if (!location?.parent) return design;
  const next = location.index + delta;
  if (next < 0 || next >= childNodes(location.parent).length) return design;
  return moveNode(design, id, location.parent.id, delta > 0 ? next + 1 : next);
}

/** Deep copy with fresh ids for the node and everything inside it. */
export function cloneWithNewIds<T extends Node>(node: T): T {
  const copy = structuredClone(node) as Node;
  const renew = (current: Node) => {
    current.id = newId(current.id.replace(/[^a-z].*$/, "") || "n");
    if (current.type === "tabs")
      current.tabs.forEach((tab) => (tab.id = newId("tab")));
    if (current.type === "stories")
      current.items.forEach((item) => (item.id = newId("i")));
    childNodes(current).forEach(renew);
  };
  renew(copy);
  return copy as T;
}

export function duplicateNode(
  design: Design,
  id: string,
): { design: Design; newId?: string } {
  const location = locate(design, id);
  if (!location?.parent) return { design };
  const copy = cloneWithNewIds(location.node);
  return {
    design: insertNode(design, location.parent.id, copy, location.index + 1),
    newId: copy.id,
  };
}

/** Where a new widget goes: into the selected container, or right after the selected node. */
export function insertionPoint(
  design: Design,
  selectedId: string | null,
  screenId: string,
): { containerId: string; index?: number } {
  const screen =
    design.screens.find((candidate) => candidate.id === screenId) ??
    design.screens[0];
  if (!selectedId) return { containerId: screen.root.id };
  const location = locate(design, selectedId);
  if (!location) return { containerId: screen.root.id };
  if (location.node.type === "container")
    return { containerId: location.node.id };
  if (location.node.type === "accordion")
    return { containerId: location.node.child.id };
  if (location.parent)
    return { containerId: location.parent.id, index: location.index + 1 };
  return { containerId: screen.root.id };
}

/** Which screen a node belongs to ("header"/"footer" for the pinned parts). */
export function screenOf(design: Design, id: string): string | undefined {
  if (design.header.id === id) return "header";
  if (
    design.footer &&
    (design.footer.id === id ||
      locate(design, id)?.path[0] === design.footer.id)
  )
    return "footer";
  return design.screens.find(
    (screen) =>
      screen.root.id === id || locate(design, id)?.path[0] === screen.root.id,
  )?.id;
}

export function addScreen(
  design: Design,
  title: string,
): { design: Design; screenId: string } {
  const screenId = newId("s");
  const root: ContainerNode = {
    id: newId("c"),
    type: "container",
    layout: "stack",
    gap: 8,
    box: { padding: 12 },
    children: [],
  };
  return {
    design: {
      ...design,
      screens: [...design.screens, { id: screenId, title, root }],
    },
    screenId,
  };
}

export function removeScreen(design: Design, screenId: string): Design {
  if (design.screens[0]?.id === screenId) return design;
  // Links pointing to the removed screen become "no link".
  let next: Design = {
    ...design,
    screens: design.screens.filter((screen) => screen.id !== screenId),
  };
  const visit = (node: Node) => {
    if (
      "link" in node &&
      node.link?.type === "screen" &&
      node.link.screenId === screenId
    ) {
      next = updateNode(next, node.id, {
        link: { type: "none" },
      } as Partial<Node>);
    }
    childNodes(node).forEach(visit);
  };
  designRoots(next).forEach(visit);
  return next;
}

/**
 * Whether a node sits inside side tabs. Side tabs are already the second
 * level (tap a category, see its items), so their items don't get sub-menus.
 */
export function isInSideTabs(design: Design, id: string): boolean {
  const path = locate(design, id)?.path ?? [];
  return path.some((ancestorId) => {
    const ancestor = locate(design, ancestorId)?.node;
    return ancestor?.type === "tabs" && ancestor.placement === "side";
  });
}
