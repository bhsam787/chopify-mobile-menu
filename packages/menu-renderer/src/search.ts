/**
 * Live search inside the menu: the search field, the panel that covers the
 * menu while the shopper types, and the results markup. The results are
 * built in the browser (behavior.ts) and in the editor's previews from the
 * same functions, so both always look alike.
 */
import type {
  HeaderNode,
  LiveSearch,
  LiveSearchLayout,
  UiTextKey,
} from "@chopi/menu-core";
import { UI_TEXT_DEFAULTS } from "@chopi/menu-core";
import { color, esc, img, styleAttr, token } from "./html";
import { ICONS, icon } from "./icons";
import { nodeAttr, t, type State } from "./state";

export interface SearchLink {
  title: string;
  url?: string;
  /** A sub-menu of this menu it opens. */
  screen?: string;
  image?: string;
}

export interface SearchProduct {
  title: string;
  url: string;
  image?: string;
  price?: string;
  compareAtPrice?: string;
  soldOut?: boolean;
}

export interface SearchResults {
  links: SearchLink[];
  suggestions: string[];
  collections: { title: string; url: string; image?: string }[];
  products: SearchProduct[];
}

/** Built-in words the results use, in the shopper's language. */
export type SearchWords = Record<
  | "recent"
  | "clear"
  | "popular"
  | "inMenu"
  | "suggestions"
  | "collections"
  | "products"
  | "seeAll"
  | "noResults"
  | "soldOut",
  string
>;

const WORD_KEYS: (keyof SearchWords)[] = [
  "recent",
  "clear",
  "popular",
  "inMenu",
  "suggestions",
  "collections",
  "products",
  "seeAll",
  "noResults",
  "soldOut",
];

function searchWords(state: State): SearchWords {
  return Object.fromEntries(
    WORD_KEYS.map((key) => [
      key,
      t(state, "ui", key, UI_TEXT_DEFAULTS[key as UiTextKey]),
    ]),
  ) as SearchWords;
}

/** CSS variables for the search's own colors and sizes (only those set). */
function searchVars(live: LiveSearch | undefined, part: "field" | "panel") {
  const d = live?.design ?? {};
  const px = (value: number | undefined, min: number, max: number) =>
    value === undefined || !Number.isFinite(Number(value))
      ? undefined
      : `${Math.max(min, Math.min(max, Number(value)))}px`;
  const vars: [string, string | undefined][] =
    part === "field"
      ? [
          ["--chm-sf-bg", d.fieldBackground && color(d.fieldBackground)],
          ["--chm-sf-text", d.fieldText && color(d.fieldText)],
          ["--chm-sf-border", d.fieldBorder && color(d.fieldBorder)],
          ["--chm-sf-radius", px(d.fieldRadius, 0, 999)],
          ["--chm-sf-height", px(d.fieldHeight, 34, 60)],
        ]
      : [
          ["--chm-sr-bg", d.panelBackground && color(d.panelBackground)],
          ["--chm-sr-text", d.panelText && color(d.panelText)],
          ["--chm-sr-heading", d.headingColor && color(d.headingColor)],
          ["--chm-sr-img-radius", px(d.imageRadius, 0, 40)],
          [
            "--chm-sr-ratio",
            d.imageRatio && Number.isFinite(Number(d.imageRatio))
              ? `1 / ${Math.max(0.6, Math.min(1.6, Number(d.imageRatio)))}`
              : undefined,
          ],
          ["--chm-sr-price", d.priceColor && color(d.priceColor)],
          ["--chm-sr-sale", d.saleColor && color(d.saleColor)],
          ["--chm-sr-chip-bg", d.chipBackground && color(d.chipBackground)],
          ["--chm-sr-chip-text", d.chipText && color(d.chipText)],
          ["--chm-sr-btn-bg", d.buttonBackground && color(d.buttonBackground)],
          ["--chm-sr-btn-text", d.buttonText && color(d.buttonText)],
          ["--chm-sr-title", px(d.titleSize, 11, 20)],
        ];
  return vars
    .filter(([, value]) => value)
    .map(([name, value]) => `${name}:${value}`)
    .join(";");
}

/** Whether live search is on (it needs a search field or a search button). */
export function liveSearchOn(node: HeaderNode): boolean {
  return Boolean(
    node.liveSearch?.enabled &&
    (node.searchBar || (node.icons ?? []).includes("search")),
  );
}

const CLEAR_ICON =
  '<svg class="chm-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor" opacity=".18"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

/**
 * The search field. With live search it becomes a combobox that opens the
 * results panel; a header with only a search button keeps it folded away
 * until the button is tapped.
 */
export function searchField(state: State, node: HeaderNode): string {
  const live = liveSearchOn(node) ? node.liveSearch : undefined;
  const label = t(state, "ui", "search", UI_TEXT_DEFAULTS.search);
  const placeholder = node.searchPlaceholder?.trim()
    ? t(state, node.id, "searchPlaceholder", node.searchPlaceholder)
    : label;
  // In the editor it's a picture: typing or submitting would leave the admin.
  const inert = state.ctx.editor && !live ? ' tabindex="-1" readonly' : "";
  const folded = live && !node.searchBar ? " is-folded" : "";
  // The field's look is set with live search, but applies either way.
  const field = node.liveSearch?.field ?? "pill";
  const combobox = live
    ? ' role="combobox" aria-expanded="false" aria-controls="chm-sr" aria-autocomplete="list"'
    : "";
  return `<form class="chm-header__search chm-search--${field}${folded}" role="search" method="get" action="${esc(state.ctx.routes.search)}"${live ? " data-chm-live" : ""}${styleAttr(searchVars(node.liveSearch, "field"))}><span class="chm-search__box">${icon("search")}<input type="search" name="q" placeholder="${esc(placeholder)}" aria-label="${esc(label)}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"${combobox}${inert}>${
    live
      ? `<button type="button" class="chm-search__clear" data-chm-search-clear aria-label="${esc(t(state, "ui", "clear", UI_TEXT_DEFAULTS.clear))}" hidden>${CLEAR_ICON}</button>`
      : ""
  }</span>${
    live
      ? `<button type="button" class="chm-search__cancel" data-chm-search-cancel>${esc(t(state, "ui", "cancel", UI_TEXT_DEFAULTS.cancel))}</button>`
      : ""
  }<input type="hidden" name="options[prefix]" value="last"></form>`;
}

/**
 * The panel that covers the menu while searching: popular and recent
 * searches before typing, results after. Settings the browser needs travel
 * as data attributes.
 */
export function searchPanel(state: State, node: HeaderNode): string {
  const live = node.liveSearch;
  if (!live || !liveSearchOn(node)) return "";
  const words = searchWords(state);
  const popular = popularTerms(
    (live.popular ?? []).map((term) => t(state, term.id, "text", term.text)),
    live.topSearches === false ? [] : (state.ctx.topSearches ?? []),
    live.hiddenTerms ?? [],
  );
  const settings = {
    url: `${state.ctx.routes.search.replace(/\/$/, "")}/suggest.json`,
    searchUrl: state.ctx.routes.search,
    locale: state.ctx.locale,
    currency: state.ctx.currency ?? "",
    layout: live.layout,
    limit: Math.max(2, Math.min(8, Number(live.productLimit) || 6)),
    links: live.menuLinks !== false,
    suggestions: live.suggestions !== false,
    collections: live.collections !== false,
    recent: live.recent !== false,
    popular,
    words,
  };
  // The editor can show the panel open with sample results (its design).
  const sample = state.ctx.editor ? state.ctx.searchSample : undefined;
  const results = sample
    ? searchResultsHtml(sample, {
        // A believable search: the first word of the sample suggestion.
        query: sample.suggestions[0]?.split(" ")[0] ?? "",
        layout: live.layout,
        words,
        searchUrl: settings.searchUrl,
      })
    : "";
  return `<div class="chm-sr chm-sr--${token(live.layout)}${sample ? " has-query" : ""}" id="chm-sr" data-chm-search-panel="${esc(JSON.stringify(settings))}"${nodeAttr(state, node)}${styleAttr(
    live.accent && `--chm-sr-accent:${color(live.accent)}`,
    searchVars(live, "panel"),
  )}${sample ? "" : " hidden"}>${searchStart(words, popular, [], live.recent !== false)}<div class="chm-sr__results" aria-live="polite">${results}</div></div>`;
}

/** Popular searches shown at most. */
const POPULAR_MAX = 8;

/**
 * The merchant's own popular searches first, then the store's most searched
 * terms (minus hidden ones and duplicates), up to POPULAR_MAX.
 */
export function popularTerms(
  own: string[],
  top: string[],
  hidden: string[],
): string[] {
  const seen = new Set(hidden.map((term) => term.trim().toLowerCase()));
  const terms: string[] = [];
  for (const term of [...own, ...top]) {
    const clean = term.trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    terms.push(clean);
    if (terms.length >= POPULAR_MAX) break;
  }
  return terms;
}

/** Search terms as chips that search for them; recent ones get a clock. */
function termChips(terms: string[], recent = false): string {
  return `<div class="chm-sr__chips">${terms
    .map(
      (term) =>
        `<button type="button" class="chm-sr__chip${recent ? " chm-sr__chip--recent" : ""}" data-chm-sr-term="${esc(term)}">${recent ? ICONS.clock : ""}<span>${esc(term)}</span></button>`,
    )
    .join("")}</div>`;
}

/** What the panel shows before typing: recent and popular searches. */
export function searchStart(
  words: SearchWords,
  popular: string[],
  recent: string[],
  showRecent: boolean,
): string {
  const recentHtml =
    showRecent && recent.length
      ? `<section class="chm-sr__section"><header class="chm-sr__head"><h3>${esc(words.recent)}</h3><button type="button" class="chm-sr__clear" data-chm-sr-clear-recent>${esc(words.clear)}</button></header>${termChips(recent, true)}</section>`
      : "";
  const popularHtml = popular.length
    ? `<section class="chm-sr__section"><header class="chm-sr__head"><h3>${esc(words.popular)}</h3></header>${termChips(popular)}</section>`
    : "";
  return `<div class="chm-sr__start">${recentHtml}${popularHtml}</div>`;
}

/** The typed part stays plain; what a suggestion adds is bold (easier to scan). */
function completion(text: string, query: string): string {
  const lower = text.toLowerCase();
  const typed = query.trim().toLowerCase();
  if (typed && lower.startsWith(typed))
    return `${esc(text.slice(0, typed.length))}<strong>${esc(text.slice(typed.length))}</strong>`;
  return `<strong>${esc(text)}</strong>`;
}

function productsHtml(
  products: SearchProduct[],
  layout: LiveSearchLayout,
  words: SearchWords,
): string {
  return products
    .map((product) => {
      const price = product.price
        ? `<span class="chm-sr__price">${
            product.compareAtPrice
              ? `<span class="chm-sr__now">${esc(product.price)}</span> <s>${esc(product.compareAtPrice)}</s>`
              : esc(product.price)
          }</span>`
        : "";
      const badge = product.soldOut
        ? `<span class="chm-sr__badge">${esc(words.soldOut)}</span>`
        : "";
      return `<a class="chm-sr__product" href="${esc(product.url)}" data-chm-sr-pick><span class="chm-sr__media">${img(
        product.image,
        layout === "list" ? 128 : 320,
        "",
        "chm-sr__img",
      )}${layout === "list" ? "" : badge}</span><span class="chm-sr__info"><span class="chm-sr__title">${esc(product.title)}</span>${price}${layout === "list" ? badge : ""}</span></a>`;
    })
    .join("");
}

/** The results for `query`, grouped and labelled. */
export function searchResultsHtml(
  results: SearchResults,
  options: {
    query: string;
    layout: LiveSearchLayout;
    words: SearchWords;
    searchUrl: string;
    loading?: boolean;
    popular?: string[];
  },
): string {
  const { query, layout, words, loading } = options;
  const section = (title: string, body: string, extra = "") =>
    `<section class="chm-sr__section${extra}"><header class="chm-sr__head"><h3>${esc(title)}</h3></header>${body}</section>`;
  const parts: string[] = [];

  if (results.links.length)
    parts.push(
      section(
        words.inMenu,
        `<div class="chm-sr__rows">${results.links
          .map((link) => {
            const open = link.screen
              ? `<button type="button" class="chm-sr__row" data-chm-sr-screen="${esc(link.screen)}">`
              : `<a class="chm-sr__row" href="${esc(link.url ?? "#")}" data-chm-sr-pick>`;
            return `${open}${
              link.image
                ? img(link.image, 80, "", "chm-sr__thumb")
                : `<span class="chm-sr__thumb chm-sr__thumb--icon">${icon("tag")}</span>`
            }<span class="chm-sr__label">${esc(link.title)}</span>${ICONS.chevron}${link.screen ? "</button>" : "</a>"}`;
          })
          .join("")}</div>`,
      ),
    );

  if (results.suggestions.length)
    parts.push(
      section(
        words.suggestions,
        `<div class="chm-sr__rows">${results.suggestions
          .map(
            (text) =>
              `<button type="button" class="chm-sr__row chm-sr__row--query" data-chm-sr-term="${esc(text)}">${icon("search")}<span class="chm-sr__label">${completion(text, query)}</span></button>`,
          )
          .join("")}</div>`,
      ),
    );

  if (results.collections.length)
    parts.push(
      section(
        words.collections,
        `<div class="chm-sr__chips chm-sr__chips--scroll">${results.collections
          .map(
            (collection) =>
              `<a class="chm-sr__chip chm-sr__chip--collection" href="${esc(collection.url)}" data-chm-sr-pick>${collection.image ? img(collection.image, 64, "", "chm-sr__chip-img") : ""}<span>${esc(collection.title)}</span></a>`,
          )
          .join("")}</div>`,
      ),
    );

  if (results.products.length)
    parts.push(
      section(
        words.products,
        `<div class="chm-sr__products">${productsHtml(results.products, layout, words)}</div>`,
        " chm-sr__section--products",
      ),
    );
  else if (loading)
    parts.push(
      section(
        words.products,
        `<div class="chm-sr__products">${Array.from(
          { length: layout === "list" ? 3 : 4 },
          () =>
            '<span class="chm-sr__product is-loading"><span class="chm-sr__media"></span><span class="chm-sr__info"><span class="chm-sr__line"></span><span class="chm-sr__line chm-sr__line--short"></span></span></span>',
        ).join("")}</div>`,
        " chm-sr__section--products",
      ),
    );

  const all = `${options.searchUrl}?q=${encodeURIComponent(query)}&options%5Bprefix%5D=last`;
  if (!parts.length && !loading) {
    const popular = options.popular ?? [];
    return `<div class="chm-sr__empty"><p>${esc(words.noResults)} “${esc(query)}”</p>${
      popular.length ? termChips(popular) : ""
    }<a class="chm-sr__all" href="${esc(all)}" data-chm-sr-pick>${esc(words.seeAll)}${ICONS.arrow}</a></div>`;
  }
  return `${parts.join("")}<a class="chm-sr__all" href="${esc(all)}" data-chm-sr-pick><span>${esc(words.seeAll)} <span class="chm-sr__q">“${esc(query)}”</span></span>${ICONS.arrow}</a>`;
}
