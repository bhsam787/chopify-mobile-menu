import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { syncPlan } from "../services/billing.server";

/**
 * A subscription was approved, cancelled, frozen, expired or changed plan.
 * The payload isn't trusted for the plan: it's re-read from Shopify, which
 * also makes duplicate or out-of-order deliveries harmless. The storefront
 * entitlement is rewritten when the plan changed, so the live menu turns on
 * or off right away.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, admin } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);
  // No admin context: the app was uninstalled (its data goes with it).
  if (!admin) return new Response();
  try {
    await syncPlan(admin, shop, { force: true });
  } catch (error) {
    // Shopify retries a failed delivery; the next app visit re-reads it too.
    console.error(`Plan sync failed for ${shop}`, error);
    return new Response(null, { status: 500 });
  }
  return new Response();
};
