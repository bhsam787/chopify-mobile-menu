import type { Prisma } from "@prisma/client";
import type { Design } from "@chopify/menu-core";
import { compile } from "@chopify/menu-core";
import prisma from "../db.server";
import { assertNoUserErrors, gql, type Admin } from "./admin-graphql.server";
import { deleteMenuReferences, writeMenuReferences } from "./references.server";
import { importTemplateImages } from "./template-images.server";

/** Namespace of the app-data metafields the theme embed reads (`app.metafields.chopify.*`). */
export const METAFIELD_NAMESPACE = "chopify";

const APP_INSTALLATION = `#graphql
  query AppInstallation {
    currentAppInstallation { id }
  }
`;

const SET_METAFIELDS = `#graphql
  mutation SetMenuMetafields($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { key }
      userErrors { field message }
    }
  }
`;

const DELETE_METAFIELDS = `#graphql
  mutation DeleteMenuMetafields($metafields: [MetafieldIdentifierInput!]!) {
    metafieldsDelete(metafields: $metafields) {
      deletedMetafields { key }
      userErrors { field message }
    }
  }
`;

async function installationId(admin: Admin): Promise<string> {
  const data = await gql(admin, APP_INSTALLATION);
  return data.currentAppInstallation.id;
}

/** Plan flags the storefront checks (written on publish and on plan changes). */
export function entitlementValue(shop: { plan: string; isDevStore: boolean }) {
  return {
    plan: shop.plan.toLowerCase(),
    live_allowed: shop.plan === "PRO" || shop.isDevStore,
  };
}

export async function writeEntitlement(
  admin: Admin,
  shop: { plan: string; isDevStore: boolean },
) {
  const result = await gql(admin, SET_METAFIELDS, {
    metafields: [
      {
        ownerId: await installationId(admin),
        namespace: METAFIELD_NAMESPACE,
        key: "entitlement",
        type: "json",
        value: JSON.stringify(entitlementValue(shop)),
      },
    ],
  });
  assertNoUserErrors(result.metafieldsSet.userErrors);
}

/**
 * Publishes a menu to the storefront: compiles it, writes the linked
 * resources as reference metafields and the menu as an app-data metafield,
 * and records a version.
 */
export async function publishMenu(
  admin: Admin,
  shopDomain: string,
  menuId: string,
) {
  const menu = await prisma.menu.findFirstOrThrow({
    where: { id: menuId, shop: { shop: shopDomain } },
    include: { shop: true },
  });
  // Sample images from templates move to the merchant's Shopify Files first.
  const imported = await importTemplateImages(
    admin,
    menu.draft as unknown as Design,
  );
  const design = imported.design;
  if (imported.imported > 0) {
    await prisma.menu.update({
      where: { id: menu.id },
      data: { draft: design as unknown as Prisma.InputJsonValue },
    });
  }
  const { menu: published, translations, references, bytes } = compile(design);

  // Linked collections, products, pages and posts, by ID: the theme resolves
  // their current URLs, titles and images when the page renders.
  await writeMenuReferences(admin, references);

  const ownerId = await installationId(admin);
  const result = await gql(admin, SET_METAFIELDS, {
    metafields: [
      {
        ownerId,
        namespace: METAFIELD_NAMESPACE,
        key: "menu",
        type: "json",
        value: JSON.stringify(published),
      },
      {
        ownerId,
        namespace: METAFIELD_NAMESPACE,
        key: "entitlement",
        type: "json",
        value: JSON.stringify(entitlementValue(menu.shop)),
      },
    ],
  });
  assertNoUserErrors(result.metafieldsSet.userErrors);
  await writeTranslations(admin, ownerId, translations);

  await prisma.$transaction([
    // Only one menu is live per store.
    prisma.menu.updateMany({
      where: { shopId: menu.shopId, id: { not: menu.id } },
      data: { publishedAt: null },
    }),
    prisma.menu.update({
      where: { id: menu.id },
      data: {
        published: published as unknown as Prisma.InputJsonValue,
        publishedAt: new Date(),
      },
    }),
    prisma.menuVersion.create({
      data: {
        menuId: menu.id,
        design: design as unknown as Prisma.InputJsonValue,
        label: "Published",
      },
    }),
  ]);

  return { bytes, design, importedImages: imported.imported };
}

/** Takes the menu off the storefront; the theme's own menu shows again. */
export async function unpublishMenu(admin: Admin) {
  const ownerId = await installationId(admin);
  const result = await gql(admin, DELETE_METAFIELDS, {
    metafields: [{ ownerId, namespace: METAFIELD_NAMESPACE, key: "menu" }],
  });
  assertNoUserErrors(result.metafieldsDelete.userErrors);
  await deleteMenuReferences(admin);
  await writeTranslations(admin, ownerId, {});
}

/** Metafield key of one language's texts ("t_de", "t_pt-BR"). */
export const translationKey = (locale: string) => `t_${locale}`;

const TRANSLATION_KEYS = `#graphql
  query MenuTranslationKeys {
    currentAppInstallation {
      metafields(first: 100, namespace: "chopify") {
        nodes { key }
      }
    }
  }
`;

/**
 * One app-data metafield per language, so the theme loads only the shopper's
 * language. Languages that were removed are deleted.
 */
async function writeTranslations(
  admin: Admin,
  ownerId: string,
  translations: Record<string, Record<string, string>>,
) {
  const wanted = Object.entries(translations).map(([locale, texts]) => ({
    ownerId,
    namespace: METAFIELD_NAMESPACE,
    key: translationKey(locale),
    type: "json",
    value: JSON.stringify(texts),
  }));
  // metafieldsSet takes 25 at a time.
  for (let index = 0; index < wanted.length; index += 25) {
    const result = await gql(admin, SET_METAFIELDS, {
      metafields: wanted.slice(index, index + 25),
    });
    assertNoUserErrors(result.metafieldsSet.userErrors);
  }
  const existing = await gql<{
    currentAppInstallation: { metafields: { nodes: { key: string }[] } };
  }>(admin, TRANSLATION_KEYS);
  const keep = new Set(wanted.map((metafield) => metafield.key));
  const stale = existing.currentAppInstallation.metafields.nodes
    .map((metafield) => metafield.key)
    .filter((key) => key.startsWith("t_") && !keep.has(key));
  if (stale.length) {
    const result = await gql(admin, DELETE_METAFIELDS, {
      metafields: stale.map((key) => ({
        ownerId,
        namespace: METAFIELD_NAMESPACE,
        key,
      })),
    });
    assertNoUserErrors(result.metafieldsDelete.userErrors);
  }
}
