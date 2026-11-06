import { cleanCustomCss } from "./customCss";
import { isResourceLink, resourceKey } from "./links";
import { walkDesign, withoutHidden } from "./tree";
import type {
  Design,
  LinkRef,
  Node,
  ResourceLink,
  ResourceType,
} from "./types";

/** Shopify's limit for JSON metafields written by new apps. */
export const METAFIELD_LIMIT_BYTES = 128 * 1024;
/** Warn the merchant before they hit the limit. */
export const METAFIELD_WARN_BYTES = 100 * 1024;

/** A store resource the storefront must resolve (current URL, image, products). */
export interface ResourceNeed {
  key: string;
  type: ResourceType;
  id: string;
  title: string;
  /** The collection's products are needed (story circles from a collection). */
  withProducts: boolean;
}

/**
 * Resource types the theme resolves by ID from reference-list metafields
 * (blogs have no reference type and keep their stored URL).
 */
export const REFERENCE_TYPES = [
  "collection",
  "product",
  "page",
  "article",
] as const;
export type ReferenceType = (typeof REFERENCE_TYPES)[number];

/**
 * Liquid loops over at most 50 references of a list without `paginate`
 * (which would follow the page's own ?page= parameter), so each type is
 * written in chunks of 50, up to 4 chunks.
 */
export const REFERENCE_CHUNK = 50;
export const REFERENCE_CHUNKS = 4;
export const MAX_REFERENCES = REFERENCE_CHUNK * REFERENCE_CHUNKS;

/** IDs the theme must resolve, by type, plus collections whose products are shown. */
export interface MenuReferences {
  ids: Record<ReferenceType, string[]>;
  productCollections: string[];
}

/** Publishing checks this: more links than the theme can resolve by ID. */
export function assertReferenceLimits(references: MenuReferences): void {
  for (const type of REFERENCE_TYPES) {
    if (references.ids[type].length > MAX_REFERENCES)
      throw new TooManyLinksError(type, references.ids[type].length);
  }
  if (references.productCollections.length > REFERENCE_CHUNK)
    throw new TooManyLinksError(
      "collection",
      references.productCollections.length,
    );
}

export interface CompileResult {
  /** The storefront menu, without translations (they're stored per language). */
  menu: Design;
  /**
   * Translations by locale, each written to its own metafield so the theme
   * loads only the shopper's language (and each has its own size limit).
   */
  translations: Design["translations"];
  resources: ResourceNeed[];
  references: MenuReferences;
  bytes: number;
}

export class TooManyLinksError extends Error {
  constructor(
    public type: ReferenceType,
    public count: number,
  ) {
    super(
      `This menu links to ${count} different ${type === "article" ? "blog post" : type}s; the limit is ${MAX_REFERENCES}. Group some of them into a collection or a sub-menu.`,
    );
    this.name = "TooManyLinksError";
  }
}

export class MenuTooLargeError extends Error {
  constructor(public bytes: number) {
    super(
      `This menu is ${Math.round(bytes / 1024)} KB; Shopify allows ${METAFIELD_LIMIT_BYTES / 1024} KB. Remove some widgets or translations.`,
    );
    this.name = "MenuTooLargeError";
  }
}

function linksOf(node: Node): LinkRef[] {
  switch (node.type) {
    case "card":
    case "row":
    case "banner":
    case "countdown":
    case "pill":
    case "chip":
    case "button":
    case "image":
    case "shape":
      return [node.link];
    case "stories":
      return [
        ...node.items.map((item) => item.link),
        ...(node.source === "collection" && node.collection
          ? [node.collection]
          : []),
      ];
    case "products":
      return node.collection ? [node.collection] : [];
    case "contact":
      return node.items.flatMap((item) =>
        item.kind === "link" && item.link ? [item.link] : [],
      );
    default:
      return [];
  }
}

/** The collection whose products a node shows (story circles, product cards). */
function productsCollectionOf(node: Node): ResourceLink | undefined {
  if (node.type === "stories" && node.source === "collection")
    return node.collection;
  if (node.type === "products") return node.collection;
  return undefined;
}

function compactTranslations(design: Design): Design["translations"] {
  const result: Design["translations"] = {};
  for (const [locale, texts] of Object.entries(design.translations)) {
    const filled = Object.fromEntries(
      Object.entries(texts).filter(([, value]) => value.trim() !== ""),
    );
    if (Object.keys(filled).length > 0) result[locale] = filled;
  }
  return result;
}

/**
 * Turns the editor design into the storefront payload: drops hidden nodes and
 * empty translations, lists the store resources the theme has to resolve, and
 * enforces the metafield size limit.
 */
export function compile(design: Design): CompileResult {
  const menu: Design = {
    ...design,
    header: withoutHidden(design.header),
    footer: design.footer ? withoutHidden(design.footer) : undefined,
    screens: design.screens.map((screen) => ({
      ...screen,
      root: withoutHidden(screen.root),
    })),
    translations: {},
    customCss: cleanCustomCss(design.customCss) || undefined,
  };
  const translations = compactTranslations(design);

  const resources = new Map<string, ResourceNeed>();
  let localization = design.header.showLanguage === true;
  walkDesign(menu, (node) => {
    if (node.type === "localization") localization = true;
    // Stand-in products are for the editor only (nodes here are copies).
    if (node.type === "products") delete node.sample;
    for (const link of linksOf(node)) {
      if (!isResourceLink(link) || !link.id) continue;
      const key = resourceKey(link.type, link.id);
      const withProducts = productsCollectionOf(node)?.id === link.id;
      const existing = resources.get(key);
      if (existing) {
        existing.withProducts ||= withProducts;
      } else {
        resources.set(key, {
          key,
          type: link.type,
          id: link.id,
          title: link.title,
          withProducts,
        });
      }
    }
  });

  const needs = [...resources.values()];
  const references: MenuReferences = {
    ids: { collection: [], product: [], page: [], article: [] },
    productCollections: needs
      .filter((need) => need.withProducts)
      .map((need) => need.id),
  };
  for (const need of needs) {
    if ((REFERENCE_TYPES as readonly string[]).includes(need.type))
      references.ids[need.type as ReferenceType].push(need.id);
  }
  let productLimit = 0;
  walkDesign(menu, (node) => {
    if (productsCollectionOf(node))
      productLimit = Math.max(
        productLimit,
        (node as { limit?: number }).limit ?? 8,
      );
  });
  menu.meta = { localization, ...(productLimit ? { productLimit } : {}) };

  const size = (value: unknown) =>
    new TextEncoder().encode(JSON.stringify(value)).length;
  const bytes = size(menu);
  if (bytes > METAFIELD_LIMIT_BYTES) throw new MenuTooLargeError(bytes);
  for (const texts of Object.values(translations)) {
    const languageBytes = size(texts);
    if (languageBytes > METAFIELD_LIMIT_BYTES)
      throw new MenuTooLargeError(languageBytes);
  }

  return { menu, translations, resources: needs, references, bytes };
}
