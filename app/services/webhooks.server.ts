import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies a webhook from Shopify without loading the shop's session.
 *
 * `authenticate.webhook` also loads the offline session and, with expiring
 * offline tokens, refreshes an expired token first. After an uninstall that
 * refresh is refused, so `app/uninstalled` and `shop/redact` failed with a 500
 * on every retry. Those handlers only touch our database and need no Admin
 * API access, so they use this check instead: the HMAC signature of the raw
 * body with the app's secret, as Shopify documents for webhooks.
 */
export interface VerifiedWebhook {
  shop: string;
  /** As Shopify sends it, e.g. "app/uninstalled", "shop/redact". */
  topic: string;
}

const SHOP_DOMAIN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

export async function verifyWebhook(
  request: Request,
): Promise<VerifiedWebhook> {
  if (request.method !== "POST") throw new Response(null, { status: 405 });
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) throw new Error("SHOPIFY_API_SECRET is not set");

  const body = Buffer.from(await request.arrayBuffer());
  const signature = Buffer.from(
    request.headers.get("x-shopify-hmac-sha256") ?? "",
    "base64",
  );
  const expected = createHmac("sha256", secret).update(body).digest();
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(signature, expected)
  ) {
    throw new Response(null, { status: 401 });
  }

  const shop = request.headers.get("x-shopify-shop-domain") ?? "";
  const topic = request.headers.get("x-shopify-topic") ?? "";
  if (!SHOP_DOMAIN.test(shop) || !topic) {
    throw new Response(null, { status: 400 });
  }
  return { shop, topic };
}
