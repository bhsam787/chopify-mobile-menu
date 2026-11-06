import type { ImageRef, RouteKey } from "@chopify/menu-core";

/** Store data for one linked resource, resolved by Liquid (storefront) or the Admin API (editor). */
export interface ResolvedResource {
  url: string;
  title: string;
  image?: string;
  /** Only for collections that story circles read products from. */
  products?: { title: string; url: string; image?: string }[];
}

export interface LocalizationOption {
  code: string;
  name: string;
}

/** Everything the renderer needs besides the design itself. */
export interface RenderContext {
  /** Active locale ISO code, e.g. "de". */
  locale: string;
  shopName: string;
  /** Keyed by `resourceKey()` ("collection:123"). */
  resources: Record<string, ResolvedResource>;
  /**
   * Storefront: `resources` holds every linked collection, product, page and
   * blog post, resolved by ID. One missing from it was deleted or unpublished,
   * so items linking to it are left out instead of leading to a 404.
   */
  liveResources?: boolean;
  routes: Record<RouteKey, string>;
  customerLoggedIn: boolean;
  localization?: {
    action: string;
    returnTo: string;
    country?: string;
    language?: string;
    countries: LocalizationOption[];
    languages: LocalizationOption[];
  };
  /** Editor preview: annotate nodes for selection, show placeholders, don't navigate. */
  editor?: boolean;
  /** Editor only: which tab each tabs node shows (tabs id → tab id). */
  activeTabs?: Record<string, string>;
  /** Editor only: collapsible frames shown open while being edited. */
  expanded?: string[];
  /** Fallback image when a node has none (editor placeholders). */
  logo?: ImageRef;
}

export const DEFAULT_ROUTES: Record<RouteKey, string> = {
  root: "/",
  search: "/search",
  collections: "/collections",
  all_products: "/collections/all",
  account: "/account",
  account_login: "/account/login",
  cart: "/cart",
};
