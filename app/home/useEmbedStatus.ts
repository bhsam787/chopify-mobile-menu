import { useEffect, useState } from "react";

/** Handle of the app embed block (its Liquid file name). */
const EMBED_HANDLE = "menu-embed";

export type EmbedStatus = "loading" | "active" | "inactive" | "unknown";

/** Whether the merchant's live theme has the Chopi - Menu app embed turned on. */
export function useEmbedStatus(): EmbedStatus {
  const [status, setStatus] = useState<EmbedStatus>("loading");
  useEffect(() => {
    shopify.app
      .extensions()
      .then((extensions) => {
        // Theme app extension activations are blocks/embeds with a handle and status.
        const blocks = extensions
          .filter((extension) => extension.type === "theme_app_extension")
          .flatMap(
            (extension) =>
              extension.activations as unknown as {
                handle: string;
                status: string;
              }[],
          );
        const active = blocks.some(
          (block) => block.handle === EMBED_HANDLE && block.status === "active",
        );
        setStatus(active ? "active" : "inactive");
      })
      .catch(() => setStatus("unknown"));
  }, []);
  return status;
}

/** Theme editor deep link that opens App embeds with ours selected. */
export function embedEditorUrl(shop: string, apiKey: string): string {
  return `https://${shop}/admin/themes/current/editor?context=apps&activateAppId=${apiKey}/${EMBED_HANDLE}`;
}
