import type { ContainerNode, Node } from "@chopify/menu-core";
import { NODE_LABELS, describeLink, nodeLabel } from "@chopify/menu-core";

/**
 * How the editor presents the design: a numbered list of sections in
 * storefront order (like the BBB/Speckshop designers). A container whose
 * children are all "items" (cards, rows, chips…) is ONE section with an item
 * list; a container holding other sections is a "panel" that groups them.
 */

/** Node types edited as rows of a section's item list. */
export const ITEM_TYPES = new Set<Node["type"]>(["card", "row", "chip", "pill", "image", "accordion", "button"]);

export function isItemList(node: Node): node is ContainerNode {
  return node.type === "container" && node.children.every((child) => ITEM_TYPES.has(child.type));
}

/** A container that groups sections (e.g. a white rounded panel). */
export function isPanel(node: Node): node is ContainerNode {
  return node.type === "container" && !isItemList(node);
}

const ITEM_NOUNS: Partial<Record<Node["type"], [string, string]>> = {
  card: ["card", "Category cards"],
  row: ["link", "Links"],
  chip: ["chip", "Quick links"],
  pill: ["pill", "Promo pills"],
  image: ["image", "Images"],
  accordion: ["link", "Links"],
  button: ["button", "Buttons"],
};

export const SECTION_ICONS: Record<Node["type"], string> = {
  container: "layout-columns-2",
  tabs: "menu-horizontal",
  header: "layout-header",
  heading: "text-title",
  text: "text-block",
  card: "collection",
  row: "list-bulleted",
  accordion: "chevron-down-circle",
  banner: "megaphone",
  countdown: "clock",
  pill: "discount",
  chip: "link",
  button: "button",
  stories: "star",
  review: "text-quote",
  "social-proof": "person-list",
  "account-bar": "person",
  localization: "globe",
  image: "image",
  divider: "minus",
  spacer: "arrows-out-horizontal",
  canvas: "layout-block",
  shape: "blank",
};

export function sectionIcon(node: Node): string {
  if (node.type === "container" && node.children[0]) return SECTION_ICONS[node.children[0].type];
  return SECTION_ICONS[node.type];
}

/** Section name in the list. */
export function sectionTitle(node: Node): string {
  if (node.name) return node.name;
  if (node.type === "container") {
    const first = node.children[0];
    if (!first) return node.layout === "scroll" ? "Scroll row" : node.layout === "grid" ? "Grid" : "Group";
    const types = new Set(node.children.map((child) => child.type));
    if (types.size === 1 || (types.size === 2 && types.has("row") && types.has("accordion"))) {
      return ITEM_NOUNS[first.type]?.[1] ?? NODE_LABELS[first.type];
    }
    return "Items";
  }
  return NODE_LABELS[node.type];
}

/** One-line summary under the section name. */
export function sectionSummary(node: Node): string {
  switch (node.type) {
    case "container": {
      const count = node.children.length;
      const noun = ITEM_NOUNS[node.children[0]?.type ?? "card"]?.[0] ?? "item";
      const layout = node.layout === "grid" ? ` · ${node.columns ?? 2} columns` : node.layout === "scroll" ? " · swipeable row" : "";
      const hidden = node.children.filter((child) => child.hidden).length;
      return `${count} ${noun}${count === 1 ? "" : "s"}${hidden ? ` (${hidden} hidden)` : ""}${layout}`;
    }
    case "tabs":
      return node.tabs.map((tab) => tab.label).join(" · ");
    case "header":
      return `Logo ${node.logoAlign === "start" ? "left" : "centered"}${node.showLanguage ? " · language switcher" : ""}`;
    case "stories":
      return node.source === "collection"
        ? node.collection
          ? `Products from ${node.collection.title}`
          : "Choose a collection"
        : `${node.items.length} items`;
    case "account-bar":
      return `Account link${node.socials.length ? ` · ${node.socials.length} social icon${node.socials.length === 1 ? "" : "s"}` : ""}`;
    case "localization":
      return "Shopify's country and language selectors";
    case "review":
      return `Review by ${node.author}`;
    case "divider":
      return "Line";
    case "canvas":
      return node.children.length ? `${node.children.length} element${node.children.length === 1 ? "" : "s"} placed freely` : "Empty — open the canvas editor to design";
    case "spacer":
      return `${node.height}px of space`;
    case "button":
    case "chip":
      return `${node.label} → ${describeLink(node.link)}`;
    default:
      return nodeLabel(node);
  }
}

/** Title shown for an item row. */
export function itemTitle(node: Node): string {
  return nodeLabel(node) || NODE_LABELS[node.type];
}

/** Second line of an item row. */
export function itemSubtitle(node: Node): string {
  if ("subtitle" in node && node.subtitle) return node.subtitle;
  if ("link" in node && node.link) return describeLink(node.link);
  return NODE_LABELS[node.type];
}
