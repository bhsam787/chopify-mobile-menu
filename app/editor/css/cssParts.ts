import { MENU_CSS } from "@chopi/menu-renderer";

/** The menu's main parts, in plain words, for autocomplete and the picked-layer names. */
export const MENU_PARTS: { selector: string; label: string }[] = [
  { selector: ".chm-panel", label: "The whole drawer" },
  {
    selector: ".chm-body",
    label: "Scrolling area under the header",
  },
  { selector: ".chm-head__body", label: "Header" },
  {
    selector: ".chm-header__brand",
    label: "Logo or store name",
  },
  {
    selector: ".chm-header__icon",
    label: "Header buttons (search, account, cart)",
  },
  { selector: ".chm-close", label: "Close button" },
  {
    selector: ".chm-header__announce",
    label: "Announcement line",
  },
  {
    selector: ".chm-header__search input",
    label: "Search field",
  },
  { selector: ".chm-sr", label: "Search results panel" },
  {
    selector: ".chm-sr__product",
    label: "Product in search results",
  },
  {
    selector: ".chm-sr__all",
    label: "“See all results” button",
  },
  { selector: ".chm-tabs__list", label: "Tab bar" },
  { selector: ".chm-tab", label: "Tab" },
  {
    selector: '.chm-tab[aria-selected="true"]',
    label: "Selected tab",
  },
  { selector: ".chm-card", label: "Category card" },
  { selector: ".chm-card__title", label: "Card title" },
  { selector: ".chm-row", label: "Link row" },
  { selector: ".chm-row__title", label: "Link row title" },
  { selector: ".chm-acc", label: "Accordion" },
  { selector: ".chm-chip", label: "Chip (quick link)" },
  { selector: ".chm-banner", label: "Banner" },
  { selector: ".chm-btn", label: "Button" },
  { selector: ".chm-heading", label: "Heading" },
  { selector: ".chm-text", label: "Text" },
  { selector: ".chm-product", label: "Product card" },
  { selector: ".chm-perks", label: "Perks" },
  { selector: ".chm-contact__item", label: "Contact button" },
  { selector: ".chm-discount", label: "Discount code" },
  { selector: ".chm-ticker", label: "Ticker" },
  { selector: ".chm-back", label: "Sub-menu back bar" },
  { selector: ".chm-footer", label: "Footer" },
];

/** Every class the menu uses (from its stylesheet), for autocomplete. */
export const MENU_CLASSES: string[] = [
  ...new Set(MENU_CSS.match(/\.chm-[a-z0-9_-]+/g) ?? []),
].sort();

/** The menu's CSS variables, with what they hold. */
export const MENU_VARIABLES: { name: string; info: string }[] = [
  { name: "--chm-text", info: "Text color" },
  { name: "--chm-muted", info: "Secondary text color" },
  { name: "--chm-bg", info: "Background color" },
  { name: "--chm-canvas", info: "Color behind sections" },
  { name: "--chm-accent", info: "Accent color" },
  { name: "--chm-accent-fg", info: "Text on the accent color" },
  { name: "--chm-radius", info: "Corner radius" },
  { name: "--chm-width", info: "Drawer width" },
  { name: "--chm-overlay", info: "Dimmed page behind the drawer" },
  { name: "--chm-ease", info: "Animation easing" },
  { name: "--chm-sr-accent", info: "Search highlight color" },
];

/** What the editor starts with: a short guide in comments. */
export const STARTER_CSS = `/* Custom CSS for this menu only. It can't affect your theme.
   Type "." to see the menu's parts, or "var(--" for its colors.
   Example:
   .chm-card__title { letter-spacing: 0.08em; }
*/
`;
