import type { ActionFunctionArgs } from "react-router";
import { deleteShopData } from "../models/shop.server";
import { verifyWebhook } from "../services/webhooks.server";

/**
 * Mandatory GDPR compliance webhooks. The app stores no customer data, so
 * customer requests need no action; `shop/redact` deletes all shop data.
 * Verified without the shop's session: `shop/redact` arrives 48 hours after
 * the uninstall, when the shop's token can no longer be refreshed. A wrong
 * HMAC is rejected with 401.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await verifyWebhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  switch (topic) {
    case "customers/data_request":
    case "customers/redact":
      break;
    case "shop/redact":
      await deleteShopData(shop);
      break;
    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  return new Response();
};
