import type { Shop } from "@prisma/client";
import type { Design } from "@chopi/menu-core";
import prisma from "../db.server";
import type { Admin } from "./admin-graphql.server";
import { gql } from "./admin-graphql.server";
import {
  billingConfigured,
  fetchActiveSubscription,
} from "./partner-api.server";
import { writeEntitlement } from "./publish.server";
import {
  livePlan,
  planAllows,
  planForHandle,
  requiredPlan,
  usesCanvas,
  type PaidPlanKey,
  type PlanKey,
} from "../billing/plans";

/** How long a plan read from Shopify is trusted (Shopify suggests ~5 minutes). */
const FRESH_MS = 5 * 60 * 1000;

const SHOP_BILLING = `#graphql
  query ShopBilling {
    shop {
      id
      plan {
        partnerDevelopment
      }
    }
  }
`;

export interface PlanState {
  /** The plan the merchant chose (Shopify App Pricing). */
  plan: PlanKey;
  /** A development store: unrestricted, whatever `plan` is. */
  devStore: boolean;
  /** What counts for publishing and the live theme. */
  livePlan: PlanKey;
  trialEndsAt: string | null;
  cancelAtEndOfCycle: boolean;
}

const stateOf = (shop: Shop): PlanState => ({
  plan: shop.plan,
  devStore: shop.isDevStore,
  livePlan: livePlan(shop.plan, shop.isDevStore),
  trialEndsAt: shop.trialEndsAt?.toISOString() ?? null,
  cancelAtEndOfCycle: shop.cancelAtEndOfCycle,
});

/** The plan as last read (no request to Shopify). */
export async function storedPlan(shopDomain: string): Promise<PlanState> {
  return stateOf(
    await prisma.shop.findUniqueOrThrow({ where: { shop: shopDomain } }),
  );
}

/**
 * The shop's plan, read from Shopify App Pricing when the stored one is
 * older than a few minutes (or `force`, e.g. right after a plan change).
 * When it changed, the storefront's entitlement is rewritten so a menu the
 * plan no longer covers stops showing. Throws if Shopify can't be reached:
 * callers decide whether the stored plan is good enough.
 */
export async function syncPlan(
  admin: Admin,
  shopDomain: string,
  { force = false }: { force?: boolean } = {},
): Promise<PlanState> {
  const shop = await prisma.shop.findUniqueOrThrow({
    where: { shop: shopDomain },
  });
  const fresh =
    shop.planCheckedAt && Date.now() - shop.planCheckedAt.getTime() < FRESH_MS;
  if ((fresh && !force) || !billingConfigured()) return stateOf(shop);

  // Also re-read whether it's a development store: one handed over to a
  // merchant stops being unrestricted.
  const { shop: shopNode } = await gql<{
    shop: { id: string; plan: { partnerDevelopment: boolean } };
  }>(admin, SHOP_BILLING);
  const isDevStore = Boolean(shopNode.plan?.partnerDevelopment);
  const subscription = await fetchActiveSubscription(shopNode.id);
  let plan: PlanKey = "FREE";
  if (subscription) {
    const plans = subscription.items
      .map((item) => planForHandle(item.handle))
      .filter((key): key is PaidPlanKey => key !== null);
    // A paid plan we don't know (renamed in the Partner Dashboard) still
    // counts as paid: never block a paying merchant over a handle.
    plan = plans.includes("PRO") ? "PRO" : "STARTER";
    if (!plans.length)
      console.warn(
        `Unknown plan handle for ${shopDomain}: ${subscription.items.map((item) => item.handle).join(", ")}`,
      );
  }
  // Storefront first: if this write fails the stored plan stays old, so the
  // next check sees the change again and retries instead of skipping it.
  if (plan !== shop.plan || isDevStore !== shop.isDevStore)
    await refreshEntitlement(admin, { ...shop, plan, isDevStore });
  const updated = await prisma.shop.update({
    where: { id: shop.id },
    data: {
      plan,
      trialEndsAt: subscription?.trialEndsAt
        ? new Date(subscription.trialEndsAt)
        : null,
      cancelAtEndOfCycle: subscription?.cancelAtEndOfCycle ?? false,
      planCheckedAt: new Date(),
      isDevStore,
    },
  });
  return stateOf(updated);
}

/**
 * The plan for gating: fresh from Shopify when possible, else the stored one
 * (a short Partner API outage shouldn't stop merchants from working).
 */
export async function currentPlan(
  admin: Admin,
  shopDomain: string,
  options?: { force?: boolean },
): Promise<PlanState & { checkFailed: boolean }> {
  try {
    return {
      ...(await syncPlan(admin, shopDomain, options)),
      checkFailed: false,
    };
  } catch (error) {
    console.error(`Plan check failed for ${shopDomain}`, error);
    return { ...(await storedPlan(shopDomain)), checkFailed: true };
  }
}

/** Rewrites the storefront's entitlement for the shop's live menu. */
async function refreshEntitlement(admin: Admin, shop: Shop) {
  const live = await prisma.menu.findFirst({
    where: { shopId: shop.id, publishedAt: { not: null } },
    select: { published: true },
  });
  const liveUsesCanvas = Boolean(
    live?.published && usesCanvas(live.published as unknown as Design),
  );
  await writeEntitlement(
    admin,
    livePlan(shop.plan, shop.isDevStore),
    liveUsesCanvas,
  );
}

/** What publishing this menu needs, and whether the plan has it. */
export function publishCheck(plan: PlanKey, design: Design) {
  const required = requiredPlan(design);
  return { required, allowed: planAllows(plan, required) };
}

/**
 * Whether the live menu (if any) is covered by the plan, i.e. actually
 * showing on the store. Null when nothing is published.
 */
export async function liveMenuCovered(
  shopDomain: string,
  plan: PlanKey,
): Promise<{ covered: boolean; required: PaidPlanKey } | null> {
  const live = await prisma.menu.findFirst({
    where: { shop: { shop: shopDomain }, publishedAt: { not: null } },
    select: { published: true },
  });
  if (!live?.published) return null;
  const required = requiredPlan(live.published as unknown as Design);
  return { covered: planAllows(plan, required), required };
}
