import type { Shop } from "@prisma/client";
import type { Design } from "@chopi/menu-core";
import prisma from "../db.server";
import type { Admin } from "./admin-graphql.server";
import { gql } from "./admin-graphql.server";
import { writeEntitlement } from "./publish.server";
import {
  livePlan,
  planAllows,
  planForName,
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
    currentAppInstallation {
      activeSubscriptions {
        id
        name
        status
        test
        trialDays
        createdAt
      }
    }
  }
`;

interface Subscription {
  id: string;
  name: string;
  status: string;
  test: boolean;
  trialDays: number;
  createdAt: string;
}

/**
 * Test charges are free and only made on development stores (see the
 * pricing page): elsewhere they don't count, so no one gets a plan for free.
 */
export const testChargesFor = (isDevStore: boolean) =>
  isDevStore || process.env.SHOPIFY_BILLING_TEST === "true";

export interface PlanState {
  /** The plan the merchant subscribed to (Billing API). */
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
async function storedPlan(shopDomain: string): Promise<PlanState> {
  return stateOf(
    await prisma.shop.findUniqueOrThrow({ where: { shop: shopDomain } }),
  );
}

/**
 * The shop's plan, read from its active Billing API subscription when the
 * stored one is older than a few minutes (or `force`: on the pricing page
 * and when Shopify reports a subscription change). When it changed, the
 * storefront's entitlement is rewritten so a menu the plan no longer covers
 * stops showing. Throws if Shopify can't be reached: callers decide whether
 * the stored plan is good enough.
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
  if (fresh && !force) return stateOf(shop);

  // Also re-read whether it's a development store: one handed over to a
  // merchant stops being unrestricted.
  const data = await gql<{
    shop: { id: string; plan: { partnerDevelopment: boolean } };
    currentAppInstallation: { activeSubscriptions: Subscription[] };
  }>(admin, SHOP_BILLING);
  const isDevStore = Boolean(data.shop.plan?.partnerDevelopment);
  const subscriptions = data.currentAppInstallation.activeSubscriptions.filter(
    (subscription) =>
      subscription.status === "ACTIVE" &&
      (!subscription.test || testChargesFor(isDevStore)),
  );
  const plans = subscriptions
    .map((subscription) => planForName(subscription.name))
    .filter((key): key is PaidPlanKey => key !== null);
  let plan: PlanKey = plans.includes("PRO")
    ? "PRO"
    : plans.length
      ? "STARTER"
      : "FREE";
  // A paid subscription we don't know (a renamed plan) still counts as paid:
  // never block a paying merchant over a name.
  if (plan === "FREE" && subscriptions.length) {
    plan = "STARTER";
    console.warn(
      `Unknown plan for ${shopDomain}: ${subscriptions.map((subscription) => subscription.name).join(", ")}`,
    );
  }
  const current = subscriptions.find(
    (subscription) => planForName(subscription.name) === plan,
  );
  const trialEnd = current?.trialDays
    ? new Date(
        new Date(current.createdAt).getTime() +
          current.trialDays * 24 * 60 * 60 * 1000,
      )
    : null;

  // Storefront first: if this write fails the stored plan stays old, so the
  // next check sees the change again and retries instead of skipping it.
  if (plan !== shop.plan || isDevStore !== shop.isDevStore)
    await refreshEntitlement(admin, { ...shop, plan, isDevStore });
  const updated = await prisma.shop.update({
    where: { id: shop.id },
    data: {
      plan,
      trialEndsAt: trialEnd && trialEnd > new Date() ? trialEnd : null,
      // Billing API cancellations take effect right away.
      cancelAtEndOfCycle: false,
      planCheckedAt: new Date(),
      isDevStore,
    },
  });
  return stateOf(updated);
}

/**
 * The plan for gating: fresh from Shopify when possible, else the stored one
 * (a short Shopify outage shouldn't stop merchants from working).
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
