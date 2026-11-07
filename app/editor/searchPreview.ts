import { useMemo } from "react";
import { templateImage, type ImageRef } from "@chopi/menu-core";
import type { RenderContext, SearchResults } from "@chopi/menu-renderer";

type Context = Omit<RenderContext, "editor">;
type StoreResults = Omit<SearchResults, "links">;

/** Stand-in products for stores the editor knows no products of yet. */
const SAMPLE_PRODUCTS: [string, Parameters<typeof templateImage>[0], number][] =
  [
    ["Navy double-breasted suit", "fashion/suits", 249],
    ["White oxford shirt", "fashion/shirts", 59],
    ["Merino rollneck", "fashion/knitwear", 89],
    ["Slim black jeans", "fashion/jeans", 79],
    ["Field jacket", "fashion/jackets", 149],
    ["Stretch chinos", "fashion/chinos", 69],
    ["Linen summer blazer", "fashion/look-summer", 199],
    ["Classic tuxedo", "fashion/smoking", 329],
  ];

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

function price(amount: number, context: Context): string | undefined {
  if (!context.currency) return undefined;
  try {
    return new Intl.NumberFormat(context.locale, {
      style: "currency",
      currency: context.currency,
    }).format(amount);
  } catch {
    return undefined;
  }
}

/** Every product and collection the editor knows about (for previews). */
function catalog(context: Context) {
  const products = new Map<string, SearchResults["products"][number]>();
  const collections: SearchResults["collections"] = [];
  for (const [key, resource] of Object.entries(context.resources)) {
    if (key.startsWith("collection:"))
      collections.push({
        title: resource.title,
        url: resource.url,
        image: resource.image,
      });
    for (const product of resource.products ?? [])
      products.set(product.url, {
        title: product.title,
        url: product.url,
        image: product.image,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
      });
  }
  // Stand-ins only for stores the editor knows no products of (never mixed in).
  if (products.size === 0)
    SAMPLE_PRODUCTS.forEach(([title, image, amount], index) => {
      const photo: ImageRef = templateImage(image, title);
      products.set(`/products/sample-${index}`, {
        title,
        url: `/products/sample-${index}`,
        image: photo.url,
        price: price(amount, context),
        // One sample on sale, so the sale look can be judged.
        compareAtPrice: index === 0 ? price(329, context) : undefined,
      });
    });
  return { products: [...products.values()], collections };
}

/** Matches for `query` among the products and collections the editor knows. */
export function previewSearch(
  context: Context,
  query: string,
  limit: number,
): StoreResults {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const matches = (title: string) =>
    words.every((word) => normalize(title).includes(word));
  const { products, collections } = catalog(context);
  const found = products.filter((product) => matches(product.title));
  // Words of the matching titles that start like the query, as suggestions.
  const last = words[words.length - 1] ?? "";
  const suggestions = [
    ...new Set(
      [...products, ...collections]
        .flatMap((item) => normalize(item.title).split(/[^\p{L}\p{N}]+/u))
        .filter((word) => last && word.startsWith(last) && word !== last),
    ),
  ]
    .slice(0, 3)
    .map((word) => [...words.slice(0, -1), word].join(" "));
  return {
    suggestions,
    collections: collections.filter((item) => matches(item.title)).slice(0, 6),
    products: found.slice(0, limit),
  };
}

/** Results for the style tiles: a typical search with every kind of result. */
export function sampleResults(context: Context, limit: number): StoreResults {
  const { products, collections } = catalog(context);
  return {
    suggestions: [],
    collections: collections.slice(0, 3),
    products: products.slice(0, limit),
  };
}

/** A full set of sample results (links, suggestion, collections, products) for design previews. */
function previewSearchResults(context: Context): SearchResults {
  const { products, collections } = catalog(context);
  const first = products[0]?.title.split(/\s+/)[0]?.toLowerCase() ?? "shirt";
  return {
    links: [],
    suggestions: [`${first} new`],
    collections: collections.slice(0, 3),
    products: products.slice(0, 4),
  };
}

/**
 * `context` with sample search results while `shown` (the search results are
 * being designed), so the phone opens the results panel with them.
 */
export function useSearchSample(context: Context, shown: boolean): Context {
  return useMemo(
    () =>
      shown
        ? { ...context, searchSample: previewSearchResults(context) }
        : context,
    [context, shown],
  );
}
