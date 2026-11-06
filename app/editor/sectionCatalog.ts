import type {
  BannerNode,
  ButtonNode,
  CardNode,
  Design,
  Node,
  RowNode,
  Screen,
  WidgetDefinition,
} from "@chopi/menu-core";
import {
  childNodes,
  cloneWithNewIds,
  findTemplate,
  newId,
  WIDGETS,
} from "@chopi/menu-core";
import { widgetPreview, widgetSample, type Sample } from "./widgetSamples";

/**
 * Everything "Add a section" offers: each basic section (with its styles) and
 * ready-made sections taken from the templates, so a menu built from scratch
 * can look exactly like a template. Template sections are read from the
 * template designs themselves, so they never drift from the templates.
 */

export type CatalogGroup =
  | "From templates"
  | "Navigation"
  | "Promotion"
  | "Store"
  | "Content"
  | "Layout";

/** Order of the kind chips and groups: basics first, template sections last. */
export const CATALOG_GROUPS: CatalogGroup[] = [
  "Navigation",
  "Promotion",
  "Store",
  "Content",
  "Layout",
  "From templates",
];

/** A section to add: its node plus the sub-menus its links open. */
export interface SectionPreset {
  node: Node;
  screens: Screen[];
}

export interface CatalogStyle {
  id: string;
  label: string;
  /** Fresh ids on every call (adding the same section twice is fine). */
  create: (samples: Sample[]) => SectionPreset;
  /** What the library shows (dividers and spacers get context around them). */
  preview: (samples: Sample[]) => Node;
}

export interface CatalogEntry {
  id: string;
  label: string;
  description: string;
  group: CatalogGroup;
  /** Template the section comes from (shown as a badge). */
  template?: string;
  /** Extra words people may search for. */
  keywords: string;
  styles: CatalogStyle[];
}

// ---------------------------------------------------------------------------
// Basic sections, with style choices
// ---------------------------------------------------------------------------

const WIDGET_GROUP: Record<WidgetDefinition["group"], CatalogGroup> = {
  Layout: "Layout",
  Navigation: "Navigation",
  Promotion: "Promotion",
  Store: "Store",
  Content: "Content",
};

const KEYWORDS: Partial<Record<Node["type"], string>> = {
  container: "group panel box columns",
  tabs: "switch categories toggle",
  card: "collection category tile image",
  row: "link list item menu",
  accordion: "fold dropdown expand collapse sub links",
  chip: "quick link tag pill",
  button: "cta call to action",
  stories: "circles instagram round best sellers",
  "account-bar": "login sign in social instagram tiktok facebook",
  localization: "currency country language market",
  banner: "promo hero sale image",
  countdown: "timer sale deadline",
  pill: "badge free shipping gift announcement",
  "social-proof": "trust customers rating verified",
  review: "testimonial quote stars",
  heading: "title",
  text: "paragraph copy",
  image: "picture photo",
  divider: "line separator",
  spacer: "gap space",
  canvas: "free design figma",
  products: "bestsellers new arrivals shop items price collection",
  perks: "trust shipping returns guarantee usp benefits",
  contact: "help support whatsapp phone email call chat",
  discount: "coupon promo code voucher copy",
  ticker: "marquee announcement scrolling running text",
};

/** Styles a basic section can be added in (the first is its default). */
function stylesFor(
  widget: WidgetDefinition,
): { id: string; label: string; apply: (node: Node) => Node }[] {
  const same = { id: "default", label: "Default", apply: (node: Node) => node };
  switch (widget.type) {
    case "banner":
      return (
        [
          ["promo", "Promo"],
          ["highlight", "Highlight"],
          ["split", "Split"],
          ["feature", "Feature"],
        ] as const
      ).map(([variant, label]) => ({
        id: variant,
        label,
        apply: (node) =>
          ({
            ...(node as BannerNode),
            variant,
            ...(variant === "highlight"
              ? { eyebrow: "New", cta: "Shop now", badge: { text: "Top deal" } }
              : variant === "feature"
                ? { eyebrow: "Featured", cta: "Discover" }
                : {}),
          }) as Node,
      }));
    case "card":
      return (
        [
          ["studio", "Studio"],
          ["product", "Product"],
          ["overlay", "Overlay"],
          ["tile", "Tile"],
          ["label", "Label"],
          ["circle", "Circle"],
        ] as const
      ).map(([variant, label]) => ({
        id: variant,
        label,
        apply: (node) => ({ ...(node as CardNode), variant }) as Node,
      }));
    case "row":
      return (
        [
          ["thumb", "Image"],
          ["icon", "Icon"],
          ["plain", "Text"],
        ] as const
      ).map(([variant, label]) => ({
        id: variant,
        label,
        apply: (node) =>
          ({
            ...(node as RowNode),
            variant,
            ...(variant === "icon" ? { icon: "star" } : {}),
          }) as Node,
      }));
    case "button":
      return (
        [
          ["filled", "Filled"],
          ["outline", "Outline"],
        ] as const
      ).map(([variant, label]) => ({
        id: variant,
        label,
        apply: (node) => ({ ...(node as ButtonNode), variant }) as Node,
      }));
    default:
      return [same];
  }
}

const basicEntries = (): CatalogEntry[] =>
  WIDGETS.map((widget) => ({
    id: `widget:${widget.type}:${widget.label}`,
    label: widget.label,
    description: widget.description,
    group: WIDGET_GROUP[widget.group],
    keywords: KEYWORDS[widget.type] ?? "",
    styles: stylesFor(widget).map((style) => ({
      id: style.id,
      label: style.label,
      create: (samples) => ({
        node: style.apply(widgetSample(widget, samples)),
        screens: [],
      }),
      preview: (samples) => style.apply(widgetPreview(widget, samples)),
    })),
  }));

// ---------------------------------------------------------------------------
// Sections from the templates
// ---------------------------------------------------------------------------

/**
 * The first node `pick` accepts: on the template's main screen or footer
 * first, then in its sub-menus (e.g. Studio's look banner).
 */
function findInTemplate(
  design: Design,
  pick: (node: Node) => boolean,
): Node | undefined {
  let found: Node | undefined;
  const walk = (node: Node) => {
    if (found) return;
    if (pick(node)) {
      found = node;
      return;
    }
    childNodes(node).forEach(walk);
  };
  [
    design.screens[0].root,
    ...(design.footer ? [design.footer] : []),
    ...design.screens.slice(1).map((screen) => screen.root),
  ].forEach(walk);
  return found;
}

/** Ids of the screens `node` links to, and the screens those link to. */
function linkedScreens(design: Design, node: Node): Screen[] {
  const byId = new Map(design.screens.map((screen) => [screen.id, screen]));
  const found = new Map<string, Screen>();
  const scan = (value: Node) => {
    JSON.stringify(value, (key, field) => {
      if (key === "screenId" && typeof field === "string") {
        const screen = byId.get(field);
        if (screen && !found.has(screen.id)) {
          found.set(screen.id, screen);
          scan(screen.root);
        }
      }
      return field;
    });
  };
  scan(node);
  return [...found.values()];
}

/**
 * A copy of the template's section with fresh ids, plus copies of the
 * sub-menus it opens (their links point at the copies).
 */
function presetFrom(design: Design, node: Node): SectionPreset {
  const screens = linkedScreens(design, node);
  const screenIds = new Map(screens.map((screen) => [screen.id, newId("s")]));
  const relink = <T>(value: T): T =>
    JSON.parse(JSON.stringify(value), (key, field) =>
      key === "screenId" && typeof field === "string"
        ? (screenIds.get(field) ?? field)
        : field,
    ) as T;
  return {
    node: relink(cloneWithNewIds(node)),
    screens: screens.map((screen) => ({
      ...screen,
      id: screenIds.get(screen.id)!,
      root: relink(cloneWithNewIds(screen.root)),
    })),
  };
}

const isGridOf = (variant: CardNode["variant"]) => (node: Node) =>
  node.type === "container" &&
  node.layout === "grid" &&
  node.children.some(
    (child) => child.type === "card" && child.variant === variant,
  );

interface TemplateSection {
  template: string;
  label: string;
  description: string;
  keywords: string;
  pick: (node: Node) => boolean;
}

const TEMPLATE_SECTIONS: TemplateSection[] = [
  {
    template: "sliding",
    label: "App-style tabs",
    description:
      "Pill tabs with story circles and icon rows that slide to their own sub-menus.",
    keywords: "tabs occasions categories sliding sub-menu icons",
    pick: (node) => node.type === "tabs",
  },
  {
    template: "sliding",
    label: "Icon list",
    description:
      "Full-width rows with line icons and thin dividers; arrows open sub-menus.",
    keywords: "rows icons dividers list links sliding",
    pick: (node) =>
      node.type === "container" &&
      node.children.some((child) => child.type === "divider") &&
      node.children.filter((child) => child.type === "row").length >= 3,
  },
  {
    template: "sliding",
    label: "Story band",
    description: "Round photos on a soft colored band that shoppers swipe.",
    keywords: "story circles band swipe round",
    pick: (node) =>
      node.type === "container" &&
      node.children[0]?.type === "stories" &&
      Boolean(node.box?.background),
  },
  {
    template: "studio",
    label: "Category photo grid",
    description: "Two columns of category cards with big product photos.",
    keywords: "grid cards categories photos fashion",
    pick: isGridOf("studio"),
  },
  {
    template: "studio",
    label: "Shop-the-look tiles",
    description: "Photo tiles with the title on top, for outfits or looks.",
    keywords: "looks overlay tiles outfits",
    pick: isGridOf("overlay"),
  },
  {
    template: "studio",
    label: "Look banner",
    description: "An image banner that features a styled look or campaign.",
    keywords: "feature banner look campaign",
    pick: (node) => node.type === "banner" && node.variant === "feature",
  },
  {
    template: "botanical",
    label: "Product cards with tags",
    description: "Product photos on soft cards with NEW and SAVE tags.",
    keywords: "product cards tags new save badges grid",
    pick: isGridOf("product"),
  },
  {
    template: "botanical",
    label: "Set builder banner",
    description: "Promote bundles: image, title, saving and an arrow button.",
    keywords: "bundle set builder promo banner",
    pick: (node) => node.type === "banner" && node.variant === "promo",
  },
  {
    template: "botanical",
    label: "Link zone",
    description: "Help and info links with icons in a soft panel.",
    keywords: "links help info panel zone icons",
    pick: (node) =>
      node.type === "container" &&
      Boolean(node.box?.background) &&
      node.children.filter((child) => child.type === "row").length >= 2,
  },
  {
    template: "image-tiles",
    label: "Goal photo tiles",
    description: "Photo tiles that fade into a rich color, by shopping goal.",
    keywords: "goals tiles photos fade color",
    pick: isGridOf("tile"),
  },
  {
    template: "circle-tiles",
    label: "Circle cards",
    description: "Round product photos on soft cards.",
    keywords: "circle round cards photos",
    pick: isGridOf("circle"),
  },
  {
    template: "mono",
    label: "Label tiles",
    description: "Bold black-and-white tiles with a label and arrow.",
    keywords: "mono black white label tiles grid",
    pick: isGridOf("label"),
  },
  {
    template: "mono",
    label: "Refer-a-friend banner",
    description: "A promo banner that turns menu visits into referrals.",
    keywords: "referral refer friend promo banner",
    pick: (node) => node.type === "banner" && node.variant === "promo",
  },
  {
    template: "spotlight",
    label: "Social proof bar",
    description: "Shows how many customers trust you, at the top.",
    keywords: "trust customers verified social proof",
    pick: (node) => node.type === "social-proof",
  },
  {
    template: "spotlight",
    label: "Deal highlight",
    description: "A bold dark card for your best offer, with a button.",
    keywords: "deal offer highlight banner sale",
    pick: (node) => node.type === "banner" && node.variant === "highlight",
  },
  {
    template: "spotlight",
    label: "Best-seller circles",
    description: "A heading and round photos of your best sellers.",
    keywords: "best sellers circles stories round",
    pick: (node) =>
      node.type === "container" &&
      node.children.some((child) => child.type === "stories"),
  },
  {
    template: "spotlight",
    label: "Customer review",
    description: "A star rating and a customer quote.",
    keywords: "review testimonial quote stars",
    pick: (node) => node.type === "review",
  },
  {
    template: "accordion",
    label: "Quick-link chips",
    description: "Swipeable chips with small photos for your top pages.",
    keywords: "chips quick links scroll swipe",
    pick: (node) => node.type === "container" && node.layout === "scroll",
  },
  {
    template: "accordion",
    label: "Fold-out product list",
    description: "An image row that opens in place to show more links.",
    keywords: "accordion fold out expand collapse dropdown",
    pick: (node) => node.type === "accordion",
  },
  {
    template: "accordion",
    label: "Photo banner",
    description: "A colored banner that fades into a photo, e.g. About us.",
    keywords: "split banner photo about help",
    pick: (node) => node.type === "banner" && node.variant === "split",
  },
];

const templateEntries = (): CatalogEntry[] =>
  TEMPLATE_SECTIONS.flatMap((section) => {
    const template = findTemplate(section.template);
    if (!template) return [];
    const build = (): SectionPreset | null => {
      const design = template.build();
      const node = findInTemplate(design, section.pick);
      return node ? presetFrom(design, node) : null;
    };
    // Templates whose section can't be found are left out (never a broken tile).
    if (!build()) return [];
    return [
      {
        id: `template:${section.template}:${section.label}`,
        label: section.label,
        description: section.description,
        group: "From templates" as const,
        template: template.name,
        keywords: `${section.keywords} ${template.name}`,
        styles: [
          {
            id: "template",
            label: template.name,
            create: () => build()!,
            preview: () => build()!.node,
          },
        ],
      },
    ];
  });

/** Built when the library opens (template sections build their templates). */
export function sectionCatalog(): CatalogEntry[] {
  return [...basicEntries(), ...templateEntries()];
}

/** Entries whose name, description, template or keywords contain every word of `query`. */
export function searchCatalog(
  entries: CatalogEntry[],
  query: string,
): CatalogEntry[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return entries;
  return entries.filter((entry) => {
    const haystack =
      `${entry.label} ${entry.description} ${entry.template ?? ""} ${entry.keywords} ${entry.styles.map((style) => style.label).join(" ")}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}
