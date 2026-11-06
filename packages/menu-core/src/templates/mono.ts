import type { Design } from "../types";
import {
  accountBar,
  banner,
  button,
  card,
  design,
  grid,
  header,
  pill,
  row,
  stack,
  tabs,
} from "./build";
import { templateImage, type TemplateImageName } from "./images";

/**
 * Mono Grid — after the black & white nutrition frames ("Huel"-style):
 * Products / Nutrition goals tabs, label cards, bold overlay tiles, referral
 * banner, plain link rows and a green promo pill.
 */
const INK = "#111111";

const PRODUCTS: [string, TemplateImageName][] = [
  ["Bestsellers", "nutrition/bundle"],
  ["Powder meals", "nutrition/powder"],
  ["Superfood greens", "nutrition/greens"],
  ["Ready-to-drink", "nutrition/shake"],
  ["Hot meals", "nutrition/meal"],
  ["Protein snacks", "nutrition/snack"],
];

const GOALS: [string, TemplateImageName][] = [
  ["Eat healthier", "nutrition/goal-healthy"],
  ["Weight control", "nutrition/goal-weight"],
  ["More protein", "nutrition/goal-protein"],
  ["Save time", "nutrition/goal-time"],
];

export function mono(): Design {
  const cta = () =>
    button("All products", {
      background: INK,
      color: "#FFFFFF",
      height: 44,
      style: { size: 14, weight: 600 },
    });
  const productCards = PRODUCTS.map(([title, image]) =>
    card("label", title, image, {
      ratio: 1,
      imageBackground: "#FFFFFF",
      box: { background: "#F4F4F4", radius: 12, padding: 8 },
      arrowBackground: "#FFFFFF",
      titleStyle: { size: 12, weight: 600, color: INK },
    }),
  );
  const goalCards = GOALS.map(([title, image]) =>
    card("overlay", title, image, {
      ratio: 1,
      box: { radius: 12 },
      titleStyle: { size: 13, weight: 700, color: "#FFFFFF" },
    }),
  );
  const plain = {
    background: "#FFFFFF",
    radius: 10,
    padding: [14, 14, 14, 14] as [number, number, number, number],
  };

  return design({
    tokens: {
      fontFamily: "theme",
      text: INK,
      mutedText: "#6B6B6B",
      background: "#FFFFFF",
      canvas: "#F4F4F4",
      accent: INK,
      accentText: "#FFFFFF",
      radius: 12,
    },
    header: header({
      showLanguage: true,
      box: { background: "#FFFFFF", padding: [12, 16, 12, 16] },
    }),
    main: stack(
      [
        stack(
          [
            tabs(
              [
                {
                  label: "Products",
                  child: stack([grid(productCards, { gap: 10 }), cta()], {
                    gap: 14,
                  }),
                },
                {
                  label: "Nutrition goals",
                  child: stack([grid(goalCards, { gap: 10 }), cta()], {
                    gap: 14,
                  }),
                },
              ],
              {
                activeBackground: INK,
                activeColor: "#FFFFFF",
                inactiveBackground: "#EFEFEF",
                inactiveColor: INK,
                text: { size: 12, weight: 600 },
              },
            ),
          ],
          { box: { background: "#FFFFFF", padding: 12 } },
        ),
        stack(
          [
            banner("promo", "Refer a friend", {
              text: "Share the love – you both save",
              image: templateImage("nutrition/referral", "Refer a friend"),
              box: { background: "#E4F5E1", radius: 12, padding: 12 },
              titleStyle: { size: 14, weight: 600, color: INK },
              textStyle: { size: 12, color: "#6B6B6B" },
              accent: "#FFFFFF",
              accentText: INK,
            }),
            row("Science", {
              box: plain,
              titleStyle: { size: 14, weight: 500 },
            }),
            row("About us", {
              box: plain,
              titleStyle: { size: 14, weight: 500 },
            }),
            row("Why choose us?", {
              box: plain,
              chevron: false,
              titleStyle: { size: 14, weight: 500 },
            }),
            row("Guides & articles", {
              box: plain,
              chevron: false,
              titleStyle: { size: 14, weight: 500 },
            }),
            pill("Give $30, get $30", {
              box: { background: "#C9F0C2", radius: 6 },
              style: { size: 13, weight: 600, color: INK },
            }),
          ],
          { gap: 8, box: { padding: 12 } },
        ),
      ],
      { gap: 0 },
    ),
    footer: stack([
      accountBar(["instagram", "tiktok"], {
        iconColor: INK,
        box: { padding: [12, 16, 20, 16] },
      }),
    ]),
  });
}
