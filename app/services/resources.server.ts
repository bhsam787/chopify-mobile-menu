import type {
  ResourceLink,
  ResourceNeed,
  ResourceType,
} from "@chopify/menu-core";
import { resourceKey } from "@chopify/menu-core";
import type { ResolvedResource } from "@chopify/menu-renderer";
import { gql, type Admin } from "./admin-graphql.server";

const RESOLVE_RESOURCES = `#graphql
  query ResolveResources($ids: [ID!]!, $withProducts: Boolean!) {
    nodes(ids: $ids) {
      __typename
      ... on Collection {
        id
        handle
        title
        image { url }
        products(first: 12) @include(if: $withProducts) {
          nodes {
            title
            handle
            featuredMedia { preview { image { url } } }
          }
        }
      }
      ... on Product {
        id
        handle
        title
        featuredMedia { preview { image { url } } }
      }
      ... on Page { id handle title }
      ... on Blog { id handle title }
      ... on Article {
        id
        handle
        title
        image { url }
        blog { handle }
      }
    }
  }
`;

interface ResourceNode {
  __typename: string;
  id: string;
  handle: string;
  title: string;
  image?: { url: string } | null;
  featuredMedia?: {
    preview?: { image?: { url: string } | null } | null;
  } | null;
  blog?: { handle: string };
  products?: {
    nodes: {
      title: string;
      handle: string;
      featuredMedia?: {
        preview?: { image?: { url: string } | null } | null;
      } | null;
    }[];
  };
}

const TYPE_BY_TYPENAME: Record<string, ResourceType> = {
  Collection: "collection",
  Product: "product",
  Page: "page",
  Blog: "blog",
  Article: "article",
};

export function storefrontPath(
  type: ResourceType,
  handle: string,
  blogHandle?: string,
): string {
  switch (type) {
    case "collection":
      return `/collections/${handle}`;
    case "product":
      return `/products/${handle}`;
    case "page":
      return `/pages/${handle}`;
    case "blog":
      return `/blogs/${handle}`;
    case "article":
      return `/blogs/${blogHandle ?? "news"}/${handle}`;
  }
}

/** Current data of store resources by GID (deleted ones are missing from the result). */
async function fetchResources(
  admin: Admin,
  ids: string[],
  withProducts = false,
): Promise<
  Map<
    string,
    {
      link: ResourceLink;
      image?: string;
      products?: ResolvedResource["products"];
    }
  >
> {
  const result = new Map<
    string,
    {
      link: ResourceLink;
      image?: string;
      products?: ResolvedResource["products"];
    }
  >();
  for (let start = 0; start < ids.length; start += 100) {
    const batch = ids.slice(start, start + 100);
    const data = await gql<{ nodes: (ResourceNode | null)[] }>(
      admin,
      RESOLVE_RESOURCES,
      { ids: batch, withProducts },
    );
    for (const node of data.nodes) {
      const type = node && TYPE_BY_TYPENAME[node.__typename];
      if (!node || !type) continue;
      result.set(node.id, {
        link: {
          type,
          id: node.id,
          handle: node.handle,
          title: node.title,
          url: storefrontPath(type, node.handle, node.blog?.handle),
        },
        image:
          node.image?.url ??
          node.featuredMedia?.preview?.image?.url ??
          undefined,
        products: node.products?.nodes.map((product) => ({
          title: product.title,
          url: storefrontPath("product", product.handle),
          image: product.featuredMedia?.preview?.image?.url ?? undefined,
        })),
      });
    }
  }
  return result;
}

/**
 * Same data the theme embed prints, built from the Admin API, so the editor
 * preview shows real titles, images and products.
 */
export async function resolvePreviewResources(
  admin: Admin,
  needs: ResourceNeed[],
): Promise<Record<string, ResolvedResource>> {
  const resolved: Record<string, ResolvedResource> = {};
  const withProducts = needs
    .filter((need) => need.withProducts)
    .map((need) => need.id);
  const plain = needs
    .filter((need) => !need.withProducts)
    .map((need) => need.id);
  const fetched = new Map([
    ...(await fetchResources(admin, plain)),
    ...(await fetchResources(admin, withProducts, true)),
  ]);
  for (const [, value] of fetched) {
    resolved[resourceKey(value.link.type, value.link.id)] = {
      url: value.link.url,
      title: value.link.title,
      image: value.image,
      products: value.products,
    };
  }
  return resolved;
}
