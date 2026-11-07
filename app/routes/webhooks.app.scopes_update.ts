import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  const current = payload.current as string[];

  if (session) {
    // updateMany: the session may already be gone (uninstalled), and a
    // throw here would only make Shopify retry the webhook.
    await prisma.session.updateMany({
      where: { id: session.id },
      data: { scope: current.toString() },
    });
  }

  return new Response();
};
