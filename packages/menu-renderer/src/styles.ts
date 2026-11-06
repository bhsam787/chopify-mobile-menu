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
.chm-fragment .chm-c--scroll, .chm-fragment .chm-stories { margin-inline: -12px; padding-inline: 12px; }
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
.chm-header { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 56px; background: var(--chm-bg); color: var(--chm-text); }
.chm-header--center { display: grid; grid-template-columns: 1fr auto 1fr; }
.chm-header__side { display: flex; align-items: center; gap: 8px; min-width: 0; }
.chm-header__side--end { justify-content: flex-end; }
.chm-header__brand { display: flex; align-items: center; min-width: 0; }
.chm-header__logo { height: auto; max-height: 44px; object-fit: contain; }
.chm-header__name { font-weight: 700; font-size: 18px; letter-spacing: .2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chm-close { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; margin-right: -8px; }
.chm-close--circle { width: 34px; height: 34px; margin-right: 0; background: rgba(0,0,0,.06); }
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
.chm-c--scroll { flex-direction: row; overflow-x: auto; scrollbar-width: none; scroll-snap-type: x proximity; margin-inline: -16px; padding-inline: 16px; }
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
.chm-canvas__item > .chm-c--scroll, .chm-canvas__item > .chm-stories { margin-inline: 0; padding-inline: 0; }
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
.chm-tabs--free > .chm-tabpanel { position: relative; flex: 1 1 auto; min-height: 0; }
.chm-tabs--free > .chm-tabpanel > * { position: absolute; inset: 0; }
.chm-shape__hit { position: absolute; inset: 0; }
.chm-list-line { position: absolute; pointer-events: none; }
.chm-shape__icon { position: absolute; inset: 0; display: flex; pointer-events: none; }
.chm-shape__icon > svg { width: 100%; height: 100%; }

/* Misc */
.chm-image { display: block; overflow: hidden; border-radius: var(--chm-radius); }
.chm-image__img { width: 100%; height: 100%; object-fit: var(--chm-fit, cover); object-position: var(--chm-focus, center); }
.chm-divider { border: 0; border-top: 1px solid rgba(0,0,0,.1); margin: 0; }
.chm-icon { flex: none; }

@media (prefers-reduced-motion: reduce) {
  .chm-root *, .chm-root *::before, .chm-root *::after { animation: none !important; transition: none !important; }
}
/* Right-to-left languages: "next" and "back" arrows point the other way. */
.chm-root[dir="rtl"] .chm-row__chevron svg,
.chm-root[dir="rtl"] .chm-arrow svg,
.chm-root[dir="rtl"] .chm-back svg { transform: scaleX(-1); }
`;
