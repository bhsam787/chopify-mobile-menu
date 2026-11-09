import { newId } from "../tree";
import type { Design } from "../types";
import {
  badge,
  banner,
  design,
  header,
  search,
  stack,
  thumbRow,
} from "./build";
import { templateImage, type TemplateImageName } from "./images";

/**
 * Spotlight — the structure of the bbb-menu-sh drawer (social proof bar, dark
 * deal highlight, best-seller story circles, image rows, a review and the
 * country/language row), shown with fashion sample content.
 */
const INK = "#14271F";
const SOFT = "#F5F4F2";

const BESTSELLERS: [string, TemplateImageName][] = [
  ["Classic jacket", "fashion/jacket-classic"],
  ["Double-breasted", "fashion/jacket-double"],
  ["Tuxedo", "fashion/smoking"],
  ["Waistcoat", "fashion/vest"],
];

const ROWS: [string, string, TemplateImageName, boolean?][] = [
  ["Suits", "Tailored suits for every occasion", "fashion/suits"],
  ["Build your look", "Up to 2 accessories free", "fashion/look-groom", true],
  ["Shirts", "Business, casual & slim fit", "fashion/shirts"],
  ["Trousers & chinos", "Tailored trousers and chinos", "fashion/chinos"],
  ["Knitwear", "Merino, cashmere & more", "fashion/knitwear"],
  ["Jeans", "Slim and regular fits", "fashion/jeans"],
  ["Secret outlet", "Up to 50% off", "fashion/outlet"],
];

export function spotlight(): Design {
  return design({
    tokens: {
      fontFamily: "theme",
      text: INK,
      mutedText: "#6B7380",
      background: "#FFFFFF",
      canvas: "#FFFFFF",
      accent: INK,
      accentText: "#FFFFFF",
      radius: 16,
    },
    header: header({
      icons: ["search", "account"],
      ...search("Search suits, shirts, shoes…", {
        layout: "carousel",
        accent: INK,
      }),
      box: { background: SOFT, padding: [10, 16, 10, 16] },
    }),
    main: stack(
      [
        {
          id: newId("sp"),
          type: "social-proof",
          text: "Over **120,000 customers** love our suits",
          avatars: [],
          verified: true,
          box: { background: SOFT, padding: [10, 16, 12, 16] },
          style: { size: 14 },
        },
        stack(
          [
            banner("highlight", "Build your wedding look", {
              eyebrow: "NEW!",
              badge: badge("Top deal", "#D93A2B"),
              text: "2 accessories as a gift",
              cta: "Build my look",
              image: templateImage(
                "fashion/look-wedding-guest",
                "Wedding look",
              ),
              box: { background: INK, radius: 16, padding: 20 },
              titleStyle: { size: 20, weight: 700, color: "#FFFFFF" },
              textStyle: { size: 14, color: "rgba(255,255,255,0.85)" },
              accent: "#FFFFFF",
              accentText: INK,
            }),
            {
              id: newId("hd"),
              type: "heading",
              text: "Bestsellers",
              style: { size: 20, weight: 700, color: INK },
            },
            {
              id: newId("st"),
              type: "stories",
              source: "manual",
              items: BESTSELLERS.map(([title, image]) => ({
                id: newId("i"),
                title,
                image: templateImage(image, title),
                link: { type: "none" },
              })),
              size: 96,
              ringColor: "#D0D0D0",
              imageBackground: "#FFFFFF",
              labelStyle: { size: 14 },
            },
            stack(
              ROWS.map(([title, subtitle, image, isNew]) =>
                thumbRow(title, image, {
                  subtitle,
                  chevron: false,
                  badge: isNew ? badge("NEW!", "#D93A2B") : undefined,
                  thumbSize: 80,
                  thumbRadius: 6,
                  box: { background: SOFT, radius: 10, padding: 12 },
                  titleStyle: { size: 18, weight: 700, color: INK },
                  subtitleStyle: { size: 14 },
                }),
              ),
              { gap: 12 },
            ),
            {
              id: newId("rv"),
              type: "review",
              quote:
                "The fit is perfect and the fabric feels amazing. I wore it at my brother's wedding and got compliments all day – **simply top**.",
              author: "Harald G.",
              stars: 5,
              box: { background: SOFT, radius: 10, padding: 16 },
              quoteStyle: { size: 15, italic: true },
              starColor: "#F2A93B",
              markColor: INK,
            },
          ],
          { gap: 20, box: { padding: 16 } },
        ),
      ],
      { gap: 0 },
    ),
    footer: stack(
      [
        {
          id: newId("l"),
          type: "localization",
          showCountry: true,
          showLanguage: true,
          box: { padding: [16, 16, 24, 16] },
          style: { size: 15 },
        },
      ],
      { box: { borderWidth: 1, borderColor: "#E5E5E5" } },
    ),
  });
}
