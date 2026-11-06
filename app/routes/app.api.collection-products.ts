import type { LoaderFunctionArgs } from "react-router";
import { resourceKey } from "@chopi/menu-core";
import { authenticate } from "../shopify.server";
import { resolvePreviewResources } from "../services/resources.server";

const COLLECTION_GID = /^gid:\/\/shopify\/Collection\/\d+$/;

/**
 * A collection with its products (photo, title, price), for the editor
 * preview right after a merchant picks it for product cards or story circles.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!COLLECTION_GID.test(id))
    return Response.json({ error: "Invalid collection" }, { status: 400 });
  const key = resourceKey("collection", id);
  const resources = await resolvePreviewResources(admin, [
    { key, type: "collection", id, title: "", withProducts: true },
  ]);
  const resource = resources[key];
  if (!resource)
    return Response.json({ error: "Collection not found" }, { status: 404 });
  return Response.json({ key, resource });
};
