import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";

export type Admin = AdminApiContext;

export class ShopifyUserError extends Error {
  constructor(public errors: { field?: string[] | null; message: string }[]) {
    super(errors.map((error) => error.message).join("; "));
    this.name = "ShopifyUserError";
  }
}

/**
 * Runs an Admin GraphQL operation and returns `data`, throwing on GraphQL errors.
 * Pass `T` for typed results; untyped operations default to a loose shape.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function gql<T = any>(
  admin: Admin,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await admin.graphql(
    query,
    variables ? { variables } : undefined,
  );
  const body = (await response.json()) as {
    data?: T;
    errors?: { message: string }[];
  };
  if (body.errors?.length) {
    throw new Error(body.errors.map((error) => error.message).join("; "));
  }
  return body.data as T;
}

export function assertNoUserErrors(
  errors: { field?: string[] | null; message: string }[] | undefined,
) {
  if (errors?.length) throw new ShopifyUserError(errors);
}
