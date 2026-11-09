import { newId } from "../tree";
import type { AccordionNode, ChipNode, Design } from "../types";
import {
  accountBar,
  banner,
  design,
  header,
  scrollRow,
  search,
  stack,
  thumbRow,
} from "./build";
import { templateImage, type TemplateImageName } from "./images";

/**
 * Accordion — after the "Control Menu" frame: "What are you looking for?",
 * scrolling chips, image rows where "All products" expands inline, and split
 * banners for About us / Help.
 */
const TEXT = "#1A1B18";
const GREEN = "#2F4A35";
const SOFT = "#F1F0EC";

const PRODUCTS: [string, TemplateImageName][] = [
  ["Essential oils", "botanical/oils"],
  ["Capsules (new)", "botanical/capsules"],
  ["Black seed oil", "botanical/black-seed-oil"],
  ["Gift sets", "botanical/sets"],
  ["Roll-ons (new)", "botanical/roll-on"],
  ["Carrier oils", "botanical/carrier-oils"],
  ["Room sprays", "botanical/room-spray"],
  ["Sauna infusions", "botanical/sauna"],
];

export function accordion(): Design {
  const imageRow = (
    title: string,
    subtitle: string,
    image: TemplateImageName,
  ) =>
    thumbRow(title, image, {
      subtitle,
      chevron: false,
      thumbSize: 64,
      thumbRadius: 8,
      box: { background: SOFT, radius: 12, padding: 10 },
      titleStyle: { size: 17, weight: 600, color: TEXT },
      subtitleStyle: { size: 13 },
    });

  const chip = (
    label: string,
    image: TemplateImageName,
    accent = false,
  ): ChipNode => ({
    id: newId("ch"),
    type: "chip",
    label,
    image: templateImage(image, label),
    link: { type: "none" },
    box: accent
      ? { background: "#E2231A", radius: 999, padding: [8, 14, 8, 8] }
      : {
          background: "#F2EBDD",
          radius: 999,
          padding: [8, 14, 8, 8],
          borderWidth: 1,
          borderColor: "#D9CBAE",
        },
    style: {
      size: 12,
      weight: 600,
      transform: "uppercase",
      letterSpacing: 1,
      color: accent ? "#FFFFFF" : "#6B5A35",
    },
  });

  const allProducts: AccordionNode = {
    id: newId("ac"),
    type: "accordion",
    title: "All products",
    subtitle: "Only the real thing",
    image: templateImage("botanical/sets", "All products"),
    open: true,
    box: { background: SOFT, radius: 12, padding: 10 },
    titleStyle: { size: 17, weight: 600, color: TEXT },
    subtitleStyle: { size: 13 },
    child: stack(
      PRODUCTS.map(([title, image]) =>
        thumbRow(title, image, {
          thumbSize: 32,
          thumbRadius: 999,
          chevron: false,
          box: { padding: [10, 8, 10, 8] },
          titleStyle: { size: 14, color: TEXT },
        }),
      ),
      { gap: 0, box: { background: "#FAFAF7", padding: [4, 16, 8, 16] } },
    ),
  };

  const split = (title: string, image: TemplateImageName) =>
    banner("split", title, {
      image: templateImage(image, title),
      box: { background: GREEN, radius: 12 },
      titleStyle: { size: 17, weight: 600, color: "#FFFFFF" },
    });

  return design({
    tokens: {
      fontFamily: "theme",
      text: TEXT,
      mutedText: "#6E6E6E",
      background: "#FFFFFF",
      canvas: "#FFFFFF",
      accent: GREEN,
      accentText: "#FFFFFF",
      radius: 12,
    },
    // The search field asks "What are you looking for?"; the chips under it
    // are the quick answers.
    header: header({
      close: "circle",
      searchBar: true,
      ...search("What are you looking for?", {
        field: "underline",
        accent: GREEN,
      }),
      box: { padding: [12, 16, 4, 16] },
    }),
    main: stack(
      [
        scrollRow([
          chip("Build-a-set", "botanical/bundle"),
          chip("Special deals", "botanical/sets", true),
          chip("Gift ideas", "botanical/roll-on"),
        ]),
        stack(
          [
            imageRow("Build-a-set", "Save up to 20%", "botanical/bundle"),
            allProducts,
            imageRow("Special deals", "+ free products", "botanical/sets"),
            imageRow(
              "Certificates",
              "Tested batch by batch",
              "botanical/carrier-oils",
            ),
          ],
          { gap: 8 },
        ),
        split("About us", "botanical/about"),
        split("Help & contact", "botanical/help"),
      ],
      { gap: 12, box: { padding: [8, 16, 16, 16] } },
    ),
    footer: stack([
      accountBar(["instagram", "tiktok"], {
        iconColor: TEXT,
        box: {
          padding: [12, 16, 20, 16],
          borderWidth: 1,
          borderColor: "#E5E5E5",
        },
      }),
    ]),
  });
}
