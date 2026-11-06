import { MENU_CSS } from "@chopi/menu-renderer";

/** The menu's main parts, in plain words, for autocomplete and quick insert. */
export const MENU_PARTS: { selector: string; label: string; group: string }[] =
  [
    { selector: ".chm-panel", label: "The whole drawer", group: "Menu" },
    {
      selector: ".chm-body",
      label: "Scrolling area under the header",
      group: "Menu",
    },
    { selector: ".chm-head__body", label: "Header", group: "Header" },
    {
      selector: ".chm-header__brand",
      label: "Logo or store name",
      group: "Header",
    },
    {
      selector: ".chm-header__icon",
      label: "Header buttons (search, account, cart)",
      group: "Header",
    },
    { selector: ".chm-close", label: "Close button", group: "Header" },
    {
      selector: ".chm-header__announce",
      label: "Announcement line",
      group: "Header",
    },
    {
      selector: ".chm-header__search input",
      label: "Search field",
      group: "Search",
    },
    { selector: ".chm-sr", label: "Search results panel", group: "Search" },
    {
      selector: ".chm-sr__product",
      label: "Product in search results",
      group: "Search",
    },
    {
      selector: ".chm-sr__all",
      label: "“See all results” button",
      group: "Search",
    },
    { selector: ".chm-tabs__list", label: "Tab bar", group: "Sections" },
    { selector: ".chm-tab", label: "Tab", group: "Sections" },
    {
      selector: '.chm-tab[aria-selected="true"]',
      label: "Selected tab",
      group: "Sections",
    },
    { selector: ".chm-card", label: "Category card", group: "Sections" },
    { selector: ".chm-card__title", label: "Card title", group: "Sections" },
    { selector: ".chm-row", label: "Link row", group: "Sections" },
    { selector: ".chm-row__title", label: "Link row title", group: "Sections" },
    { selector: ".chm-acc", label: "Accordion", group: "Sections" },
    { selector: ".chm-chip", label: "Chip (quick link)", group: "Sections" },
    { selector: ".chm-banner", label: "Banner", group: "Sections" },
    { selector: ".chm-btn", label: "Button", group: "Sections" },
    { selector: ".chm-heading", label: "Heading", group: "Sections" },
    { selector: ".chm-text", label: "Text", group: "Sections" },
    { selector: ".chm-product", label: "Product card", group: "Store" },
    { selector: ".chm-perks", label: "Perks", group: "Store" },
    { selector: ".chm-contact__item", label: "Contact button", group: "Store" },
    { selector: ".chm-discount", label: "Discount code", group: "Store" },
    { selector: ".chm-ticker", label: "Ticker", group: "Store" },
    { selector: ".chm-back", label: "Sub-menu back bar", group: "Sub-menus" },
    { selector: ".chm-footer", label: "Footer", group: "Menu" },
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
