import { assertNoUserErrors, gql, type Admin } from "./admin-graphql.server";

/**
 * The store's most searched terms, from Shopify's own search statistics
 * (ShopifyQL `search_queries`). They're saved in an app-data metafield the
 * theme embed reads, so live search shows them without any database and
 * opening the menu never waits for them.
 *
 * Reading them needs the `read_reports` scope and Shopify's approval for
 * protected customer data; without either, menus keep the merchant's own
 * popular searches only.
 */

const NAMESPACE = "chopi";
const KEY = "top_searches";
/** Refresh at most once a day. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
/** Searched at least this often in the last 30 days (no one-off terms). */
const MIN_SEARCHES = 3;
const MAX_TERMS = 12;

const TOP_SEARCHES = `#graphql
  query TopSearches($query: String!) {
    shopifyqlQuery(query: $query) {
      tableData {
        columns { name dataType }
        rows
      }
      parseErrors
    }
  }
`;

const CURRENT = `#graphql
  query CurrentTopSearches {
    currentAppInstallation {
      id
      metafield(namespace: "chopi", key: "top_searches") { value }
    }
  }
`;

const SET_METAFIELD = `#graphql
  mutation SetTopSearches($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { key }
      userErrors { field message }
    }
  }
`;

export type TopSearches =
  | { available: true; terms: string[]; updatedAt: string }
  | { available: false; terms: string[] };

interface Stored {
  terms: string[];
  updatedAt: string;
}

/**
 * Whether a shopper's search can be shown to other shoppers: no emails,
 * phone numbers, links or order numbers, nothing too short or too long.
 */
function presentable(term: string): boolean {
  if (term.length < 2 || term.length > 40) return false;
  if (/@|https?:|www\.|\.(com|net|org)\b/i.test(term)) return false;
  if (/^[#\d\s+().-]+$/.test(term)) return false;
  if ((term.match(/\d/g) ?? []).length >= 6) return false;
  return true;
}

/** Reads the top terms from Shopify; throws when the app may not read them. */
async function queryTopSearches(admin: Admin): Promise<string[]> {
  const data = await gql<{
    shopifyqlQuery: {
      tableData: { rows: Record<string, unknown>[] } | null;
      parseErrors: string[];
    };
  }>(admin, TOP_SEARCHES, {
    query: `FROM search_queries SHOW search_queries GROUP BY search_query HAVING search_queries >= ${MIN_SEARCHES} SINCE -30d ORDER BY search_queries DESC LIMIT 40`,
  });
  const result = data.shopifyqlQuery;
  if (result.parseErrors.length || !result.tableData)
    throw new Error(result.parseErrors.join("; ") || "No search data");
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const row of result.tableData.rows) {
    const term = String(row.search_query ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    if (!presentable(term) || seen.has(term)) continue;
    seen.add(term);
    terms.push(term);
    if (terms.length >= MAX_TERMS) break;
  }
  return terms;
}

/**
 * The store's top searches, refreshed from Shopify when the saved ones are
 * older than a day (or `force`). Never throws: when the statistics can't be
 * read, the last saved terms (if any) are returned as unavailable.
 */
export async function topSearches(
  admin: Admin,
  { force = false } = {},
): Promise<TopSearches> {
  let installationId: string;
  let stored: Stored | null = null;
  try {
    const data = await gql<{
      currentAppInstallation: {
        id: string;
        metafield: { value: string } | null;
      };
    }>(admin, CURRENT);
    installationId = data.currentAppInstallation.id;
    const value = data.currentAppInstallation.metafield?.value;
    stored = value ? (JSON.parse(value) as Stored) : null;
  } catch {
    return { available: false, terms: [] };
  }

  const fresh =
    stored && Date.now() - new Date(stored.updatedAt).getTime() < MAX_AGE_MS;
  if (stored && fresh && !force)
    return {
      available: true,
      terms: stored.terms,
      updatedAt: stored.updatedAt,
    };

  try {
    const terms = await queryTopSearches(admin);
    const next: Stored = { terms, updatedAt: new Date().toISOString() };
    const result = await gql(admin, SET_METAFIELD, {
      metafields: [
        {
          ownerId: installationId,
          namespace: NAMESPACE,
          key: KEY,
          type: "json",
          value: JSON.stringify(next),
        },
      ],
    });
    assertNoUserErrors(result.metafieldsSet.userErrors);
    return { available: true, ...next };
  } catch {
    // No permission (yet) or Shopify's statistics are unavailable: keep what
    // was saved before, so the storefront doesn't lose its terms.
    return { available: false, terms: stored?.terms ?? [] };
  }
}
