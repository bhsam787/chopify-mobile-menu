import { walkDesign, type Design } from "@chopi/menu-core";

/**
 * The app's plans, shared by the server (gating, the Billing API config in
 * shopify.server.ts) and the UI (pricing page, publish dialog). Charged
 * through Shopify's Billing API: a recurring subscription every 30 days.
 */
export type PlanKey = "FREE" | "STARTER" | "PRO";
export type PaidPlanKey = Exclude<PlanKey, "FREE">;

export const TRIAL_DAYS = 14;

export interface PaidPlan {
  key: PaidPlanKey;
  /** Shown on Shopify's approval screen and the merchant's bill; it identifies the plan. */
  name: string;
  /** In USD, every 30 days. */
  amount: number;
  price: string;
  tagline: string;
  features: string[];
}

export const PAID_PLANS: PaidPlan[] = [
  {
    key: "STARTER",
    name: "Starter",
    amount: 9.99,
    price: "$9.99",
    tagline: "Show your template menus on your live store",
    features: [
      "Template and section menus on your live theme",
      "Live search, translations and custom CSS on your store",
      "Links that stay up to date by themselves",
      "Every template, ready to fill in",
    ],
  },
  {
    key: "PRO",
    name: "Pro",
    amount: 14.99,
    price: "$14.99",
    tagline: "Everything in Starter, plus your own free-form designs",
    features: [
      "Everything in Starter",
      "Free-form canvas menus on your live theme",
      "Place text, images, shapes and widgets anywhere",
      "Canvas sub-menus, designed the same way",
    ],
  },
];

export const PLAN_NAMES: Record<PlanKey, string> = {
  FREE: "Free",
  STARTER: "Starter",
  PRO: "Pro",
};

const RANK: Record<PlanKey, number> = { FREE: 0, STARTER: 1, PRO: 2 };

/** The plan a Billing API subscription stands for (null: not one of ours). */
export function planForName(name: string | null | undefined) {
  return PAID_PLANS.find((plan) => plan.name === name)?.key ?? null;
}

/** Whether the menu has a free-form canvas anywhere (it then needs Pro). */
export function usesCanvas(design: Design): boolean {
  let found = false;
  walkDesign(design, (node) => {
    if (node.type === "canvas") found = true;
  });
  return found;
}

/** The lowest plan that can publish this menu. */
export function requiredPlan(design: Design): PaidPlanKey {
  return usesCanvas(design) ? "PRO" : "STARTER";
}

/**
 * The plan that counts for publishing and the live theme. Development
 * stores are unrestricted (partners and app reviewers test everything),
 * whatever plan they chose.
 */
export function livePlan(plan: PlanKey, isDevStore: boolean): PlanKey {
  return isDevStore ? "PRO" : plan;
}

export function planAllows(plan: PlanKey, required: PlanKey): boolean {
  return RANK[plan] >= RANK[required];
}
