import type { MenuReferences, ReferenceType } from "@chopify/menu-core";
import {
  assertReferenceLimits,
  REFERENCE_CHUNK,
  REFERENCE_CHUNKS,
  REFERENCE_TYPES,
} from "@chopify/menu-core";
import { assertNoUserErrors, gql, type Admin } from "./admin-graphql.server";

/**
 * The live menu's linked resources, stored by ID in app-owned shop
 * metafields. The theme embed reads them as
 * `shop.metafields["$app:chopify"]` and Shopify resolves each ID when the page
 * renders, so URLs, titles and images are always current: a renamed handle
 * needs no republish, and a deleted resource simply drops out.
 */
export const REFERENCE_NAMESPACE = "$app:chopify";

/** "collection_1" … "collection_4": Liquid reads 50 references per list. */
const chunkKey = (type: ReferenceType, index: number) => `${type}_${index + 1}`;
const PRODUCT_COLLECTIONS_KEY = "product_collections";

const ALL_KEYS = [
  ...REFERENCE_TYPES.flatMap((type) =>
    Array.from({ length: REFERENCE_CHUNKS }, (_, index) =>
      chunkKey(type, index),
    ),
  ),
  PRODUCT_COLLECTIONS_KEY,
];

const SHOP_ID = `#graphql
  query ShopId {
    shop { id }
  }
`;

const SET_METAFIELDS = `#graphql
  mutation SetReferenceMetafields($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { key }
      userErrors { field message }
    }
  }
`;

const DELETE_METAFIELDS = `#graphql
  mutation DeleteReferenceMetafields($metafields: [MetafieldIdentifierInput!]!) {
    metafieldsDelete(metafields: $metafields) {
      deletedMetafields { key }
      userErrors { field message }
    }
  }
`;

async function shopId(admin: Admin): Promise<string> {
  const data = await gql(admin, SHOP_ID);
  return data.shop.id;
}

/** Replaces the stored references with `references` (empty lists are removed). */
export async function writeMenuReferences(
  admin: Admin,
  references: MenuReferences,
) {
  assertReferenceLimits(references);
  const ownerId = await shopId(admin);
  const lists = new Map<string, { type: string; ids: string[] }>();
  for (const type of REFERENCE_TYPES) {
    const ids = references.ids[type];
    for (let index = 0; index * REFERENCE_CHUNK < ids.length; index++) {
      lists.set(chunkKey(type, index), {
        type: `list.${type}_reference`,
        ids: ids.slice(index * REFERENCE_CHUNK, (index + 1) * REFERENCE_CHUNK),
      });
    }
  }
  if (references.productCollections.length)
    lists.set(PRODUCT_COLLECTIONS_KEY, {
      type: "list.collection_reference",
      ids: references.productCollections,
    });

  if (lists.size) {
    const result = await gql(admin, SET_METAFIELDS, {
      metafields: [...lists].map(([key, list]) => ({
        ownerId,
        namespace: REFERENCE_NAMESPACE,
        key,
        type: list.type,
        value: JSON.stringify(list.ids),
      })),
    });
    assertNoUserErrors(result.metafieldsSet.userErrors);
  }
  // Lists the menu no longer needs (deleting a missing one is a no-op).
  const unused = ALL_KEYS.filter((key) => !lists.has(key));
  if (unused.length) await deleteKeys(admin, ownerId, unused);
}

/** Removes all stored references (the menu was taken off the store). */
export async function deleteMenuReferences(admin: Admin) {
  await deleteKeys(admin, await shopId(admin), ALL_KEYS);
}

async function deleteKeys(admin: Admin, ownerId: string, keys: string[]) {
  const result = await gql(admin, DELETE_METAFIELDS, {
    metafields: keys.map((key) => ({
      ownerId,
      namespace: REFERENCE_NAMESPACE,
      key,
    })),
  });
  assertNoUserErrors(result.metafieldsDelete.userErrors);
}
