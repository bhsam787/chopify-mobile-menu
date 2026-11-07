/**
 * How to find a theme's mobile menu ("burger") button. The app menu takes
 * over clicks on it below the breakpoint. Matched by the theme's schema name
 * (`Shopify.theme.schema_name`), which survives renaming and duplicating.
 *
 * Every adapter lists the theme versions it was checked on; selectors for
 * unchecked themes are best effort until verified (see docs/PLAN.md §4).
 */
interface ThemeAdapter {
  id: string;
  /** Theme schema names (case-insensitive). */
  themes: string[];
  /** CSS selector of the element(s) that open the theme's mobile menu. */
  trigger: string;
  /** Theme versions this adapter was verified on. Empty = not verified yet. */
  verified: string[];
}

const ADAPTERS: ThemeAdapter[] = [
  {
    id: "dawn",
    themes: [
      "Dawn",
      "Refresh",
      "Sense",
      "Craft",
      "Studio",
      "Taste",
      "Origin",
      "Crave",
      "Colorblock",
      "Ride",
      "Spotlight",
      "Publisher",
    ],
    trigger: "header-drawer summary, .header__icon--menu",
    verified: [],
  },
  {
    id: "horizon",
    themes: [
      "Horizon",
      "Atelier",
      "Dwell",
      "Fabric",
      "Heritage",
      "Pitch",
      "Savor",
      "Tinker",
      "Vessel",
      "Ritual",
    ],
    trigger:
      ".header__icon--menu, .menu-drawer-container > summary, header-drawer summary",
    verified: [],
  },
  {
    id: "impulse",
    themes: ["Impulse", "Motion", "Streamline", "Expanse"],
    trigger: ".js-drawer-open-nav, [aria-controls='NavDrawer']",
    verified: [],
  },
  {
    id: "prestige",
    themes: ["Prestige", "Focal", "Warehouse", "Impact"],
    trigger:
      "[aria-controls='sidebar-menu'], [aria-controls='header-sidebar-menu'], [aria-controls='mobile-menu-drawer'], [aria-controls='mobile-menu']",
    verified: [],
  },
  {
    id: "broadcast",
    themes: ["Broadcast", "Pipeline", "Palo Alto"],
    trigger:
      "[data-drawer-toggle='hamburger'], .header__mobile__hamburger, [aria-controls='header-menu-drawer']",
    verified: [],
  },
];

/** Used for themes without an adapter. Only ever applies below the breakpoint. */
const GENERIC_TRIGGER = [
  "[aria-controls*='menu-drawer' i]",
  "[aria-controls*='menudrawer' i]",
  "[aria-controls*='mobile-menu' i]",
  "[aria-controls*='mobile-nav' i]",
  "[aria-controls*='navdrawer' i]",
  ".header__icon--menu",
  ".js-drawer-open-nav",
  ".mobile-menu-toggle",
  ".mobile-nav-toggle",
  "header-drawer summary",
].join(", ");

function findAdapter(schemaName: string | undefined): ThemeAdapter | undefined {
  if (!schemaName) return undefined;
  const name = schemaName.toLowerCase();
  return ADAPTERS.find((adapter) =>
    adapter.themes.some((theme) => theme.toLowerCase() === name),
  );
}

/** The trigger selector to use: the merchant's override, the theme adapter, then the generic list. */
export function triggerSelector(
  schemaName: string | undefined,
  override?: string,
): string {
  if (override?.trim()) return override.trim();
  const adapter = findAdapter(schemaName);
  return adapter ? `${adapter.trigger}, ${GENERIC_TRIGGER}` : GENERIC_TRIGGER;
}
