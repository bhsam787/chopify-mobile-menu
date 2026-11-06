import { NO_LINK } from "./links";
import { richToPlain } from "./richtext";
import { newId } from "./tree";
import type { ContainerNode, Node, NodeType } from "./types";

export interface WidgetDefinition {
  type: Exclude<NodeType, "header">;
  label: string;
  description: string;
  group: "Layout" | "Navigation" | "Promotion" | "Content" | "Store";
  create: () => Node;
}

const container = (
  layout: ContainerNode["layout"],
  extra: Partial<ContainerNode> = {},
): ContainerNode => ({
  id: newId("c"),
  type: "container",
  layout,
  gap: 12,
  children: [],
  ...extra,
});

export const WIDGETS: WidgetDefinition[] = [
  {
    type: "container",
    label: "Stack",
    description:
      "Groups widgets vertically, with its own background and padding.",
    group: "Layout",
    create: () =>
      container("stack", {
        box: { padding: 12, radius: 16, background: "#FFFFFF" },
      }),
  },
  {
    type: "container",
    label: "Grid",
    description: "Lays out cards in 2–4 columns.",
    group: "Layout",
    create: () => container("grid", { columns: 2 }),
  },
  {
    type: "container",
    label: "Scroll row",
    description: "A horizontally scrolling row, e.g. for chips.",
    group: "Layout",
    create: () => container("scroll", { gap: 8 }),
  },
  {
    type: "tabs",
    label: "Tabs",
    description: "Pill tabs that switch between two or more panels.",
    group: "Layout",
    create: () => ({
      id: newId("t"),
      type: "tabs",
      tabs: [
        {
          id: newId("tab"),
          label: "Categories",
          child: container("grid", { columns: 2 }),
        },
        {
          id: newId("tab"),
          label: "Collections",
          child: container("grid", { columns: 2 }),
        },
      ],
    }),
  },
  {
    type: "canvas",
    label: "Canvas",
    description:
      "Design freely: place text, images, shapes and widgets anywhere, like in Figma.",
    group: "Layout",
    create: () => ({
      id: newId("cv"),
      type: "canvas",
      height: 360,
      background: "",
      children: [],
    }),
  },
  {
    type: "divider",
    label: "Divider",
    description: "A thin line between sections.",
    group: "Layout",
    create: () => ({ id: newId("d"), type: "divider" }),
  },
  {
    type: "spacer",
    label: "Spacer",
    description: "Empty space.",
    group: "Layout",
    create: () => ({ id: newId("sp"), type: "spacer", height: 16 }),
  },
  {
    type: "card",
    label: "Category card",
    description: "Image card with a title and arrow, in six styles.",
    group: "Navigation",
    create: () => ({
      id: newId("k"),
      type: "card",
      variant: "studio",
      title: "Category",
      useResourceImage: true,
      link: NO_LINK,
      arrow: "light",
      box: { background: "#F3F3F3", radius: 12 },
      titleStyle: { size: 13, weight: 700, transform: "uppercase" },
    }),
  },
  {
    type: "row",
    label: "Link row",
    description: "A row with a thumbnail or icon, title, subtitle and chevron.",
    group: "Navigation",
    create: () => ({
      id: newId("r"),
      type: "row",
      variant: "thumb",
      title: "Link",
      useResourceImage: true,
      chevron: true,
      link: NO_LINK,
      thumbSize: 56,
      thumbRadius: 8,
      box: { background: "#F5F5F5", radius: 12, padding: 10 },
    }),
  },
  {
    type: "accordion",
    label: "Accordion",
    description: "A row that expands to show more links.",
    group: "Navigation",
    create: () => ({
      id: newId("ac"),
      type: "accordion",
      title: "All products",
      box: { background: "#F1F0EC", radius: 12, padding: 10 },
      titleStyle: { size: 17, weight: 600 },
      child: container("stack", { gap: 0, box: { padding: [4, 16, 8, 16] } }),
    }),
  },
  {
    type: "chip",
    label: "Chip",
    description: "Small rounded link, ideal in a scroll row.",
    group: "Navigation",
    create: () => ({
      id: newId("ch"),
      type: "chip",
      label: "Quick link",
      link: NO_LINK,
      box: { radius: 999, padding: [8, 14, 8, 14] },
      style: {
        size: 12,
        weight: 500,
        transform: "uppercase",
        letterSpacing: 1,
      },
    }),
  },
  {
    type: "button",
    label: "Button",
    description: "Full-width call to action.",
    group: "Navigation",
    create: () => ({
      id: newId("b"),
      type: "button",
      label: "All products",
      variant: "filled",
      link: { type: "route", route: "all_products" },
      radius: 999,
      height: 50,
    }),
  },
  {
    type: "stories",
    label: "Story circles",
    description: "Round product images, e.g. best sellers from a collection.",
    group: "Store",
    create: () => ({
      id: newId("st"),
      type: "stories",
      source: "collection",
      limit: 8,
      items: [],
      size: 88,
      ringColor: "#D0D0D0",
    }),
  },
  {
    type: "account-bar",
    label: "Account & socials",
    description: "Log in link and social media icons.",
    group: "Store",
    create: () => ({
      id: newId("a"),
      type: "account-bar",
      showAccount: true,
      loginLabel: "Log in",
      accountLabel: "My account",
      socials: [{ network: "instagram", url: "" }],
      box: { padding: [14, 16, 14, 16], background: "#FFFFFF", radius: 16 },
    }),
  },
  {
    type: "localization",
    label: "Country & language",
    description: "Lets shoppers switch country/currency and language.",
    group: "Store",
    create: () => ({
      id: newId("l"),
      type: "localization",
      showCountry: true,
      showLanguage: true,
      box: { padding: [12, 0, 12, 0] },
    }),
  },
  {
    type: "banner",
    label: "Banner",
    description: "Promo, highlight, split or feature banner.",
    group: "Promotion",
    create: () => ({
      id: newId("p"),
      type: "banner",
      variant: "promo",
      title: "Build your own set",
      text: "Save up to 20%",
      link: NO_LINK,
      box: { background: "#E7EEDC", radius: 12, padding: 12 },
      titleStyle: { size: 15, weight: 600 },
      textStyle: { size: 12 },
    }),
  },
  {
    type: "countdown",
    label: "Countdown",
    description: "Sale banner with a live timer.",
    group: "Promotion",
    create: () => ({
      id: newId("cd"),
      type: "countdown",
      title: "Summer sale",
      text: "-20% on everything with code SUMMER20",
      endsAt: "",
      link: NO_LINK,
      box: { background: "#D7193F", radius: 10 },
      titleStyle: { color: "#FFFFFF" },
      textStyle: { color: "#FFFFFF" },
      timerBackground: "#FFFFFF",
      timerColor: "#D7193F",
    }),
  },
  {
    type: "pill",
    label: "Promo pill",
    description: "Short highlighted message, e.g. a free gift.",
    group: "Promotion",
    create: () => ({
      id: newId("pl"),
      type: "pill",
      icon: "gift",
      text: "Free gift over $59",
      link: NO_LINK,
      box: { background: "#E4F2DD" },
    }),
  },
  {
    type: "social-proof",
    label: "Social proof",
    description: "Avatars with a trust message.",
    group: "Promotion",
    create: () => ({
      id: newId("sp"),
      type: "social-proof",
      text: "Loved by **10,000+** customers",
      avatars: [],
      verified: true,
    }),
  },
  {
    type: "review",
    label: "Review",
    description: "A customer quote with stars.",
    group: "Content",
    create: () => ({
      id: newId("rv"),
      type: "review",
      quote: "Great quality and fast delivery!",
      author: "A happy customer",
      stars: 5,
      box: { background: "#F5F4F2", radius: 10, padding: 16 },
    }),
  },
  {
    type: "heading",
    label: "Heading",
    description: "A section title.",
    group: "Content",
    create: () => ({
      id: newId("hd"),
      type: "heading",
      text: "Heading",
      style: { size: 18, weight: 600 },
    }),
  },
  {
    type: "text",
    label: "Text",
    description: "A paragraph. Use **bold** for emphasis.",
    group: "Content",
    create: () => ({
      id: newId("tx"),
      type: "text",
      text: "Text",
      style: { size: 14 },
    }),
  },
  {
    type: "image",
    label: "Image",
    description: "A full-width image, optionally linked.",
    group: "Content",
    create: () => ({
      id: newId("im"),
      type: "image",
      link: NO_LINK,
      ratio: 0.5,
      radius: 12,
    }),
  },
];

export const NODE_LABELS: Record<NodeType, string> = {
  container: "Container",
  tabs: "Tabs",
  header: "Header",
  heading: "Heading",
  text: "Text",
  card: "Category card",
  row: "Link row",
  accordion: "Accordion",
  banner: "Banner",
  countdown: "Countdown",
  pill: "Promo pill",
  chip: "Chip",
  button: "Button",
  stories: "Story circles",
  review: "Review",
  "social-proof": "Social proof",
  "account-bar": "Account & socials",
  localization: "Country & language",
  image: "Image",
  divider: "Divider",
  spacer: "Spacer",
  canvas: "Canvas",
  shape: "Shape",
};

/** Short label for a node in the layers panel. */
export function nodeLabel(node: Node): string {
  if (node.name) return node.name;
  switch (node.type) {
    case "container":
      return node.layout === "grid"
        ? `Grid · ${node.columns ?? 2} columns`
        : node.layout === "scroll"
          ? "Scroll row"
          : "Stack";
    case "heading":
    case "text":
      return richToPlain(node.text);
    case "card":
    case "row":
    case "accordion":
    case "banner":
    case "countdown":
      return node.title;
    case "chip":
    case "button":
      return node.label;
    case "pill":
      return node.text;
    default:
      return NODE_LABELS[node.type];
  }
}
