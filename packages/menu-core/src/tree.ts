import type {
  CanvasNode,
  ContainerNode,
  Design,
  Node,
  ShapeNode,
} from "./types";

/** Nodes that hold a list of child nodes. */
export type ParentNode = ContainerNode | CanvasNode | ShapeNode;

export function isParentNode(node: Node): node is ParentNode {
  return (
    node.type === "container" || node.type === "canvas" || node.type === "shape"
  );
}

/** Direct child nodes of a node (containers, canvases, shapes, tabs and accordions have children). */
export function childNodes(node: Node): Node[] {
  switch (node.type) {
    case "container":
    case "canvas":
      return node.children;
    case "shape":
      return node.children ?? [];
    case "tabs":
      return node.tabs.map((tab) => tab.child);
    case "accordion":
      return [node.child];
    default:
      return [];
  }
}

/** Every root of the design: header, footer and each screen. */
export function designRoots(design: Design): Node[] {
  return [
    design.header,
    ...(design.footer ? [design.footer] : []),
    ...design.screens.map((screen) => screen.root),
  ];
}

/** Depth-first walk over every node of the design. */
export function walkDesign(design: Design, visit: (node: Node) => void): void {
  const walk = (node: Node) => {
    visit(node);
    childNodes(node).forEach(walk);
  };
  designRoots(design).forEach(walk);
}

/** A copy of the node without its hidden descendants. */
export function withoutHidden<T extends Node>(node: T): T {
  const copy = { ...node };
  if (isParentNode(copy) && copy.children) {
    copy.children = copy.children
      .filter((child) => !child.hidden)
      .map(withoutHidden);
  } else if (copy.type === "tabs") {
    copy.tabs = copy.tabs.map((tab) => ({
      ...tab,
      child: withoutHidden(tab.child),
    }));
  } else if (copy.type === "accordion") {
    copy.child = withoutHidden(copy.child);
  }
  return copy;
}

let counter = 0;

/** Short, collision-resistant id for nodes created in the editor or templates. */
export function newId(prefix = "n"): string {
  counter = (counter + 1) % 1296;
  return `${prefix}${Date.now().toString(36).slice(-5)}${counter.toString(36).padStart(2, "0")}${Math.random()
    .toString(36)
    .slice(2, 5)}`;
}
