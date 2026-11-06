import type { ReactNode } from "react";

/**
 * Editable list of a widget's items (perks, contact buttons, ticker
 * messages): each in a box with its fields, buttons to move it up or down or
 * remove it, and an Add button.
 */
export function ItemList<T extends { id: string }>({
  label,
  items,
  min = 1,
  max = 8,
  addLabel,
  create,
  onChange,
  children,
}: {
  label: string;
  items: T[];
  min?: number;
  max?: number;
  addLabel: string;
  create: () => T;
  onChange: (items: T[]) => void;
  /** The fields of one item. */
  children: (item: T, index: number) => ReactNode;
}) {
  const move = (index: number, by: number) => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    onChange(next);
  };
  return (
    <s-stack gap="small-200">
      <s-text type="strong">{label}</s-text>
      {items.map((item, index) => (
        <s-box key={item.id} padding="small" border="base" borderRadius="base">
          <s-stack gap="small-200">
            {children(item, index)}
            <s-stack direction="inline" gap="small-100" justifyContent="end">
              <s-button
                variant="tertiary"
                icon="arrow-up"
                accessibilityLabel={`Move item ${index + 1} up`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              />
              <s-button
                variant="tertiary"
                icon="arrow-down"
                accessibilityLabel={`Move item ${index + 1} down`}
                disabled={index === items.length - 1}
                onClick={() => move(index, 1)}
              />
              <s-button
                variant="tertiary"
                tone="critical"
                icon="delete"
                accessibilityLabel={`Remove item ${index + 1}`}
                disabled={items.length <= min}
                onClick={() =>
                  onChange(
                    items.filter((candidate) => candidate.id !== item.id),
                  )
                }
              />
            </s-stack>
          </s-stack>
        </s-box>
      ))}
      {items.length < max && (
        <s-button icon="plus" onClick={() => onChange([...items, create()])}>
          {addLabel}
        </s-button>
      )}
    </s-stack>
  );
}
