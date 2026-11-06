import { useEffect, useRef, type ReactNode } from "react";
import {
  newId,
  resolveTexts,
  UI_TEXT_DEFAULTS,
  type Design,
  type HeaderNode,
  type LiveSearch,
  type LiveSearchDesign,
  type LiveSearchLayout,
  type UiTextKey,
} from "@chopi/menu-core";
import {
  MENU_CSS,
  popularTerms,
  renderFragment,
  searchResultsHtml,
  searchStart,
  type SearchWords,
} from "@chopi/menu-renderer";
import type { PreviewContext } from "../components/MenuPreview";
import {
  ColorPicker,
  DESIGN_ICONS,
  DesignGroup,
  FocusArea,
  Segmented,
  SliderField,
} from "./designControls";
import { ItemList } from "./ItemList";
import { ColorField, FieldRow, SwitchField } from "./controls";
import { sampleResults } from "./searchPreview";

const LAYOUTS: { key: LiveSearchLayout; name: string; description: string }[] =
  [
    {
      key: "list",
      name: "Clean list",
      description: "Photo, name and price in rows",
    },
    {
      key: "grid",
      name: "Gallery grid",
      description: "Big photos, two per row",
    },
    {
      key: "carousel",
      name: "Swipe cards",
      description: "Products in a sideways row",
    },
  ];

/** What live search starts with when it's turned on. */
export function defaultLiveSearch(field: LiveSearch["field"]): LiveSearch {
  return {
    enabled: true,
    layout: "list",
    field: field ?? "pill",
    productLimit: 6,
    menuLinks: true,
    suggestions: true,
    collections: true,
    recent: true,
    popular: [
      { id: newId("ps"), text: "New arrivals" },
      { id: newId("ps"), text: "Bestsellers" },
      { id: newId("ps"), text: "Gift ideas" },
    ],
  };
}

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

function wordsFor(design: Design, locale: string): SearchWords {
  const texts = resolveTexts(design.translations, locale);
  return Object.fromEntries(
    WORD_KEYS.map((key) => [
      key,
      texts[`ui.${key}`] || UI_TEXT_DEFAULTS[key as UiTextKey],
    ]),
  ) as SearchWords;
}

/** One results style drawn by the real renderer, with sample results. */
function LayoutPreview({
  design,
  context,
  live,
  layout,
  showStart,
}: {
  design: Design;
  context: PreviewContext;
  live: LiveSearch;
  layout: LiveSearchLayout;
  /** Show what appears before typing (recent and popular searches). */
  showStart?: boolean;
}) {
  const host = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const shadow = element.shadowRoot ?? element.attachShadow({ mode: "open" });
    const words = wordsFor(design, context.locale);
    const results = sampleResults(context, layout === "list" ? 3 : 4);
    const body = showStart
      ? searchStart(
          words,
          popularTerms(
            (live.popular ?? []).map((term) => term.text),
            live.topSearches === false ? [] : (context.topSearches ?? []),
            live.hiddenTerms ?? [],
          ),
          ["linen shirt", "gift card"],
          live.recent !== false,
        )
      : searchResultsHtml(
          {
            links: [],
            suggestions: [],
            collections: live.collections === false ? [] : results.collections,
            products: results.products,
          },
          {
            query: "",
            layout,
            words,
            searchUrl: "/search",
          },
        );
    // The menu's own colors and fonts, from an empty fragment of it.
    const frame = renderFragment(design, [], { ...context, editor: true });
    const accent = live.accent ? `--chm-sr-accent:${live.accent};` : "";
    // A picture only: its sample links must never be clickable (the tile
    // around it is the button).
    shadow.innerHTML = `<style>${MENU_CSS} :host{pointer-events:none} .chm-root,.chm-root *{pointer-events:none!important} .chm-fragment{padding:0} .chm-sr{min-height:0;padding:14px;animation:none} .chm-sr__all{display:none}</style>${frame.replace(
      /<\/div>$/,
      `<div class="chm-sr chm-sr--${layout}" style="${accent}">${body}</div></div>`,
    )}`;
  }, [design, context, live, layout, showStart]);
  return (
    <span
      ref={(element) => {
        host.current = element;
        // Out of the tab order and click-proof (React 18 doesn't know `inert`).
        element?.setAttribute("inert", "");
      }}
      aria-hidden="true"
      style={{ display: "block" }}
    />
  );
}

/**
 * Live search settings: the results style (three looks, previewed with the
 * merchant's colors), what results show, and popular searches.
 */
export function LiveSearchFields({
  design,
  node,
  context,
  set,
  termText,
}: {
  design: Design;
  node: HeaderNode;
  context?: PreviewContext;
  set: (patch: Partial<HeaderNode>) => void;
  /** A translation-aware text field for a popular search term. */
  termText: (
    id: string,
    value: string,
    label: string,
    onChange: (value: string) => void,
  ) => ReactNode;
}) {
  const live = node.liveSearch;
  const on = Boolean(live?.enabled);
  const update = (patch: Partial<LiveSearch>) =>
    set({
      liveSearch: { ...(live ?? defaultLiveSearch(undefined)), ...patch },
    });
  const hasEntry = node.searchBar || (node.icons ?? []).includes("search");

  const toggles: { key: keyof LiveSearch; label: string }[] = [
    { key: "menuLinks", label: "Links of this menu" },
    { key: "suggestions", label: "Search suggestions" },
    { key: "collections", label: "Collections" },
    { key: "recent", label: "Recent searches" },
  ];

  return (
    <DesignGroup
      title="Live search"
      icon={
        <svg
          viewBox="0 0 20 20"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="8.5" cy="8.5" r="4.5" />
          <path d="M12 12l4 4M15 3v3M13.5 4.5h3" />
        </svg>
      }
      target=".chm-header__search"
      help="Results appear while shoppers type: links of this menu at once, then your store's products, collections and suggestions. Try it on the phone in Preview."
    >
      <SwitchField
        label="Show results while typing"
        details="Products, collections and links of this menu, without leaving the menu"
        checked={on}
        onChange={(enabled) =>
          set({
            liveSearch: enabled
              ? live
                ? { ...live, enabled: true }
                : defaultLiveSearch(node.liveSearch?.field)
              : live && { ...live, enabled: false },
            // Live search needs a way in: show the search field if there's none.
            ...(enabled && !hasEntry ? { searchBar: true } : {}),
          })
        }
      />
      {on && live && (
        <>
          {!hasEntry && (
            <s-banner tone="warning">
              Shoppers need the search field or the Search button to open live
              search.
            </s-banner>
          )}
          {/* Working on how results look: the phone shows them, with sample products. */}
          <FocusArea target={SEARCH_RESULTS_TARGET} label="Search results">
            <div className="chm-field">
              <div className="chm-field__top">
                <span className="chm-field__label">Results style</span>
              </div>
              <div
                className="chm-search-styles"
                role="radiogroup"
                aria-label="Results style"
              >
                {LAYOUTS.map((layout) => (
                  <button
                    key={layout.key}
                    type="button"
                    role="radio"
                    aria-checked={live.layout === layout.key}
                    className="chm-header-style chm-search-style"
                    onClick={() => update({ layout: layout.key })}
                  >
                    {context && (
                      <span className="chm-search-style__stage">
                        <LayoutPreview
                          design={design}
                          context={context}
                          live={live}
                          layout={layout.key}
                        />
                      </span>
                    )}
                    <span className="chm-header-style__name">
                      {layout.name}
                    </span>
                    <span className="chm-header-style__description">
                      {layout.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <SliderField
              label="Products shown"
              value={live.productLimit ?? 6}
              min={2}
              max={8}
              unit=""
              onChange={(productLimit) => update({ productLimit })}
            />
            <div className="chm-field">
              <div className="chm-field__top">
                <span className="chm-field__label">Also show</span>
              </div>
              <div className="chm-hchips">
                {toggles.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    className="chm-hchip"
                    aria-pressed={live[key] !== false}
                    onClick={() => update({ [key]: live[key] === false })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </FocusArea>
          <ItemList
            label="Popular searches (shown before typing)"
            items={live.popular ?? []}
            min={0}
            max={8}
            addLabel="Add search term"
            create={() => ({ id: newId("ps"), text: "" })}
            onChange={(popular) => update({ popular })}
          >
            {(term, index) =>
              termText(term.id, term.text, `Term ${index + 1}`, (text) =>
                update({
                  popular: (live.popular ?? []).map((candidate) =>
                    candidate.id === term.id
                      ? { ...candidate, text }
                      : candidate,
                  ),
                }),
              )
            }
          </ItemList>
          <TopSearches
            live={live}
            terms={context?.topSearches}
            onChange={update}
          />
          {context && (
            <div className="chm-field">
              <div className="chm-field__top">
                <span className="chm-field__label">Before typing</span>
              </div>
              <span className="chm-search-style__stage chm-search-style__stage--wide">
                <LayoutPreview
                  design={design}
                  context={context}
                  live={live}
                  layout={live.layout}
                  showStart
                />
              </span>
            </div>
          )}
          <ColorPicker
            label="Highlight color"
            value={live.accent}
            onChange={(accent) => update({ accent })}
          />
        </>
      )}
    </DesignGroup>
  );
}

/**
 * The store's most searched terms (from Shopify's search statistics), added
 * after the merchant's own popular searches. Any can be hidden.
 */
function TopSearches({
  live,
  terms,
  onChange,
}: {
  live: LiveSearch;
  /** null: Shopify doesn't let the app read them (yet). */
  terms: string[] | null | undefined;
  onChange: (patch: Partial<LiveSearch>) => void;
}) {
  const on = live.topSearches !== false;
  const hidden = new Set(live.hiddenTerms ?? []);
  const toggle = (term: string) =>
    onChange({
      hiddenTerms: hidden.has(term)
        ? [...hidden].filter((item) => item !== term)
        : [...hidden, term],
    });
  return (
    <s-stack gap="small-300">
      <SwitchField
        label="Add your store's most searched terms"
        details="Real searches from the last 30 days, after your own terms. Updated daily."
        checked={on}
        onChange={(topSearches) => onChange({ topSearches })}
      />
      {on &&
        (terms == null ? (
          <s-banner tone="info">
            Shopify hasn&apos;t given the app access to your search statistics
            yet, so only your own terms show. They appear once access is
            approved.
          </s-banner>
        ) : terms.length === 0 ? (
          <s-text color="subdued">
            No search has been made often enough yet. Terms appear here once
            shoppers search your store.
          </s-text>
        ) : (
          <s-stack gap="small-200">
            <div className="chm-hchips">
              {terms.map((term) => (
                <button
                  key={term}
                  type="button"
                  className="chm-hchip"
                  aria-pressed={!hidden.has(term)}
                  onClick={() => toggle(term)}
                >
                  {term}
                </button>
              ))}
            </div>
            <s-text color="subdued">Tap a term to hide or show it.</s-text>
          </s-stack>
        ))}
    </s-stack>
  );
}

/** The results card's target: in the Design dialog the phone opens the results panel for it. */
export const SEARCH_RESULTS_TARGET = ".chm-sr";

/**
 * Basic design of search: the field's colors, corners and height, and the
 * results' colors, photo corners and shape, text size and buttons.
 */
export function SearchDesignFields({
  node,
  set,
}: {
  node: HeaderNode;
  set: (patch: Partial<HeaderNode>) => void;
}) {
  const live = node.liveSearch;
  const design = live?.design ?? {};
  const update = (patch: Partial<LiveSearchDesign>) =>
    set({
      liveSearch: {
        ...(live ?? { enabled: false, layout: "list" }),
        design: { ...design, ...patch },
      },
    });
  const color = (key: keyof LiveSearchDesign, label: string) => (
    <ColorField
      label={label}
      value={design[key] as string | undefined}
      onChange={(value) => update({ [key]: value || undefined })}
    />
  );
  const showResults = Boolean(live?.enabled);
  const underline = live?.field === "underline";

  return (
    <>
      {(node.searchBar || showResults) && (
        <DesignGroup
          title="Search field"
          icon={DESIGN_ICONS.look}
          target=".chm-header__search input"
          help="The colors, corners and height of the search field."
        >
          <FieldRow>
            {color("fieldBackground", "Background")}
            {color("fieldText", "Text")}
          </FieldRow>
          <FieldRow>
            {color("fieldBorder", underline ? "Line" : "Border")}
            <span />
          </FieldRow>
          {!underline && (
            <SliderField
              label="Corner radius"
              // The field's own corners until one is chosen (pill or soft box).
              value={Math.min(
                30,
                design.fieldRadius ?? (live?.field === "box" ? 12 : 30),
              )}
              max={30}
              presets={[
                { label: "Square", value: 0 },
                { label: "Soft", value: 10 },
                { label: "Pill", value: 30 },
              ]}
              onChange={(fieldRadius) =>
                update({ fieldRadius: fieldRadius === 30 ? 999 : fieldRadius })
              }
            />
          )}
          <SliderField
            label="Height"
            value={design.fieldHeight ?? (underline ? 42 : 44)}
            min={34}
            max={60}
            onChange={(fieldHeight) => update({ fieldHeight })}
          />
        </DesignGroup>
      )}
      {showResults && (
        <DesignGroup
          title="Search results"
          icon={DESIGN_ICONS.layout}
          target={SEARCH_RESULTS_TARGET}
          help="How the results look. While you work here, the phone shows the results with sample products."
        >
          <FieldRow>
            {color("panelBackground", "Background")}
            {color("panelText", "Text")}
          </FieldRow>
          <FieldRow>
            {color("headingColor", "Section titles")}
            <span />
          </FieldRow>
          <SliderField
            label="Product name size"
            value={design.titleSize ?? 14}
            min={11}
            max={20}
            onChange={(titleSize) => update({ titleSize })}
          />
          <SliderField
            label="Photo corners"
            value={design.imageRadius ?? (live?.layout === "list" ? 12 : 14)}
            max={30}
            onChange={(imageRadius) => update({ imageRadius })}
          />
          {live?.layout !== "list" && (
            <Segmented
              label="Photo shape"
              value={design.imageRatio ?? 1.25}
              options={[
                { value: 1, label: "Square" },
                { value: 1.25, label: "Portrait" },
                { value: 1.5, label: "Tall" },
              ]}
              onChange={(imageRatio) => update({ imageRatio })}
            />
          )}
          <FieldRow>
            {color("priceColor", "Price")}
            {color("saleColor", "Sale price")}
          </FieldRow>
          <FieldRow>
            {color("chipBackground", "Chips background")}
            {color("chipText", "Chips text")}
          </FieldRow>
          <FieldRow>
            {color("buttonBackground", "“See all” button")}
            {color("buttonText", "“See all” text")}
          </FieldRow>
        </DesignGroup>
      )}
    </>
  );
}
