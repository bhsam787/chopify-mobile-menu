/**
 * Live search in the browser. Focusing the search field opens the results
 * panel over the menu: recent and popular searches first, then, while the
 * shopper types, matching links of this menu (instantly) and Shopify's
 * predictive search results (after a short pause).
 */
import type { LiveSearchLayout } from "@chopi/menu-core";
import {
  searchResultsHtml,
  searchStart,
  type SearchLink,
  type SearchProduct,
  type SearchResults,
  type SearchWords,
} from "./search";

interface PanelSettings {
  url: string;
  searchUrl: string;
  locale: string;
  currency: string;
  layout: LiveSearchLayout;
  limit: number;
  links: boolean;
  suggestions: boolean;
  collections: boolean;
  recent: boolean;
  popular: string[];
  words: SearchWords;
}

/** Results from somewhere other than the store (the editor's preview). */
export type SearchSource = (
  query: string,
  limit: number,
) => Promise<Omit<SearchResults, "links">>;

const RECENT_KEY = "chopi-menu:recent-searches";
const RECENT_MAX = 6;
/** Pause after typing before asking Shopify (links of the menu show at once). */
const DEBOUNCE_MS = 220;

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

function readRecent(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(value)
      ? value.filter((item) => typeof item === "string").slice(0, RECENT_MAX)
      : [];
  } catch {
    return [];
  }
}

function writeRecent(terms: string[]) {
  try {
    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify(terms.slice(0, RECENT_MAX)),
    );
  } catch {
    // Private mode or storage turned off: recent searches just aren't kept.
  }
}

function money(amount: unknown, settings: PanelSettings): string | undefined {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  const currency =
    settings.currency ||
    (window as { Shopify?: { currency?: { active?: string } } }).Shopify
      ?.currency?.active;
  try {
    return currency
      ? new Intl.NumberFormat(settings.locale, {
          style: "currency",
          currency,
        }).format(value)
      : value.toFixed(2);
  } catch {
    return value.toFixed(2);
  }
}

interface ShopifyProduct {
  title: string;
  url: string;
  image?: string;
  price?: string;
  compare_at_price_max?: string;
  available?: boolean;
}

/** Shopify's predictive search for the store the menu runs on. */
function storeSource(settings: PanelSettings, signal: AbortSignal) {
  return async (query: string, limit: number) => {
    const types = ["product"];
    if (settings.collections) types.push("collection");
    if (settings.suggestions) types.push("query");
    const params = new URLSearchParams({
      q: query,
      "resources[type]": types.join(","),
      "resources[limit]": String(limit),
      "resources[limit_scope]": "each",
      "resources[options][unavailable_products]": "last",
    });
    const response = await fetch(`${settings.url}?${params}`, {
      signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Search failed (${response.status})`);
    const data = (await response.json()) as {
      resources?: {
        results?: {
          products?: ShopifyProduct[];
          collections?: {
            title: string;
            url: string;
            featured_image?: { url?: string };
          }[];
          queries?: { text: string }[];
        };
      };
    };
    const results = data.resources?.results ?? {};
    return {
      suggestions: (results.queries ?? [])
        .map((item) => item.text)
        .filter((text) => normalize(text) !== normalize(query))
        .slice(0, 4),
      collections: (results.collections ?? []).slice(0, 6).map((item) => ({
        title: item.title,
        url: item.url,
        image: item.featured_image?.url,
      })),
      products: (results.products ?? [])
        .slice(0, limit)
        .map((item): SearchProduct => {
          const price = money(item.price, settings);
          const was = money(item.compare_at_price_max, settings);
          return {
            title: item.title,
            url: item.url,
            image: item.image,
            price,
            compareAtPrice:
              was && Number(item.compare_at_price_max) > Number(item.price)
                ? was
                : undefined,
            soldOut: item.available === false,
          };
        }),
    };
  };
}

/** Links of this menu (any screen), as shoppers see them. */
function menuLinks(root: ParentNode): SearchLink[] {
  const seen = new Set<string>();
  const links: SearchLink[] = [];
  root
    .querySelectorAll<HTMLElement>(
      ".chm-screens a[href], .chm-screens [data-chm-screen]",
    )
    .forEach((element) => {
      const title = (
        element.querySelector('[class*="__title"], [class*="__label"]')
          ?.textContent ?? element.textContent
      )
        ?.replace(/\s+/g, " ")
        .trim();
      if (!title || title.length > 80) return;
      const url = element.getAttribute("href") ?? undefined;
      const screen = element.dataset.chmScreen;
      const key = `${normalize(title)}|${url ?? screen}`;
      if (seen.has(key)) return;
      seen.add(key);
      const image =
        element.querySelector("img")?.getAttribute("src") ?? undefined;
      links.push({ title, url, screen, image });
    });
  return links;
}

function matchLinks(links: SearchLink[], query: string): SearchLink[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return links
    .filter((link) =>
      words.every((word) => normalize(link.title).includes(word)),
    )
    .sort(
      (a, b) =>
        Number(normalize(b.title).startsWith(words[0])) -
        Number(normalize(a.title).startsWith(words[0])),
    )
    .slice(0, 4);
}

interface LiveSearchHandle {
  /** Leaves search (Escape, Cancel); false when it wasn't active. */
  exit(): boolean;
  destroy(): void;
}

interface Parts {
  panel: HTMLElement;
  form: HTMLFormElement;
  input: HTMLInputElement;
  menuRoot: HTMLElement;
  output: HTMLElement;
  settings: PanelSettings;
}

/**
 * Wires live search in `root` (a rendered menu) and returns how to leave it.
 * Everything is looked up when used, so the menu can be re-rendered (the
 * editor does on every change) without wiring it again. `onScreen` opens a
 * sub-menu picked from the results.
 */
export function attachLiveSearch(
  root: HTMLElement | ShadowRoot,
  options: {
    source?: SearchSource;
    onScreen: (screenId: string) => void;
    /** Admin preview: results are shown but links don't navigate. */
    sandbox?: boolean;
  },
): LiveSearchHandle {
  let links: SearchLink[] | null = null;
  let timer: number | undefined;
  let controller: AbortController | undefined;
  const cache = new Map<string, Omit<SearchResults, "links">>();
  let parsed: { raw: string; settings: PanelSettings } | null = null;

  const parts = (): Parts | null => {
    const panel = root.querySelector<HTMLElement>("[data-chm-search-panel]");
    const form = root.querySelector<HTMLFormElement>("form[data-chm-live]");
    const input = form?.querySelector<HTMLInputElement>("input[name='q']");
    const menuRoot = root.querySelector<HTMLElement>(".chm-root");
    const output = panel?.querySelector<HTMLElement>(".chm-sr__results");
    const raw = panel?.dataset.chmSearchPanel;
    if (!panel || !form || !input || !menuRoot || !output || !raw) return null;
    if (parsed?.raw !== raw) {
      try {
        parsed = { raw, settings: JSON.parse(raw) as PanelSettings };
        cache.clear();
      } catch {
        return null;
      }
    }
    return { panel, form, input, menuRoot, output, settings: parsed.settings };
  };

  const active = (p: Parts) => p.menuRoot.classList.contains("chm-searching");

  const renderStart = (p: Parts) => {
    const start = p.panel.querySelector<HTMLElement>(".chm-sr__start");
    if (!start) return;
    start.outerHTML = searchStart(
      p.settings.words,
      p.settings.popular,
      p.settings.recent ? readRecent() : [],
      p.settings.recent,
    );
  };

  const show = (
    p: Parts,
    results: SearchResults,
    query: string,
    loading: boolean,
  ) => {
    p.output.innerHTML = searchResultsHtml(results, {
      query,
      layout: p.settings.layout,
      words: p.settings.words,
      searchUrl: p.settings.searchUrl,
      loading,
      popular: p.settings.popular,
    });
  };

  const update = (p: Parts) => {
    const query = p.input.value.trim();
    const clear = p.form.querySelector<HTMLElement>("[data-chm-search-clear]");
    if (clear) clear.hidden = !p.input.value;
    p.panel.classList.toggle("has-query", Boolean(query));
    window.clearTimeout(timer);
    controller?.abort();
    if (!query) {
      p.output.innerHTML = "";
      return;
    }
    const { settings } = p;
    links ??= settings.links ? menuLinks(root) : [];
    const matched = settings.links ? matchLinks(links, query) : [];
    const cached = cache.get(normalize(query));
    if (cached) return show(p, { links: matched, ...cached }, query, false);

    const empty = { suggestions: [], collections: [], products: [] };
    if (query.length < 2)
      return show(p, { links: matched, ...empty }, query, false);
    // Menu links at once, store results after a short pause.
    show(p, { links: matched, ...empty }, query, true);
    timer = window.setTimeout(async () => {
      controller = new AbortController();
      const fetchResults =
        options.source ?? storeSource(settings, controller.signal);
      const current = () => parts()?.input.value.trim() === query;
      try {
        const found = await fetchResults(query, settings.limit);
        cache.set(normalize(query), found);
        const now = parts();
        if (now && current())
          show(now, { links: matched, ...found }, query, false);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        // The store's search isn't reachable: the menu's links and
        // "See all results" still work.
        const now = parts();
        if (now && current())
          show(now, { links: matched, ...empty }, query, false);
      }
    }, DEBOUNCE_MS);
  };

  const enter = (p: Parts) => {
    if (active(p)) return;
    p.menuRoot.classList.add("chm-searching");
    // A field opened from the search button folds away again on Cancel.
    p.form.dataset.chmFoldable ??= String(
      p.form.classList.contains("is-folded"),
    );
    p.form.classList.remove("is-folded");
    p.panel.hidden = false;
    p.input.setAttribute("aria-expanded", "true");
    links = null; // the menu may have changed since last time
    renderStart(p);
    update(p);
  };

  const exit = () => {
    const p = parts();
    if (!p || !active(p)) return false;
    p.menuRoot.classList.remove("chm-searching");
    p.panel.hidden = true;
    p.input.setAttribute("aria-expanded", "false");
    controller?.abort();
    window.clearTimeout(timer);
    // The query stays for when the shopper comes back.
    if (p.form.dataset.chmFoldable === "true")
      p.form.classList.add("is-folded");
    p.input.blur();
    return true;
  };

  const remember = (p: Parts, term: string) => {
    if (!p.settings.recent || !term.trim()) return;
    const clean = term.trim();
    writeRecent([
      clean,
      ...readRecent().filter((item) => normalize(item) !== normalize(clean)),
    ]);
  };

  const isField = (target: EventTarget | null, p: Parts) => target === p.input;

  const onFocusIn = (event: Event) => {
    const p = parts();
    if (p && isField(event.target, p)) enter(p);
  };
  const onInput = (event: Event) => {
    const p = parts();
    if (!p || !isField(event.target, p)) return;
    if (!active(p)) enter(p);
    else update(p);
  };
  const onSubmit = (event: Event) => {
    const p = parts();
    if (!p || event.target !== p.form) return;
    // The admin preview never leaves the page.
    if (options.sandbox) {
      event.preventDefault();
      return;
    }
    remember(p, p.input.value);
  };

  const onClick = (event: Event) => {
    const p = parts();
    if (!p) return;
    const target = event.target as HTMLElement;
    if (target.closest("[data-chm-search-cancel]")) {
      exit();
      return;
    }
    if (target.closest("[data-chm-search-clear]")) {
      p.input.value = "";
      p.input.focus();
      update(p);
      return;
    }
    if (!p.panel.contains(target)) return;
    if (target.closest("[data-chm-sr-clear-recent]")) {
      writeRecent([]);
      renderStart(p);
      return;
    }
    const term = target.closest<HTMLElement>("[data-chm-sr-term]");
    if (term?.dataset.chmSrTerm) {
      p.input.value = term.dataset.chmSrTerm;
      p.input.focus();
      update(p);
      return;
    }
    const screen = target.closest<HTMLElement>("[data-chm-sr-screen]");
    if (screen?.dataset.chmSrScreen) {
      remember(p, p.input.value);
      exit();
      options.onScreen(screen.dataset.chmSrScreen);
      return;
    }
    if (target.closest("[data-chm-sr-pick]")) {
      remember(p, p.input.value);
      if (options.sandbox) event.preventDefault();
    }
  };

  root.addEventListener("focusin", onFocusIn);
  root.addEventListener("input", onInput);
  root.addEventListener("submit", onSubmit);
  root.addEventListener("click", onClick);

  return {
    exit,
    destroy() {
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("input", onInput);
      root.removeEventListener("submit", onSubmit);
      root.removeEventListener("click", onClick);
      controller?.abort();
      window.clearTimeout(timer);
    },
  };
}
