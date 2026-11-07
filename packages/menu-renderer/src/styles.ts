/**
 * Menu stylesheet. Rendered inside a shadow root, so theme CSS can't reach it
 * and it can't leak into the theme. Inherited properties (font, color) still
 * flow in, which is how "theme" fonts work.
 */
export const MENU_CSS = /* css */ `
:host { all: initial; display: block; font: inherit; color: inherit; }
*, *::before, *::after { box-sizing: border-box; }
img { display: block; max-width: 100%; }
a { color: inherit; text-decoration: none; }
button { font: inherit; color: inherit; background: none; border: 0; padding: 0; margin: 0; cursor: pointer; text-align: inherit; }
[hidden] { display: none !important; }
.chm-visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

.chm-root {
  --chm-ease: cubic-bezier(.2,.8,.2,1);
  position: fixed; inset: 0; z-index: 2147483000; pointer-events: none;
  font-family: inherit; color: var(--chm-text); font-size: 15px; line-height: 1.35;
  -webkit-font-smoothing: antialiased; -webkit-tap-highlight-color: transparent;
}
.chm-root.is-open { pointer-events: auto; }
.chm-overlay { position: absolute; inset: 0; background: var(--chm-overlay); opacity: 0; transition: opacity .3s var(--chm-ease); }
.chm-root.is-open .chm-overlay { opacity: 1; }
.chm-panel {
  position: absolute; top: 0; bottom: 0; left: 0; width: min(var(--chm-width, 420px), 100%);
  display: flex; flex-direction: column; background: var(--chm-canvas); outline: none;
  transform: translateX(-100%); transition: transform .35s var(--chm-ease); box-shadow: 0 0 40px rgba(0,0,0,.18);
}
.chm-full .chm-panel { width: 100%; }
.chm-side-right .chm-panel { left: auto; right: 0; transform: translateX(100%); }
.chm-root.is-open .chm-panel { transform: none; }

.chm-editor { position: relative; inset: auto; height: 100%; pointer-events: auto; z-index: auto; }
.chm-editor .chm-overlay { display: none; }
.chm-fragment { display: flex; flex-direction: column; justify-content: safe center; gap: 10px; height: auto; min-height: 100%; padding: 12px; background: var(--chm-canvas); }
.chm-fragment .chm-c--scroll, .chm-fragment .chm-stories { margin-inline: -12px; padding-inline: 12px; scroll-padding-inline: 12px; }
.chm-editor .chm-panel { position: relative; width: 100%; height: 100%; transform: none; transition: none; box-shadow: none; }
.chm-editor [data-chm-node] { cursor: pointer; }
.chm-editor [data-chm-hidden] { opacity: .35; }
.chm-editor .is-selected { outline: 2px solid #2C6ECB; outline-offset: 1px; }
.chm-editor .is-hovered:not(.is-selected) { outline: 1px dashed #2C6ECB; outline-offset: 1px; }

.chm-body { flex: 1; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; -webkit-overflow-scrolling: touch; }
.chm-screens { flex: 1 0 auto; }
.chm-screen { display: none; }
.chm-screen.is-active { display: block; animation: chm-in .3s var(--chm-ease); }
.chm-screen.is-back { animation-name: chm-back; }
@keyframes chm-in { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: none; } }
@keyframes chm-back { from { opacity: 0; transform: translateX(-24px); } to { opacity: 1; transform: none; } }
.chm-footer { flex: none; }

/* Header */
.chm-head { flex: none; }
.chm-head__body { min-height: 56px; display: flex; flex-direction: column; justify-content: center; gap: 10px; background: var(--chm-bg); color: var(--chm-text); }
.chm-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 40px; }
/* Centered logo: the sides keep their buttons, the logo or name gives way when space runs out. */
.chm-header--center { display: grid; grid-template-columns: 1fr minmax(0, max-content) 1fr; }
.chm-header--center > .chm-header__side { min-width: max-content; }
.chm-header__side { display: flex; align-items: center; gap: 4px; min-width: 0; }
/* The buttons keep their size; a long store name gives way (ellipsis) instead. */
.chm-header__side--end { justify-content: flex-end; margin-inline-start: auto; flex: none; }
.chm-header__icon { flex: none; display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; color: inherit; }
.chm-header__announce--ticker { padding: 0 !important; }
.chm-header__announce--ticker .chm-ticker { padding: 8px 0; color: inherit; }
.chm-header__announce { margin: 0; padding: 8px 16px; text-align: center; font-size: 12px; font-weight: 600; letter-spacing: .2px; line-height: 1.35; background: var(--chm-text); color: var(--chm-bg); }
/* Search field: pill (filled), box (outlined) or underline. */
.chm-header__search { display: flex; align-items: center; gap: 10px; margin: 0; --chm-sr-accent: var(--chm-accent); }
.chm-header__search.is-folded { display: none; }
.chm-search__box { position: relative; flex: 1 1 auto; display: flex; align-items: center; min-width: 0; }
.chm-search__box > .chm-icon { position: absolute; inset-inline-start: 13px; width: 18px; height: 18px; opacity: .55; pointer-events: none; }
.chm-header__search input[type="search"] { width: 100%; height: var(--chm-sf-height, 44px); padding-inline: 40px 38px; font: inherit; font-size: 16px; color: var(--chm-sf-text, inherit); background: var(--chm-sf-bg, rgba(127,127,127,.12)); border: 1.5px solid var(--chm-sf-border, transparent); border-radius: var(--chm-sf-radius, 999px); outline: none; -webkit-appearance: none; appearance: none; transition: background-color .2s, border-color .2s, box-shadow .2s; }
.chm-header__search input[type="search"]::-webkit-search-cancel-button { -webkit-appearance: none; }
.chm-header__search input::placeholder { color: inherit; opacity: .55; }
.chm-header__search input:focus { background: var(--chm-sf-bg, var(--chm-bg)); border-color: var(--chm-sr-accent); box-shadow: 0 0 0 4px color-mix(in srgb, var(--chm-sr-accent) 14%, transparent); }
.chm-search--box input[type="search"] { border-radius: var(--chm-sf-radius, 12px); background: var(--chm-sf-bg, var(--chm-bg)); border-color: var(--chm-sf-border, rgba(127,127,127,.32)); }
.chm-search--underline input[type="search"] { height: var(--chm-sf-height, 42px); padding-inline: 30px 34px; border-radius: 0; background: var(--chm-sf-bg, none); border-width: 0 0 1.5px; border-color: var(--chm-sf-border, rgba(127,127,127,.4)); }
.chm-search--underline input:focus { background: var(--chm-sf-bg, none); box-shadow: none; }
.chm-search--underline .chm-search__box > .chm-icon { inset-inline-start: 2px; }
.chm-search__clear { position: absolute; inset-inline-end: 8px; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; color: inherit; opacity: .7; }
.chm-search__cancel { display: none; flex: none; padding: 8px 2px; font: inherit; font-size: 15px; font-weight: 600; color: var(--chm-sr-accent); }
.chm-searching .chm-search__cancel { display: block; animation: chm-sr-in .2s var(--chm-ease, ease); }

/* Live search panel: covers the menu while the shopper searches. */
.chm-root.chm-searching .chm-screens, .chm-root.chm-searching .chm-footer { display: none; }
.chm-sr { --chm-sr-accent: var(--chm-accent); display: flex; flex-direction: column; gap: 22px; padding: 18px 16px 28px; min-height: 100%; background: var(--chm-sr-bg, var(--chm-bg)); color: var(--chm-sr-text, var(--chm-text)); animation: chm-sr-in .2s var(--chm-ease, ease); }
.chm-sr.has-query .chm-sr__start { display: none; }
.chm-sr__start, .chm-sr__results { display: flex; flex-direction: column; gap: 22px; }
.chm-sr__results:empty { display: none; }
.chm-sr__results > * { animation: chm-sr-in .22s var(--chm-ease, ease) both; }
.chm-sr__results > *:nth-child(2) { animation-delay: .03s; }
.chm-sr__results > *:nth-child(3) { animation-delay: .06s; }
.chm-sr__results > *:nth-child(4) { animation-delay: .09s; }
@keyframes chm-sr-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.chm-sr__section { display: flex; flex-direction: column; gap: 10px; }
.chm-sr__head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.chm-sr__head h3 { margin: 0; font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--chm-sr-heading, var(--chm-muted)); }
.chm-sr__clear { font: inherit; font-size: 13px; font-weight: 600; color: var(--chm-sr-accent); padding: 4px 0; }
.chm-sr__chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chm-sr__chips--scroll { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; margin-inline: -16px; padding-inline: 16px; }
.chm-sr__chips--scroll::-webkit-scrollbar { display: none; }
.chm-sr__chip { flex: none; display: inline-flex; align-items: center; gap: 7px; min-height: 36px; padding: 0 14px; border: 1px solid rgba(127,127,127,.25); border-radius: 999px; font: inherit; font-size: 14px; color: var(--chm-sr-chip-text, inherit); background: var(--chm-sr-chip-bg, var(--chm-sr-bg, var(--chm-bg))); transition: border-color .15s, background-color .15s; }
.chm-sr__chip:active { background: rgba(127,127,127,.1); }
.chm-sr__chip .chm-icon { width: 15px; height: 15px; opacity: .5; }
.chm-sr__chip--collection { padding-inline-start: 4px; }
.chm-sr__chip-img { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
.chm-sr__rows { display: flex; flex-direction: column; }
.chm-sr__row { display: flex; align-items: center; gap: 12px; min-height: 48px; padding: 6px 0; font: inherit; font-size: 15px; color: inherit; text-align: start; border-bottom: 1px solid rgba(127,127,127,.14); }
.chm-sr__row:last-child { border-bottom: 0; }
.chm-sr__row > .chm-icon:last-child { margin-inline-start: auto; opacity: .4; }
.chm-sr__row--query > .chm-icon { width: 18px; height: 18px; opacity: .45; }
.chm-sr__label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chm-sr__label strong { font-weight: 650; }
.chm-sr__thumb { flex: none; width: 36px; height: 36px; border-radius: 10px; object-fit: cover; background: rgba(127,127,127,.1); }
.chm-sr__thumb--icon { display: grid; place-items: center; color: var(--chm-sr-accent); background: color-mix(in srgb, var(--chm-sr-accent) 10%, transparent); }
.chm-sr__thumb--icon .chm-icon { width: 18px; height: 18px; }
/* Products: list (rows), grid (two columns) or carousel (swipe). */
.chm-sr__products { display: flex; flex-direction: column; gap: 12px; }
.chm-sr__product { display: flex; align-items: center; gap: 14px; color: inherit; min-width: 0; }
.chm-sr__media { position: relative; flex: none; display: block; width: 64px; aspect-ratio: 1; overflow: hidden; border-radius: var(--chm-sr-img-radius, 12px); background: rgba(127,127,127,.08); }
.chm-sr__img { width: 100%; height: 100%; object-fit: cover; transition: transform .3s; }
.chm-sr__product:active .chm-sr__img { transform: scale(1.03); }
.chm-sr__info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.chm-sr__title { font-size: var(--chm-sr-title, 14px); font-weight: 500; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.chm-sr__price { font-size: 14px; font-weight: 650; color: var(--chm-sr-price, inherit); }
.chm-sr__price s { font-weight: 400; opacity: .5; margin-inline-start: 4px; }
.chm-sr__now { color: var(--chm-sr-sale, #C4291C); }
.chm-sr__badge { align-self: flex-start; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; background: rgba(127,127,127,.14); }
.chm-sr--grid .chm-sr__products { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 12px; }
.chm-sr--grid .chm-sr__product, .chm-sr--carousel .chm-sr__product { flex-direction: column; align-items: stretch; gap: 8px; }
.chm-sr--grid .chm-sr__media, .chm-sr--carousel .chm-sr__media { width: 100%; aspect-ratio: var(--chm-sr-ratio, 4 / 5); border-radius: var(--chm-sr-img-radius, 14px); }
.chm-sr--grid .chm-sr__badge, .chm-sr--carousel .chm-sr__badge { position: absolute; top: 8px; inset-inline-start: 8px; background: rgba(255,255,255,.92); color: #1a1a1a; }
.chm-sr--carousel .chm-sr__products { flex-direction: row; overflow-x: auto; scrollbar-width: none; scroll-snap-type: x mandatory; margin-inline: -16px; padding-inline: 16px; scroll-padding-inline: 16px; gap: 12px; }
.chm-sr--carousel .chm-sr__products::-webkit-scrollbar { display: none; }
.chm-sr--carousel .chm-sr__product { flex: 0 0 46%; scroll-snap-align: start; }
/* Loading placeholders. */
.chm-sr__product.is-loading .chm-sr__media, .chm-sr__line { background: linear-gradient(90deg, rgba(127,127,127,.1) 25%, rgba(127,127,127,.2) 50%, rgba(127,127,127,.1) 75%); background-size: 200% 100%; animation: chm-sr-shimmer 1.2s linear infinite; }
.chm-sr__product.is-loading .chm-sr__info { flex: 1 1 auto; gap: 8px; }
.chm-sr__line { display: block; height: 11px; width: 80%; border-radius: 6px; }
.chm-sr__line--short { width: 40%; }
@keyframes chm-sr-shimmer { to { background-position: -200% 0; } }
.chm-sr__all { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; padding: 0 16px; border-radius: 14px; font-size: 15px; font-weight: 600; color: var(--chm-sr-btn-text, var(--chm-bg)); background: var(--chm-sr-btn-bg, var(--chm-text)); }
.chm-sr__all .chm-icon { width: 16px; height: 16px; }
.chm-sr__q { font-weight: 400; opacity: .8; }
.chm-sr__empty { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 28px 0 8px; text-align: center; }
.chm-sr__empty p { margin: 0; font-size: 15px; color: var(--chm-muted); }
.chm-sr__empty .chm-sr__chips { justify-content: center; }
.chm-sr__empty .chm-sr__all { align-self: stretch; }
.chm-header__brand { display: flex; align-items: center; min-width: 0; flex: 0 1 auto; overflow: hidden; }
.chm-header__logo { height: auto; max-height: 44px; object-fit: contain; }
.chm-header__name { display: block; font-weight: 700; font-size: 18px; letter-spacing: .2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chm-close { flex: none; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; margin-inline-end: -8px; }
.chm-close--circle { width: 34px; height: 34px; margin-inline: 4px 0; background: rgba(0,0,0,.06); }
.chm-close--circle .chm-icon { width: 16px; height: 16px; }

/* Back bar of sub-menu screens */
.chm-back {
  display: flex; align-items: center; gap: 10px; width: calc(100% - 24px); margin: 12px 12px 0; padding: 16px;
  background: var(--chm-bg); border-radius: var(--chm-radius); font-weight: 600; font-size: 15px; letter-spacing: .6px; text-transform: uppercase;
}
.chm-back--link, .chm-back--pill, .chm-back--parent { display: inline-flex; }
.chm-back--link { width: auto; margin: 14px 16px 2px; padding: 6px 0; background: none; font-size: 14px; letter-spacing: 0; text-transform: none; gap: 6px; }
.chm-back--pill { width: auto; margin: 14px 16px 2px; padding: 9px 16px 9px 10px; border-radius: 999px; background: var(--chm-accent); color: var(--chm-accent-fg); font-size: 14px; letter-spacing: 0; text-transform: none; gap: 4px; }
.chm-back--centered { width: 100%; margin: 0; padding: 14px 12px; border-radius: 0; border-bottom: 1px solid rgba(0,0,0,.08); font-size: 16px; letter-spacing: 0; text-transform: none; }
.chm-back--centered span { flex: 1; text-align: center; }
.chm-back--centered i { width: 18px; }
.chm-back--parent { width: auto; margin: 12px 16px 2px; padding: 8px 0; background: none; font-size: 15px; letter-spacing: 0; text-transform: none; gap: 6px; }
.chm-back-large { padding: 12px 16px 4px; }
.chm-back-large .chm-back { width: auto; margin: 0; padding: 4px 0; background: none; font-size: 14px; font-weight: 500; letter-spacing: 0; text-transform: none; gap: 4px; opacity: .8; }
.chm-back-large__title { margin: 6px 0 0; font-size: 26px; font-weight: 700; line-height: 1.2; }
.chm-back-preview { padding: 0 !important; min-height: 0 !important; justify-content: flex-start !important; }

/* Containers */
.chm-c { display: flex; flex-direction: column; min-width: 0; }
.chm-c--grid { display: grid; }
/* Runs to the screen edges; scroll-padding keeps snapping from scrolling the first item under the edge. */
.chm-c--scroll { flex-direction: row; overflow-x: auto; scrollbar-width: none; scroll-snap-type: x proximity; margin-inline: -16px; padding-inline: 16px; scroll-padding-inline: 16px; }
.chm-c--scroll::-webkit-scrollbar { display: none; }
.chm-c--scroll > * { flex: 0 0 var(--chm-item-width, auto); scroll-snap-align: start; }

/* Tabs */
.chm-tabs { display: flex; flex-direction: column; gap: 14px; }
.chm-tabs__list { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 8px; }
.chm-tab {
  min-height: 44px; padding: 8px 12px; border-radius: 999px; text-align: center; font-size: 13px; font-weight: 600;
  background: var(--chm-tab-bg, rgba(0,0,0,.06)); color: var(--chm-tab-fg, var(--chm-text)); transition: background .2s, color .2s;
}
.chm-tab[aria-selected="true"] { background: var(--chm-tab-active-bg, var(--chm-accent)); color: var(--chm-tab-active-fg, var(--chm-accent-fg)); }
/* Side tabs: a column of tabs left of the panel (big catalogs). */
.chm-tabs--side { flex-direction: row; align-items: flex-start; }
.chm-tabs--side > .chm-tabs__list { flex: none; display: flex; flex-direction: column; gap: 4px; }
.chm-tabs--side > .chm-tabs__list > .chm-tab { min-height: 44px; border-radius: 12px; text-align: start; padding: 10px 12px; line-height: 1.25; }
.chm-tabs--side > .chm-tabpanel { flex: 1 1 auto; min-width: 0; }
.chm-tabs--free.chm-tabs--side { align-items: stretch; }
.chm-tabs--free.chm-tabs--side > .chm-tabs__list > .chm-tab { min-height: 0; height: var(--chm-side-tab-h, 44px); padding-block: 0; flex: none; }
/* A canvas is never mirrored, so its side tabs stay on the left. */
.chm-root[dir="rtl"] .chm-tabs--free.chm-tabs--side { flex-direction: row-reverse; }
.chm-tabs--side.chm-tabs--underline > .chm-tabs__list { border-bottom: 0; border-inline-end: 1px solid rgba(127,127,127,.25); gap: 0; }
.chm-tabs--side.chm-tabs--underline .chm-tab { border-radius: 0; }
.chm-tabs--side.chm-tabs--underline .chm-tab[aria-selected="true"] { box-shadow: inset 3px 0 0 currentColor; }
.chm-root[dir="rtl"] .chm-tabs--side.chm-tabs--underline .chm-tab[aria-selected="true"] { box-shadow: inset -3px 0 0 currentColor; }

/* Underline look: plain text tabs, the selected one underlined in its text color. */
.chm-tabs--underline > .chm-tabs__list { gap: 0; border-bottom: 1px solid rgba(127,127,127,.25); }
.chm-tabs--underline .chm-tab { background: none; border-radius: 0; color: var(--chm-tab-fg, var(--chm-text)); opacity: .65; }
.chm-tabs--underline .chm-tab[aria-selected="true"] { background: none; color: var(--chm-tab-active-fg, var(--chm-text)); opacity: 1; box-shadow: inset 0 -2px 0 currentColor; }

/* Text */
.chm-heading { margin: 0; font-size: 20px; font-weight: 700; line-height: 1.2; }
.chm-text { margin: 0; }
.chm-text a, .chm-review__quote a, .chm-proof__text a { text-decoration: underline; text-underline-offset: 2px; }
.chm-badge {
  display: inline-flex; align-items: center; height: 20px; padding: 0 7px; border-radius: 4px; font-size: 11px; font-weight: 700;
  letter-spacing: .4px; text-transform: uppercase; background: var(--chm-accent); color: var(--chm-accent-fg); white-space: nowrap; vertical-align: middle;
}

/* Arrow chip */
.chm-arrow { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; flex: none; }
.chm-arrow--light { background: #fff; color: var(--chm-text); box-shadow: 0 1px 3px rgba(0,0,0,.08); }
.chm-arrow--filled { background: var(--chm-accent); color: var(--chm-accent-fg); }
.chm-arrow--plain { color: var(--chm-text); }

/* Images */
.chm-img--empty { display: block; background: linear-gradient(135deg, rgba(0,0,0,.05), rgba(0,0,0,.1)); }

/* Cards */
.chm-card {
  position: relative; display: flex; flex-direction: column; align-items: stretch; justify-content: flex-start;
  width: 100%; overflow: hidden; min-width: 0; border-radius: var(--chm-radius); background: var(--chm-bg); isolation: isolate; text-align: left;
}
.chm-card__title { display: block; font-size: 14px; font-weight: 600; line-height: 1.25; overflow-wrap: break-word; hyphens: auto; }
.chm-card__subtitle { display: block; font-size: 12px; color: var(--chm-muted); margin-top: 2px; }
.chm-card__text { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
.chm-card .chm-arrow { position: absolute; z-index: 3; }

.chm-card--studio { aspect-ratio: 1 / 1; }
.chm-card--studio .chm-card__text { padding: 14px 0 14px 12px; width: 50%; }
.chm-card--studio .chm-card__img { position: absolute; z-index: 1; top: 0; right: 0; bottom: 0; width: 48%; height: 100%; object-fit: cover; }
.chm-card--studio .chm-arrow { left: 12px; bottom: 12px; }

.chm-card--product { aspect-ratio: 1 / 1.25; }
.chm-card__head { position: relative; z-index: 2; display: flex; align-items: flex-start; gap: 6px; padding: 14px 12px 8px 14px; }
.chm-card__head .chm-card__title { flex: 1; min-width: 0; }
.chm-card--product .chm-card__media { flex: 1; min-height: 0; border-radius: 0; background: none; aspect-ratio: auto; }
.chm-card__fade { position: absolute; inset: 0 0 auto 0; height: 52px; background: linear-gradient(var(--chm-card-bg, var(--chm-bg)), transparent); pointer-events: none; }
.chm-card__fade--bottom { inset: auto 0 0 0; height: 58px; background: linear-gradient(transparent, var(--chm-card-bg, var(--chm-bg))); }
.chm-card--product .chm-arrow { right: 12px; bottom: 12px; }

.chm-card--overlay { aspect-ratio: 3 / 4; color: #fff; }
.chm-card--overlay .chm-card__img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.chm-card__shade { position: absolute; inset: 0; z-index: 1; background: linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,.6) 100%); }
.chm-card--overlay .chm-card__text { position: absolute; left: 12px; right: 12px; bottom: 12px; gap: 2px; }
.chm-card--overlay .chm-card__subtitle { color: rgba(255,255,255,.85); }
.chm-card--overlay .chm-arrow { top: 10px; right: 10px; }
.chm-card--overlay > .chm-badge { position: absolute; z-index: 3; top: 10px; left: 10px; }

.chm-card__media { position: relative; display: block; overflow: hidden; border-radius: calc(var(--chm-radius) - 6px); aspect-ratio: 1 / 1; }
.chm-card__media .chm-card__img { width: 100%; height: 100%; object-fit: cover; }
.chm-card__media .chm-badge { position: absolute; top: 8px; left: 8px; z-index: 2; }
.chm-card__foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.chm-card__foot .chm-card__title { flex: 1; min-width: 0; }
.chm-card__foot .chm-arrow { position: static; }

.chm-card--label { gap: 10px; }
.chm-card--label .chm-card__foot { padding-left: 6px; }

.chm-card--circle { align-items: center; gap: 12px; text-align: center; }
.chm-card--circle .chm-card__media { width: 63%; border-radius: 50%; background: #fff; }
.chm-card--circle > .chm-badge { position: absolute; top: 10px; right: 10px; }
.chm-card--circle:has(> .chm-badge) > .chm-card__title { padding-inline: 34px; }

.chm-card--tile .chm-card__media { border-radius: 0; aspect-ratio: 1 / 0.97; }
.chm-card--tile .chm-card__foot { padding: 2px 12px 14px 14px; }
.chm-card--tile > .chm-badge { position: absolute; top: 10px; left: 10px; z-index: 2; }

/* Rows */
.chm-row { display: flex; align-items: center; gap: 14px; width: 100%; min-height: 48px; padding: 12px 14px; border-radius: var(--chm-radius); }
.chm-row__thumb { flex: none; display: block; overflow: hidden; background: rgba(0,0,0,.04); }
.chm-row__img { width: 100%; height: 100%; object-fit: cover; }
.chm-row__icon { flex: none; display: grid; place-items: center; width: 22px; height: 22px; }
.chm-row__text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.chm-row__title { font-size: 16px; font-weight: 500; line-height: 1.25; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.chm-row__subtitle { font-size: 13px; color: var(--chm-muted); line-height: 1.3; }
.chm-row__chevron { flex: none; display: grid; place-items: center; opacity: .8; }
.chm-row--plain { min-height: 52px; }

/* Accordion */
.chm-acc { overflow: hidden; border-radius: var(--chm-radius); }
.chm-acc__head { display: flex; align-items: center; gap: 14px; width: 100%; padding: 10px; }
.chm-acc__thumb { width: 64px; height: 64px; border-radius: 8px; }
.chm-acc__chevron { flex: none; display: grid; place-items: center; width: 28px; height: 28px; transition: transform .25s var(--chm-ease); }
.chm-acc.is-open .chm-acc__chevron { transform: rotate(180deg); }
.chm-acc__body { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .3s var(--chm-ease); }
.chm-acc.is-open .chm-acc__body { grid-template-rows: 1fr; }
.chm-acc__inner { min-height: 0; overflow: hidden; }
.chm-acc__inner .chm-row { border-radius: 0; border-bottom: 1px solid rgba(0,0,0,.08); }
.chm-acc__inner .chm-row:last-child { border-bottom: 0; }

/* Banners */
.chm-banner { position: relative; display: flex; align-items: center; gap: 12px; overflow: hidden; border-radius: var(--chm-radius); min-width: 0; }
.chm-banner__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; position: relative; z-index: 1; }
.chm-banner__title { font-size: 16px; font-weight: 700; line-height: 1.25; }
.chm-banner__text { font-size: 13px; opacity: .9; }
.chm-banner--promo .chm-banner__img { width: 56px; height: 56px; object-fit: cover; border-radius: 12px; flex: none; }
.chm-banner--highlight { align-items: stretch; gap: 16px; }
.chm-banner--highlight .chm-banner__body { gap: 10px; }
.chm-banner__eyebrow { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; letter-spacing: .5px; }
.chm-banner__cta { align-self: flex-start; margin-top: 6px; padding: 11px 20px; border-radius: 999px; font-weight: 700; font-size: 14px; background: var(--chm-accent); color: var(--chm-accent-fg); }
.chm-banner--highlight .chm-banner__img { width: 38%; max-width: 150px; align-self: center; aspect-ratio: 1; object-fit: cover; border-radius: 10px; border: 2px solid rgba(255,255,255,.9); }
.chm-banner--split { min-height: 92px; }
.chm-banner--split .chm-banner__body { padding: 16px; }
.chm-banner__media { position: absolute; top: 0; right: 0; bottom: 0; width: 60%; -webkit-mask-image: linear-gradient(90deg, transparent, #000 45%); mask-image: linear-gradient(90deg, transparent, #000 45%); }
.chm-banner__media .chm-banner__img { width: 100%; height: 100%; object-fit: cover; }
.chm-banner--feature { align-items: stretch; gap: 14px; }
.chm-banner--feature > .chm-banner__img { width: 112px; flex: none; aspect-ratio: 4 / 5; object-fit: cover; border-radius: 10px; }
.chm-banner--feature .chm-banner__eyebrow { font-size: 11px; color: var(--chm-muted); text-transform: uppercase; letter-spacing: 1px; }
.chm-banner__outline { align-self: flex-start; display: inline-flex; align-items: center; gap: 8px; margin-top: 8px; padding: 8px 16px; border: 1px solid currentColor; border-radius: 999px; font-size: 13px; text-transform: uppercase; letter-spacing: .6px; }

/* Countdown */
.chm-countdown { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border-radius: 10px; }
.chm-countdown.is-ended[data-chm-hide-ended] { display: none; }
.chm-countdown__body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.chm-countdown__title { font-weight: 700; letter-spacing: 1px; text-transform: uppercase; font-size: 15px; }
.chm-countdown__text { font-size: 12px; }
.chm-timer { flex: none; display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px; border-radius: 6px; background: #fff; font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; }

/* Pills, chips, buttons */
.chm-pill { display: inline-flex; align-self: flex-start; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 6px; background: #E4F2DD; font-size: 13px; font-weight: 500; }
.chm-chip { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 14px; border-radius: 999px; white-space: nowrap; background: var(--chm-bg); border: 1px solid rgba(0,0,0,.1); }
.chm-chip__img { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; }
.chm-btn { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; min-height: 48px; padding: 10px 20px; border-radius: 999px; font-weight: 600; text-align: center; }
.chm-btn--filled { background: var(--chm-accent); color: var(--chm-accent-fg); }
.chm-btn--outline { border: 1.5px solid currentColor; }

/* Stories */
.chm-stories { display: flex; gap: 10px; overflow-x: auto; scrollbar-width: none; margin-inline: -16px; padding: 2px 16px; }
.chm-stories::-webkit-scrollbar { display: none; }
.chm-story { flex: none; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; }
.chm-story__ring { display: block; border-radius: 50%; border: 3px solid #D0D0D0; overflow: hidden; background: #fff; padding: 4px; }
.chm-story__img { width: 100%; height: 100%; object-fit: contain; border-radius: 50%; }
.chm-story__label { font-size: 13px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

/* Review & social proof */
.chm-review { margin: 0; display: flex; gap: 14px; border-radius: var(--chm-radius); }
.chm-review__mark { flex: none; }
.chm-review__body { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.chm-review__quote { margin: 0; }
.chm-review__stars { display: flex; gap: 3px; color: #F2A93B; }
.chm-review__author { display: flex; align-items: center; gap: 10px; font-style: italic; }
.chm-review__avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
.chm-proof { display: flex; align-items: center; gap: 12px; }
.chm-proof__avatars { position: relative; display: flex; flex: none; }
.chm-proof__avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #fff; }
.chm-proof__avatar + .chm-proof__avatar { margin-left: -12px; }
.chm-proof__verified { position: absolute; top: -4px; right: -6px; }
.chm-proof__verified--inline { position: static; display: flex; flex: none; margin-right: -4px; }
.chm-proof__text { font-size: 14px; }

/* Account bar & localization */
.chm-account { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.chm-account__link { display: inline-flex; align-items: center; gap: 8px; font-size: 15px; }
.chm-account__socials { display: flex; align-items: center; gap: 14px; }
.chm-account__socials a { display: grid; place-items: center; }
.chm-loc-form { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; }
.chm-select { position: relative; display: inline-flex; align-items: center; gap: 4px; }
.chm-select select { appearance: none; -webkit-appearance: none; font: inherit; color: inherit; background: none; border: 0; padding: 4px 22px 4px 0; cursor: pointer; }
.chm-select .chm-icon { position: absolute; right: 0; pointer-events: none; }
.chm-header .chm-select select { font-weight: 600; font-size: 14px; }
.chm-loc { color: var(--chm-muted); }

/* Free canvas: stage is designed at 390px and scaled to the real width (behavior.ts). */
.chm-canvas { position: relative; width: 100%; overflow: hidden; }
.chm-canvas__stage { position: absolute; top: 0; left: 0; transform-origin: 0 0; }
.chm-canvas__item { position: absolute; display: flex; }
.chm-canvas__item > * { flex: 1 1 auto; width: 100%; height: 100%; min-width: 0; min-height: 0; margin: 0; aspect-ratio: auto !important; }
.chm-canvas__item > .chm-c--scroll, .chm-canvas__item > .chm-stories { margin-inline: 0; padding-inline: 0; scroll-padding-inline: 0; }
.chm-shape { display: block; position: relative; }
.chm-shape--clip { overflow: hidden; }
.chm-canvas__item.chm-fit-y > * { height: auto; }
.chm-canvas__item.chm-fit-x > * { width: auto; flex: 0 0 auto; }
.chm-shape--scroll { overflow-x: auto; overflow-y: hidden; scrollbar-width: none; overscroll-behavior-x: contain; }
.chm-shape--scroll::-webkit-scrollbar { display: none; }
.chm-canvas__item[data-chm-collapse] { overflow: hidden; }
.chm-canvas__item[data-chm-y] { transition: top .25s ease, height .25s ease; }
.chm-canvas__item[data-chm-collapse] .chm-shape__icon--chevron > svg { transition: transform .25s ease; }
.chm-canvas__item[data-chm-open] .chm-shape__icon--chevron > svg { transform: rotate(90deg); }
.chm-tabs--free { height: 100%; }
.chm-tabs--free > .chm-tabs__list { flex: none; }
/* The bar's height is set on the canvas: the tabs fill it rather than spill out. */
.chm-tabs--free > .chm-tabs__list > .chm-tab { min-height: 0; padding-block: 0; }
.chm-tabs--free > .chm-tabpanel { position: relative; flex: 1 1 auto; min-height: 0; }
.chm-tabs--free > .chm-tabpanel > * { position: absolute; inset: 0; }
.chm-shape__hit { position: absolute; inset: 0; }
.chm-list-line { position: absolute; pointer-events: none; }
.chm-shape__icon { position: absolute; inset: 0; display: flex; pointer-events: none; }
/* Arrow on a frame that opens a sub-menu: at the end of a row, in the corner of a card. */
.chm-shape__more { position: absolute; inset-inline-end: 12px; top: 50%; transform: translateY(-50%); display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255,255,255,.85); color: var(--chm-text); box-shadow: 0 1px 3px rgba(0,0,0,.12); pointer-events: none; }
.chm-shape__more .chm-icon { width: 14px; height: 14px; }
.chm-shape__more--corner { top: auto; bottom: 12px; transform: none; }
.chm-shape__icon > svg { width: 100%; height: 100%; }

/* Product cards: a collection's products with photo, title and price. */
.chm-products { display: grid; gap: 12px; }
.chm-products--grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.chm-products--row { display: flex; overflow-x: auto; scrollbar-width: none; scroll-snap-type: x proximity; }
.chm-products--row::-webkit-scrollbar { display: none; }
.chm-product { display: flex; flex-direction: column; gap: 6px; min-width: 0; flex: none; scroll-snap-align: start; color: inherit; }
.chm-product__media { display: block; overflow: hidden; border-radius: 12px; background: rgba(0,0,0,.04); }
.chm-product__img { width: 100%; height: 100%; object-fit: cover; }
.chm-product__title { font-size: 13px; font-weight: 500; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.chm-product__price { font-size: 13px; font-weight: 600; }
.chm-product__price--empty { display: block; width: 40%; height: 10px; border-radius: 4px; background: rgba(0,0,0,.08); }
.chm-product__was { font-weight: 400; opacity: .55; }
.chm-product__now { color: #C4291C; }

/* Perks: short reassurances with icons. */
.chm-perks { display: grid; grid-template-columns: repeat(var(--chm-perk-cols, 3), minmax(0, 1fr)); gap: 10px 8px; }
.chm-perk { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; min-width: 0; }
.chm-perks--inline .chm-perk { flex-direction: row; text-align: start; gap: 8px; }
.chm-perk__icon { display: grid; place-items: center; color: var(--chm-accent); }
.chm-perk__text { font-size: 12px; font-weight: 600; line-height: 1.3; overflow-wrap: anywhere; }

/* Contact & help: call, email, WhatsApp, help page. */
.chm-contact { display: flex; flex-direction: column; gap: 10px; }
.chm-contact__title { margin: 0; font-size: 15px; font-weight: 600; }
.chm-contact__items { display: grid; gap: 8px; }
.chm-contact--buttons .chm-contact__items { grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); }
.chm-contact__item { display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 10px 12px; border-radius: 12px; background: rgba(0,0,0,.05); color: inherit; font-size: 14px; font-weight: 500; }
.chm-contact--buttons .chm-contact__item { justify-content: center; }
.chm-contact--rows .chm-contact__item { background: none; padding-inline: 0; border-radius: 0; border-bottom: 1px solid rgba(0,0,0,.08); }
.chm-contact__icon { display: grid; place-items: center; }
.chm-contact__label { flex: 1 1 auto; min-width: 0; }
.chm-contact--buttons .chm-contact__label { flex: none; }
.chm-contact__arrow { display: grid; opacity: .5; }

/* Discount code with a Copy button. */
.chm-discount { display: flex; flex-direction: column; gap: 6px; }
.chm-discount__title { margin: 0; font-size: 16px; font-weight: 700; }
.chm-discount__text { margin: 0; font-size: 13px; opacity: .8; }
.chm-discount__row { display: flex; align-items: center; gap: 8px; margin-top: 4px; flex-wrap: wrap; }
.chm-discount__code { flex: 1 1 auto; min-width: 0; padding: 10px 12px; border: 1.5px dashed currentColor; border-radius: 10px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 15px; font-weight: 700; letter-spacing: 1px; text-align: center; overflow-wrap: anywhere; }
.chm-discount__copy { flex: none; min-height: 44px; padding: 0 16px; border-radius: 10px; background: var(--chm-accent); color: var(--chm-accent-fg); font-weight: 600; font-size: 14px; }
.chm-discount__copy.is-copied { opacity: .85; }
.chm-discount__apply { flex: none; font-size: 14px; font-weight: 600; text-decoration: underline; padding: 10px 4px; color: inherit; }

/* Ticker: two copies of the messages slide by, so the loop never shows a gap. */
.chm-ticker { overflow: hidden; white-space: nowrap; font-size: 13px; }
.chm-ticker__track { display: flex; width: max-content; animation: chm-ticker var(--chm-ticker-duration, 20s) linear infinite; }
.chm-ticker:hover .chm-ticker__track { animation-play-state: paused; }
.chm-ticker__group { display: flex; align-items: center; flex: none; }
.chm-ticker__item { padding-inline: 14px; }
.chm-ticker__sep { opacity: .6; }
@keyframes chm-ticker { to { transform: translateX(-50%); } }
.chm-root[dir="rtl"] .chm-ticker__track { animation-name: chm-ticker-rtl; }
@keyframes chm-ticker-rtl { to { transform: translateX(50%); } }

/* Misc */
.chm-image { display: block; overflow: hidden; border-radius: var(--chm-radius); }
.chm-image__img { width: 100%; height: 100%; object-fit: var(--chm-fit, cover); object-position: var(--chm-focus, center); }
.chm-divider { border: 0; border-top: 1px solid rgba(0,0,0,.1); margin: 0; }
.chm-icon { flex: none; }

@media (prefers-reduced-motion: reduce) {
  .chm-root *, .chm-root *::before, .chm-root *::after { animation: none !important; transition: none !important; }
  /* A still ticker: the messages can be swiped instead. */
  .chm-ticker { overflow-x: auto; scrollbar-width: none; }
  .chm-ticker__group + .chm-ticker__group { display: none; }
}
/* Right-to-left languages: "next" and "back" arrows point the other way. */
.chm-root[dir="rtl"] .chm-row__chevron svg,
.chm-root[dir="rtl"] .chm-arrow svg,
.chm-root[dir="rtl"] .chm-back svg,
.chm-root[dir="rtl"] .chm-shape__more svg,
.chm-root[dir="rtl"] .chm-sr__row > .chm-icon:last-child,
.chm-root[dir="rtl"] .chm-sr__all .chm-icon { transform: scaleX(-1); }
`;
