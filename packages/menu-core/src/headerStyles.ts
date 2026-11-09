/**
 * Ready-made header designs. Each one only sets the header's layout parts
 * (logo position, shortcut buttons, search, promo line), so the merchant's
 * logo, colors, spacing, language switcher and close button stay as they are.
 */
import { newId } from "./tree";
import { HEADER_BUTTONS } from "./types";
import type { HeaderButton, HeaderIcon, HeaderNode, LiveSearch } from "./types";

export type HeaderStyleKey =
  "classic" | "centered" | "search" | "shop" | "announcement" | "minimal";

type LayoutFields = Pick<
  HeaderNode,
  "logoAlign" | "hideBrand" | "icons" | "searchBar" | "announcement"
>;

export interface HeaderStyle {
  key: HeaderStyleKey;
  name: string;
  description: string;
  layout: LayoutFields;
}

/** Text a new promo line starts with (no prices: it suits any currency). */
export const DEFAULT_ANNOUNCEMENT = "Free shipping & easy returns";

const NONE: LayoutFields = {
  logoAlign: "start",
  hideBrand: false,
  icons: [],
  searchBar: false,
  announcement: undefined,
};

export const HEADER_STYLES: HeaderStyle[] = [
  {
    key: "classic",
    name: "Classic",
    description: "Logo left, close button right",
    layout: NONE,
  },
  {
    key: "centered",
    name: "Centered",
    description: "Logo in the middle",
    layout: { ...NONE, logoAlign: "center" },
  },
  {
    key: "search",
    name: "With search",
    description: "A search field under the logo",
    layout: { ...NONE, searchBar: true },
  },
  {
    key: "shop",
    name: "Shop icons",
    description: "Search, account and cart buttons",
    layout: { ...NONE, icons: ["search", "account", "cart"] },
  },
  {
    key: "announcement",
    name: "Announcement",
    description: "A promo line above the logo",
    layout: { ...NONE, announcement: DEFAULT_ANNOUNCEMENT },
  },
  {
    key: "minimal",
    name: "Minimal",
    description: "Only the close button",
    layout: { ...NONE, hideBrand: true },
  },
];

const sameIcons = (a: HeaderIcon[] = [], b: HeaderIcon[] = []) =>
  a.length === b.length && a.every((name) => b.includes(name));

/** The ready-made style a header matches, or null when it's been customized. */
export function headerStyleOf(node: HeaderNode): HeaderStyleKey | null {
  const match = HEADER_STYLES.find(({ layout }) => {
    const wantsAnnouncement = Boolean(layout.announcement);
    return (
      (node.logoAlign ?? "start") === layout.logoAlign &&
      Boolean(node.hideBrand) === layout.hideBrand &&
      sameIcons(node.icons, layout.icons) &&
      Boolean(node.searchBar) === layout.searchBar &&
      Boolean(node.announcement?.trim()) === wantsAnnouncement
    );
  });
  return match?.key ?? null;
}

/** The header with a ready-made style applied; a promo line already written is kept. */
export function applyHeaderStyle(
  node: HeaderNode,
  key: HeaderStyleKey,
): HeaderNode {
  const style = HEADER_STYLES.find((candidate) => candidate.key === key);
  if (!style) return node;
  const announcement = style.layout.announcement
    ? node.announcement?.trim() || style.layout.announcement
    : undefined;
  return { ...node, ...style.layout, announcement };
}

/** The header's buttons in their chosen order (any missing ones at the end). */
export function headerButtonOrder(node: HeaderNode): HeaderButton[] {
  const chosen = (node.buttonOrder ?? []).filter((button) =>
    (HEADER_BUTTONS as readonly string[]).includes(button),
  );
  return [...new Set([...chosen, ...HEADER_BUTTONS])] as HeaderButton[];
}

/** Live search as it's first switched on (in the editor and in templates). */
export function defaultLiveSearch(
  overrides: Partial<LiveSearch> = {},
): LiveSearch {
  return {
    enabled: true,
    layout: "list",
    field: "pill",
    productLimit: 6,
    menuLinks: true,
    suggestions: true,
    collections: true,
    recent: true,
    popular: ["New arrivals", "Bestsellers", "Gift ideas"].map((text) => ({
      id: newId("ps"),
      text,
    })),
    ...overrides,
  };
}
