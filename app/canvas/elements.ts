import type {
  Frame,
  IconName,
  LinkRef,
  Node,
  ShapeIcon,
  ShapeNode,
  TextStyle,
} from "@chopi/menu-core";
import { layoutList, type ListFrame } from "./items";
import {
  CANVAS_WIDTH,
  newId,
  SIDE_TAB_HEIGHT,
  TAB_GAP,
  TAB_RAIL_WIDTH,
  templateImage,
  WIDGETS,
} from "@chopi/menu-core";

/** An element merchants can drag onto the canvas. */
export interface CanvasElement {
  key: string;
  label: string;
  group:
    | "Text"
    | "Shapes"
    | "Media"
    | "Buttons & links"
    | "Layouts"
    | "Navigation"
    | "Promotion"
    | "Store";
  /** Shown in the hover preview. */
  description: string;
  size: { w: number; h: number };
  create: () => Node;
  /** Added as editable layers (image, texts, shapes inside a frame) instead of one widget. */
  layers?: boolean;
  /** `create` already makes the finished element (no sample content to fill in). */
  ready?: boolean;
}

const NO_LINK: LinkRef = { type: "none" };
/** Where new sample items go until the merchant picks a link (the editor marks it to be replaced). */
export const SAMPLE_LINK: LinkRef = {
  type: "route",
  route: "all_products",
  sample: true,
};
const INK = "#1A1A1A";
const MUTED = "#6B6B6B";

/** A text layer whose box fits one line of `style.size` (vertically centered in `height` when given). */
function textLayer(
  text: string,
  style: TextStyle,
  at: { x: number; y?: number; w: number; height?: number },
): Node {
  const lineHeight = style.lineHeight ?? 1.25;
  const h = Math.ceil((style.size ?? 15) * lineHeight) + 2;
  const y = at.y ?? Math.round(((at.height ?? h) - h) / 2);
  return {
    id: newId("tx"),
    type: "text",
    text,
    style: { lineHeight, ...style },
    frame: { x: at.x, y, w: at.w, h },
  };
}

function iconLayer(
  icon: ShapeIcon,
  color: string,
  frame: Frame,
  link: LinkRef = NO_LINK,
): Node {
  return {
    id: newId("ic"),
    type: "shape",
    name: "Icon",
    icon,
    iconColor: color,
    link,
    frame,
  };
}

function frameLayer(
  name: string,
  fields: Partial<ShapeNode>,
  children: Node[],
): ShapeNode {
  return {
    id: newId("sh"),
    type: "shape",
    name,
    link: NO_LINK,
    clip: true,
    ...fields,
    children,
  };
}

type ImageName = Parameters<typeof templateImage>[0];

/** A category card made of layers: photo on a soft background with a title. */
function cardLayer(title: string, image: ImageName, frame: Frame): ShapeNode {
  const imageHeight = Math.round(frame.h * 0.76);
  return {
    ...frameLayer(title, { fill: "#F3F3F3", radius: 12, link: SAMPLE_LINK }, [
      {
        id: newId("im"),
        type: "image",
        image: templateImage(image, title),
        link: NO_LINK,
        radius: 0,
        frame: { x: 0, y: 0, w: frame.w, h: imageHeight },
      },
      textLayer(
        title.toUpperCase(),
        { size: 12, weight: 700, letterSpacing: 0.5 },
        {
          x: 10,
          y: imageHeight + Math.round((frame.h - imageHeight - 18) / 2),
          w: frame.w - 20,
        },
      ),
    ]),
    frame,
  };
}

/** A link row made of layers: thumbnail, title and chevron on a soft bar. */
function rowLayer(title: string, image: ImageName, frame: Frame): ShapeNode {
  const thumb = frame.h - 12;
  return {
    ...frameLayer(title, { fill: "#F5F5F5", radius: 10, link: SAMPLE_LINK }, [
      {
        id: newId("im"),
        type: "image",
        image: templateImage(image, title),
        link: NO_LINK,
        radius: 6,
        frame: { x: 6, y: 6, w: thumb, h: thumb },
      },
      textLayer(
        title,
        { size: 15, weight: 500 },
        { x: thumb + 18, w: frame.w - thumb - 56, height: frame.h },
      ),
      iconLayer("chevron", MUTED, {
        x: frame.w - 30,
        y: Math.round((frame.h - 18) / 2),
        w: 18,
        h: 18,
      }),
    ]),
    frame,
  };
}

/** A rounded chip with a label, sized to the text. */
function chipLayer(label: string, x: number): ShapeNode {
  const w = Math.round(label.length * 7.6 + 30);
  return {
    ...frameLayer(
      label,
      {
        radius: 999,
        borderWidth: 1,
        borderColor: "#D4D4D4",
        fill: "#FFFFFF",
        link: SAMPLE_LINK,
      },
      [
        textLayer(
          label,
          { size: 13, weight: 500, align: "center" },
          { x: 0, w, height: 36 },
        ),
      ],
    ),
    frame: { x, y: 0, w, h: 36 },
  };
}

const CATEGORIES: [string, ImageName][] = [
  ["Suits", "fashion/suits"],
  ["Shirts", "fashion/shirts"],
  ["Knitwear", "fashion/knitwear"],
  ["Jeans", "fashion/jeans"],
  ["Jackets", "fashion/jackets"],
  ["Chinos", "fashion/chinos"],
];

/** Four cards in two columns, starting at the top-left of a panel `width` wide. */
function cardGrid(
  items: [string, ImageName][],
  width: number,
  cardHeight: number,
  gap = 12,
): Node[] {
  const cardWidth = Math.floor((width - gap) / 2);
  return items.map(([title, image], index) =>
    cardLayer(title, image, {
      x: (index % 2) * (cardWidth + gap),
      y: Math.floor(index / 2) * (cardHeight + gap),
      w: cardWidth,
      h: cardHeight,
    }),
  );
}

// ---------------------------------------------------------------------------
// Template styles. Built from the same widgets as the templates, so each
// card, banner or row keeps its own settings (title, picture, link, colors,
// and a Style menu) and grids/lists are smart lists (add, reorder, sub-menus).
// ---------------------------------------------------------------------------

type CardStyle = "product" | "overlay" | "label" | "circle" | "tile";

/** A category card in one of the template styles. */
function styledCard(style: CardStyle, title: string, image: ImageName): Node {
  const base = {
    id: newId("k"),
    type: "card" as const,
    variant: style,
    title,
    image: templateImage(image, title),
    link: SAMPLE_LINK,
    arrow: "light" as const,
  };
  switch (style) {
    case "product":
      return {
        ...base,
        box: { background: "#F7F2E8", radius: 16 },
        titleStyle: { size: 15, weight: 600, color: "#2B2B2B" },
      };
    case "overlay":
      return {
        ...base,
        box: { radius: 12 },
        titleStyle: { size: 14, weight: 700, color: "#FFFFFF" },
      };
    case "label":
      return {
        ...base,
        imageBackground: "#FFFFFF",
        arrowBackground: "#FFFFFF",
        box: { background: "#F4F4F4", radius: 12, padding: 8 },
        titleStyle: { size: 12, weight: 600, color: INK },
      };
    case "circle":
      return {
        ...base,
        arrow: "none",
        imageBackground: "#FFFFFF",
        box: { background: "#F7F2E8", radius: 16, padding: [18, 12, 16, 12] },
        titleStyle: { size: 14, weight: 600, color: "#2B2B2B" },
      };
    case "tile":
      return {
        ...base,
        box: { background: "#2F4A35", radius: 16 },
        titleStyle: { size: 15, weight: 600, color: "#FFFFFF" },
      };
  }
}

const STYLE_IMAGES: Record<CardStyle, [string, ImageName][]> = {
  product: [
    ["Essential oils", "botanical/oils"],
    ["Capsules", "botanical/capsules"],
    ["Roll-ons", "botanical/roll-on"],
    ["Gift sets", "botanical/sets"],
  ],
  overlay: [
    ["Eat healthier", "nutrition/goal-healthy"],
    ["Weight control", "nutrition/goal-weight"],
    ["More protein", "nutrition/goal-protein"],
    ["Save time", "nutrition/goal-time"],
  ],
  label: [
    ["Bestsellers", "nutrition/bundle"],
    ["Powder meals", "nutrition/powder"],
    ["Greens", "nutrition/greens"],
    ["Ready-to-drink", "nutrition/shake"],
  ],
  circle: [
    ["Black seed oil", "botanical/black-seed-oil"],
    ["Carrier oils", "botanical/carrier-oils"],
    ["Room sprays", "botanical/room-spray"],
    ["Sauna", "botanical/sauna"],
  ],
  tile: [
    ["Sleep", "botanical/goal-sleep"],
    ["Skin", "botanical/goal-skin"],
    ["Vitality", "botanical/goal-vitality"],
    ["Home", "botanical/goal-home"],
  ],
};

const CARD_HEIGHT: Record<CardStyle, number> = {
  product: 210,
  overlay: 169,
  label: 196,
  circle: 196,
  tile: 200,
};

/** Two columns of cards in one style, as a smart list. */
function styledGrid(style: CardStyle, name: string): Node {
  const h = CARD_HEIGHT[style];
  const cards = STYLE_IMAGES[style].map(([title, image], index) => ({
    ...styledCard(style, title, image),
    frame: {
      x: (index % 2) * 181,
      y: Math.floor(index / 2) * (h + 12),
      w: 169,
      h,
    },
  }));
  return frameLayer(
    name,
    { clip: false, list: { direction: "grid", gap: 12, columns: 2 } },
    cards,
  );
}

const LIST_LINE = "rgba(0,0,0,0.12)";

/** Full-width rows under each other with thin lines between, as a smart list. */
function linedList(
  name: string,
  entries: [string, IconName | null][],
  rowHeight: number,
): Node {
  const items = entries.map(([title, icon], index): Node => ({
    id: newId("r"),
    type: "row",
    variant: icon ? "icon" : "plain",
    icon: icon ?? undefined,
    title,
    chevron: true,
    link: SAMPLE_LINK,
    box: { padding: [12, 16, 12, 16], radius: 0 },
    titleStyle: { size: 16, weight: 500, color: INK },
    frame: { x: 0, y: index * (rowHeight + 1), w: 390, h: rowHeight },
  }));
  return frameLayer(
    name,
    { clip: false, list: { direction: "column", gap: 1, divider: LIST_LINE } },
    items,
  );
}

const fromLibrary = (type: Node["type"], label?: string): (() => Node) => {
  const widget = WIDGETS.find(
    (candidate) =>
      candidate.type === type && (!label || candidate.label === label),
  );
  if (!widget) throw new Error(`No widget ${type}`);
  return widget.create;
};

export const CANVAS_ELEMENTS: CanvasElement[] = [
  {
    key: "heading",
    label: "Heading",
    description: "A large title, e.g. “Shop by category”.",
    group: "Text",
    size: { w: 300, h: 36 },
    create: () => ({
      id: newId("hd"),
      type: "heading",
      text: "Heading",
      style: { size: 24, weight: 700 },
    }),
  },
  {
    key: "text",
    label: "Text",
    description: "A paragraph with bold, italic and links.",
    group: "Text",
    size: { w: 300, h: 48 },
    create: fromLibrary("text"),
  },
  {
    key: "shape",
    label: "Frame",
    description: "A colored box. Drop layers into it to group them.",
    group: "Shapes",
    size: { w: 160, h: 100 },
    create: () => ({
      id: newId("sh"),
      type: "shape",
      fill: "#EEEEEE",
      radius: 12,
      link: { type: "none" },
    }),
  },
  {
    key: "image",
    label: "Image",
    description: "A photo from your store’s files, optionally linked.",
    group: "Media",
    size: { w: 350, h: 200 },
    create: () => ({
      id: newId("im"),
      type: "image",
      link: { type: "none" },
      radius: 12,
    }),
  },
  {
    key: "button",
    label: "Button",
    description: "A call to action, e.g. “All products”.",
    group: "Buttons & links",
    size: { w: 350, h: 50 },
    create: fromLibrary("button"),
  },
  {
    key: "divider",
    label: "Line",
    description: "A thin line to separate areas.",
    group: "Shapes",
    size: { w: 350, h: 2 },
    create: fromLibrary("divider"),
  },
  // Template card styles: one card, or a grid of them.
  ...(
    [
      [
        "product",
        "Photo card",
        "Photo with a soft fade under the title, like Botanical.",
      ],
      [
        "overlay",
        "Overlay card",
        "Title on the photo, like Mono's goal tiles.",
      ],
      [
        "label",
        "Label card",
        "Picture with a small label and arrow, like Mono.",
      ],
      [
        "circle",
        "Round photo card",
        "Title above a round photo, like Circle Tiles.",
      ],
      [
        "tile",
        "Tile card",
        "Photo fading into a strong color, like Image Tiles.",
      ],
    ] as const
  ).flatMap(([style, label, description]): CanvasElement[] => [
    {
      key: `card-${style}`,
      label,
      description: `${description} Change its Style any time.`,
      group: "Navigation",
      size: { w: 169, h: CARD_HEIGHT[style] },
      ready: true,
      create: () => {
        const [title, image] = STYLE_IMAGES[style][0];
        return styledCard(style, title, image);
      },
    },
    {
      key: `grid-${style}`,
      label: `${label} grid`,
      description: `Four ${label.toLowerCase()}s in two columns. Add, reorder and give each a sub-menu.`,
      group: "Layouts",
      size: { w: 350, h: CARD_HEIGHT[style] * 2 + 12 },
      ready: true,
      create: () => styledGrid(style, `${label}s`),
    },
  ]),
  {
    key: "icon-list",
    label: "Menu list",
    description:
      "Rows with an arrow and thin lines between, like Sliding Menu and Mono. Icons can be turned off in its settings.",
    group: "Layouts",
    size: { w: 390, h: 4 * 57 - 1 },
    ready: true,
    create: () =>
      linedList(
        "Icon list",
        [
          ["New in", "sparkle"],
          ["Bestsellers", "star"],
          ["Gifts", "gift"],
          ["Sale", "percent"],
        ],
        56,
      ),
  },
  {
    key: "story-band",
    label: "Story band",
    description:
      "Round photos with a thin ring on a colored band that swipes sideways, like Sliding Menu.",
    group: "Store",
    size: { w: 390, h: 150 },
    ready: true,
    create: () =>
      frameLayer("Story band", { fill: "#FDF5F8" }, [
        {
          id: newId("st"),
          type: "stories",
          source: "manual",
          size: 80,
          ringColor: INK,
          ringWidth: 2,
          imageBackground: "#FFFFFF",
          labelStyle: { size: 13, weight: 500, color: INK },
          items: CATEGORIES.map(([title, image]) => ({
            id: newId("i"),
            title,
            image: templateImage(image, title),
            link: SAMPLE_LINK,
          })),
          frame: { x: 15, y: 16, w: 375, h: 118 },
        },
      ]),
  },
  // Layouts: the building blocks of the templates, made of editable layers.
  {
    key: "tabs",
    label: "Tabs",
    description:
      "Tabs that switch between panels. Each tab is its own free area: drop anything into it.",
    group: "Layouts",
    size: { w: 350, h: 420 },
    ready: true,
    create: () => {
      const panel = (
        label: string,
        items: [string, ImageName][],
      ): ShapeNode => ({
        id: newId("sh"),
        type: "shape",
        name: label,
        link: NO_LINK,
        // A smart grid, so cards can be added, reordered and nested.
        children: [
          {
            ...frameLayer(
              `${label} cards`,
              { clip: false, list: { direction: "grid", gap: 12, columns: 2 } },
              cardGrid(items, 350, 173),
            ),
            frame: { x: 0, y: 0, w: 350, h: 358 },
          },
        ],
      });
      return {
        id: newId("t"),
        type: "tabs",
        barHeight: 36,
        style: {
          activeBackground: INK,
          activeColor: "#FFFFFF",
          inactiveBackground: "#EFEFEF",
          inactiveColor: INK,
          text: { size: 13, weight: 600 },
        },
        tabs: [
          {
            id: newId("tab"),
            label: "Categories",
            child: panel("Categories", CATEGORIES.slice(0, 4)),
          },
          {
            id: newId("tab"),
            label: "Looks",
            child: panel("Looks", [
              ["Wedding", "fashion/look-wedding-guest"],
              ["Business", "fashion/look-business"],
              ["Gala", "fashion/look-gala"],
              ["Summer", "fashion/look-summer"],
            ]),
          },
        ],
      };
    },
  },
  {
    key: "accordion",
    label: "Accordion",
    description:
      "A row that opens on tap to show more links, pushing what's below down.",
    group: "Layouts",
    size: { w: 350, h: 196 },
    ready: true,
    create: () =>
      frameLayer(
        "Accordion",
        { fill: "#F1F0EC", radius: 12, collapsible: { height: 56 } },
        [
          textLayer(
            "All products",
            { size: 17, weight: 600 },
            { x: 16, w: 260, height: 56 },
          ),
          iconLayer("chevron", INK, { x: 314, y: 18, w: 20, h: 20 }),
          // The links are a smart list: even spacing, add/duplicate/reorder.
          {
            ...frameLayer(
              "Links",
              { clip: false, list: { direction: "column", gap: 6 } },
              ["New in", "Best sellers", "Sale"].map((title, index) => ({
                ...frameLayer(title, { clip: false, link: SAMPLE_LINK }, [
                  textLayer(title, { size: 15 }, { x: 0, w: 318, height: 36 }),
                ]),
                frame: { x: 0, y: index * 42, w: 318, h: 36 },
              })),
            ),
            frame: { x: 16, y: 60, w: 318, h: 120 },
          },
        ],
      ),
  },
  {
    key: "chip-row",
    label: "Chip row",
    description: "Quick links in pills that scroll sideways.",
    group: "Layouts",
    size: { w: 390, h: 36 },
    ready: true,
    create: () => {
      let x = 16;
      const chips = [
        "New in",
        "Best sellers",
        "Suits",
        "Shirts",
        "Knitwear",
        "Sale",
      ].map((label) => {
        const chip = chipLayer(label, x);
        x += chip.frame!.w + 8;
        return chip;
      });
      return frameLayer(
        "Chip row",
        { scroll: "x", clip: undefined, list: { direction: "row", gap: 8 } },
        chips,
      );
    },
  },
  {
    key: "carousel",
    label: "Card carousel",
    description: "Cards in a row that scroll sideways, like a slider.",
    group: "Layouts",
    size: { w: 390, h: 196 },
    ready: true,
    create: () =>
      frameLayer(
        "Card carousel",
        { scroll: "x", clip: undefined, list: { direction: "row", gap: 12 } },
        CATEGORIES.map(([title, image], index) =>
          cardLayer(title, image, {
            x: 16 + index * 152,
            y: 0,
            w: 140,
            h: 196,
          }),
        ),
      ),
  },
  {
    key: "card-grid",
    label: "Card grid",
    description: "Category cards in two columns.",
    group: "Layouts",
    size: { w: 350, h: 358 },
    ready: true,
    create: () =>
      frameLayer(
        "Card grid",
        { clip: false, list: { direction: "grid", gap: 12, columns: 2 } },
        cardGrid(CATEGORIES.slice(0, 4), 350, 173),
      ),
  },
  {
    key: "link-list",
    label: "Link list",
    description:
      "Links one under the other. Add items, reorder them and give each its own sub-menu.",
    group: "Layouts",
    size: { w: 350, h: 224 },
    ready: true,
    create: () =>
      frameLayer(
        "Link list",
        { clip: false, list: { direction: "column", gap: 8 } },
        CATEGORIES.slice(0, 4).map(([title, image], index) =>
          rowLayer(title, image, { x: 0, y: index * 58, w: 350, h: 50 }),
        ),
      ),
  },
  {
    key: "card",
    label: "Category card",
    description:
      "A category card with photo, title and arrow. Every part is its own layer.",
    group: "Navigation",
    size: { w: 170, h: 170 },
    create: fromLibrary("card"),
    layers: true,
  },
  {
    key: "row",
    label: "Link row",
    description:
      "A link with thumbnail, title, subtitle and chevron. Every part is its own layer.",
    group: "Navigation",
    size: { w: 350, h: 72 },
    create: fromLibrary("row"),
    layers: true,
  },
  {
    key: "chip",
    label: "Chip",
    description: "A small rounded quick link.",
    group: "Navigation",
    size: { w: 130, h: 40 },
    create: fromLibrary("chip"),
  },
  {
    key: "banner",
    label: "Banner",
    description:
      "A promo banner. Its image, texts and button are layers you can edit, move or replace.",
    group: "Promotion",
    size: { w: 350, h: 84 },
    create: fromLibrary("banner"),
    layers: true,
  },
  {
    key: "banner-highlight",
    label: "Deal banner",
    description:
      "A dark highlight with a label, badge, button and photo, like Spotlight.",
    group: "Promotion",
    size: { w: 350, h: 190 },
    ready: true,
    create: () => ({
      id: newId("p"),
      type: "banner",
      variant: "highlight",
      title: "Build your look",
      eyebrow: "NEW!",
      badge: { text: "Top deal", background: "#D93A2B", color: "#FFFFFF" },
      text: "2 accessories as a gift",
      cta: "Shop the look",
      image: templateImage("fashion/look-wedding-guest", "Look"),
      link: SAMPLE_LINK,
      box: { background: INK, radius: 16, padding: 20 },
      titleStyle: { size: 20, weight: 700, color: "#FFFFFF" },
      textStyle: { size: 14, color: "rgba(255,255,255,0.85)" },
      accent: "#FFFFFF",
      accentText: INK,
    }),
  },
  {
    key: "banner-split",
    label: "Split banner",
    description:
      "A colored half with a title and a photo half, like Accordion.",
    group: "Promotion",
    size: { w: 350, h: 110 },
    ready: true,
    create: () => ({
      id: newId("p"),
      type: "banner",
      variant: "split",
      title: "About us",
      image: templateImage("botanical/about", "About us"),
      link: SAMPLE_LINK,
      box: { background: "#2F4A35", radius: 12 },
      titleStyle: { size: 17, weight: 600, color: "#FFFFFF" },
    }),
  },
  {
    key: "banner-feature",
    label: "Feature banner",
    description:
      "A photo with a small label, title, text and outlined button, like Studio's looks.",
    group: "Promotion",
    size: { w: 350, h: 130 },
    ready: true,
    create: () => ({
      id: newId("p"),
      type: "banner",
      variant: "feature",
      title: "Look: Groom",
      eyebrow: "Pairs well with",
      text: "Suit, waistcoat, shirt & bow tie",
      cta: "View look",
      image: templateImage("fashion/look-groom", "Look: Groom"),
      link: SAMPLE_LINK,
      box: { background: "#F3F3F3", radius: 12, padding: 12 },
      titleStyle: { size: 16, weight: 600, color: INK },
      textStyle: { size: 13 },
    }),
  },
  {
    key: "side-tabs",
    label: "Side tabs",
    description:
      "Categories in a column on the left, their content on the right: the way big stores organise a phone menu.",
    group: "Layouts",
    size: { w: 350, h: 272 },
    ready: true,
    create: () => {
      const panelWidth = 350 - TAB_RAIL_WIDTH - TAB_GAP;
      const panel = (
        label: string,
        items: [string, ImageName][],
      ): ShapeNode => ({
        id: newId("sh"),
        type: "shape",
        name: label,
        link: NO_LINK,
        children: [
          {
            ...frameLayer(
              `${label} cards`,
              { clip: false, list: { direction: "grid", gap: 12, columns: 2 } },
              cardGrid(items, panelWidth, 130),
            ),
            frame: { x: 0, y: 0, w: panelWidth, h: 272 },
          },
        ],
      });
      const tab = (label: string, items: [string, ImageName][]) => ({
        id: newId("tab"),
        label,
        child: panel(label, items),
      });
      return {
        id: newId("t"),
        type: "tabs",
        placement: "side",
        railWidth: TAB_RAIL_WIDTH,
        barHeight: SIDE_TAB_HEIGHT,
        style: {
          look: "pills",
          activeBackground: "#F1F1F1",
          activeColor: INK,
          inactiveBackground: "transparent",
          inactiveColor: MUTED,
          text: { size: 13, weight: 600 },
        },
        tabs: [
          tab("Suits", CATEGORIES.slice(0, 4)),
          tab("Casual", CATEGORIES.slice(2, 6)),
          tab("Looks", [
            ["Wedding", "fashion/look-wedding-guest"],
            ["Business", "fashion/look-business"],
            ["Gala", "fashion/look-gala"],
            ["Summer", "fashion/look-summer"],
          ]),
          tab("Sale", [
            CATEGORIES[5],
            CATEGORIES[1],
            CATEGORIES[3],
            CATEGORIES[0],
          ]),
        ],
      };
    },
  },
  {
    key: "products",
    label: "Product cards",
    description:
      "Products from a collection with photo, title and price, always current and in the shopper's currency.",
    group: "Store",
    size: { w: 350, h: 236 },
    ready: true,
    create: fromLibrary("products"),
  },
  {
    key: "perks",
    label: "Perks",
    description: "Shipping, returns and secure checkout, each with an icon.",
    group: "Promotion",
    size: { w: 350, h: 84 },
    ready: true,
    create: fromLibrary("perks"),
  },
  {
    key: "contact",
    label: "Contact & help",
    description:
      "Buttons to call, email or message the store, or open a help page.",
    group: "Store",
    size: { w: 350, h: 92 },
    ready: true,
    create: fromLibrary("contact"),
  },
  {
    key: "discount",
    label: "Discount code",
    description: "A code shoppers copy with one tap, or apply to their cart.",
    group: "Promotion",
    size: { w: 350, h: 150 },
    ready: true,
    create: fromLibrary("discount"),
  },
  {
    key: "ticker",
    label: "Ticker",
    description:
      "A thin strip of short messages that scrolls sideways in a loop.",
    group: "Promotion",
    size: { w: 350, h: 38 },
    ready: true,
    create: fromLibrary("ticker"),
  },
  {
    key: "countdown",
    label: "Countdown",
    description: "A sale banner with a live timer.",
    group: "Promotion",
    size: { w: 350, h: 72 },
    create: fromLibrary("countdown"),
  },
  {
    key: "pill",
    label: "Promo pill",
    description: "A short highlighted message, e.g. a free gift.",
    group: "Promotion",
    size: { w: 220, h: 34 },
    create: fromLibrary("pill"),
    layers: true,
  },
  {
    key: "proof",
    label: "Social proof",
    description: "Avatars with a trust message.",
    group: "Promotion",
    size: { w: 350, h: 44 },
    create: fromLibrary("social-proof"),
  },
  {
    key: "review",
    label: "Review",
    description: "A customer quote with stars. Every part is its own layer.",
    group: "Promotion",
    size: { w: 350, h: 170 },
    create: fromLibrary("review"),
    layers: true,
  },
  {
    key: "stories",
    label: "Story circles",
    description:
      "Round product photos that scroll sideways, like Instagram stories.",
    group: "Store",
    size: { w: 390, h: 130 },
    create: fromLibrary("stories"),
  },
  {
    key: "account",
    label: "Account & socials",
    description: "Log-in link and social media icons.",
    group: "Store",
    size: { w: 350, h: 56 },
    create: fromLibrary("account-bar"),
  },
  {
    key: "localization",
    label: "Country & language",
    description: "Country/currency and language switchers.",
    group: "Store",
    size: { w: 350, h: 48 },
    create: fromLibrary("localization"),
  },

  // Text
  {
    key: "title",
    label: "Big title",
    description: "An eye-catching display title for a campaign or season.",
    group: "Text",
    size: { w: 340, h: 44 },
    ready: true,
    create: () => ({
      id: newId("hd"),
      type: "heading",
      text: "Summer edit",
      style: { size: 34, weight: 800, letterSpacing: -0.5 },
    }),
  },
  {
    key: "label",
    label: "Small label",
    description:
      "A small uppercase label above a title, e.g. “NEW COLLECTION”.",
    group: "Text",
    size: { w: 220, h: 18 },
    ready: true,
    create: () => ({
      id: newId("tx"),
      type: "text",
      text: "NEW COLLECTION",
      style: { size: 12, weight: 600, letterSpacing: 1.5, color: MUTED },
    }),
  },
  {
    key: "list",
    label: "Check list",
    description: "Short selling points, one per line.",
    group: "Text",
    size: { w: 300, h: 78 },
    ready: true,
    create: () => ({
      id: newId("tx"),
      type: "text",
      text: "✓ Free shipping over $50\n✓ 30-day free returns\n✓ Secure checkout",
      style: { size: 15, lineHeight: 1.6 },
    }),
  },
  {
    key: "price",
    label: "Price",
    description: "A price or offer line with a bold amount.",
    group: "Text",
    size: { w: 160, h: 26 },
    ready: true,
    create: () => ({
      id: newId("tx"),
      type: "text",
      text: "From **$49**",
      style: { size: 18 },
    }),
  },
  // Shapes
  {
    key: "circle",
    label: "Circle",
    description: "A round shape: dots, backgrounds behind photos, highlights.",
    group: "Shapes",
    size: { w: 100, h: 100 },
    ready: true,
    create: () => ({
      id: newId("sh"),
      type: "shape",
      name: "Circle",
      fill: "#E7EEDC",
      radius: 999,
      link: NO_LINK,
    }),
  },
  {
    key: "outline",
    label: "Outline box",
    description: "A box with only a border. Holds layers like a frame.",
    group: "Shapes",
    size: { w: 160, h: 100 },
    ready: true,
    create: () => ({
      id: newId("sh"),
      type: "shape",
      name: "Outline box",
      radius: 12,
      borderWidth: 1.5,
      borderColor: INK,
      link: NO_LINK,
    }),
  },
  {
    key: "gradient",
    label: "Gradient",
    description: "A soft two-color background. Change the colors and angle.",
    group: "Shapes",
    size: { w: 350, h: 140 },
    ready: true,
    create: () => ({
      id: newId("sh"),
      type: "shape",
      name: "Gradient",
      fillGradient: { from: "#FDE2E4", to: "#E2ECF9", angle: 135 },
      radius: 16,
      link: NO_LINK,
    }),
  },
  {
    key: "shade",
    label: "Photo shade",
    description:
      "A dark fade to put over a photo, so white text on it stays readable.",
    group: "Shapes",
    size: { w: 350, h: 200 },
    ready: true,
    create: () => ({
      id: newId("sh"),
      type: "shape",
      name: "Photo shade",
      gradient:
        "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%)",
      radius: 12,
      link: NO_LINK,
    }),
  },
  {
    key: "vline",
    label: "Vertical line",
    description: "A thin upright line, e.g. between two links.",
    group: "Shapes",
    size: { w: 2, h: 80 },
    ready: true,
    create: () => ({
      id: newId("sh"),
      type: "shape",
      name: "Vertical line",
      fill: "#D4D4D4",
      link: NO_LINK,
    }),
  },
  // Media
  {
    key: "circle-image",
    label: "Round photo",
    description: "A photo cut into a circle.",
    group: "Media",
    size: { w: 120, h: 120 },
    ready: true,
    create: () => ({
      id: newId("im"),
      type: "image",
      image: templateImage("fashion/look-summer"),
      radius: 999,
      link: NO_LINK,
    }),
  },
  {
    key: "icon",
    label: "Icon",
    description: "One icon: star, gift, truck, heart, search, bag and more.",
    group: "Media",
    size: { w: 32, h: 32 },
    ready: true,
    create: () => iconLayer("star", INK, { x: 0, y: 0, w: 32, h: 32 }),
  },
  {
    key: "icon-circle",
    label: "Icon in circle",
    description: "An icon on a round background, e.g. next to a perk.",
    group: "Media",
    size: { w: 48, h: 48 },
    ready: true,
    create: () =>
      frameLayer("Icon in circle", { fill: "#F1F1F1", radius: 999 }, [
        iconLayer("gift", INK, { x: 12, y: 12, w: 24, h: 24 }),
      ]),
  },
  {
    key: "social",
    label: "Social icons",
    description: "Linked icons for your social media profiles.",
    group: "Media",
    size: { w: 152, h: 26 },
    ready: true,
    create: () =>
      frameLayer(
        "Social icons",
        { clip: false },
        (
          [
            ["instagram", "https://www.instagram.com/"],
            ["tiktok", "https://www.tiktok.com/"],
            ["facebook", "https://www.facebook.com/"],
            ["youtube", "https://www.youtube.com/"],
          ] as const
        ).map(([network, url], index) =>
          iconLayer(
            network,
            INK,
            { x: index * 42, y: 0, w: 26, h: 26 },
            {
              type: "url",
              url,
            },
          ),
        ),
      ),
  },
  // Buttons & links
  {
    key: "button-outline",
    label: "Outline button",
    description: "A lighter button with a border.",
    group: "Buttons & links",
    size: { w: 200, h: 44 },
    ready: true,
    create: () => ({
      id: newId("b"),
      type: "button",
      label: "Shop now",
      variant: "outline",
      link: { type: "route", route: "all_products" },
      radius: 999,
      height: 44,
    }),
  },
  {
    key: "button-small",
    label: "Small button",
    description: "A compact pill button, e.g. “View all”.",
    group: "Buttons & links",
    size: { w: 110, h: 34 },
    ready: true,
    create: () => ({
      id: newId("b"),
      type: "button",
      label: "View all",
      variant: "filled",
      link: { type: "route", route: "all_products" },
      radius: 999,
      height: 34,
      style: { size: 13, weight: 600 },
    }),
  },
  {
    key: "text-link",
    label: "Text link",
    description: "Underlined text that links anywhere.",
    group: "Buttons & links",
    size: { w: 140, h: 24 },
    ready: true,
    create: () =>
      frameLayer(
        "Text link",
        { link: { type: "route", route: "all_products" }, clip: false },
        [
          textLayer(
            "Shop all →",
            { size: 15, weight: 600, underline: true },
            { x: 0, w: 140, height: 24 },
          ),
        ],
      ),
  },
  {
    key: "arrow-button",
    label: "Arrow button",
    description: "A round button with an arrow.",
    group: "Buttons & links",
    size: { w: 48, h: 48 },
    ready: true,
    create: () =>
      frameLayer(
        "Arrow button",
        {
          fill: INK,
          radius: 999,
          link: { type: "route", route: "all_products" },
        },
        [iconLayer("arrow", "#FFFFFF", { x: 12, y: 12, w: 24, h: 24 })],
      ),
  },
  {
    key: "badge",
    label: "Badge",
    description: "A small colored tag, e.g. NEW or -20%.",
    group: "Buttons & links",
    size: { w: 56, h: 22 },
    ready: true,
    create: () =>
      frameLayer("Badge", { fill: "#D93A2B", radius: 999 }, [
        textLayer(
          "NEW",
          {
            size: 11,
            weight: 700,
            color: "#FFFFFF",
            align: "center",
            letterSpacing: 0.5,
          },
          { x: 0, w: 56, height: 22 },
        ),
      ]),
  },
  {
    key: "search",
    label: "Search bar",
    description: "Opens your store’s search.",
    group: "Buttons & links",
    size: { w: 350, h: 42 },
    ready: true,
    create: () =>
      frameLayer(
        "Search bar",
        {
          fill: "#F3F3F3",
          radius: 999,
          link: { type: "route", route: "search" },
        },
        [
          iconLayer("search", MUTED, { x: 16, y: 11, w: 20, h: 20 }),
          textLayer(
            "Search products",
            { size: 15, color: MUTED },
            { x: 46, w: 280, height: 42 },
          ),
        ],
      ),
  },
  {
    key: "cart-link",
    label: "Cart link",
    description: "A bag icon with “Cart”, linking to the cart.",
    group: "Buttons & links",
    size: { w: 96, h: 28 },
    ready: true,
    create: () =>
      frameLayer(
        "Cart link",
        { link: { type: "route", route: "cart" }, clip: false },
        [
          iconLayer("bag", INK, { x: 0, y: 2, w: 24, h: 24 }),
          textLayer(
            "Cart",
            { size: 15, weight: 500 },
            {
              x: 32,
              w: 64,
              height: 28,
            },
          ),
        ],
      ),
  },
  {
    key: "account-link",
    label: "Log-in link",
    description: "A person icon with “Log in”, linking to the account page.",
    group: "Buttons & links",
    size: { w: 110, h: 28 },
    ready: true,
    create: () =>
      frameLayer(
        "Log-in link",
        { link: { type: "route", route: "account_login" }, clip: false },
        [
          iconLayer("user", INK, { x: 0, y: 2, w: 24, h: 24 }),
          textLayer(
            "Log in",
            { size: 15, weight: 500 },
            {
              x: 32,
              w: 78,
              height: 28,
            },
          ),
        ],
      ),
  },
];

/** Other words merchants may search for, per element key. */
const SEARCH_WORDS: Record<string, string> = {
  heading: "title headline",
  text: "paragraph copy body rich",
  shape: "rectangle box container group background",
  image: "photo picture media",
  button: "cta call to action",
  divider: "separator rule hr",
  tabs: "switch segment toggle panels track pill underline",
  accordion: "collapse expand dropdown faq toggle",
  "chip-row": "pills tags quick links scroll",
  carousel: "slider swipe scroll gallery",
  "card-grid": "categories collections tiles",
  "link-list": "menu links rows navigation",
  card: "category collection tile",
  row: "link item navigation",
  banner: "promo promotion hero announcement",
  countdown: "timer sale clock",
  pill: "message notice free gift",
  proof: "trust avatars customers",
  review: "testimonial quote rating stars",
  stories: "instagram bubbles best sellers products",
  account: "login social instagram",
  localization: "currency language country market",
  circle: "round dot ellipse",
  outline: "border stroke",
  gradient: "color fade background",
  shade: "overlay gradient dark",
  icon: "symbol glyph",
  social: "instagram tiktok facebook youtube",
  badge: "tag label sale new",
  search: "find input",
  "cart-link": "bag basket checkout",
  "account-link": "login sign in user profile",
  "text-link": "anchor url",
  "card-product": "fade category style",
  "card-overlay": "title on photo category style",
  "card-label": "category arrow style",
  "card-circle": "round category style",
  "card-tile": "color fade category style",
  "grid-product": "cards categories style",
  "grid-overlay": "cards categories style",
  "grid-label": "cards categories style",
  "grid-circle": "cards round categories style",
  "grid-tile": "cards categories style",
  "icon-list": "menu rows links lines dividers navigation text icons",
  "side-tabs": "vertical categories sidebar column departments",
  products: "bestsellers new arrivals shop items price collection",
  perks: "trust shipping returns guarantee usp benefits",
  contact: "help support whatsapp phone email call chat",
  discount: "coupon promo code voucher copy",
  ticker: "marquee announcement scrolling running text",
  "story-band": "stories circles bubbles swipe",
  "banner-highlight": "deal promo hero dark",
  "banner-split": "promo half photo",
  "banner-feature": "promo look editorial",
};

/**
 * Elements matching a search: every word must appear in the name,
 * description, group or synonyms (case-insensitive).
 */
export function searchElements(query: string): CanvasElement[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return CANVAS_ELEMENTS;
  return CANVAS_ELEMENTS.filter((element) => {
    const haystack =
      `${element.label} ${element.description} ${element.group} ${SEARCH_WORDS[element.key] ?? ""}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}

/** Space kept between the phone's edges and what's placed on the canvas. */
export const SIDE_MARGIN = 20;

/**
 * A new layer of `element`, centered on (cx, cy) inside its parent (the
 * canvas or a frame of `bounds.w` width). It keeps `margin` from both
 * edges, shrinking to fit: a list lays its rows out again at the new width
 * (rows keep their height), anything else scales with its layers.
 */
export function placeElement(
  element: CanvasElement,
  cx: number,
  cy: number,
  bounds: { w: number } = { w: CANVAS_WIDTH },
  margin = 0,
): Node {
  const side = Math.min(margin, bounds.w / 4);
  const room = bounds.w - side * 2;
  const scale = Math.min(1, room / element.size.w);
  // Exactly as its hover preview shows it: complete sample content (e.g. six
  // story circles), so it looks finished. Sample images are copied to the
  // store's Shopify Files on save.
  const node = elementPreview(element, { rich: true });
  const w = Math.round(element.size.w * scale);
  const x = Math.round(
    Math.min(Math.max(side, cx - w / 2), Math.max(side, bounds.w - side - w)),
  );

  if (node.type === "shape" && node.list && scale < 1) {
    const row = node.list.direction === "row";
    const children = (node.children ?? []).map((child, index) =>
      // A narrowed row starts at its own edge (the margin is outside it now).
      row && index === 0 && child.frame
        ? { ...child, frame: { ...child.frame, x: 0 } }
        : child,
    );
    const laid = layoutList({
      ...node,
      children,
      frame: { x, y: 0, w, h: element.size.h },
    } as ListFrame);
    const h = laid.frame?.h ?? element.size.h;
    return {
      ...laid,
      frame: { x, y: Math.round(Math.max(0, cy - h / 2)), w, h },
    };
  }

  const h = Math.round(element.size.h * scale);
  const frame: Frame = { x, y: Math.round(Math.max(0, cy - h / 2)), w, h };
  return scale < 1
    ? { ...scaleLayers(node, scale), frame }
    : { ...node, frame };
}

/** A frame's layers scaled with it (positions and sizes), at every depth. */
function scaleLayers(node: Node, scale: number): Node {
  if (node.type !== "shape" || !node.children?.length) return node;
  return {
    ...node,
    children: node.children.map((child) =>
      scaleLayers(
        child.frame
          ? {
              ...child,
              frame: {
                x: Math.round(child.frame.x * scale),
                y: Math.round(child.frame.y * scale),
                w: Math.round(child.frame.w * scale),
                h: Math.round(child.frame.h * scale),
              },
            }
          : child,
        scale,
      ),
    ),
  };
}

const STORY_SAMPLES = [
  ["Jackets", "fashion/jacket-classic"],
  ["Tuxedos", "fashion/smoking"],
  ["Vests", "fashion/vest"],
  ["Shirts", "fashion/shirts"],
  ["Knitwear", "fashion/knitwear"],
  ["Chinos", "fashion/chinos"],
] as const;

/**
 * What a tile in the Elements panel shows: the element with sample content,
 * rendered by the storefront renderer. Tiles are small, so they show fewer
 * items; the hover card and the added element get the full content.
 */
export function elementPreview(
  element: CanvasElement,
  options: { rich?: boolean } = {},
): Node {
  return element.ready
    ? element.create()
    : fillSample(element.create(), options.rich ?? false);
}

function fillSample(node: Node, rich: boolean): Node {
  switch (node.type) {
    case "heading":
      return {
        ...node,
        text: "New arrivals",
        style: { size: 22, weight: 700 },
      };
    case "text":
      return {
        ...node,
        text: "Free shipping on **all orders** over $50.",
        style: { size: 15 },
      };
    case "shape":
      return { ...node, fill: "#E7EEDC", radius: 16 };
    case "image":
      return {
        ...node,
        image: templateImage("fashion/look-summer"),
        ratio: 0.5,
      };
    case "card":
      return {
        ...node,
        title: "Suits",
        image: templateImage("fashion/suits"),
        ratio: 0.7,
      };
    case "row":
      return {
        ...node,
        title: "Shirts",
        subtitle: "Slim & regular fit",
        image: templateImage("fashion/shirts"),
      };
    case "chip":
      return {
        ...node,
        label: "Sale",
        image: templateImage("fashion/outlet"),
        box: { ...node.box, borderWidth: 1, borderColor: "#DDDDDD" },
      };
    case "banner":
      return { ...node, image: templateImage("botanical/bundle") };
    case "stories":
      return {
        ...node,
        source: "manual",
        size: rich ? 72 : 64,
        items: STORY_SAMPLES.slice(0, rich ? 6 : 3).map(([title, image]) => ({
          id: newId("i"),
          title,
          image: templateImage(image),
          link: { type: "none" },
        })),
      };
    case "social-proof":
      return { ...node, text: "Loved by **10,000+** customers" };
    case "account-bar":
      return {
        ...node,
        socials: [
          { network: "instagram", url: "" },
          { network: "tiktok", url: "" },
        ],
      };
    case "divider":
      return { ...node, color: INK, thickness: 2 };
    default:
      return node;
  }
}
