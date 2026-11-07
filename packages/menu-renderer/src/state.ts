/**
 * What every part of the renderer shares: the design, the store context and
 * the texts in the shopper's language, plus the helpers that read them.
 */
import type { Design, LinkRef, Node } from "@chopi/menu-core";
import { isResourceLink, resourceKey } from "@chopi/menu-core";
import type { RenderContext } from "./context";
import { esc, safeUrl } from "./html";

export interface State {
  design: Design;
  ctx: RenderContext;
  texts: Record<string, string>;
}

/** Translated text for "<nodeId>.<field>", falling back to the default-language value. */
export function t(
  state: State,
  id: string,
  field: string,
  fallback: string,
): string {
  return state.texts[`${id}.${field}`] || fallback;
}

/**
 * Attributes that identify a node: `data-chm-node` for the editor, and
 * `data-chm-id` for custom CSS aimed at one item. The store only gets
 * `data-chm-id` on items the menu's custom CSS mentions (no extra weight).
 */
export function nodeAttr(state: State, node: Node): string {
  if (state.ctx.editor)
    return ` data-chm-node="${esc(node.id)}" data-chm-id="${esc(node.id)}"`;
  return state.design.customCss?.includes(node.id)
    ? ` data-chm-id="${esc(node.id)}"`
    : "";
}

/** Whether `link` points to a store resource that no longer exists (storefront only). */
export function isGone(state: State, link: LinkRef | undefined): boolean {
  return (
    Boolean(state.ctx.liveResources) &&
    !state.ctx.editor &&
    isResourceLink(link) &&
    // Blogs have no metafield reference type: they keep their stored URL.
    link.type !== "blog" &&
    Boolean(link.id) &&
    !state.ctx.resources[resourceKey(link.type, link.id)]
  );
}

/** Where a link goes on this store, or null (no link, a sub-menu, or gone). */
export function href(state: State, link: LinkRef): string | null {
  if (isGone(state, link)) return null;
  switch (link.type) {
    case "none":
    case "screen":
      return null;
    case "url":
      return safeUrl(link.url);
    case "route":
      return state.ctx.routes[link.route] ?? null;
    default:
      return (
        state.ctx.resources[resourceKey(link.type, link.id)]?.url ??
        safeUrl(link.url)
      );
  }
}
