import { childNodes, designRoots } from "./tree";
import type { Design, Node } from "./types";
import { SCHEMA_VERSION } from "./types";

const NODE_TYPES = new Set<string>([
  "container",
  "tabs",
  "header",
  "heading",
  "text",
  "card",
  "row",
  "accordion",
  "banner",
  "countdown",
  "pill",
  "chip",
  "button",
  "stories",
  "review",
  "social-proof",
  "account-bar",
  "localization",
  "image",
  "divider",
  "spacer",
  "canvas",
  "shape",
  "products",
  "perks",
  "contact",
  "discount",
  "ticker",
]);

export class InvalidDesignError extends Error {
  constructor(message: string) {
    super(`Invalid menu design: ${message}`);
    this.name = "InvalidDesignError";
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Structural check for designs received from the editor before they're
 * stored: known node types, unique ids, required parts present.
 */
export function parseDesign(value: unknown): Design {
  if (!isObject(value)) throw new InvalidDesignError("not an object");
  if (value.schemaVersion !== SCHEMA_VERSION)
    throw new InvalidDesignError("unsupported schema version");
  if (
    !isObject(value.tokens) ||
    !isObject(value.behavior) ||
    !isObject(value.translations)
  ) {
    throw new InvalidDesignError("missing tokens, behavior or translations");
  }
  if (!Array.isArray(value.screens) || value.screens.length === 0)
    throw new InvalidDesignError("no screens");
  if (!isObject(value.header) || value.header.type !== "header")
    throw new InvalidDesignError("missing header");
  if (value.customCss !== undefined && typeof value.customCss !== "string")
    throw new InvalidDesignError("custom CSS must be text");

  const design = value as unknown as Design;
  const ids = new Set<string>();
  const check = (node: Node) => {
    if (
      !isObject(node) ||
      typeof node.id !== "string" ||
      !NODE_TYPES.has(node.type)
    ) {
      throw new InvalidDesignError("unknown node");
    }
    if (ids.has(node.id))
      throw new InvalidDesignError(`duplicate id ${node.id}`);
    ids.add(node.id);
    if (
      (node.type === "container" || node.type === "canvas") &&
      !Array.isArray(node.children)
    ) {
      throw new InvalidDesignError("container without children");
    }
    if (
      node.type === "shape" &&
      node.children !== undefined &&
      !Array.isArray(node.children)
    ) {
      throw new InvalidDesignError("shape with invalid children");
    }
    childNodes(node).forEach(check);
  };
  designRoots(design).forEach(check);
  for (const screen of design.screens) {
    if (
      typeof screen.id !== "string" ||
      !isObject(screen.root) ||
      screen.root.type !== "container"
    ) {
      throw new InvalidDesignError("invalid screen");
    }
  }
  return design;
}
