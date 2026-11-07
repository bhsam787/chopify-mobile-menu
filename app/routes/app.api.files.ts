import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { gql } from "../services/admin-graphql.server";

const PICKED_IMAGES = `#graphql
  query PickedImages($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on MediaImage {
        id
        alt
        image { url altText }
      }
    }
  }
`;

interface PickedImage {
  id?: string;
  alt?: string | null;
  image?: { url: string; altText: string | null } | null;
}

/**
 * Resolves files picked in Shopify's file picker (`pick:shopify/File`, which
 * only returns IDs) to image URLs. `?ids=gid,gid`
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const ids = (new URL(request.url).searchParams.get("ids") ?? "")
    .split(",")
    .filter((id) => id.startsWith("gid://shopify/MediaImage/"))
    .slice(0, 50);
  if (ids.length === 0) return Response.json({ files: [] });

  const data = await gql<{ nodes: (PickedImage | null)[] }>(
    admin,
    PICKED_IMAGES,
    { ids },
  );
  const files = data.nodes
    .filter((node): node is PickedImage & { id: string } => Boolean(node?.id))
    .map((node) => ({
      fileId: node.id,
      url: node.image?.url ?? null,
      alt: node.alt || node.image?.altText || "",
      // Freshly uploaded files may still be processing; the editor retries.
      ready: Boolean(node.image?.url),
    }));
  return Response.json({ files });
};
