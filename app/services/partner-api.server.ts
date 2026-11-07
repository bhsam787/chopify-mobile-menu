/**
 * Shopify App Pricing reads: the shop's active plan comes from the Partner
 * API (App Pricing sends no billing webhooks and isn't in the Admin API).
 *
 * Needs, in the environment:
 * - SHOPIFY_PARTNER_ORG_ID: the number in your Partner Dashboard URL
 * - SHOPIFY_PARTNER_API_ACCESS_TOKEN: a Partner API client with "Manage apps"
 * - SHOPIFY_APP_GID: gid://shopify/App/<the app's numeric ID>
 * - SHOPIFY_APP_HANDLE: the app's handle (for the plan selection page URL)
 */

const API_VERSION = "2026-10";

const ACTIVE_SUBSCRIPTION = `#graphql
  query ActiveSubscription($appId: ID!, $shopId: ID!) {
    activeSubscription(appId: $appId, shopId: $shopId) {
      trialEndsAt
      cancelAtEndOfCycle
      items {
        handle
      }
    }
  }
`;

export interface ActiveSubscription {
  trialEndsAt: string | null;
  cancelAtEndOfCycle: boolean;
  items: { handle: string | null }[];
}

/** Whether the Partner API credentials are set (plans can be read). */
export function billingConfigured(): boolean {
  return Boolean(
    process.env.SHOPIFY_PARTNER_ORG_ID &&
    process.env.SHOPIFY_PARTNER_API_ACCESS_TOKEN &&
    process.env.SHOPIFY_APP_GID,
  );
}

export class PartnerApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PartnerApiError";
  }
}

/**
 * The shop's active App Pricing subscription, or null when it has none.
 * Throws on failures and throttling (4 requests/second per client): a
 * failed check must never be read as "no plan" for a paying merchant.
 */
export async function fetchActiveSubscription(
  shopGid: string,
): Promise<ActiveSubscription | null> {
  if (!billingConfigured())
    throw new PartnerApiError("Partner API credentials aren't set.");
  const response = await fetch(
    `https://partners.shopify.com/${process.env.SHOPIFY_PARTNER_ORG_ID}/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": process.env.SHOPIFY_PARTNER_API_ACCESS_TOKEN!,
      },
      body: JSON.stringify({
        query: ACTIVE_SUBSCRIPTION,
        variables: { appId: process.env.SHOPIFY_APP_GID, shopId: shopGid },
      }),
    },
  );
  const body = (await response.json().catch(() => null)) as {
    data?: { activeSubscription: ActiveSubscription | null };
    errors?: unknown;
  } | null;
  if (!response.ok || !body?.data || body.errors)
    throw new PartnerApiError(
      `Partner API request failed (${response.status}): ${JSON.stringify(body?.errors ?? null)}`,
    );
  return body.data.activeSubscription;
}

/**
 * Shopify's hosted plan selection page for the shop (outside the app frame:
 * open it in the top window). Null when the app handle isn't set.
 */
export function planSelectionUrl(shopDomain: string): string | null {
  const appHandle = process.env.SHOPIFY_APP_HANDLE;
  if (!appHandle) return null;
  const storeHandle = shopDomain.replace(/\.myshopify\.com$/, "");
  return `https://admin.shopify.com/store/${encodeURIComponent(storeHandle)}/charges/${encodeURIComponent(appHandle)}/pricing_plans`;
}
