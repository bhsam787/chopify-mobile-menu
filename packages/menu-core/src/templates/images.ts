import type { ImageRef } from "../types";
import manifest from "./images.json";

/**
 * Sample images used by the templates, served by the app from
 * `public/templates/` for previews and copied into the merchant's Shopify
 * Files when the menu is saved. `images.json` lists every image with its file
 * and the prompt used to (re)generate it.
 *
 * Photos are original generated stand-ins (same crops and subjects as the
 * Figma frames, with invented labels). Prompts live in images.json.
 */
export const TEMPLATE_IMAGE_PATH = "/templates/";

export type TemplateImageName = (typeof manifest)[number]["name"];

export const TEMPLATE_IMAGES: {
  name: string;
  file: string;
  prompt: string;
  tint: string;
  source: string;
}[] = manifest;

export function templateImage(name: TemplateImageName, alt = ""): ImageRef {
  // Looked up on demand (no module-level work), so storefront bundles that
  // import menu-core don't pull in the manifest.
  const file =
    manifest.find((image) => image.name === name)?.file ?? `${name}.svg`;
  return { url: `${TEMPLATE_IMAGE_PATH}${file}`, alt };
}

export function isTemplateImage(url: string): boolean {
  return url.startsWith(TEMPLATE_IMAGE_PATH);
}
