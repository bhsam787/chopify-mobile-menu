import { useState } from "react";
import type { ResourceLink } from "@chopi/menu-core";

interface PickedCollection {
  id: string;
  handle: string;
  title: string;
}

/**
 * Picks the collection whose products a section shows (product cards, story
 * circles) with Shopify's own collection picker.
 */
export function CollectionField({
  value,
  details,
  onChange,
}: {
  value: ResourceLink<"collection"> | undefined;
  details: string;
  onChange: (collection: ResourceLink<"collection"> | undefined) => void;
}) {
  const [busy, setBusy] = useState(false);
  const pick = async () => {
    setBusy(true);
    try {
      const selection = (await shopify.resourcePicker({
        type: "collection",
        action: "select",
        multiple: false,
        selectionIds: value ? [{ id: value.id }] : undefined,
      })) as PickedCollection[] | undefined;
      const picked = selection?.[0];
      if (picked)
        onChange({
          type: "collection",
          id: picked.id,
          handle: picked.handle,
          title: picked.title,
          url: `/collections/${picked.handle}`,
        });
    } finally {
      setBusy(false);
    }
  };

  return (
    <s-stack gap="small-200">
      <s-text type="strong">Collection</s-text>
      {value ? (
        <s-box padding="small" border="base" borderRadius="base">
          <s-stack direction="inline" gap="small-200" alignItems="center">
            <s-icon type="collection" />
            <s-box inlineSize="100%">
              <s-text>{value.title}</s-text>
            </s-box>
            <s-button variant="tertiary" loading={busy} onClick={pick}>
              Change
            </s-button>
            <s-button
              variant="tertiary"
              icon="x"
              accessibilityLabel="Remove collection"
              onClick={() => onChange(undefined)}
            />
          </s-stack>
        </s-box>
      ) : (
        <s-button icon="collection" loading={busy} onClick={pick}>
          Choose collection
        </s-button>
      )}
      <s-text color="subdued">{details}</s-text>
    </s-stack>
  );
}
