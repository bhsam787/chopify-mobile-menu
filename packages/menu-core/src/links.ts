import type { LinkRef, ResourceLink, ResourceType, RouteKey } from "./types";
import { RESOURCE_TYPES } from "./types";

export const ROUTES: Record<RouteKey, { label: string; path: string }> = {
  root: { label: "Home page", path: "/" },
  search: { label: "Search", path: "/search" },
  collections: { label: "All collections", path: "/collections" },
  all_products: { label: "All products", path: "/collections/all" },
  account: { label: "Customer account", path: "/account" },
  account_login: { label: "Customer login", path: "/account/login" },
  cart: { label: "Cart", path: "/cart" },
};

export const NO_LINK: LinkRef = { type: "none" };

export function isResourceLink(
  link: LinkRef | undefined,
): link is ResourceLink {
  return !!link && (RESOURCE_TYPES as readonly string[]).includes(link.type);
}

/** "gid://shopify/Collection/123" → "123" */
function numericId(gid: string): string {
  return gid.slice(gid.lastIndexOf("/") + 1);
}

/**
 * Key the storefront uses to look up a resource's current URL and data:
 * "<type>:<numeric id>". The theme builds the same key from the resources it
 * loads through the reference metafields (e.g. "collection:" + collection.id).
 */
export function resourceKey(type: ResourceType, gid: string): string {
  return `${type}:${numericId(gid)}`;
}

/** Display label for a link in the editor. */
export function describeLink(link: LinkRef): string {
  switch (link.type) {
    case "none":
      return "No link";
    case "url":
      return link.url || "No link";
    case "route":
      return link.sample
        ? `${ROUTES[link.route].label} (sample link)`
        : ROUTES[link.route].label;
    case "screen":
      return "Opens sub-menu";
    default:
      return link.title || link.handle;
  }
}
