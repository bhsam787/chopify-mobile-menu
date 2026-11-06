import {
  newId,
  templateImage,
  type ContainerNode,
  type LinkRef,
  type Node,
  type ResourceType,
  type WidgetDefinition,
} from "@chopify/menu-core";
import type { RenderContext, ResolvedResource } from "@chopify/menu-renderer";

export interface Sample {
  title: string;
  link: LinkRef;
  image?: string;
}

/**
 * Store resources (with images) already known to the editor, used to fill
 * widget previews with the merchant's own collections and products.
 */
export function samplesFrom(
  resources: Record<string, ResolvedResource>,
): Sample[] {
  return Object.entries(resources)
    .filter(([, resource]) => resource.image)
    .sort(
      ([a], [b]) =>
        Number(b.startsWith("collection:")) -
        Number(a.startsWith("collection:")),
    )
    .map(([key, resource]) => {
      const [type, numeric] = key.split(":") as [ResourceType, string];
      const gidType = type[0].toUpperCase() + type.slice(1);
      return {
        title: resource.title,
        image: resource.image,
        link: {
          type,
          id: `gid://shopify/${gidType}/${numeric}`,
          handle: "",
          title: resource.title,
          url: resource.url,
        } as LinkRef,
      };
    });
}

/** Used when the store has too few collections/products with images (e.g. new dev stores). */
const FALLBACK = (
  [
    ["Suits", "fashion/suits"],
    ["Shirts", "fashion/shirts"],
    ["Knitwear", "fashion/knitwear"],
    ["Jeans", "fashion/jeans"],
    ["Jackets", "fashion/jackets"],
    ["Sale", "fashion/outlet"],
  ] as const
).map(([title, image]): Sample => ({
  title,
  image: templateImage(image, title).url,
  link: { type: "none" },
}));

/**
 * A new section for `widget`, filled with complete sample content (the store's
 * own collections when it has enough, otherwise sample images), so it looks
 * finished when added and merchants only replace what they need. Sample
 * images are copied to the store's Shopify Files on save.
 */
export function widgetSample(
  widget: WidgetDefinition,
  available: Sample[],
): Node {
  const samples = available.length >= 4 ? available : FALLBACK;
  const sample = (index: number) => samples[index % samples.length];
  const node = widget.create();

  // Store resources render their own image (useResourceImage); only fallback samples carry one.
  const image = (index: number) =>
    sample(index).link.type === "none" && sample(index).image
      ? { url: sample(index).image!, alt: sample(index).title }
      : undefined;
  const card = (index: number): Node => ({
    id: newId("k"),
    type: "card",
    variant: "studio",
    title: sample(index).title,
    image: image(index),
    useResourceImage: true,
    link: sample(index).link,
    arrow: "light",
    box: { background: "#F3F3F3", radius: 12 },
    titleStyle: { size: 12, weight: 700, transform: "uppercase" },
  });
  const row = (index: number, size = 44): Node => ({
    id: newId("r"),
    type: "row",
    variant: "thumb",
    title: sample(index).title,
    image: image(index),
    useResourceImage: true,
    chevron: true,
    link: sample(index).link,
    thumbSize: size,
    thumbRadius: 8,
    box: { background: "#F5F5F5", radius: 10, padding: 8 },
    titleStyle: { size: 14 },
  });

  switch (node.type) {
    case "container":
      if (node.layout === "grid")
        return { ...node, children: [0, 1, 2, 3].map(card) };
      if (node.layout === "scroll") {
        return {
          ...node,
          children: [0, 1, 2, 3, 4, 5].map((index) => ({
            id: newId("ch"),
            type: "chip",
            label: sample(index).title,
            link: sample(index).link,
            box: { radius: 999, padding: [8, 14, 8, 14] },
            style: { size: 12, weight: 500 },
          })),
        };
      }
      return {
        ...node,
        children: [
          {
            id: newId("h"),
            type: "heading",
            text: "Shop by category",
            style: { size: 16, weight: 600 },
          },
          row(0),
          row(1),
          row(2),
        ],
      };
    case "tabs":
      return {
        ...node,
        tabs: node.tabs.map((tab, tabIndex) => ({
          ...tab,
          child: {
            ...tab.child,
            children: [0, 1, 2, 3].map((index) => card(tabIndex * 2 + index)),
          } as ContainerNode,
        })),
      };
    case "card":
      return { ...card(0), variant: "studio", ratio: 0.55 } as Node;
    case "row":
      return row(0, 56);
    case "accordion":
      return {
        ...node,
        title: sample(0).title,
        open: true,
        child: {
          ...node.child,
          children: [1, 2, 3].map(
            (index) =>
              ({
                ...(row(index, 28) as object),
                box: { padding: [8, 4, 8, 4] },
              }) as Node,
          ),
        },
      };
    case "chip":
      return { ...node, label: sample(0).title, link: sample(0).link };
    case "stories":
      return {
        ...node,
        source: "manual",
        size: 72,
        items: [0, 1, 2, 3, 4, 5].map((index) => ({
          id: newId("i"),
          title: sample(index).title,
          image: image(index),
          link: sample(index).link,
        })),
      };
    case "image":
      return {
        ...node,
        ratio: 0.45,
        image: sample(0).image
          ? { url: sample(0).image!, alt: sample(0).title }
          : undefined,
        link: sample(0).link,
      };
    case "banner":
      return {
        ...node,
        image: sample(1).image ? { url: sample(1).image!, alt: "" } : undefined,
      };
    case "account-bar":
      return {
        ...node,
        socials: [
          { network: "instagram", url: "" },
          { network: "tiktok", url: "" },
          { network: "facebook", url: "" },
        ],
      };
    default:
      return node;
  }
}

/**
 * The widget as it appears in the section library: the section it adds, with
 * spacers and dividers shown between placeholder text so they're visible.
 */
export function widgetPreview(
  widget: WidgetDefinition,
  available: Sample[],
): Node {
  const node = widgetSample(widget, available);
  switch (node.type) {
    case "spacer":
      return {
        id: newId("c"),
        type: "container",
        layout: "stack",
        gap: 0,
        children: [
          {
            id: newId("t"),
            type: "text",
            text: "Content above",
            style: { size: 13, color: "#8A8A8A" },
          },
          { ...node, height: 28 },
          {
            id: newId("t"),
            type: "text",
            text: "Content below",
            style: { size: 13, color: "#8A8A8A" },
          },
        ],
      };
    case "divider":
      return {
        id: newId("c"),
        type: "container",
        layout: "stack",
        gap: 12,
        children: [
          {
            id: newId("t"),
            type: "text",
            text: "Section above",
            style: { size: 13, color: "#8A8A8A" },
          },
          node,
          {
            id: newId("t"),
            type: "text",
            text: "Section below",
            style: { size: 13, color: "#8A8A8A" },
          },
        ],
      };
    default:
      return node;
  }
}

/** Shows the country/language widget even on single-market dev stores. */
export const SAMPLE_LOCALIZATION: RenderContext["localization"] = {
  action: "/localization",
  returnTo: "/",
  country: "US",
  language: "en",
  countries: [
    { code: "US", name: "United States (USD $)" },
    { code: "DE", name: "Germany (EUR €)" },
  ],
  languages: [
    { code: "en", name: "English" },
    { code: "de", name: "Deutsch" },
  ],
};
