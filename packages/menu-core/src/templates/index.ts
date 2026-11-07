import { newId } from "../tree";
import type { Design } from "../types";
import { accordion } from "./accordion";
import { botanical, circleTiles, imageTiles } from "./botanical";
import { design, header, stack } from "./build";
import { mono } from "./mono";
import { sliding } from "./sliding";
import { spotlight } from "./spotlight";
import { studio } from "./studio";

export {
  TEMPLATE_IMAGE_PATH,
  isTemplateImage,
  replaceTemplateImages,
  templateImage,
} from "./images";

export const TEMPLATE_FEATURES = [
  "tabs",
  "image-cards",
  "fold-outs",
  "story-circles",
  "banners",
  "sliding",
] as const;
export type TemplateFeature = (typeof TEMPLATE_FEATURES)[number];

export interface Template {
  id: string;
  name: string;
  description: string;
  /** What the template shows off, for filtering the gallery. */
  features: TemplateFeature[];
  /** Added recently: marked "New" in the gallery. */
  isNew?: boolean;
  /** Builds a fully pre-filled design (sample texts and images) with fresh ids. */
  build: () => Design;
}

/** Templates follow the Figma menu designs (see docs/PLAN.md §7); content is sample content. */
export const TEMPLATES: Template[] = [
  {
    id: "studio",
    name: "Studio",
    description:
      "Fashion-style tabs with category cards and looks, plus a sub-menu with a matching look.",
    features: ["tabs", "image-cards", "banners"],
    build: () => studio({ tabs: true }),
  },
  {
    id: "studio-simple",
    name: "Studio Simple",
    description: "One clean category grid in a white panel, with sub-menus.",
    features: ["image-cards"],
    build: () => studio({ tabs: false }),
  },
  {
    id: "botanical",
    name: "Botanical Grid",
    description:
      "Product cards with NEW/SAVE tags, a set builder banner and a cream link zone.",
    features: ["tabs", "image-cards", "banners"],
    build: botanical,
  },
  {
    id: "image-tiles",
    name: "Image Tiles",
    description:
      "Photo tiles that fade into a rich color, great for shopping by goal.",
    features: ["image-cards", "banners"],
    build: imageTiles,
  },
  {
    id: "circle-tiles",
    name: "Circle Tiles",
    description:
      "Round product photos on soft cards, like a store's category circles.",
    features: ["tabs", "image-cards", "banners"],
    build: circleTiles,
  },
  {
    id: "mono",
    name: "Mono Grid",
    description:
      "Bold black & white grid with goal tiles, a referral banner and simple links.",
    features: ["tabs", "image-cards", "banners"],
    build: mono,
  },
  {
    id: "spotlight",
    name: "Spotlight",
    description:
      "Conversion-focused: social proof, deal highlight, best-seller circles and a review.",
    features: ["story-circles", "banners"],
    build: spotlight,
  },
  {
    id: "accordion",
    name: "Accordion",
    description:
      "Quick-link chips, image rows that expand inline and photo banners.",
    features: ["fold-outs", "banners"],
    build: accordion,
  },
  {
    id: "sliding",
    name: "Sliding Menu",
    description:
      "Category / Occasion tabs, round photos and icon rows. Rows with an arrow slide to their own sub-menu.",
    features: ["tabs", "story-circles", "sliding"],
    isNew: true,
    build: sliding,
  },
];

/** The plain look a blank menu starts from (the merchant restyles it). */
const BLANK_TOKENS: Design["tokens"] = {
  fontFamily: "theme",
  text: "#1A1A1A",
  mutedText: "#6B6B6B",
  background: "#FFFFFF",
  canvas: "#FFFFFF",
  accent: "#1A1A1A",
  accentText: "#FFFFFF",
  radius: 12,
};

/**
 * "Start blank": the header and no sections yet, built up section by section
 * in the regular editor (Add section), like a template without its content.
 */
export function blankSections(): Design {
  return design({
    tokens: BLANK_TOKENS,
    header: header({ box: { padding: [12, 16, 12, 16] } }),
    main: stack([], { gap: 12 }),
  });
}

/**
 * "Start with a blank canvas": the header (close button, logo) and one empty
 * canvas filling the menu, edited in the full-screen canvas editor.
 */
export function blankCanvas(): Design {
  return design({
    tokens: BLANK_TOKENS,
    header: header({ box: { padding: [12, 16, 12, 16] } }),
    main: stack(
      [
        {
          id: newId("cv"),
          type: "canvas",
          height: 720,
          background: "",
          children: [],
        },
      ],
      { gap: 0 },
    ),
  });
}

export function findTemplate(id: string): Template | undefined {
  return TEMPLATES.find((template) => template.id === id);
}
