import type { CardNode, Design, Node } from "../types";
import {
  accountBar,
  banner,
  button,
  card,
  design,
  grid,
  header,
  screen,
  stack,
  tabs,
  thumbRow,
} from "./build";
import { templateImage, type TemplateImageName } from "./images";

/**
 * Studio — after the "Mobile Menü – Konzept" (IOS) frames: language + centered
 * logo, Categories / Looks tabs, 2-column studio cards in a white panel on
 * light grey, a "Suits" sub-menu with thumbnail rows and a related look.
 */
const INK = "#252A3A";
const PANEL = { background: "#FFFFFF", radius: 16, padding: 12 } as const;

const CATEGORIES: [string, TemplateImageName][] = [
  ["Bestsellers", "fashion/bestsellers"],
  ["Shirts", "fashion/shirts"],
  ["Suits", "fashion/suits"],
  ["Trousers", "fashion/trousers"],
  ["Jeans", "fashion/jeans"],
  ["Chinos", "fashion/chinos"],
  ["T-shirts", "fashion/tshirts"],
  ["Knitwear", "fashion/knitwear"],
  ["Jackets", "fashion/jackets"],
  ["Secret outlet", "fashion/outlet"],
];

const LOOKS: [string, string, TemplateImageName][] = [
  ["Wedding guest", "Elegant for the ceremony", "fashion/look-wedding-guest"],
  ["Groom", "Your big day", "fashion/look-groom"],
  ["Business", "Office & meetings", "fashion/look-business"],
  ["Prom & gala", "Black tie moments", "fashion/look-gala"],
  ["Smart casual", "Blazer meets jeans", "fashion/look-smart-casual"],
  ["Summer wedding", "Light fabrics", "fashion/look-summer"],
];

const SUITS: [string, string, TemplateImageName][] = [
  ["Classic jacket", "The timeless cut", "fashion/jacket-classic"],
  ["Clean jacket", "No lapel stitching", "fashion/jacket-clean"],
  ["Double-breasted", "Six buttons, sharp lines", "fashion/jacket-double"],
  ["Tuxedo", "Black tie", "fashion/smoking"],
  ["Waistcoat", "Completes the look", "fashion/vest"],
];

const studioCard = (
  title: string,
  image: TemplateImageName,
  extra: Partial<CardNode> = {},
): CardNode =>
  card("studio", title, image, {
    ratio: 1.05,
    box: { background: "#F3F3F3", radius: 12 },
    titleStyle: {
      size: 13,
      weight: 700,
      transform: "uppercase",
      letterSpacing: 0.5,
      color: INK,
    },
    ...extra,
  });

const darkButton = (label: string) =>
  button(label, {
    background: INK,
    color: "#FFFFFF",
    style: { size: 14, weight: 500, transform: "uppercase", letterSpacing: 1 },
  });

export function studio(options: { tabs: boolean }): Design {
  const suits = screen(
    "Suits",
    stack(
      [
        stack(
          SUITS.map(([title, subtitle, image]) =>
            thumbRow(title, image, {
              subtitle,
              thumbSize: 64,
              thumbRadius: 8,
              box: {
                background: "#F5F5F5",
                radius: 12,
                padding: [10, 14, 10, 10],
              },
              titleStyle: { size: 15, weight: 500, color: INK },
              subtitleStyle: { size: 12 },
            }),
          ),
          { gap: 8, box: PANEL },
        ),
        stack(
          [
            banner("feature", "Look: Groom", {
              eyebrow: "Pairs well with",
              text: "Suit, waistcoat, shirt & bow tie",
              cta: "View look",
              image: templateImage("fashion/look-groom", "Look: Groom"),
              titleStyle: { size: 16, weight: 600, color: INK },
              textStyle: { size: 13 },
            }),
          ],
          { box: PANEL },
        ),
        darkButton("All suits"),
      ],
      { gap: 12, box: { padding: 12 } },
    ),
  );

  const categoryCards = CATEGORIES.map(([title, image]) =>
    title === "Suits"
      ? studioCard(title, image, {
          link: { type: "screen", screenId: suits.id },
        })
      : studioCard(title, image),
  );
  const categories = stack([grid(categoryCards), darkButton("All products")], {
    gap: 16,
  });

  const looks = stack(
    [
      grid(
        LOOKS.map(([title, subtitle, image]) =>
          card("overlay", title, image, {
            subtitle,
            ratio: 1.28,
            box: { radius: 12 },
            titleStyle: {
              size: 13,
              weight: 700,
              transform: "uppercase",
              color: "#FFFFFF",
            },
            subtitleStyle: { size: 11 },
          }),
        ),
      ),
      darkButton("All outfits"),
    ],
    { gap: 16 },
  );

  const body: Node = options.tabs
    ? tabs(
        [
          { label: "Categories", child: categories },
          { label: "Looks", child: looks },
        ],
        {
          activeBackground: INK,
          activeColor: "#FFFFFF",
          inactiveBackground: "#F0F0F0",
          inactiveColor: INK,
          text: {
            size: 12,
            weight: 700,
            transform: "uppercase",
            letterSpacing: 0.5,
          },
        },
      )
    : categories;

  return design({
    tokens: {
      fontFamily: "theme",
      text: INK,
      mutedText: "#6B6F7A",
      background: "#FFFFFF",
      canvas: "#EFEFEF",
      accent: INK,
      accentText: "#FFFFFF",
      radius: 16,
    },
    header: header({
      logoAlign: "center",
      showLanguage: true,
      box: { background: "#FFFFFF", padding: [12, 16, 12, 16] },
    }),
    main: stack([stack([body], { gap: 16, box: PANEL })], {
      box: { padding: 12 },
    }),
    footer: stack(
      [
        accountBar(["facebook", "instagram"], {
          box: { ...PANEL, padding: [14, 16, 14, 16] },
          iconColor: INK,
        }),
      ],
      { box: { padding: 12 } },
    ),
    screens: [suits],
  });
}
