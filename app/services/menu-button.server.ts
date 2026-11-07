import { createHmac, timingSafeEqual } from "node:crypto";
import { gql, ShopifyUserError, type Admin } from "./admin-graphql.server";
import { APP_DATA_NAMESPACE, setMetafields } from "./metafields.server";

/**
 * "Menu button" fix for themes whose menu icon isn't found automatically.
 * The merchant points at the icon in a phone-sized window of their store
 * (the storefront can't be framed in the admin), and the picker there sends
 * the icon's selector back to `/api/menu-button` with a signed, short-lived
 * pick token. Selectors are kept per theme in the app-data metafield
 * `chopi.menu_buttons` ({ "<theme id>": { selector, theme, pickedAt } }),
 * which the app embed hands to the storefront loader.
 */

const KEY = "menu_buttons";
const EMBED_BLOCK = "/blocks/menu-embed/";
/** The theme extension's uid (extensions/chopi-menu/shopify.extension.toml). */
const EXTENSION_UID = "db6280b5-1632-146f-59f9-2e076028ba1df2eb456c";
/** How long a pick window stays valid. */
const PICK_TTL_MS = 60 * 60 * 1000;
const SELECTOR_MAX = 300;

/**
 * One picked icon. The whole map is printed on every storefront page, so it
 * holds nothing private (no theme names: the app lists those itself).
 */
export interface MenuButton {
  selector: string;
  pickedAt: string;
}
export type MenuButtons = Record<string, MenuButton>;

export interface StoreTheme {
  /** Numeric theme id, as the storefront sees it (`Shopify.theme.id`). */
  id: string;
  name: string;
  live: boolean;
  updatedAt: string;
}

/** Whether the Mobile menu app embed is on, by theme id (null: unknown). */
export type EmbedStatuses = Record<string, boolean | null>;

/** Stores on Shopify Plus can have up to 100 themes; this is a safe cap. */
const MAX_THEMES = 250;

const THEMES = `#graphql
  query ThemesForMenuButton($after: String) {
    themes(first: 100, after: $after, roles: [MAIN, UNPUBLISHED]) {
      nodes {
        id
        name
        role
        processing
        updatedAt
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const EMBED_STATUS = `#graphql
  query ThemeEmbedStatus($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on OnlineStoreTheme {
        id
        files(filenames: ["config/settings_data.json"], first: 1) {
          nodes {
            body {
              ... on OnlineStoreThemeFileBodyText {
                content
              }
            }
          }
        }
      }
    }
  }
`;

const MENU_BUTTONS = `#graphql
  query MenuButtons {
    currentAppInstallation {
      id
      metafield(namespace: "chopi", key: "menu_buttons") {
        value
        compareDigest
      }
    }
  }
`;

/**
 * Whether settings_data.json turns our app embed on. The file may start
 * with a comment, and `current` may name a preset instead of holding the
 * settings.
 */
function embedOn(settingsData: string | undefined): boolean | null {
  if (!settingsData) return null;
  try {
    const data = JSON.parse(settingsData.replace(/^\s*\/\*[\s\S]*?\*\//, ""));
    const current =
      typeof data.current === "string"
        ? data.presets?.[data.current]
        : data.current;
    const blocks = Object.values(current?.blocks ?? {}) as {
      type?: string;
      disabled?: boolean;
    }[];
    // Block types look like "shopify://apps/<app>/blocks/menu-embed/<id>".
    // Prefer blocks that carry our extension's id; another app's block with
    // the same common name must not count as ours.
    const embeds = blocks.filter((block) => block.type?.includes(EMBED_BLOCK));
    const ours = embeds.filter((block) => block.type?.includes(EXTENSION_UID));
    return (ours.length ? ours : embeds).some(
      (block) => block.disabled !== true,
    );
  } catch {
    return null;
  }
}

/**
 * Every theme, the live one first, then drafts by last edit. Only names and
 * dates: reading each theme's settings would be slow on stores with many.
 */
export async function listThemes(admin: Admin): Promise<StoreTheme[]> {
  const themes: StoreTheme[] = [];
  let after: string | null = null;
  do {
    const data: {
      themes: {
        nodes: {
          id: string;
          name: string;
          role: string;
          processing: boolean;
          updatedAt: string;
        }[];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    } = await gql(admin, THEMES, { after });
    for (const theme of data.themes.nodes)
      if (!theme.processing)
        themes.push({
          id: theme.id.split("/").pop() ?? theme.id,
          name: theme.name,
          live: theme.role === "MAIN",
          updatedAt: theme.updatedAt,
        });
    after = data.themes.pageInfo.hasNextPage
      ? data.themes.pageInfo.endCursor
      : null;
  } while (after && themes.length < MAX_THEMES);
  return themes.sort(
    (a, b) =>
      Number(b.live) - Number(a.live) || b.updatedAt.localeCompare(a.updatedAt),
  );
}

/** App embed status for a few themes (the ones on screen). */
export async function embedStatuses(
  admin: Admin,
  themeIds: string[],
): Promise<EmbedStatuses> {
  const ids = themeIds.filter((id) => /^\d+$/.test(id)).slice(0, 20);
  if (!ids.length) return {};
  const data = await gql<{
    nodes: ({
      id: string;
      files: { nodes: { body: { content?: string } }[] };
    } | null)[];
  }>(admin, EMBED_STATUS, {
    ids: ids.map((id) => `gid://shopify/OnlineStoreTheme/${id}`),
  });
  const statuses: EmbedStatuses = {};
  for (const node of data.nodes)
    if (node?.id)
      statuses[node.id.split("/").pop()!] = embedOn(
        node.files.nodes[0]?.body.content,
      );
  return statuses;
}

async function readStored(admin: Admin): Promise<{
  ownerId: string;
  buttons: MenuButtons;
  digest: string | null;
}> {
  const data = await gql<{
    currentAppInstallation: {
      id: string;
      metafield: { value: string; compareDigest: string } | null;
    };
  }>(admin, MENU_BUTTONS);
  const metafield = data.currentAppInstallation.metafield;
  let buttons: MenuButtons = {};
  try {
    if (metafield?.value) buttons = JSON.parse(metafield.value) as MenuButtons;
  } catch {
    // A broken value is replaced on the next save.
  }
  return {
    ownerId: data.currentAppInstallation.id,
    buttons,
    digest: metafield?.compareDigest ?? null,
  };
}

export async function readMenuButtons(admin: Admin): Promise<MenuButtons> {
  return (await readStored(admin)).buttons;
}

/**
 * Read, change, write, guarded by the metafield's digest: two picks saved at
 * the same moment (two themes, two tabs) can't overwrite each other; the
 * loser reads again and retries.
 */
async function writeMenuButtons(
  admin: Admin,
  change: (buttons: MenuButtons) => MenuButtons,
) {
  for (let attempt = 0; ; attempt++) {
    const { ownerId, buttons, digest } = await readStored(admin);
    try {
      await setMetafields(admin, [
        {
          ownerId,
          namespace: APP_DATA_NAMESPACE,
          key: KEY,
          type: "json",
          value: JSON.stringify(change(buttons)),
          compareDigest: digest,
        },
      ]);
      return;
    } catch (error) {
      if (attempt >= 2 || !(error instanceof ShopifyUserError)) throw error;
    }
  }
}

/**
 * A selector the storefront can use safely: one line, short, and nothing
 * that could end a CSS rule or an HTML element. Null when unusable.
 */
export function cleanSelector(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const selector = value.trim();
  if (!selector || selector.length > SELECTOR_MAX) return null;
  // Backslashes are fine: CSS.escape uses them (ids starting with a digit,
  // "md:hidden" classes). Braces, semicolons, "<" and line breaks are not.
  if (/[<{};\n\r]/.test(selector)) return null;
  // Catch-alls would turn every button or link into the menu icon.
  if (/^(\*|[a-z]+)$/i.test(selector)) return null;
  return selector;
}

export function saveMenuButton(
  admin: Admin,
  themeId: string,
  selector: string,
) {
  return writeMenuButtons(admin, (buttons) => ({
    ...buttons,
    [themeId]: { selector, pickedAt: new Date().toISOString() },
  }));
}

export function removeMenuButton(admin: Admin, themeId: string) {
  return writeMenuButtons(admin, (buttons) => {
    const rest = { ...buttons };
    delete rest[themeId];
    return rest;
  });
}

/*
 * Pick tokens: the store window proves it was opened from the app for this
 * shop and theme, without a session (it runs on the storefront's origin).
 */

interface PickClaims {
  shop: string;
  theme: string;
  name: string;
  exp: number;
}

const base64url = (value: string | Buffer) =>
  Buffer.from(value).toString("base64url");

function signature(payload: string): string {
  const secret = process.env.SHOPIFY_API_SECRET;
  // Never sign (or accept) tokens with an empty key: anyone could forge them.
  if (!secret) throw new Error("SHOPIFY_API_SECRET is not set");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signPick(
  shop: string,
  theme: { id: string; name: string },
): string {
  const payload = base64url(
    JSON.stringify({
      shop,
      theme: theme.id,
      name: theme.name,
      exp: Date.now() + PICK_TTL_MS,
    } satisfies PickClaims),
  );
  return `${payload}.${signature(payload)}`;
}

/** The token's claims, or null when it's forged, malformed or expired. */
export function verifyPick(token: unknown): PickClaims | null {
  if (typeof token !== "string" || token.length > 1000) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  let expected: Buffer;
  try {
    expected = Buffer.from(signature(payload));
  } catch {
    return null;
  }
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given))
    return null;
  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as PickClaims;
    if (typeof claims.exp !== "number" || claims.exp < Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}
