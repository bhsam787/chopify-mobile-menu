import { newId } from "../tree";
import type {
  Design,
  IconName,
  LinkRef,
  Node,
  Screen,
  StoriesNode,
} from "../types";
import {
  accountBar,
  design,
  header,
  screen,
  stack,
  tabs,
  thumbRow,
  row,
} from "./build";
import { templateImage, type TemplateImageName } from "./images";

/**
 * Sliding Menu — after the "Mobile_Variant 3" / "Anlässe" frames: a pill tab
 * switch (Categories / Occasions), round photos on a soft pink band, and
 * full-width rows with line icons. Rows with an arrow slide to their own
 * sub-menu (with a back button), like a native app menu.
 */
const WINE = "#60062E";
const BAND = "#FDF5F8";
const LINE = "rgba(24,1,12,0.15)";

const divider = (): Node => ({
  id: newId("d"),
  type: "divider",
  color: LINE,
  thickness: 1,
});

/** Rows one under the other, separated by thin lines (no line after the last). */
const rows = (items: Node[]): Node =>
  stack(
    items.flatMap((item, index) => (index ? [divider(), item] : [item])),
    { gap: 0 },
  );

const rowStyle = {
  box: {
    padding: [24, 15, 24, 15] as [number, number, number, number],
    radius: 0,
  },
  titleStyle: {
    size: 16,
    weight: 500 as const,
    color: WINE,
    letterSpacing: -0.3,
  },
};

/** A row with a line icon; with `opens`, its arrow slides to that sub-menu. */
const iconRow = (
  title: string,
  icon: TemplateImageName,
  opens?: Screen,
): Node =>
  thumbRow(title, icon, {
    ...rowStyle,
    thumbSize: 28,
    thumbRadius: 0,
    thumbBackground: "transparent",
    chevron: true,
    link: opens ? { type: "screen", screenId: opens.id } : { type: "none" },
  });

const textRow = (
  title: string,
  opens?: Screen,
  chevron = Boolean(opens),
): Node =>
  row(title, {
    ...rowStyle,
    chevron,
    link: opens ? { type: "screen", screenId: opens.id } : { type: "none" },
  });

const band = (items: [string, TemplateImageName][]): Node => {
  const stories: StoriesNode = {
    id: newId("st"),
    type: "stories",
    source: "manual",
    items: items.map(([title, image]) => ({
      id: newId("i"),
      title,
      image: templateImage(image, title),
      link: { type: "none" } as LinkRef,
    })),
    size: 90,
    ringColor: WINE,
    ringWidth: 2,
    imageBackground: "#FFFFFF",
    labelStyle: { size: 14, weight: 500, color: WINE },
  };
  return stack([stories], {
    gap: 0,
    box: { background: BAND, padding: [20, 15, 21, 15] },
  });
};

/**
 * A sub-menu that slides in: "Shop all" first, then its categories, each
 * with the parent's line icon (or a matching built-in icon), like level one.
 */
const subMenu = (
  title: string,
  entries: string[],
  icon: TemplateImageName | IconName,
): Screen => {
  const entryRow = (entryTitle: string): Node =>
    icon.includes("/")
      ? thumbRow(entryTitle, icon as TemplateImageName, {
          ...rowStyle,
          thumbSize: 28,
          thumbRadius: 0,
          thumbBackground: "transparent",
          chevron: false,
        })
      : row(entryTitle, {
          ...rowStyle,
          variant: "icon",
          icon: icon as IconName,
          chevron: false,
        });
  return screen(
    title,
    stack(
      [
        rows([
          entryRow(`Shop all ${title.toLowerCase()}`),
          ...entries.map(entryRow),
        ]),
      ],
      {
        gap: 0,
        box: { padding: 0 },
      },
    ),
  );
};

export function sliding(): Design {
  const food = subMenu(
    "Food & drink",
    ["Plates & bowls", "Cups & bottles", "Cutlery", "Bibs"],
    "kids/icon-food",
  );
  const nursery = subMenu(
    "Nursery",
    ["Night lights", "Storage", "Wall decor", "Bedding"],
    "kids/icon-nursery",
  );
  const toys = subMenu(
    "Toys",
    ["Wooden toys", "Soft toys", "Puzzles & games", "Outdoor play"],
    "kids/icon-toys",
  );
  const textiles = subMenu(
    "Clothing",
    ["Bodysuits", "Hats & scarves", "Sleep bags", "Blankets"],
    "kids/icon-textiles",
  );
  const occasions = subMenu(
    "Occasions",
    ["Birth", "Birthdays", "Baby shower", "Christmas"],
    "gift",
  );
  const brands = subMenu(
    "Brands",
    ["Featured brands", "New brands", "All brands A–Z"],
    "star",
  );
  const sale = subMenu(
    "Sale",
    ["Up to 30% off", "Bundles", "Last chance"],
    "percent",
  );

  const categories = stack(
    [
      band([
        ["All products", "kids/category-all"],
        ["Bestsellers", "kids/category-best"],
        ["New in", "kids/category-new"],
        // Enough circles to swipe sideways, like on the store.
        ["Gift sets", "kids/occasion-birth"],
        ["Party", "kids/occasion-first-birthday"],
        ["Back to school", "kids/occasion-kindergarten"],
      ]),
      rows([
        iconRow("Food & drink", "kids/icon-food", food),
        iconRow("Nursery", "kids/icon-nursery", nursery),
        iconRow("Toys", "kids/icon-toys", toys),
        iconRow("Clothing", "kids/icon-textiles", textiles),
        textRow("Bundles & savings"),
        textRow("Occasions", occasions),
        textRow("Brands", brands),
        textRow("SALE", sale),
      ]),
    ],
    { gap: 0 },
  );

  const occasionList = stack(
    [
      band([
        ["Birth gifts", "kids/occasion-birth"],
        ["Baptism gifts", "kids/occasion-baptism"],
        ["1st birthday", "kids/occasion-first-birthday"],
        ["Kindergarten start", "kids/occasion-kindergarten"],
        ["School start", "kids/occasion-school"],
        ["Christmas", "kids/occasion-christmas"],
      ]),
      rows([
        iconRow("Birthday", "kids/icon-cake"),
        iconRow("2nd birthday", "kids/icon-balloons"),
        iconRow("3rd birthday", "kids/icon-party"),
        iconRow("Baby shower", "kids/icon-teddy"),
        iconRow("Goodbye gifts for daycare", "kids/icon-diploma"),
        iconRow("Gifts for teachers", "kids/icon-books"),
        iconRow("Confirmation", "kids/icon-dove"),
        iconRow("Easter", "kids/icon-egg"),
        iconRow("Advent calendars", "kids/icon-calendar"),
        iconRow("Valentine's Day", "kids/icon-heart"),
        iconRow("Halloween for kids", "kids/icon-pumpkin"),
      ]),
    ],
    { gap: 0 },
  );

  return design({
    tokens: {
      fontFamily: "theme",
      text: WINE,
      mutedText: "#8A6A78",
      background: "#FFFFFF",
      canvas: "#FFFFFF",
      accent: WINE,
      accentText: "#FFFFFF",
      radius: 18,
    },
    header: header({
      box: { background: "#FFFFFF", padding: [16, 15, 16, 15] },
      iconColor: WINE,
    }),
    main: stack(
      [
        tabs(
          [
            { label: "Categories", child: categories },
            { label: "Occasions", child: occasionList },
          ],
          {
            activeBackground: WINE,
            activeColor: "#FFFFFF",
            inactiveBackground: "transparent",
            inactiveColor: WINE,
            track: "#ECE8EA",
            inset: 15,
            text: { size: 14, weight: 600 },
          },
        ),
      ],
      { gap: 0, box: { padding: [16, 0, 0, 0] } },
    ),
    // A thin line above the Account row, like the design's top shadow.
    footer: stack(
      [
        { id: newId("d"), type: "divider", color: "#DCD9DB", thickness: 1 },
        accountBar([], {
          loginLabel: "Account",
          accountLabel: "Account",
          iconColor: "#18010C",
          style: { size: 14, color: "#18010C" },
          box: { padding: [20, 24, 20, 24] },
        }),
      ],
      { gap: 0 },
    ),
    screens: [food, nursery, toys, textiles, occasions, brands, sale],
  });
}
