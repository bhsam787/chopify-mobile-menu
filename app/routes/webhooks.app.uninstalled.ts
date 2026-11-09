import type { ActionFunctionArgs } from "react-router";
import { markShopUninstalled } from "../models/shop.server";
import { verifyWebhook } from "../services/webhooks.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  // Not `authenticate.webhook`: it would refresh the shop's expired token,
  // which Shopify refuses once the app is uninstalled (see verifyWebhook).
  const { shop, topic } = await verifyWebhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Idempotent: Shopify can deliver this more than once, also after the
  // sessions are already gone.
  await markShopUninstalled(shop);

  return new Response();
};
