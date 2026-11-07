import { assertNoUserErrors, gql, type Admin } from "./admin-graphql.server";

/** Namespace of the app-data metafields the theme embed reads (`app.metafields.chopi.*`). */
export const APP_DATA_NAMESPACE = "chopi";

/** metafieldsSet accepts at most 25 metafields per call. */
const SET_BATCH = 25;

const SET_METAFIELDS = `#graphql
  mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      userErrors { field message }
    }
  }
`;

const DELETE_METAFIELDS = `#graphql
  mutation DeleteMetafields($metafields: [MetafieldIdentifierInput!]!) {
    metafieldsDelete(metafields: $metafields) {
      userErrors { field message }
    }
  }
`;

interface MetafieldIdentifier {
  ownerId: string;
  namespace: string;
  key: string;
}

export interface MetafieldInput extends MetafieldIdentifier {
  type: string;
  value: string;
  /** Write only if the stored value still has this digest (null: absent). */
  compareDigest?: string | null;
}

/** Writes metafields in batches, throwing on any user error. */
export async function setMetafields(
  admin: Admin,
  metafields: MetafieldInput[],
) {
  for (let index = 0; index < metafields.length; index += SET_BATCH) {
    const result = await gql(admin, SET_METAFIELDS, {
      metafields: metafields.slice(index, index + SET_BATCH),
    });
    assertNoUserErrors(result.metafieldsSet.userErrors);
  }
}

/** Deletes metafields (deleting a missing one is a no-op). */
export async function deleteMetafields(
  admin: Admin,
  metafields: MetafieldIdentifier[],
) {
  if (!metafields.length) return;
  const result = await gql(admin, DELETE_METAFIELDS, { metafields });
  assertNoUserErrors(result.metafieldsDelete.userErrors);
}
