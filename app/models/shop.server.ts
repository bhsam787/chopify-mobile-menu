import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";

const SHOP_SYNC_QUERY = `#graphql
  query ShopSync {
    shop {
      plan {
        partnerDevelopment
      }
    }
  }
`;

/**
 * Creates or refreshes the shop's row after OAuth. Runs on install and on
 * re-install, so it also clears a previous uninstall.
 */
export async function syncShop(shop: string, admin: AdminApiContext) {
  const response = await admin.graphql(SHOP_SYNC_QUERY);
  const { data } = await response.json();
  const isDevStore = Boolean(data?.shop?.plan?.partnerDevelopment);

  await prisma.shop.upsert({
    where: { shop },
    create: { shop, isDevStore },
    update: { isDevStore, uninstalledAt: null },
  });
}

/**
 * The shop's row, created on the fly if it's missing (e.g. installed before
 * the row existed, or the `afterAuth` hook didn't run for this token).
 */
export async function ensureShop(shop: string, admin: AdminApiContext) {
  const existing = await prisma.shop.findUnique({ where: { shop } });
  if (existing && !existing.uninstalledAt) return existing;
  await syncShop(shop, admin);
  return prisma.shop.findUniqueOrThrow({ where: { shop } });
}

/**
 * Called from `app/uninstalled`. Sessions are deleted right away; the shop's
 * designs stay until Shopify sends `shop/redact` (48 hours later), so a quick
 * re-install doesn't lose the merchant's work.
 */
export async function markShopUninstalled(shop: string) {
  await prisma.$transaction([
    prisma.session.deleteMany({ where: { shop } }),
    prisma.shop.updateMany({
      where: { shop },
      data: { uninstalledAt: new Date() },
    }),
  ]);
}

/** Called from `shop/redact`: removes everything we store for the shop. */
export async function deleteShopData(shop: string) {
  await prisma.$transaction([
    prisma.session.deleteMany({ where: { shop } }),
    // Menus and versions are removed by cascade.
    prisma.shop.deleteMany({ where: { shop } }),
  ]);
}
