import type { Design } from "@chopi/menu-core";
import { isTemplateImage, replaceTemplateImages } from "@chopi/menu-core";
import { assertNoUserErrors, gql, type Admin } from "./admin-graphql.server";
import { wait } from "./files.server";

/**
 * Template sample images are served by the app (`/templates/…`) for previews.
 * On the first save they are copied into the merchant's Shopify Files (so they
 * show up in the Files gallery) and the design points at Shopify's CDN; publish
 * runs it again as a safety net. Storefronts never depend on the app server.
 * Images the merchant already replaced aren't copied.
 */

const CREATE_FILES = `#graphql
  mutation ImportTemplateImages($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files { id }
      userErrors { field message }
    }
  }
`;

const FILE_URLS = `#graphql
  query TemplateImageUrls($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on MediaImage {
        id
        fileStatus
        image { url }
      }
    }
  }
`;

function templateImagePaths(design: Design): string[] {
  const paths = new Set<string>();
  JSON.stringify(design, (key, value) => {
    if (key === "url" && typeof value === "string" && isTemplateImage(value))
      paths.add(value);
    return value;
  });
  return [...paths];
}

/** Shown to the merchant: some images weren't ready, publishing again works. */
export class ImagesProcessingError extends Error {
  constructor() {
    super(
      "Template images are still processing in Shopify. Please publish again in a moment.",
    );
    this.name = "ImagesProcessingError";
  }
}

/**
 * Copies the design's template images to Shopify Files. Images Shopify is
 * still processing after ~30 s stay as template paths (`pending`): callers
 * save the returned design anyway, so a retry only copies those, never the
 * finished ones again.
 */
export async function importTemplateImages(
  admin: Admin,
  design: Design,
): Promise<{
  design: Design;
  imported: number;
  pending: number;
  /** Template path → Shopify CDN URL, for each image copied. */
  urls: Record<string, string>;
}> {
  const paths = templateImagePaths(design);
  if (paths.length === 0) return { design, imported: 0, pending: 0, urls: {} };
  const appUrl = (process.env.SHOPIFY_APP_URL || "").replace(/\/$/, "");
  if (!appUrl)
    throw new Error(
      "SHOPIFY_APP_URL is not set; template images can't be copied to Shopify Files.",
    );

  const created = await gql(admin, CREATE_FILES, {
    files: paths.map((path) => ({
      originalSource: `${appUrl}${path}`,
      contentType: "IMAGE",
      alt: "",
    })),
  });
  assertNoUserErrors(created.fileCreate.userErrors);
  const ids: string[] = created.fileCreate.files.map(
    (file: { id: string }) => file.id,
  );

  // Shopify processes uploads asynchronously; wait until every image has a URL.
  const urls = new Map<string, string>();
  for (let attempt = 0; attempt < 30 && urls.size < ids.length; attempt++) {
    if (attempt > 0) await wait(1000);
    const data = await gql<{
      nodes: ({
        id: string;
        fileStatus: string;
        image: { url: string } | null;
      } | null)[];
    }>(admin, FILE_URLS, {
      ids: ids.filter((id) => !urls.has(id)),
    });
    for (const node of data.nodes) {
      if (node?.image?.url) urls.set(node.id, node.image.url);
      else if (node?.fileStatus === "FAILED")
        throw new Error(
          "Shopify couldn't process a template image. Replace it with your own image and try again.",
        );
    }
  }
  const copied: Record<string, string> = {};
  paths.forEach((path, index) => {
    const cdn = urls.get(ids[index]);
    if (cdn) copied[path] = cdn;
  });
  return {
    design: replaceTemplateImages(design, copied),
    imported: urls.size,
    pending: paths.length - urls.size,
    urls: copied,
  };
}
