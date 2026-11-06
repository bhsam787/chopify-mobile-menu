import type { Design, ListLayout } from "@chopify/menu-core";
import { describeLink, mapNode } from "@chopify/menu-core";
import {
  ColorField,
  FieldRow,
  NumberField,
  SelectField,
  SwitchField,
  TextField,
} from "../editor/controls";
import {
  itemImage,
  itemLink,
  itemTitle,
  setItemTitle,
  type ListFrame,
} from "./items";
import { reorder, SortableItem, SortableList } from "../editor/Sortable";
import {
  addItem,
  moveItem,
  relayout,
  removeItem,
  setListLayout,
  styleAllLike,
} from "./lists";

const DIRECTIONS: { value: ListLayout["direction"]; label: string }[] = [
  { value: "column", label: "Under each other" },
  { value: "row", label: "Side by side (swipe)" },
  { value: "grid", label: "Grid" },
];

/**
 * The Items panel of a smart list, for merchants who don't design: every
 * item with its title and where it goes, buttons to add, reorder and remove
 * items, and a sub-menu per item (which can have sub-menus of its own).
 */
export function ListPanel({
  design,
  list,
  selectedId,
  onChange,
  onSelect,
  onOpenScreen,
  onAddSubMenu,
}: {
  design: Design;
  list: ListFrame;
  /** The selected item, if it's one of this list's. */
  selectedId: string | null;
  onChange: (design: Design, key?: string) => void;
  onSelect: (id: string) => void;
  onOpenScreen: (screenId: string) => void;
  onAddSubMenu: (itemId: string) => void;
}) {
  const items = list.children ?? [];
  const selectedItem = items.find((item) => item.id === selectedId);
  const screenTitle = (screenId: string) =>
    design.screens.find((screen) => screen.id === screenId)?.title ||
    "Untitled sub-menu";

  return (
    <s-stack gap="base">
      <s-stack gap="small-200">
        <s-heading>Items ({items.length})</s-heading>
        <s-text color="subdued">
          Each item is a link. Give it a sub-menu to show more items when
          it&apos;s tapped; sub-menus can have sub-menus too.
        </s-text>
      </s-stack>

      {/* Drag the handle to reorder (the arrows do the same from the keyboard). */}
      <SortableList
        ids={items.map((item) => item.id)}
        onReorder={(activeId, overId) =>
          onChange(relayout(reorder(design, activeId, overId), list.id))
        }
      >
        <div className="cve-items">
          {items.map((item, index) => {
            const link = itemLink(item);
            const image = itemImage(item);
            const opensScreen = link?.type === "screen" ? link.screenId : null;
            return (
              <SortableItem key={item.id} id={item.id} label={itemTitle(item)}>
                {(handle) => (
                  <div
                    className={`cve-item${item.id === selectedId ? " is-selected" : ""}`}
                  >
                    <div className="cve-item__main">
                      {handle}
                      {image?.url ? (
                        <img
                          className="cve-item__thumb"
                          src={image.url}
                          alt=""
                        />
                      ) : (
                        <span className="cve-item__thumb" aria-hidden="true" />
                      )}
                      <TextField
                        label={`Item ${index + 1} title`}
                        labelAccessibilityVisibility="exclusive"
                        value={itemTitle(item)}
                        onChange={(title) =>
                          onChange(
                            mapNode(design, item.id, (node) =>
                              setItemTitle(node, title),
                            ),
                            `${item.id}:title`,
                          )
                        }
                      />
                    </div>
                    <div className="cve-item__meta">
                      <button
                        type="button"
                        className="cve-item__link"
                        title="Select it to change where it goes"
                        onClick={() => onSelect(item.id)}
                      >
                        {opensScreen
                          ? `Opens sub-menu “${screenTitle(opensScreen)}”`
                          : link
                            ? `Goes to ${describeLink(link)}`
                            : "No link"}
                      </button>
                      <span className="cve-item__actions">
                        {opensScreen ? (
                          <s-button
                            variant="tertiary"
                            icon="arrow-right"
                            onClick={() => onOpenScreen(opensScreen)}
                          >
                            Open sub-menu
                          </s-button>
                        ) : (
                          <s-button
                            variant="tertiary"
                            icon="plus"
                            onClick={() => onAddSubMenu(item.id)}
                          >
                            Add sub-menu
                          </s-button>
                        )}
                        <s-button
                          variant="tertiary"
                          icon="arrow-up"
                          accessibilityLabel={`Move ${itemTitle(item)} up`}
                          disabled={index === 0}
                          onClick={() =>
                            onChange(moveItem(design, item.id, -1))
                          }
                        />
                        <s-button
                          variant="tertiary"
                          icon="arrow-down"
                          accessibilityLabel={`Move ${itemTitle(item)} down`}
                          disabled={index === items.length - 1}
                          onClick={() => onChange(moveItem(design, item.id, 1))}
                        />
                        <s-button
                          variant="tertiary"
                          tone="critical"
                          icon="delete"
                          accessibilityLabel={`Remove ${itemTitle(item)}`}
                          disabled={items.length <= 1}
                          onClick={() => onChange(removeItem(design, item.id))}
                        />
                      </span>
                    </div>
                  </div>
                )}
              </SortableItem>
            );
          })}
        </div>
      </SortableList>

      <s-stack direction="inline" gap="small-200">
        <s-button
          icon="plus"
          onClick={() => {
            const result = addItem(design, list.id, selectedItem?.id);
            onChange(result.design);
            if (result.itemId) onSelect(result.itemId);
          }}
        >
          Add item
        </s-button>
        {selectedItem && (
          <s-button
            onClick={() => onChange(styleAllLike(design, selectedItem.id))}
          >
            Make all items look like this one
          </s-button>
        )}
      </s-stack>

      <s-stack gap="small-300">
        <s-text type="strong">Layout</s-text>
        <FieldRow>
          <SelectField
            label="Items"
            value={list.list.direction}
            options={DIRECTIONS}
            onChange={(direction) =>
              onChange(setListLayout(design, list.id, { direction }))
            }
          />
          <NumberField
            label="Space between"
            value={list.list.gap}
            min={0}
            max={80}
            suffix="px"
            onChange={(gap) =>
              onChange(
                setListLayout(design, list.id, { gap: gap ?? 0 }),
                `${list.id}:gap`,
              )
            }
          />
        </FieldRow>
        <FieldRow>
          <SwitchField
            label="Lines between items"
            checked={Boolean(list.list.divider)}
            onChange={(on) =>
              onChange(
                setListLayout(design, list.id, {
                  divider: on ? "rgba(0,0,0,0.12)" : undefined,
                }),
              )
            }
          />
          {list.list.divider ? (
            <ColorField
              label="Line color"
              value={list.list.divider}
              onChange={(divider) =>
                onChange(
                  setListLayout(design, list.id, {
                    divider: divider || undefined,
                  }),
                  `${list.id}:divider`,
                )
              }
            />
          ) : (
            <span />
          )}
        </FieldRow>
        {list.list.direction === "grid" && (
          <NumberField
            label="Columns"
            value={list.list.columns ?? 2}
            min={1}
            max={4}
            onChange={(columns) =>
              onChange(
                setListLayout(design, list.id, { columns: columns ?? 2 }),
              )
            }
          />
        )}
        <s-text color="subdued">
          Items line up by themselves. Drag one on the canvas to change the
          order; resizing one resizes them all.
        </s-text>
      </s-stack>
    </s-stack>
  );
}
