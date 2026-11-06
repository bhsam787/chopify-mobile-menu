/**
 * Store and promotion widgets: product cards, perks, contact buttons,
 * discount codes and the ticker.
 */
import type {
  ContactNode,
  DiscountNode,
  IconName,
  PerksNode,
  ProductsNode,
  TickerNode,
} from "@chopi/menu-core";
import { contactHref, resourceKey, UI_TEXT_DEFAULTS } from "@chopi/menu-core";
import { boxCss, color, css, esc, img, styleAttr, textCss } from "./html";
import { ICONS, icon } from "./icons";
import { href, isGone, nodeAttr, t, type State } from "./state";

const clamp = (value: unknown, min: number, max: number, fallback: number) =>
  Math.max(min, Math.min(max, Number(value) || fallback));

export function products(state: State, node: ProductsNode): string {
  const limit = clamp(node.limit, 1, 12, 6);
  const resource = node.collection
    ? state.ctx.resources[resourceKey("collection", node.collection.id)]
    : undefined;
  let items = (resource?.products ?? []).slice(0, limit);
  // Until a collection is chosen the editor shows stand-in products (sample
  // photos), or empty cards; the store shows nothing.
  const placeholder = items.length === 0 && Boolean(state.ctx.editor);
  if (placeholder)
    items = node.sample?.length
      ? node.sample.slice(0, limit).map((sample) => ({
          title: sample.title,
          url: "",
          image: sample.image.url,
        }))
      : Array.from({ length: Math.min(limit, 4) }, () => ({
          title: "Product name",
          url: "",
        }));
  if (!items.length) return "";

  const row = node.layout !== "grid";
  const width = clamp(node.cardWidth, 90, 260, 140);
  const ratio = clamp(node.ratio, 0.5, 2, 1.2);
  const media = css(
    `aspect-ratio:1/${ratio}`,
    node.imageBackground && `background:${color(node.imageBackground)}`,
  );
  const cards = items
    .map((product) => {
      const tag = product.url ? "a" : "div";
      const price =
        node.showPrice === false
          ? ""
          : placeholder
            ? '<span class="chm-product__price chm-product__price--empty"></span>'
            : product.price
              ? `<span class="chm-product__price"${styleAttr(textCss(node.priceStyle))}>${
                  product.compareAtPrice
                    ? `<s class="chm-product__was">${esc(product.compareAtPrice)}</s> <span class="chm-product__now"${styleAttr(node.saleColor && `color:${color(node.saleColor)}`)}>${esc(product.price)}</span>`
                    : esc(product.price)
                }</span>`
              : "";
      return `<${tag} class="chm-product"${product.url ? ` href="${esc(product.url)}"` : ""}${row ? ` style="width:${width}px"` : ""}><span class="chm-product__media"${styleAttr(media)}>${img(
        product.image,
        Math.round((row ? width : 200) * 2),
        product.title,
        "chm-product__img",
      )}</span><span class="chm-product__title"${styleAttr(textCss(node.titleStyle))}>${esc(product.title)}</span>${price}</${tag}>`;
    })
    .join("");
  return `<div class="chm-products chm-products--${row ? "row" : "grid"}"${nodeAttr(state, node)}${styleAttr(boxCss(node.box))}>${cards}</div>`;
}

export function perks(state: State, node: PerksNode): string {
  const columns = clamp(node.columns, 1, 4, 3);
  const iconStyle = styleAttr(
    node.iconColor && `color:${color(node.iconColor)}`,
  );
  return `<div class="chm-perks chm-perks--${node.variant === "inline" ? "inline" : "stacked"}"${nodeAttr(state, node)}${styleAttr(
    `--chm-perk-cols:${columns}`,
    boxCss(node.box),
  )}>${node.items
    .map(
      (item) =>
        `<div class="chm-perk"><span class="chm-perk__icon"${iconStyle}>${icon(item.icon)}</span><span class="chm-perk__text"${styleAttr(textCss(node.style))}>${esc(
          t(state, item.id, "text", item.text),
        )}</span></div>`,
    )
    .join("")}</div>`;
}

const CONTACT_ICONS: Record<ContactNode["items"][number]["kind"], IconName> = {
  phone: "phone",
  email: "mail",
  whatsapp: "whatsapp",
  link: "help",
};

/** Where a contact button goes; null when its number or address is unusable. */
function contactLink(
  state: State,
  item: ContactNode["items"][number],
): string | null {
  if (item.kind !== "link") return contactHref(item.kind, item.value);
  return item.link && !isGone(state, item.link) ? href(state, item.link) : null;
}

export function contact(state: State, node: ContactNode): string {
  const rows = node.variant === "rows";
  const iconStyle = styleAttr(
    node.iconColor && `color:${color(node.iconColor)}`,
  );
  const items = node.items
    .map((item) => ({ item, url: contactLink(state, item) }))
    // A button with nothing to open is left out on the store (shown in the editor).
    .filter(({ url }) => url || state.ctx.editor);
  if (!items.length && !node.title) return "";
  const title = node.title
    ? `<p class="chm-contact__title"${styleAttr(textCss(node.titleStyle))}>${esc(t(state, node.id, "title", node.title))}</p>`
    : "";
  const buttons = items
    .map(({ item, url }) => {
      const external = item.kind === "whatsapp";
      const open = url
        ? `<a class="chm-contact__item" href="${esc(url)}"${external ? ' target="_blank" rel="noopener"' : ""}`
        : '<span class="chm-contact__item"';
      return `${open}${styleAttr(textCss(node.style))}><span class="chm-contact__icon"${iconStyle}>${icon(CONTACT_ICONS[item.kind])}</span><span class="chm-contact__label">${esc(
        t(state, item.id, "label", item.label),
      )}</span>${rows ? `<span class="chm-contact__arrow">${ICONS.chevron}</span>` : ""}${url ? "</a>" : "</span>"}`;
    })
    .join("");
  return `<div class="chm-contact chm-contact--${rows ? "rows" : "buttons"}"${nodeAttr(state, node)}${styleAttr(boxCss(node.box))}>${title}<div class="chm-contact__items">${buttons}</div></div>`;
}

export function discount(state: State, node: DiscountNode): string {
  const code = node.code.trim();
  if (!code && !state.ctx.editor) return "";
  const copy = t(state, "ui", "copy", UI_TEXT_DEFAULTS.copy);
  const copied = t(state, "ui", "copied", UI_TEXT_DEFAULTS.copied);
  const root = state.ctx.routes.root.replace(/\/$/, "");
  // Shopify applies a code from /discount/CODE and then opens the redirect.
  const apply =
    node.applyLink && code
      ? `<a class="chm-discount__apply" href="${esc(`${root}/discount/${encodeURIComponent(code)}?redirect=${encodeURIComponent(state.ctx.routes.cart)}`)}"${styleAttr(textCss(node.textStyle))}>${esc(t(state, "ui", "apply", UI_TEXT_DEFAULTS.apply))}</a>`
      : "";
  return `<div class="chm-discount"${nodeAttr(state, node)}${styleAttr(boxCss(node.box))}><p class="chm-discount__title"${styleAttr(textCss(node.titleStyle))}>${esc(
    t(state, node.id, "title", node.title),
  )}</p>${
    node.text
      ? `<p class="chm-discount__text"${styleAttr(textCss(node.textStyle))}>${esc(t(state, node.id, "text", node.text))}</p>`
      : ""
  }<div class="chm-discount__row"><span class="chm-discount__code"${styleAttr(
    node.codeBackground && `background:${color(node.codeBackground)}`,
    node.codeColor && `color:${color(node.codeColor)}`,
  )}>${esc(code || "CODE")}</span><button type="button" class="chm-discount__copy" data-chm-copy="${esc(code)}" data-chm-copied="${esc(copied)}" aria-live="polite"${styleAttr(
    node.buttonBackground && `background:${color(node.buttonBackground)}`,
    node.buttonColor && `color:${color(node.buttonColor)}`,
  )}>${esc(copy)}</button>${apply}</div></div>`;
}

/** Wider than any phone screen (in px), so a copy of the messages always fills it. */
const TICKER_MIN_WIDTH = 480;

export function ticker(state: State, node: TickerNode): string {
  const texts = node.items
    .map((item) => t(state, item.id, "text", item.text).trim())
    .filter(Boolean);
  if (!texts.length) return "";
  const separator = node.separator?.trim()
    ? `<span class="chm-ticker__sep" aria-hidden="true">${esc(node.separator.trim())}</span>`
    : "";
  const once = texts
    .map(
      (text) =>
        `<span class="chm-ticker__item">${esc(text)}</span>${separator}`,
    )
    .join("");
  // Widths aren't known here, so they're estimated from the text length.
  // Each copy must be wider than the widest phone, or a gap would scroll by.
  const size = Number(node.style?.size) || 13;
  const onceWidth = (texts.join("").length + texts.length * 4) * size * 0.6;
  const repeat = Math.max(1, Math.ceil(TICKER_MIN_WIDTH / onceWidth));
  const group = once.repeat(repeat);
  // One loop takes as long as one copy needs at the chosen speed.
  const seconds = Math.max(
    4,
    (onceWidth * repeat) / clamp(node.speed, 10, 200, 40),
  );
  return `<div class="chm-ticker"${nodeAttr(state, node)}${styleAttr(
    boxCss(node.box),
    textCss(node.style),
    `--chm-ticker-duration:${seconds.toFixed(1)}s`,
  )} role="marquee" aria-label="${esc(texts.join(" · "))}"><div class="chm-ticker__track" aria-hidden="true"><span class="chm-ticker__group">${group}</span><span class="chm-ticker__group">${group}</span></div></div>`;
}
