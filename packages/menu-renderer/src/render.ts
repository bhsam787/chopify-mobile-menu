import type {
  CanvasNode,
  ShapeNode,
  AccordionNode,
  AccountBarNode,
  Badge,
  BannerNode,
  ButtonNode,
  CardNode,
  ChipNode,
  ContainerNode,
  CountdownNode,
  Design,
  HeaderButton,
  HeaderIcon,
  HeaderNode,
  BackBar,
  ImageNode,
  LinkRef,
  LocalizationNode,
  Node,
  PillNode,
  ReviewNode,
  RowNode,
  Screen,
  SocialProofNode,
  StoriesNode,
  TabsNode,
} from "@chopi/menu-core";
import {
  CANVAS_WIDTH,
  canvasLayout,
  childNodes,
  headerButtonOrder,
  isFreeTabs,
  SIDE_TAB_HEIGHT,
  TAB_BAR_HEIGHT,
  TAB_RAIL_WIDTH,
  isResourceLink,
  isRtlLocale,
  resolveTexts,
  resourceKey,
  tabsLook,
  UI_TEXT_DEFAULTS,
} from "@chopi/menu-core";
import type { RenderContext } from "./context";
import { href, isGone, nodeAttr, t, type State } from "./state";
import { contact, discount, perks, products, ticker } from "./widgets";
import { liveSearchOn, searchField, searchPanel } from "./search";
import { countdownText, remaining } from "./countdown";
import {
  boxCss,
  clamp,
  color,
  css,
  esc,
  img,
  num,
  rich,
  safeUrl,
  styleAttr,
  textCss,
  token,
} from "./html";
import { ICONS, icon, shapeIcon, SOCIAL_LABELS, socialIcon } from "./icons";

/** Items that only exist to link somewhere; left out when their target is gone. */
const LINK_ITEMS = new Set<Node["type"]>([
  "card",
  "row",
  "chip",
  "pill",
  "button",
  "banner",
  "image",
]);

/** Opening/closing tags for a tappable element: a link, a sub-menu trigger or a plain box. */
function tappable(
  state: State,
  node: Node,
  link: LinkRef,
  className: string,
  style = "",
  extraAttrs = "",
): [string, string] {
  const attrs = `class="${esc(className)}"${nodeAttr(state, node)}${style ? ` style="${esc(style)}"` : ""}${extraAttrs}`;
  if (link.type === "screen") {
    return [
      `<button type="button" ${attrs} data-chm-screen="${esc(link.screenId)}">`,
      "</button>",
    ];
  }
  const url = href(state, link);
  if (url) return [`<a ${attrs} href="${esc(url)}">`, "</a>"];
  return [`<div ${attrs}>`, "</div>"];
}

function resourceImage(state: State, link: LinkRef): string | undefined {
  if (!isResourceLink(link)) return undefined;
  return state.ctx.resources[resourceKey(link.type, link.id)]?.image;
}

function imageUrl(
  state: State,
  node: { image?: { url: string }; useResourceImage?: boolean; link: LinkRef },
): string | undefined {
  return (
    node.image?.url ||
    (node.useResourceImage ? resourceImage(state, node.link) : undefined)
  );
}

function badge(state: State, nodeId: string, value: Badge | undefined): string {
  if (!value?.text) return "";
  return `<span class="chm-badge"${styleAttr(
    value.background && `background:${color(value.background)}`,
    value.color && `color:${color(value.color)}`,
  )}>${esc(t(state, nodeId, "badge", value.text))}</span>`;
}

function arrowChip(
  kind: CardNode["arrow"],
  accent?: string,
  colors: { background?: string; color?: string } = {},
): string {
  if (!kind || kind === "none") return "";
  return `<span class="chm-arrow chm-arrow--${kind}"${styleAttr(
    kind === "filled" &&
      accent &&
      !colors.background &&
      `background:${color(accent)}`,
    colors.background && `background:${color(colors.background)}`,
    colors.color && `color:${color(colors.color)}`,
  )}>${ICONS.arrow}</span>`;
}

// ---------------------------------------------------------------------------
// Widgets
// ---------------------------------------------------------------------------

function card(state: State, node: CardNode): string {
  const title = t(state, node.id, "title", node.title);
  const subtitle = node.subtitle
    ? t(state, node.id, "subtitle", node.subtitle)
    : "";
  const image = imageUrl(state, node);
  const fixedRatio =
    node.variant === "studio" ||
    node.variant === "product" ||
    node.variant === "overlay";
  const [open, close] = tappable(
    state,
    node,
    node.link,
    `chm-card chm-card--${token(node.variant)}`,
    css(
      boxCss(node.box),
      // Fades blend into the card color.
      node.box?.background && `--chm-card-bg:${color(node.box.background)}`,
      fixedRatio && node.ratio ? `aspect-ratio:${1 / node.ratio}` : "",
    ),
  );
  const titleHtml = `<span class="chm-card__title"${styleAttr(textCss(node.titleStyle))}>${esc(title)}</span>`;
  const subtitleHtml = subtitle
    ? `<span class="chm-card__subtitle"${styleAttr(textCss(node.subtitleStyle))}>${esc(subtitle)}</span>`
    : "";
  const arrow = arrowChip(node.arrow, node.accent, {
    background: node.arrowBackground,
    color: node.arrowColor,
  });
  const media = (width: number, extra = "") =>
    `<span class="chm-card__media"${styleAttr(node.imageBackground && `background:${color(node.imageBackground)}`, !fixedRatio && node.ratio ? `aspect-ratio:${1 / node.ratio}` : "")}>${img(
      image,
      width,
      "",
      "chm-card__img",
    )}${extra}</span>`;

  switch (node.variant) {
    case "studio":
      return `${open}<span class="chm-card__text">${titleHtml}${subtitleHtml}${badge(state, node.id, node.badge)}</span>${img(image, 240, "", "chm-card__img")}${arrow}${close}`;
    case "product":
      return `${open}<span class="chm-card__head">${titleHtml}${badge(state, node.id, node.badge)}</span>${media(360, '<span class="chm-card__fade"></span>')}${arrow}${close}`;
    case "overlay":
      return `${open}${img(image, 400, "", "chm-card__img")}<span class="chm-card__shade"></span><span class="chm-card__text">${titleHtml}${subtitleHtml}</span>${badge(state, node.id, node.badge)}${arrow}${close}`;
    case "label":
      return `${open}${media(320, badge(state, node.id, node.badge))}<span class="chm-card__foot">${titleHtml}${arrow}</span>${close}`;
    case "circle":
      return `${open}${titleHtml}${media(240)}${badge(state, node.id, node.badge)}${close}`;
    case "tile":
      return `${open}${media(360, '<span class="chm-card__fade chm-card__fade--bottom"></span>')}<span class="chm-card__foot">${titleHtml}${arrow}</span>${badge(state, node.id, node.badge)}${close}`;
  }
}

function row(state: State, node: RowNode): string {
  const title = t(state, node.id, "title", node.title);
  const subtitle = node.subtitle
    ? t(state, node.id, "subtitle", node.subtitle)
    : "";
  const [open, close] = tappable(
    state,
    node,
    node.link,
    `chm-row chm-row--${token(node.variant)}`,
    boxCss(node.box),
  );
  let lead = "";
  if (node.variant === "thumb") {
    const size = node.thumbSize ?? 56;
    lead = `<span class="chm-row__thumb"${styleAttr(
      `width:${size}px;height:${size}px`,
      `border-radius:${node.thumbRadius ?? 8}px`,
      node.thumbBackground && `background:${color(node.thumbBackground)}`,
    )}>${img(imageUrl(state, node), size * 2, "", "chm-row__img")}</span>`;
  } else if (node.variant === "icon" && node.icon) {
    lead = `<span class="chm-row__icon"${styleAttr(node.titleStyle?.color && `color:${color(node.titleStyle.color)}`)}>${icon(node.icon)}</span>`;
  }
  return `${open}${lead}<span class="chm-row__text"><span class="chm-row__title"${styleAttr(textCss(node.titleStyle))}>${esc(title)}${badge(
    state,
    node.id,
    node.badge,
  )}</span>${subtitle ? `<span class="chm-row__subtitle"${styleAttr(textCss(node.subtitleStyle))}>${esc(subtitle)}</span>` : ""}</span>${
    node.chevron
      ? `<span class="chm-row__chevron"${styleAttr(node.titleStyle?.color && `color:${color(node.titleStyle.color)}`)}>${ICONS.chevron}</span>`
      : ""
  }${close}`;
}

function accordion(state: State, node: AccordionNode): string {
  const title = t(state, node.id, "title", node.title);
  const subtitle = node.subtitle
    ? t(state, node.id, "subtitle", node.subtitle)
    : "";
  const open = Boolean(node.open);
  return `<div class="chm-acc${open ? " is-open" : ""}"${nodeAttr(state, node)}${styleAttr(
    node.box?.background && `background:${color(node.box.background)}`,
    node.box?.radius !== undefined && `border-radius:${node.box.radius}px`,
  )}><button type="button" class="chm-acc__head" aria-expanded="${open}" data-chm-accordion${styleAttr(
    node.box?.padding !== undefined && boxCss({ padding: node.box.padding }),
  )}>${node.image?.url ? `<span class="chm-row__thumb chm-acc__thumb">${img(node.image.url, 128, "", "chm-row__img")}</span>` : ""}<span class="chm-row__text"><span class="chm-row__title"${styleAttr(
    textCss(node.titleStyle),
  )}>${esc(title)}</span>${subtitle ? `<span class="chm-row__subtitle"${styleAttr(textCss(node.subtitleStyle))}>${esc(subtitle)}</span>` : ""}</span><span class="chm-acc__chevron">${ICONS.chevronDown}</span></button><div class="chm-acc__body"><div class="chm-acc__inner">${renderNode(
    state,
    node.child,
  )}</div></div></div>`;
}

function banner(state: State, node: BannerNode): string {
  const title = t(state, node.id, "title", node.title);
  const text = node.text ? t(state, node.id, "text", node.text) : "";
  const eyebrow = node.eyebrow
    ? t(state, node.id, "eyebrow", node.eyebrow)
    : "";
  const cta = node.cta ? t(state, node.id, "cta", node.cta) : "";
  const [open, close] = tappable(
    state,
    node,
    node.link,
    `chm-banner chm-banner--${token(node.variant)}`,
    boxCss(node.box),
  );
  const titleHtml = `<span class="chm-banner__title"${styleAttr(textCss(node.titleStyle))}>${esc(title)}</span>`;
  const textHtml = text
    ? `<span class="chm-banner__text"${styleAttr(textCss(node.textStyle))}>${rich(text, false)}</span>`
    : "";

  switch (node.variant) {
    case "promo":
      return `${open}${node.image?.url ? img(node.image.url, 128, "", "chm-banner__img") : ""}<span class="chm-banner__body">${titleHtml}${textHtml}</span>${arrowChip(
        "filled",
        node.accent,
        {
          // The arrow's own color (e.g. a dark arrow on a white circle).
          color: node.accentText,
        },
      )}${close}`;
    case "highlight":
      return `${open}<span class="chm-banner__body">${
        eyebrow || node.badge
          ? `<span class="chm-banner__eyebrow"${styleAttr(node.textStyle?.color && `color:${color(node.textStyle.color)}`)}>${esc(eyebrow)}${badge(state, node.id, node.badge)}</span>`
          : ""
      }${titleHtml}${textHtml}${
        cta
          ? `<span class="chm-banner__cta"${styleAttr(node.accent && `background:${color(node.accent)}`, node.accentText && `color:${color(node.accentText)}`)}>${esc(cta)}</span>`
          : ""
      }</span>${node.image?.url ? img(node.image.url, 280, "", "chm-banner__img") : ""}${close}`;
    case "split":
      return `${open}<span class="chm-banner__body">${titleHtml}${textHtml}</span>${
        node.image?.url
          ? `<span class="chm-banner__media">${img(node.image.url, 400, "", "chm-banner__img")}</span>`
          : ""
      }${close}`;
    case "feature":
      return `${open}${node.image?.url ? img(node.image.url, 240, "", "chm-banner__img") : '<span class="chm-banner__img chm-img--empty"></span>'}<span class="chm-banner__body">${
        eyebrow
          ? `<span class="chm-banner__eyebrow">${esc(eyebrow)}</span>`
          : ""
      }${titleHtml}${textHtml}${cta ? `<span class="chm-banner__outline">${esc(cta)}${ICONS.arrow}</span>` : ""}</span>${close}`;
  }
}

function countdown(state: State, node: CountdownNode): string {
  const title = t(state, node.id, "title", node.title);
  const text = node.text ? t(state, node.id, "text", node.text) : "";
  const [open, close] = tappable(
    state,
    node,
    node.link,
    "chm-countdown",
    boxCss(node.box),
    ` data-chm-countdown="${esc(node.endsAt || "daily")}"${node.hideWhenEnded ? " data-chm-hide-ended" : ""}`,
  );
  return `${open}<span class="chm-countdown__body"><span class="chm-countdown__title"${styleAttr(
    textCss(node.titleStyle),
  )}>${esc(title)}</span>${text ? `<span class="chm-countdown__text"${styleAttr(textCss(node.textStyle))}>${rich(text, false)}</span>` : ""}</span><span class="chm-timer"${styleAttr(
    node.timerBackground && `background:${color(node.timerBackground)}`,
    node.timerColor && `color:${color(node.timerColor)}`,
  )}>${ICONS.clock}<span data-chm-timer>${countdownText(remaining(node.endsAt || "daily", new Date()))}</span></span>${close}`;
}

function pill(state: State, node: PillNode): string {
  const [open, close] = tappable(
    state,
    node,
    node.link,
    "chm-pill",
    boxCss(node.box),
  );
  return `${open}${node.icon ? icon(node.icon) : ""}<span${styleAttr(textCss(node.style))}>${esc(t(state, node.id, "text", node.text))}</span>${close}`;
}

function chip(state: State, node: ChipNode): string {
  const [open, close] = tappable(
    state,
    node,
    node.link,
    "chm-chip",
    boxCss(node.box),
  );
  return `${open}${node.image?.url ? img(node.image.url, 48, "", "chm-chip__img") : ""}<span${styleAttr(textCss(node.style))}>${esc(
    t(state, node.id, "label", node.label),
  )}</span>${close}`;
}

function button(state: State, node: ButtonNode): string {
  const filled = node.variant === "filled";
  const [open, close] = tappable(
    state,
    node,
    node.link,
    `chm-btn chm-btn--${token(node.variant)}`,
    css(
      node.background &&
        (filled
          ? `background:${color(node.background)}`
          : `border-color:${color(node.background)}`),
      node.color && `color:${color(node.color)}`,
      node.radius !== undefined && `border-radius:${node.radius}px`,
      node.height && `min-height:${node.height}px`,
      textCss(node.style),
    ),
  );
  return `${open}${esc(t(state, node.id, "label", node.label))}${filled ? "" : ICONS.arrow}${close}`;
}

function stories(state: State, node: StoriesNode): string {
  const size = node.size ?? 88;
  let items: { title: string; url?: string; image?: string; key: string }[];
  if (node.source === "collection" && node.collection) {
    const resource =
      state.ctx.resources[resourceKey("collection", node.collection.id)];
    items = (resource?.products ?? [])
      .slice(0, node.limit ?? 8)
      .map((product, index) => ({
        title: product.title,
        url: safeUrl(product.url) ?? undefined,
        image: product.image,
        key: String(index),
      }));
    if (items.length === 0 && state.ctx.editor) {
      items = Array.from({ length: 4 }, (_, index) => ({
        title: "Product",
        key: String(index),
      }));
    }
  } else {
    items = node.items
      .filter((item) => !isGone(state, item.link))
      .map((item) => ({
        title: t(state, item.id, "title", item.title),
        url: href(state, item.link) ?? undefined,
        image: item.image?.url || resourceImage(state, item.link),
        key: item.id,
      }));
  }
  const ring = css(
    `width:${size}px;height:${size}px`,
    node.ringColor && `border-color:${color(node.ringColor)}`,
    node.ringWidth !== undefined &&
      `border-width:${Math.max(0, Math.min(8, Number(node.ringWidth)))}px`,
    node.imageBackground && `background:${color(node.imageBackground)}`,
  );
  return `<div class="chm-stories"${nodeAttr(state, node)}>${items
    .map(
      (item) =>
        `${item.url ? `<a class="chm-story" href="${esc(item.url)}"` : '<div class="chm-story"'} style="width:${num(size) + 8}px"><span class="chm-story__ring" style="${esc(ring)}">${img(
          item.image,
          size * 2,
          "",
          "chm-story__img",
        )}</span><span class="chm-story__label"${styleAttr(textCss(node.labelStyle))}>${esc(item.title)}</span>${item.url ? "</a>" : "</div>"}`,
    )
    .join("")}</div>`;
}

function review(state: State, node: ReviewNode): string {
  const stars = node.stars ?? 0;
  return `<figure class="chm-review"${nodeAttr(state, node)}${styleAttr(boxCss(node.box))}><span class="chm-review__mark"${styleAttr(
    node.markColor && `color:${color(node.markColor)}`,
  )}>${ICONS.quote}</span><div class="chm-review__body"><blockquote class="chm-review__quote"${styleAttr(textCss(node.quoteStyle))}>${rich(
    t(state, node.id, "quote", node.quote),
  )}</blockquote>${
    stars
      ? `<span class="chm-review__stars" aria-label="${stars} / 5"${styleAttr(node.starColor && `color:${color(node.starColor)}`)}>${ICONS.star.repeat(stars)}</span>`
      : ""
  }<figcaption class="chm-review__author">${node.avatar?.url ? img(node.avatar.url, 80, "", "chm-review__avatar") : ""}<span>${esc(
    t(state, node.id, "author", node.author),
  )}</span></figcaption></div></figure>`;
}

function socialProof(state: State, node: SocialProofNode): string {
  const avatars = node.avatars.filter((avatar) => avatar.url);
  const verified = node.verified
    ? `<span class="chm-proof__verified">${ICONS.verified}</span>`
    : "";
  // With avatars the badge overlaps their corner; on its own it sits inline, centered with the text.
  return `<div class="chm-proof"${nodeAttr(state, node)}${styleAttr(boxCss(node.box))}>${
    avatars.length
      ? `<span class="chm-proof__avatars">${avatars.map((avatar) => img(avatar.url, 80, "", "chm-proof__avatar")).join("")}${verified}</span>`
      : verified.replace(
          "chm-proof__verified",
          "chm-proof__verified chm-proof__verified--inline",
        )
  }<span class="chm-proof__text"${styleAttr(textCss(node.style))}>${rich(t(state, node.id, "text", node.text))}</span></div>`;
}

function accountBar(state: State, node: AccountBarNode): string {
  const loggedIn = state.ctx.customerLoggedIn;
  const label = loggedIn
    ? t(state, node.id, "accountLabel", node.accountLabel)
    : t(state, node.id, "loginLabel", node.loginLabel);
  const url = loggedIn
    ? state.ctx.routes.account
    : state.ctx.routes.account_login;
  const socials = node.socials.filter(
    (social) => social.url || state.ctx.editor,
  );
  return `<div class="chm-account"${nodeAttr(state, node)}${styleAttr(boxCss(node.box))}>${
    node.showAccount !== false
      ? `<a class="chm-account__link" href="${esc(url)}"${styleAttr(textCss(node.style))}>${icon("user")}<span>${esc(label)}</span></a>`
      : "<span></span>"
  }<span class="chm-account__socials"${styleAttr(node.iconColor && `color:${color(node.iconColor)}`)}>${socials
    .map(
      (social) =>
        `<a href="${esc(safeUrl(social.url) ?? "#")}" target="_blank" rel="noopener" aria-label="${SOCIAL_LABELS[social.network]}">${socialIcon(social.network)}</a>`,
    )
    .join("")}</span></div>`;
}

function localizationSelects(
  state: State,
  showCountry: boolean,
  showLanguage: boolean,
  compact: boolean,
): string {
  const loc = state.ctx.localization;
  if (!loc) return "";
  const select = (
    name: string,
    current: string | undefined,
    options: { code: string; name: string }[],
    label: string,
  ) =>
    options.length > 1
      ? `<label class="chm-select"><span class="chm-visually-hidden">${esc(label)}</span><select name="${name}" data-chm-autosubmit>${options
          .map(
            (option) =>
              `<option value="${esc(option.code)}"${option.code === current ? " selected" : ""}>${esc(compact ? option.code.toUpperCase() : option.name)}</option>`,
          )
          .join("")}</select>${ICONS.chevronDown}</label>`
      : "";
  const fields = `${showCountry ? select("country_code", loc.country, loc.countries, t(state, "ui", "country", UI_TEXT_DEFAULTS.country)) : ""}${
    showLanguage
      ? select(
          "language_code",
          loc.language,
          loc.languages,
          t(state, "ui", "language", UI_TEXT_DEFAULTS.language),
        )
      : ""
  }`;
  if (!fields) return "";
  return `<form class="chm-loc-form" method="post" action="${esc(loc.action)}"><input type="hidden" name="form_type" value="localization"><input type="hidden" name="utf8" value="✓"><input type="hidden" name="_method" value="put"><input type="hidden" name="return_to" value="${esc(
    loc.returnTo,
  )}">${fields}</form>`;
}

function localization(state: State, node: LocalizationNode): string {
  return `<div class="chm-loc"${nodeAttr(state, node)}${styleAttr(boxCss(node.box), textCss(node.style))}>${localizationSelects(
    state,
    node.showCountry !== false,
    node.showLanguage !== false,
    false,
  )}</div>`;
}

function imageNode(state: State, node: ImageNode): string {
  const [open, close] = tappable(
    state,
    node,
    node.link,
    "chm-image",
    css(
      node.ratio ? `aspect-ratio:${1 / node.ratio}` : "",
      node.radius !== undefined && `border-radius:${node.radius}px`,
      node.fit === "contain" && "--chm-fit:contain",
      node.focus && node.focus !== "center" && `--chm-focus:${node.focus}`,
    ),
  );
  return `${open}${img(node.image?.url, 750, node.image?.alt ?? "", "chm-image__img")}${close}`;
}

function tabs(state: State, node: TabsNode): string {
  const style = node.style ?? {};
  const free = isFreeTabs(node);
  const look = tabsLook(node);
  const vars = css(
    style.activeBackground &&
      `--chm-tab-active-bg:${color(style.activeBackground)}`,
    style.activeColor && `--chm-tab-active-fg:${color(style.activeColor)}`,
    style.inactiveBackground &&
      `--chm-tab-bg:${color(style.inactiveBackground)}`,
    style.inactiveColor && `--chm-tab-fg:${color(style.inactiveColor)}`,
  );
  const activeId =
    node.tabs.find((tab) => tab.id === state.ctx.activeTabs?.[node.id])?.id ??
    node.tabs[0]?.id;
  const side = node.placement === "side";
  const listCss = css(
    free &&
      !side &&
      `height:${Math.max(20, Number(node.barHeight) || TAB_BAR_HEIGHT)}px`,
    side &&
      `width:${Math.max(56, Math.min(200, Number(node.railWidth) || TAB_RAIL_WIDTH))}px`,
    side &&
      free &&
      `--chm-side-tab-h:${Math.max(28, Number(node.barHeight) || SIDE_TAB_HEIGHT)}px`,
    look === "track" &&
      style.track &&
      `background:${color(style.track)};padding:4px;gap:4px;border-radius:${side ? 16 : 999}px`,
    !side &&
      style.inset !== undefined &&
      `margin-inline:${Math.max(0, Math.min(60, Number(style.inset)))}px`,
  );
  return `<div class="chm-tabs${free ? " chm-tabs--free" : ""}${side ? " chm-tabs--side" : ""}${look === "underline" ? " chm-tabs--underline" : ""}"${nodeAttr(state, node)}${styleAttr(vars)}><div class="chm-tabs__list" role="tablist"${styleAttr(listCss)}>${node.tabs
    .map(
      (tab) =>
        `<button type="button" role="tab" class="chm-tab" data-chm-tab="${esc(tab.id)}" aria-selected="${tab.id === activeId}"${styleAttr(textCss(style.text))}>${esc(
          t(state, tab.id, "label", tab.label),
        )}</button>`,
    )
    .join("")}</div>${node.tabs
    .map(
      (tab) =>
        `<div class="chm-tabpanel" role="tabpanel" data-chm-tabpanel="${esc(tab.id)}"${tab.id === activeId ? "" : " hidden"}>${renderNode(state, tab.child)}</div>`,
    )
    .join("")}</div>`;
}

function container(state: State, node: ContainerNode): string {
  const vars = css(
    node.gap !== undefined && `gap:${node.gap}px`,
    node.layout === "grid" &&
      `grid-template-columns:repeat(${node.columns ?? 2},minmax(0,1fr))`,
    node.layout === "scroll" &&
      node.itemWidth &&
      `--chm-item-width:${node.itemWidth}px`,
    boxCss(node.box),
  );
  return `<div class="chm-c chm-c--${token(node.layout)}"${nodeAttr(state, node)}${styleAttr(vars)}>${node.children
    .map((child) => renderNode(state, child))
    .join("")}</div>`;
}

const HEADER_ICON_SVG: Record<HeaderIcon, string> = {
  search: icon("search"),
  account: icon("user"),
  cart: icon("bag"),
};

function headerIcon(
  state: State,
  name: HeaderIcon,
  hasSearchField: boolean,
): string {
  const { routes } = state.ctx;
  const href =
    name === "search"
      ? routes.search
      : name === "cart"
        ? routes.cart
        : state.ctx.customerLoggedIn
          ? routes.account
          : routes.account_login;
  // With a search field in the header, the search button jumps to it.
  const jump =
    name === "search" && hasSearchField ? " data-chm-search-field" : "";
  return `<a class="chm-header__icon" href="${esc(href)}"${jump} aria-label="${esc(t(state, "ui", name, UI_TEXT_DEFAULTS[name]))}">${HEADER_ICON_SVG[name]}</a>`;
}

function renderHeader(state: State, node: HeaderNode): string {
  const logo = node.logo?.url || state.ctx.logo?.url;
  const brand = node.hideBrand
    ? ""
    : logo
      ? `<a class="chm-header__brand" href="${esc(state.ctx.routes.root)}">${img(
          logo,
          (node.logoWidth ?? 96) * 2,
          state.ctx.shopName,
          "chm-header__logo",
        ).replace(
          "<img ",
          `<img style="width:${num(node.logoWidth, 96)}px" `,
        )}</a>`
      : `<a class="chm-header__brand chm-header__name" href="${esc(state.ctx.routes.root)}">${esc(state.ctx.shopName)}</a>`;
  const language = node.showLanguage
    ? localizationSelects(state, false, true, true)
    : "";
  const close = `<button type="button" class="chm-close chm-close--${token(node.close ?? "plain")}" data-chm-close aria-label="${esc(t(state, "ui", "close", UI_TEXT_DEFAULTS.close))}">${ICONS.close}</button>`;
  // The buttons that are on, in the merchant's order.
  const shown = headerButtonOrder(node).filter((button) =>
    button === "language"
      ? Boolean(language)
      : (node.icons ?? []).includes(button),
  );
  // Live search with only a search button keeps a folded field to open.
  const field = Boolean(node.searchBar) || liveSearchOn(node);
  const buttons = (list: HeaderButton[]) =>
    list
      .map((button) =>
        button === "language" ? language : headerIcon(state, button, field),
      )
      .join("");

  // Centered: the cart stays by the close button, the other buttons go left.
  const row =
    node.logoAlign === "center" && brand
      ? `<div class="chm-header chm-header--center"><span class="chm-header__side">${buttons(
          shown.filter((button) => button !== "cart"),
        )}</span>${brand}<span class="chm-header__side chm-header__side--end">${buttons(
          shown.filter((button) => button === "cart"),
        )}${close}</span></div>`
      : `<div class="chm-header">${brand}<span class="chm-header__side chm-header__side--end">${buttons(shown)}${close}</span></div>`;

  const announcementText = node.announcement?.trim()
    ? t(state, node.id, "announcement", node.announcement)
    : "";
  const announceColors = styleAttr(
    node.announcementBackground &&
      `background:${color(node.announcementBackground)}`,
    node.announcementColor && `color:${color(node.announcementColor)}`,
  );
  // A scrolling announcement is the ticker, in the announcement's colors.
  const announcement = !announcementText
    ? ""
    : node.announcementMode === "ticker"
      ? `<div class="chm-header__announce chm-header__announce--ticker"${announceColors}>${ticker(
          // Part of the header: no id of its own (a click selects the header).
          withoutEditor(state),
          {
            id: `${node.id}-announce`,
            type: "ticker",
            items: [
              // Already translated: no text is stored under this id.
              { id: `${node.id}-announce-0`, text: announcementText },
              ...(node.announcementItems ?? []),
            ],
            speed: node.announcementSpeed ?? 40,
            separator: "✦",
            style: { size: 12, weight: 600 },
          },
        )}</div>`
      : `<p class="chm-header__announce"${announceColors}>${esc(announcementText)}</p>`;
  const iconColor = node.iconColor ? `color:${color(node.iconColor)}` : "";
  return `<div class="chm-head"${nodeAttr(state, node)}>${announcement}<div class="chm-head__body"${styleAttr(boxCss(node.box), iconColor)}>${row}${
    field ? searchField(state, node) : ""
  }</div></div>`;
}

function renderNode(state: State, node: Node): string {
  if (node.hidden && !state.ctx.editor) return "";
  if (
    LINK_ITEMS.has(node.type) &&
    "link" in node &&
    isGone(state, node.link as LinkRef)
  )
    return "";
  const html = renderVisible(state, node);
  return node.hidden ? html.replace(/^<(\w+)/, "<$1 data-chm-hidden") : html;
}

/**
 * Free canvas: a CANVAS_WIDTH-wide stage with absolutely placed children. The
 * outer box keeps the canvas's aspect ratio (no layout shift); behavior.ts
 * scales the stage to the phone's real width.
 */
function canvas(state: State, node: CanvasNode): string {
  const base = Math.max(40, Math.round(node.height));
  const { html, extra } = placed(state, node.children);
  const height = base + extra;
  return `<div class="chm-canvas"${nodeAttr(state, node)} data-chm-canvas style="aspect-ratio:${CANVAS_WIDTH}/${height}${
    node.background ? `;background:${color(node.background)}` : ""
  }"><div class="chm-canvas__stage" data-chm-h="${base}" style="width:${CANVAS_WIDTH}px;height:${height}px">${html}</div></div>`;
}

const FLEX = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
} as const;
const TEXT_ALIGN = { start: "left", center: "center", end: "right" } as const;

/**
 * The layer's own box (fill, radius, border, padding) and where its content
 * sits in it. Aligned content keeps its natural size instead of filling the
 * box (texts keep the full width so their lines align).
 */
function layerCss(node: Node): string {
  const layer = node.layer;
  if (!layer) return "";
  const parts = [boxCss(layer)];
  if (layer.alignY && FLEX[layer.alignY])
    parts.push(`align-items:${FLEX[layer.alignY]}`);
  if (layer.alignX && FLEX[layer.alignX]) {
    parts.push(
      `justify-content:${FLEX[layer.alignX]}`,
      `text-align:${TEXT_ALIGN[layer.alignX]}`,
    );
  }
  const value = css(...parts);
  return value ? `;${value}` : "";
}

function layerClasses(node: Node): string {
  const layer = node.layer;
  if (!layer) return "";
  const text = node.type === "text" || node.type === "heading";
  return `${layer.alignY ? " chm-fit-y" : ""}${layer.alignX && !text ? " chm-fit-x" : ""}`;
}

const SHADOWS = {
  soft: "drop-shadow(0 2px 6px rgba(0,0,0,.12))",
  medium: "drop-shadow(0 6px 16px rgba(0,0,0,.18))",
  strong: "drop-shadow(0 12px 32px rgba(0,0,0,.28))",
} as const;

const BLENDS = new Set(["multiply", "screen", "overlay", "darken", "lighten"]);

/**
 * Opacity, rotation, shadow, blur, glass and blend of a canvas layer, applied
 * to its placement box. Every value is a number or a known keyword; colors go
 * through `color()`, so nothing else can reach the style attribute.
 */
function effectsCss(node: Node): string {
  const effects = node.effects;
  if (!effects) return "";
  const transforms = [
    effects.rotate ? `rotate(${clamp(effects.rotate, -360, 360)}deg)` : "",
    effects.flipX ? "scaleX(-1)" : "",
  ].filter(Boolean);
  const shadow =
    effects.shadow === "custom"
      ? `drop-shadow(${clamp(effects.shadowX, -100, 100)}px ${clamp(effects.shadowY, -100, 100)}px ${clamp(effects.shadowBlur, 0, 100)}px ${color(effects.shadowColor) || "rgba(0,0,0,.25)"})`
      : effects.shadow
        ? (SHADOWS[effects.shadow] ?? "")
        : "";
  const filters = [
    shadow,
    effects.blur ? `blur(${clamp(effects.blur, 0, 40)}px)` : "",
  ].filter(Boolean);
  // Glass needs the layer's rounded corners on the box that blurs.
  const radius =
    "radius" in node && typeof node.radius === "number" ? node.radius : 0;
  return [
    effects.opacity !== undefined && effects.opacity < 1
      ? `;opacity:${clamp(effects.opacity, 0, 1)}`
      : "",
    transforms.length ? `;transform:${transforms.join(" ")}` : "",
    filters.length ? `;filter:${filters.join(" ")}` : "",
    effects.backdropBlur
      ? `;backdrop-filter:blur(${clamp(effects.backdropBlur, 0, 40)}px);-webkit-backdrop-filter:blur(${clamp(effects.backdropBlur, 0, 40)}px)${radius ? `;border-radius:${clamp(radius, 0, 999)}px` : ""}`
      : "",
    effects.blend && BLENDS.has(effects.blend)
      ? `;mix-blend-mode:${token(effects.blend)}`
      : "",
  ].join("");
}

/** Collapsible frames start in their default state; the editor can show some open. */
const isOpen = (state: State) => (node: Node) =>
  node.type === "shape" &&
  Boolean(node.collapsible?.open || state.ctx.expanded?.includes(node.id));

/**
 * Children of a canvas or shape, absolutely placed by their `frame`. With
 * collapsible frames among them, every item carries its design position so
 * behavior.ts can move the layers below when one opens.
 */
function placed(
  state: State,
  children: Node[],
): { html: string; extra: number } {
  const open = isOpen(state);
  const { frames, extra } = canvasLayout(children, open);
  const flowing = children.some(
    (child) => child.type === "shape" && child.collapsible,
  );
  const html = children
    .map((child) => {
      const frame = frames.get(child.id) ??
        child.frame ?? { x: 0, y: 0, w: CANVAS_WIDTH, h: 48 };
      let attrs = "";
      if (flowing && child.frame) {
        attrs = ` data-chm-y="${num(child.frame.y)}"`;
        if (child.type === "shape" && child.collapsible) {
          const closed = Math.min(
            num(child.collapsible.height),
            num(child.frame.h),
          );
          attrs += ` data-chm-collapse="${closed}" data-chm-full="${num(child.frame.h)}"${child.collapsible.open ? " data-chm-default-open" : ""}${open(child) ? " data-chm-open" : ""}`;
        }
      }
      return `<div class="chm-canvas__item${layerClasses(child)}"${attrs} style="${esc(`left:${num(frame.x)}px;top:${num(frame.y)}px;width:${num(frame.w)}px;height:${num(frame.h)}px${effectsCss(child)}${layerCss(child)}`)}">${renderNode(state, child)}</div>`;
    })
    .join("");
  return { html, extra };
}

/** Lines between the items of a smart list that asks for them (in the gap). */
function listLines(node: ShapeNode): string {
  const line = node.list?.divider && color(node.list.divider);
  const items = node.children ?? [];
  if (!line || items.length < 2) return "";
  const column = node.list!.direction !== "row";
  return items
    .slice(0, -1)
    .map((item, index) => {
      const a = item.frame;
      const b = items[index + 1].frame;
      if (!a || !b) return "";
      const style = column
        ? `left:${a.x}px;top:${(a.y + a.h + b.y) / 2 - 0.5}px;width:${a.w}px;height:1px`
        : `top:${a.y}px;left:${(a.x + a.w + b.x) / 2 - 0.5}px;height:${a.h}px;width:1px`;
      return `<span class="chm-list-line" style="${esc(`${style};background:${line}`)}"></span>`;
    })
    .join("");
}

function shape(state: State, node: ShapeNode): string {
  const iconHtml = node.icon
    ? `<span class="chm-shape__icon chm-shape__icon--${token(node.icon)}"${styleAttr(node.iconColor && `color:${color(node.iconColor)}`)}>${shapeIcon(node.icon)}</span>`
    : "";
  const children = node.children?.length ? node.children : null;
  const fill = css(
    node.fill && `background-color:${color(node.fill)}`,
    node.fillGradient
      ? `background-image:linear-gradient(${Number(node.fillGradient.angle) || 0}deg,${color(node.fillGradient.from) || "transparent"},${color(node.fillGradient.to) || "transparent"})`
      : node.gradient && `background-image:${color(node.gradient)}`,
    node.radius !== undefined && `border-radius:${node.radius}px`,
    node.borderWidth &&
      `border:${node.borderWidth}px ${node.borderStyle === "dashed" || node.borderStyle === "dotted" ? node.borderStyle : "solid"} ${color(node.borderColor) || "currentColor"}`,
    node.opacity !== undefined &&
      node.opacity < 1 &&
      `opacity:${Math.max(0, node.opacity)}`,
  );
  if (!children) {
    const [open, close] = tappable(state, node, node.link, "chm-shape", fill);
    return `${open}${iconHtml}${close}`;
  }
  // With layers inside, the link is a full-size hit area behind them, so
  // links in the layers stay separate (links can't be nested).
  const hit =
    node.link.type === "none"
      ? ""
      : tappable(withoutEditor(state), node, node.link, "chm-shape__hit").join(
          "",
        );
  // A frame that opens a sub-menu shows an arrow, unless it has one of its own.
  const more =
    node.link.type === "screen" && !hasArrowLayer(children)
      ? `<span class="chm-shape__more${(node.frame?.h ?? 0) > 72 ? " chm-shape__more--corner" : ""}">${ICONS.chevron}</span>`
      : "";
  const overflow =
    node.scroll === "x"
      ? " chm-shape--scroll"
      : node.clip
        ? " chm-shape--clip"
        : "";
  return `<div class="chm-shape chm-shape--frame${overflow}"${nodeAttr(state, node)}${styleAttr(fill)}>${hit}${iconHtml}${listLines(node)}${
    placed(state, children).html
  }${more}</div>`;
}

const ARROW_ICONS = new Set(["chevron", "arrow"]);

/** Whether a frame's own layers already draw an arrow (no automatic one then). */
function hasArrowLayer(children: Node[]): boolean {
  return children.some(
    (child) =>
      child.type === "shape" &&
      ((child.icon && ARROW_ICONS.has(child.icon)) ||
        hasArrowLayer(child.children ?? [])),
  );
}

function renderVisible(state: State, node: Node): string {
  switch (node.type) {
    case "container":
      return container(state, node);
    case "canvas":
      return canvas(state, node);
    case "shape":
      return shape(state, node);
    case "tabs":
      return tabs(state, node);
    case "header":
      return renderHeader(state, node);
    case "heading":
      return `<h2 class="chm-heading"${nodeAttr(state, node)}${styleAttr(textCss(node.style))}>${esc(t(state, node.id, "text", node.text))}</h2>`;
    case "text":
      return `<p class="chm-text"${nodeAttr(state, node)}${styleAttr(textCss(node.style))}>${rich(t(state, node.id, "text", node.text))}</p>`;
    case "card":
      return card(state, node);
    case "row":
      return row(state, node);
    case "accordion":
      return accordion(state, node);
    case "banner":
      return banner(state, node);
    case "countdown":
      return countdown(state, node);
    case "pill":
      return pill(state, node);
    case "chip":
      return chip(state, node);
    case "button":
      return button(state, node);
    case "stories":
      return stories(state, node);
    case "review":
      return review(state, node);
    case "social-proof":
      return socialProof(state, node);
    case "account-bar":
      return accountBar(state, node);
    case "localization":
      return localization(state, node);
    case "image":
      return imageNode(state, node);
    case "divider":
      return `<hr class="chm-divider"${nodeAttr(state, node)}${styleAttr(
        node.color && `border-color:${color(node.color)}`,
        node.thickness && `border-top-width:${node.thickness}px`,
      )}>`;
    case "spacer":
      return `<div class="chm-spacer"${nodeAttr(state, node)} style="height:${Number(node.height) || 0}px"></div>`;
    case "products":
      return products(state, node);
    case "perks":
      return perks(state, node);
    case "contact":
      return contact(state, node);
    case "discount":
      return discount(state, node);
    case "ticker":
      return ticker(state, node);
  }
}

function createState(design: Design, ctx: RenderContext): State {
  return { design, ctx, texts: resolveTexts(design.translations, ctx.locale) };
}

/**
 * The same state as the storefront sees it: for parts rendered inside another
 * node, which the editor selects as a whole.
 */
function withoutEditor(state: State): State {
  return { ...state, ctx: { ...state.ctx, editor: false } };
}

function tokenVars(design: Design): string {
  const { tokens } = design;
  return css(
    `--chm-text:${color(tokens.text)}`,
    `--chm-muted:${color(tokens.mutedText)}`,
    `--chm-bg:${color(tokens.background)}`,
    `--chm-canvas:${color(tokens.canvas)}`,
    `--chm-accent:${color(tokens.accent)}`,
    `--chm-accent-fg:${color(tokens.accentText)}`,
    `--chm-radius:${tokens.radius}px`,
    `--chm-overlay:${color(design.behavior.overlayColor)}`,
    typeof design.behavior.width === "number" &&
      `--chm-width:${design.behavior.width}px`,
    tokens.fontFamily !== "theme" && `font-family:${esc(tokens.fontFamily)}`,
  );
}

/** For each sub-menu, the screen whose item opens it (first one, in menu order). */
function parentScreens(design: Design): Map<string, Screen> {
  const parents = new Map<string, Screen>();
  const note = (screen: Screen, link: LinkRef | undefined) => {
    if (
      link?.type === "screen" &&
      link.screenId !== screen.id &&
      !parents.has(link.screenId)
    )
      parents.set(link.screenId, screen);
  };
  for (const screen of design.screens) {
    const visit = (node: Node) => {
      if ("link" in node) note(screen, node.link as LinkRef);
      if (node.type === "stories")
        node.items.forEach((item) => note(screen, item.link));
      childNodes(node).forEach(visit);
    };
    visit(screen.root);
  }
  return parents;
}

/**
 * The way back from a sub-menu, in the style the merchant picked for this
 * sub-menu or for the whole menu. The whole bar is the back button.
 */
function backBar(
  state: State,
  screen: Screen,
  parents: Map<string, Screen>,
): string {
  const bar: BackBar = screen.back ?? state.design.back ?? { style: "title" };
  if (bar.style === "hidden") return "";
  const title = esc(t(state, screen.id, "title", screen.title));
  // The merchant's own back text, else the built-in word (translated).
  // A sub-menu's own back text has its own key; the shared one is "back.label".
  const label = esc(
    screen.back?.label
      ? t(state, screen.id, "back", screen.back.label)
      : bar.label
        ? t(state, "back", "label", bar.label)
        : t(state, "ui", "back", UI_TEXT_DEFAULTS.back),
  );
  const parent = parents.get(screen.id);
  const parentTitle =
    !parent || parent.id === state.design.screens[0]?.id
      ? esc(t(state, "ui", "menu", UI_TEXT_DEFAULTS.menu))
      : esc(t(state, parent.id, "title", parent.title));
  const colors = css(
    bar.color && `color:${color(bar.color)}`,
    bar.background && `background:${color(bar.background)}`,
  );
  const button = (content: string, extra = "") =>
    `<button type="button" class="chm-back chm-back--${token(bar.style)}${extra}" data-chm-back${styleAttr(colors)}>${content}</button>`;
  switch (bar.style) {
    case "link":
      return button(`${ICONS.arrowBack}<span>${label}</span>`);
    case "pill":
      return button(`${ICONS.back}<span>${label}</span>`);
    case "centered":
      return button(
        `${ICONS.back}<span>${title}</span><i aria-hidden="true"></i>`,
      );
    case "parent":
      return button(`${ICONS.back}<span>${parentTitle}</span>`);
    case "large":
      return `<div class="chm-back-large"${styleAttr(bar.background && `background:${color(bar.background)}`)}>${button(
        `${ICONS.back}<span>${label}</span>`,
      )}<h2 class="chm-back-large__title"${styleAttr(bar.color && `color:${color(bar.color)}`)}>${title}</h2></div>`;
    default:
      return button(`${ICONS.back}<span>${title}</span>`);
  }
}

/**
 * Only a sub-menu's back bar, for the editor (the canvas editor shows it
 * above the sub-menu's canvas; the style picker shows each style).
 */
export function renderBackBar(
  design: Design,
  screenId: string,
  ctx: RenderContext,
  override?: BackBar,
): string {
  const state = createState(design, ctx);
  const screen = design.screens.find((candidate) => candidate.id === screenId);
  if (!screen) return "";
  const shown = override ? { ...screen, back: override } : screen;
  return `<div class="chm-root chm-editor chm-fragment chm-back-preview" style="${esc(tokenVars(design))}">${backBar(
    state,
    shown,
    parentScreens(design),
  )}</div>`;
}

/**
 * Just the given nodes (no drawer, header or footer), styled with the
 * design's tokens. Used for widget previews in the editor's section library.
 */
export function renderFragment(
  design: Design,
  nodes: Node[],
  ctx: RenderContext,
): string {
  const state = createState(design, ctx);
  return `<div class="chm-root chm-editor chm-fragment" style="${esc(tokenVars(design))}">${nodes.map((node) => renderNode(state, node)).join("")}</div>`;
}

interface RenderOptions {
  /** Screen to show first (editor). Defaults to the main screen. */
  screenId?: string;
}

/** Full drawer markup: overlay, panel with header, every screen and the footer. */
export function renderMenu(
  design: Design,
  ctx: RenderContext,
  options: RenderOptions = {},
): string {
  const state = createState(design, ctx);
  const activeScreen =
    options.screenId &&
    design.screens.some((screen) => screen.id === options.screenId)
      ? options.screenId
      : design.screens[0]?.id;

  const parents = parentScreens(design);
  const screens = design.screens
    .map((screen, index) => {
      const back = index === 0 ? "" : backBar(state, screen, parents);
      const active = screen.id === activeScreen;
      return `<section class="chm-screen${active ? " is-active" : ""}" data-chm-screen-id="${esc(screen.id)}"${active ? "" : ' aria-hidden="true"'}>${back}${renderNode(
        state,
        screen.root,
      )}</section>`;
    })
    .join("");

  return `<div${isRtlLocale(ctx.locale) ? ' dir="rtl"' : ""} class="chm-root chm-side-${token(design.behavior.side)}${design.behavior.width === "full" ? " chm-full" : ""}${ctx.editor ? " chm-editor" : ""}${ctx.editor && ctx.searchSample && liveSearchOn(design.header) ? " chm-searching" : ""}" style="${esc(
    tokenVars(design),
  )}"><div class="chm-overlay" data-chm-close></div><div class="chm-panel" role="dialog" aria-modal="true" aria-label="${esc(t(state, "ui", "menu", UI_TEXT_DEFAULTS.menu))}" tabindex="-1">${renderHeader(
    state,
    design.header,
  )}<div class="chm-body">${searchPanel(state, design.header)}<div class="chm-screens">${screens}</div>${design.footer ? `<div class="chm-footer">${renderNode(state, design.footer)}</div>` : ""}</div></div></div>`;
}
