import { newId } from "../tree";
import type {
  CardNode,
  ContainerNode,
  Design,
  HeaderNode,
  Node,
  TabsNode,
} from "../types";
import {
  accountBar,
  badge,
  banner,
  button,
  card,
  design,
  grid,
  header,
  iconRow,
  pill,
  search,
  stack,
  tabs,
} from "./build";
import { templateImage, type TemplateImageName } from "./images";

/**
 * Botanical family — after the essential-oils frames ("Menü Redesign" A/B/C and
 * the Components sheet): green/cream palette, tab pills, configurator banner,
 * category cards with NEW/SAVE tags, a green CTA and a cream zone with link rows.
 */
const TEXT = "#1A1B18";
const MUTED = "#52564C";
const GREEN = "#516B2A";
const DARK_GREEN = "#283E1B";
const CREAM_CARD = "#F8F3E8";
const CREAM_ZONE = "#F6F1E6";
const RED = "#E11D48";

/** The colors one member of the family is painted in. */
interface Palette {
  accent: string;
  dark: string;
  card: string;
  zone: string;
  soft: string;
}
const GREENS: Palette = {
  accent: GREEN,
  dark: DARK_GREEN,
  card: CREAM_CARD,
  zone: CREAM_ZONE,
  soft: "#E3ECD7",
};
/** Circle Tiles: warm terracotta instead of green. */
const CLAY: Palette = {
  accent: "#B4532A",
  dark: "#5A2412",
  card: "#FBEEE6",
  zone: "#FBF3EE",
  soft: "#F8DCCB",
};

const NEW = badge("NEW", GREEN);
const SAVE = badge("SAVE", RED);

const PRODUCTS: [string, TemplateImageName, "new" | "save" | null][] = [
  ["Essential oils", "botanical/oils", null],
  ["Black seed oil", "botanical/black-seed-oil", "new"],
  ["Capsules", "botanical/capsules", "new"],
  ["Roll-ons", "botanical/roll-on", null],
  ["Room sprays", "botanical/room-spray", null],
  ["Sauna infusions", "botanical/sauna", null],
  ["Carrier oils", "botanical/carrier-oils", null],
  ["Gift sets", "botanical/sets", "save"],
];

const GOALS: [string, TemplateImageName][] = [
  ["Sleep & calm", "botanical/goal-sleep"],
  ["Skin & hair", "botanical/goal-skin"],
  ["Health & vitality", "botanical/goal-vitality"],
  ["Home fragrance", "botanical/goal-home"],
  ["Cooking & baking", "botanical/goal-cooking"],
  ["On the go", "botanical/goal-travel"],
];

const tokens = (palette: Palette): Design["tokens"] => ({
  fontFamily: "theme",
  text: TEXT,
  mutedText: MUTED,
  background: "#FFFFFF",
  canvas: "#FFFFFF",
  accent: palette.accent,
  accentText: "#FFFFFF",
  radius: 16,
});
const TAB_STYLE: TabsNode["style"] = {
  activeBackground: DARK_GREEN,
  activeColor: "#FFFFFF",
  inactiveBackground: "#F2F3EE",
  inactiveColor: TEXT,
  text: { size: 13, weight: 600 as const, letterSpacing: 0.4 },
};
/** Circle Tiles: plain text tabs, the selected one underlined. */
const UNDERLINE_TABS: TabsNode["style"] = {
  look: "underline",
  activeColor: CLAY.dark,
  inactiveColor: MUTED,
  text: { size: 14, weight: 600 as const },
};
const TITLE = {
  size: 15,
  weight: 600 as const,
  color: TEXT,
  letterSpacing: 0.2,
};

const tagFor = (tag: "new" | "save" | null) =>
  tag === "new" ? NEW : tag === "save" ? SAVE : undefined;

/** Category card: title + tag on top, photo filling the bottom with a soft fade. */
const productCard = ([
  title,
  image,
  tag,
]: (typeof PRODUCTS)[number]): CardNode =>
  card("product", title, image, {
    badge: tagFor(tag),
    ratio: 1.245,
    box: { background: CREAM_CARD, radius: 16 },
    titleStyle: TITLE,
  });

/** Goal tile: photo fading into dark green, white title and arrow. */
const goalTile = ([title, image]: (typeof GOALS)[number]): CardNode =>
  card("tile", title, image, {
    box: { background: DARK_GREEN, radius: 16 },
    titleStyle: { ...TITLE, color: "#FFFFFF" },
  });

/** Circle card (variant C): title above a round photo. */
const circleCard = ([title, image, tag]: (typeof PRODUCTS)[number]): CardNode =>
  card("circle", title, image, {
    badge: tag === "new" ? badge("NEW", CLAY.accent) : tagFor(tag),
    arrow: "none",
    imageBackground: "#FFFFFF",
    box: { background: CLAY.card, radius: 16, padding: [18, 12, 16, 12] },
    titleStyle: { size: 14, weight: 600, color: TEXT },
  });

const configurator = (palette = GREENS) =>
  banner("promo", "Build-your-own set", {
    text: "Mix your favourites – save up to 20%",
    image: templateImage("botanical/bundle", "Build-your-own set"),
    box: { background: palette.soft, radius: 16, padding: 14 },
    titleStyle: TITLE,
    textStyle: { size: 12.5, color: MUTED },
    accent: palette.accent,
    accentText: "#FFFFFF",
  });

const cta = (palette = GREENS) =>
  button("All products", {
    background: palette.accent,
    color: "#FFFFFF",
    style: { size: 16, weight: 700, letterSpacing: 0.6 },
  });

/** Cream zone with link rows (Special deals in red) and a promo pill. */
const linkZone = (palette: Palette): ContainerNode => {
  const box = {
    background: "#FFFFFF",
    radius: 14,
    padding: [15, 14, 15, 16] as [number, number, number, number],
  };
  return stack(
    [
      iconRow("Special deals", "percent", {
        subtitle: "+ free products",
        box,
        titleStyle: { ...TITLE, color: RED },
        subtitleStyle: { size: 12.5, color: MUTED },
      }),
      iconRow("Certificates", "certificate", {
        subtitle: "Tested batch by batch",
        box,
        titleStyle: TITLE,
        subtitleStyle: { size: 12.5, color: MUTED },
      }),
      iconRow("About us", "people", { box, titleStyle: TITLE }),
      iconRow("Help & contact", "help", { box, titleStyle: TITLE }),
      pill("A free roll-on with your first order", {
        box: { background: palette.soft, radius: 9, padding: [7, 12, 7, 10] },
        style: { size: 13, weight: 600, color: palette.dark },
      }),
    ],
    { gap: 8, box: { background: palette.zone, padding: [20, 16, 12, 16] } },
  );
};

const footer = (palette: Palette) =>
  stack(
    [
      accountBar(["instagram", "tiktok"], {
        iconColor: TEXT,
        style: { size: 14, letterSpacing: 0.6 },
        box: { padding: [8, 0, 8, 0] },
      }),
    ],
    {
      box: { background: palette.zone, padding: [4, 16, 20, 16] },
    },
  );

const shell = (
  body: Node[],
  head: HeaderNode,
  palette: Palette = GREENS,
): Design =>
  design({
    tokens: tokens(palette),
    header: head,
    main: stack(
      [
        stack(body, { gap: 14, box: { padding: [8, 16, 20, 16] } }),
        linkZone(palette),
      ],
      { gap: 0 },
    ),
    footer: footer(palette),
  });

/** Botanical Grid — Vorschlag A: tabs, configurator, product cards with tags. */
export function botanical(): Design {
  return shell(
    [
      tabs(
        [
          {
            label: "Product categories",
            child: stack(
              [
                configurator(),
                grid(PRODUCTS.map(productCard), { gap: 10 }),
                cta(),
              ],
              { gap: 14 },
            ),
          },
          {
            label: "Wellness goals",
            child: stack(
              [configurator(), grid(GOALS.map(goalTile), { gap: 10 }), cta()],
              { gap: 14 },
            ),
          },
        ],
        TAB_STYLE,
      ),
    ],
    header({
      close: "circle",
      announcement: "Free shipping on every order",
      announcementMode: "ticker",
      announcementItems: [
        { id: newId("an"), text: "100% natural" },
        { id: newId("an"), text: "Lab-tested batch by batch" },
      ],
      announcementBackground: DARK_GREEN,
      announcementColor: "#F6F1E6",
      searchBar: true,
      ...search("Search oils, capsules, sprays…", {
        field: "box",
        layout: "carousel",
        accent: GREEN,
      }),
      box: { padding: [12, 16, 4, 16] },
    }),
  );
}

/** Image Tiles — "Anwendungsziele": dark green photo tiles that fade into their color. */
export function imageTiles(): Design {
  return shell(
    [configurator(), grid(GOALS.map(goalTile), { gap: 10 }), cta()],
    header({
      icons: ["cart"],
      searchBar: true,
      ...search("Search by goal or product", {
        field: "underline",
        accent: "#E3ECD7",
        design: {
          fieldBackground: "transparent",
          fieldText: "#FFFFFF",
          fieldBorder: "rgba(255,255,255,0.45)",
        },
      }),
      iconColor: "#FFFFFF",
      box: { background: DARK_GREEN, padding: [14, 16, 16, 16] },
    }),
  );
}

/** Circle Tiles — Vorschlag C (Kreis-Kacheln): round photos on cream cards. */
export function circleTiles(): Design {
  return shell(
    [
      tabs(
        [
          {
            label: "Product categories",
            child: stack(
              [
                configurator(CLAY),
                grid(PRODUCTS.slice(0, 6).map(circleCard), { gap: 10 }),
                cta(CLAY),
              ],
              { gap: 14 },
            ),
          },
          {
            label: "Wellness goals",
            child: stack(
              [
                configurator(CLAY),
                grid(
                  GOALS.map((goal) => ({
                    ...goalTile(goal),
                    box: { background: CLAY.dark, radius: 16 },
                  })),
                  { gap: 10 },
                ),
                cta(CLAY),
              ],
              { gap: 14 },
            ),
          },
        ],
        UNDERLINE_TABS,
      ),
    ],
    header({
      logoAlign: "center",
      icons: ["search", "cart"],
      ...search("Find your favourite", { accent: CLAY.accent }),
      iconColor: CLAY.dark,
      box: { background: CLAY.zone, padding: [12, 16, 8, 16] },
    }),
    CLAY,
  );
}
