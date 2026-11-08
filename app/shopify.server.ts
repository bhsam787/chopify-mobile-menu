import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  BillingInterval,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import { syncShop } from "./models/shop.server";
import { PAID_PLANS, TRIAL_DAYS } from "./billing/plans";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October26,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  // Recurring plans, charged through Shopify (Billing API): the merchant
  // approves the charge in Shopify and pays it on their Shopify bill.
  billing: Object.fromEntries(
    PAID_PLANS.map((plan) => [
      plan.name,
      {
        trialDays: TRIAL_DAYS,
        lineItems: [
          {
            amount: plan.amount,
            currencyCode: "USD",
            interval: BillingInterval.Every30Days,
          },
        ],
      },
    ]),
  ),
  future: {
    expiringOfflineAccessTokens: true,
  },
  hooks: {
    afterAuth: async ({ session, admin }) => {
      await syncShop(session.shop, admin);
    },
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const login = shopify.login;
/** Admin API access without a request session (e.g. the storefront menu-button picker). */
export const unauthenticated = shopify.unauthenticated;
