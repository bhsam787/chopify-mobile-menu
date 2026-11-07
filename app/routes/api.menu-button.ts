import type { ActionFunctionArgs } from "react-router";
import { unauthenticated } from "../shopify.server";
import {
  cleanSelector,
  saveMenuButton,
  verifyPick,
} from "../services/menu-button.server";

/**
 * Receives the menu icon a merchant picked in their store window. It runs on
 * the storefront's origin, so there's no session: the signed pick token says
 * which shop and theme it's for. Sent as text/plain (no CORS preflight).
 */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const reply = (status: number, body: Record<string, unknown>) =>
  Response.json(body, { status, headers: CORS });

export const loader = () => reply(405, { ok: false });

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: CORS });
  if (request.method !== "POST") return reply(405, { ok: false });

  let input: { token?: unknown; selector?: unknown; theme?: unknown };
  try {
    input = JSON.parse((await request.text()).slice(0, 4000));
  } catch {
    return reply(400, { ok: false, error: "Bad request" });
  }
  const claims = verifyPick(input.token);
  if (!claims)
    return reply(401, {
      ok: false,
      error: "This window has expired. Start again from the app.",
    });
  const selector = cleanSelector(input.selector);
  if (!selector)
    return reply(400, { ok: false, error: "That element can't be used." });
  // The window must be showing the theme it was opened for.
  if (String(input.theme) !== claims.theme)
    return reply(409, {
      ok: false,
      error: "This window shows a different theme. Start again from the app.",
    });

  try {
    const { admin } = await unauthenticated.admin(claims.shop);
    await saveMenuButton(admin, claims.theme, selector);
    return reply(200, { ok: true });
  } catch (error) {
    console.error(`Menu button save failed for ${claims.shop}`, error);
    return reply(500, {
      ok: false,
      error: "Couldn't save it. Please try again.",
    });
  }
};
