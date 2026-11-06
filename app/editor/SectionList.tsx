import { useState, type ReactNode } from "react";
import type {
  ContainerNode,
  Design,
  ImageRef,
  LinkRef,
  Node,
} from "@chopify/menu-core";
import {
  addLinksInside,
  cloneWithNewIds,
  insertNode,
  isResourceLink,
  removeLinksInside,
  removeNode,
  resourceKey,
  shiftNode,
  updateNode,
  WIDGETS,
} from "@chopify/menu-core";
import type { ResolvedResource } from "@chopify/menu-renderer";
import { SwitchField } from "./controls";
import { reorder, SortableItem, SortableList } from "./Sortable";
import {
  isItemList,
  itemSubtitle,
  itemTitle,
  sectionIcon,
  sectionSummary,
  sectionTitle,
} from "./sections";

export interface ListContext {
  design: Design;
  resources: Record<string, ResolvedResource>;
  change: (design: Design) => void;
  /** Opens the item editor modal for a node. */
  editItem: (id: string) => void;
  /** Opens the design modal for a section/group. */
  designSection: (id: string) => void;
  /** Opens the full-screen canvas editor for a canvas section. */
  openCanvas: (id: string) => void;
  onResource: (key: string, resource: ResolvedResource) => void;
  /** Undoes the last change (offered after a delete). */
  undo: () => void;
}

/** Image shown for a node in lists: its own image, else the linked collection/product image. */
export function thumbnailOf(
  node: Node,
  resources: Record<string, ResolvedResource>,
): string | undefined {
  const own =
    "image" in node ? (node.image as ImageRef | undefined)?.url : undefined;
  if (own) return own;
  const link = "link" in node ? (node.link as LinkRef) : undefined;
  return link && isResourceLink(link)
    ? resources[resourceKey(link.type, link.id)]?.image
    : undefined;
}

// ---------------------------------------------------------------------------
// Adding items
// ---------------------------------------------------------------------------

interface PickedResource {
  id: string;
  handle: string;
  title: string;
  image?: { originalSrc?: string; url?: string } | null;
  images?: { originalSrc?: string; url?: string }[];
}

/** A new item styled like the container's existing items (falls back to the library default). */
function newItemLike(
  container: ContainerNode,
  content: { title: string; link: LinkRef },
): Node {
  const template = container.children.find(
    (child) => child.type !== "accordion" && child.type !== "container",
  );
  const fallback = () => {
    const type =
      container.layout === "scroll"
        ? "chip"
        : container.layout === "grid"
          ? "card"
          : "row";
    return WIDGETS.find((widget) => widget.type === type)!.create();
  };
  const base = template ? cloneWithNewIds(template) : fallback();
  const node = { ...base, name: undefined, hidden: undefined } as Node;
  switch (node.type) {
    case "card":
    case "row":
      return {
        ...node,
        title: content.title,
        subtitle: undefined,
        badge: undefined,
        image: undefined,
        useResourceImage: true,
        link: content.link,
      };
    case "chip":
      return {
        ...node,
        label: content.title,
        image: undefined,
        link: content.link,
      };
    case "button":
      return { ...node, label: content.title, link: content.link };
    case "pill":
      return { ...node, text: content.title, link: content.link };
    case "image":
      return { ...node, link: content.link };
    default:
      return node;
  }
}

async function pickMany(
  type: "collection" | "product",
  onResource: ListContext["onResource"],
) {
  const selection = (await shopify.resourcePicker({
    type,
    action: "add",
    multiple: true,
  })) as PickedResource[] | undefined;
  return (selection ?? []).map((picked) => {
    const url = `/${type === "collection" ? "collections" : "products"}/${picked.handle}`;
    const image =
      picked.image?.originalSrc ??
      picked.image?.url ??
      picked.images?.[0]?.originalSrc ??
      picked.images?.[0]?.url;
    onResource(resourceKey(type, picked.id), {
      url,
      title: picked.title,
      image,
    });
    return {
      title: picked.title,
      link: {
        type,
        id: picked.id,
        handle: picked.handle,
        title: picked.title,
        url,
      } as LinkRef,
    };
  });
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

function RowActions({
  node,
  index,
  count,
  ctx,
}: {
  node: Node;
  index: number;
  count: number;
  ctx: ListContext;
}) {
  const name = itemTitle(node);
  return (
    <s-stack direction="inline" gap="small-300" alignItems="center">
      <s-button
        icon="arrow-up"
        variant="tertiary"
        accessibilityLabel={`Move ${name} up`}
        disabled={index === 0}
        onClick={() => ctx.change(shiftNode(ctx.design, node.id, -1))}
      />
      <s-button
        icon="arrow-down"
        variant="tertiary"
        accessibilityLabel={`Move ${name} down`}
        disabled={index === count - 1}
        onClick={() => ctx.change(shiftNode(ctx.design, node.id, 1))}
      />
      <s-button
        icon={node.hidden ? "hide" : "view"}
        variant="tertiary"
        accessibilityLabel={node.hidden ? `Show ${name}` : `Hide ${name}`}
        onClick={() =>
          ctx.change(updateNode(ctx.design, node.id, { hidden: !node.hidden }))
        }
      />
      <s-button icon="edit" onClick={() => ctx.editItem(node.id)}>
        Edit
      </s-button>
      <s-button
        icon="delete"
        variant="tertiary"
        tone="critical"
        accessibilityLabel={`Delete ${name}`}
        onClick={() => ctx.change(removeNode(ctx.design, node.id))}
      />
    </s-stack>
  );
}

function ItemRow({
  node,
  index,
  count,
  ctx,
  handle,
  children,
}: {
  node: Node;
  index: number;
  count: number;
  ctx: ListContext;
  handle: ReactNode;
  children?: ReactNode;
}) {
  const image = thumbnailOf(node, ctx.resources);
  return (
    <div className="chm-enter">
      <s-box
        padding="small"
        background={node.hidden ? "subdued" : "base"}
        border="base"
        borderRadius="large"
      >
        <s-stack gap="small">
          <s-grid
            gridTemplateColumns="auto auto minmax(0, 1fr) auto"
            gap="small"
            alignItems="center"
          >
            {handle}
            {image ? (
              <s-thumbnail src={image} alt="" size="small" />
            ) : (
              <s-box
                padding="small-200"
                background="subdued"
                borderRadius="base"
              >
                <s-icon type={sectionIcon(node) as "link"} color="subdued" />
              </s-box>
            )}
            <s-stack gap="small-500">
              <s-stack direction="inline" gap="small-200" alignItems="center">
                <s-text type="strong" color={node.hidden ? "subdued" : "base"}>
                  {itemTitle(node)}
                </s-text>
                {"badge" in node && node.badge?.text ? (
                  <s-badge tone="critical">{node.badge.text}</s-badge>
                ) : null}
                {node.hidden ? (
                  <s-badge tone="warning" icon="hide">
                    Hidden
                  </s-badge>
                ) : null}
              </s-stack>
              <s-paragraph color="subdued" lineClamp={1}>
                {itemSubtitle(node)}
              </s-paragraph>
            </s-stack>
            <RowActions node={node} index={index} count={count} ctx={ctx} />
          </s-grid>
          {children}
        </s-stack>
      </s-box>
    </div>
  );
}

/**
 * The rows of a container: items as rows with actions, nested groups as
 * boxes with their own rows. Ends with "Add collections" / "Add link".
 */
export function NodeList({
  container,
  ctx,
  depth = 0,
  insideFoldOut = false,
}: {
  container: ContainerNode;
  ctx: ListContext;
  depth?: number;
  /** The links inside a fold-out: they can't fold out again. */
  insideFoldOut?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<Set<string>>(new Set());
  const items = container.children;
  const itemList = isItemList(container);
  // Only links listed under each other can fold out (not chips or cards).
  const canFoldOut = !insideFoldOut && container.layout === "stack";
  const toggleAccordion = (id: string, open: boolean) =>
    setOpenAccordions((current) => {
      const next = new Set(current);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });

  const add = async (type: "collection" | "product") => {
    setBusy(true);
    try {
      const picked = await pickMany(type, ctx.onResource);
      let next = ctx.design;
      for (const entry of picked)
        next = insertNode(next, container.id, newItemLike(container, entry));
      if (picked.length) ctx.change(next);
    } finally {
      setBusy(false);
    }
  };

  const addLink = () => {
    const node = newItemLike(container, {
      title: "New link",
      link: { type: "none" },
    });
    ctx.change(insertNode(ctx.design, container.id, node));
    ctx.editItem(node.id);
  };

  return (
    <s-stack gap="small-200">
      {items.length === 0 ? (
        <s-box
          padding="large"
          background="subdued"
          borderRadius="large"
          border="base"
          borderStyle="dashed"
        >
          <s-stack gap="small-200" alignItems="center">
            <s-icon type="collection" color="subdued" />
            <s-text color="subdued">
              Nothing here yet. Add collections or links below.
            </s-text>
          </s-stack>
        </s-box>
      ) : (
        <SortableList
          ids={items.map((node) => node.id)}
          onReorder={(active, over) =>
            ctx.change(reorder(ctx.design, active, over))
          }
        >
          <s-stack gap="small-200">
            {items.map((node, index) => (
              <SortableItem key={node.id} id={node.id} label={itemTitle(node)}>
                {(handle) => {
                  if (node.type === "container") {
                    return (
                      <s-box
                        padding="small"
                        background="subdued"
                        border="base"
                        borderRadius="large"
                      >
                        <s-stack gap="small">
                          <s-grid
                            gridTemplateColumns="auto auto minmax(0, 1fr) auto"
                            gap="small"
                            alignItems="center"
                          >
                            {handle}
                            <s-box
                              padding="small-200"
                              background="base"
                              borderRadius="base"
                            >
                              <s-icon type={sectionIcon(node) as "link"} />
                            </s-box>
                            <s-stack gap="small-500">
                              <s-text type="strong">
                                {sectionTitle(node)}
                              </s-text>
                              <s-paragraph color="subdued" lineClamp={1}>
                                {sectionSummary(node)}
                              </s-paragraph>
                            </s-stack>
                            <s-stack
                              direction="inline"
                              gap="small-300"
                              alignItems="center"
                            >
                              <s-button
                                icon="arrow-up"
                                variant="tertiary"
                                accessibilityLabel="Move up"
                                disabled={index === 0}
                                onClick={() =>
                                  ctx.change(shiftNode(ctx.design, node.id, -1))
                                }
                              />
                              <s-button
                                icon="arrow-down"
                                variant="tertiary"
                                accessibilityLabel="Move down"
                                disabled={index === items.length - 1}
                                onClick={() =>
                                  ctx.change(shiftNode(ctx.design, node.id, 1))
                                }
                              />
                              <s-button
                                icon="paint-brush-flat"
                                onClick={() => ctx.designSection(node.id)}
                              >
                                Design
                              </s-button>
                            </s-stack>
                          </s-grid>
                          <NodeList
                            container={node}
                            ctx={ctx}
                            depth={depth + 1}
                          />
                        </s-stack>
                      </s-box>
                    );
                  }
                  const accordionOpen = openAccordions.has(node.id);
                  return (
                    <ItemRow
                      node={node}
                      index={index}
                      count={items.length}
                      ctx={ctx}
                      handle={handle}
                    >
                      {node.type === "accordion" ? (
                        <s-stack gap="small-200">
                          <s-stack direction="inline" gap="small-200">
                            <s-button
                              variant="tertiary"
                              icon={
                                accordionOpen ? "chevron-up" : "chevron-down"
                              }
                              onClick={() =>
                                toggleAccordion(node.id, !accordionOpen)
                              }
                            >
                              {accordionOpen
                                ? "Hide links inside"
                                : `Links inside (${node.child.children.length})`}
                            </s-button>
                            {node.child.children.length <= 1 && (
                              <s-button
                                variant="tertiary"
                                icon="undo"
                                onClick={() =>
                                  ctx.change(
                                    removeLinksInside(ctx.design, node.id),
                                  )
                                }
                              >
                                Make it a single link again
                              </s-button>
                            )}
                          </s-stack>
                          {accordionOpen && (
                            <s-box paddingInlineStart="large-300">
                              <NodeList
                                container={node.child}
                                ctx={ctx}
                                depth={depth + 1}
                                insideFoldOut
                              />
                            </s-box>
                          )}
                        </s-stack>
                      ) : canFoldOut && node.type === "row" ? (
                        <s-stack direction="inline">
                          <s-button
                            variant="tertiary"
                            icon="plus"
                            onClick={() => {
                              const image = thumbnailOf(node, ctx.resources);
                              const result = addLinksInside(
                                ctx.design,
                                node.id,
                                image ? { url: image, alt: "" } : undefined,
                              );
                              ctx.change(result.design);
                              toggleAccordion(node.id, true);
                            }}
                          >
                            Add links inside
                          </s-button>
                        </s-stack>
                      ) : null}
                    </ItemRow>
                  );
                }}
              </SortableItem>
            ))}
          </s-stack>
        </SortableList>
      )}

      {(itemList || items.length === 0) && (
        <s-stack direction="inline" gap="small-200">
          <s-button
            icon="collection"
            loading={busy}
            onClick={() => add("collection")}
          >
            Add collections
          </s-button>
          <s-button
            icon="product"
            variant="tertiary"
            disabled={busy}
            onClick={() => add("product")}
          >
            Add products
          </s-button>
          <s-button icon="link" variant="tertiary" onClick={addLink}>
            Add link
          </s-button>
        </s-stack>
      )}
    </s-stack>
  );
}

// ---------------------------------------------------------------------------
// Section cards
// ---------------------------------------------------------------------------

export interface SectionCardProps {
  node: Node;
  number: number;
  /** Arrows are hidden for fixed sections (header, footer). */
  movable: boolean;
  isFirst: boolean;
  isLast: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ctx: ListContext;
  /** Drag handle (movable sections only). */
  handle?: ReactNode;
  /** "Customize" content. */
  children: ReactNode;
}

/** One numbered section: icon, name, summary, arrows, visibility, Design and Customize. */
export function SectionCard({
  node,
  number,
  movable,
  isFirst,
  isLast,
  open,
  onOpenChange,
  ctx,
  handle,
  children,
}: SectionCardProps) {
  const title = sectionTitle(node);
  const visible = !node.hidden;
  return (
    <s-section>
      <s-stack gap="base">
        <s-grid
          gridTemplateColumns="auto auto auto minmax(0, 1fr) auto"
          gap="base"
          alignItems="center"
        >
          {handle ?? <span className="chm-drag-spacer" />}
          <s-box
            background={open ? "strong" : "subdued"}
            borderRadius="large-100"
            paddingInline="small"
            paddingBlock="small-300"
          >
            <s-text type="strong">{String(number)}</s-text>
          </s-box>
          <s-box padding="small-200" background="subdued" borderRadius="base">
            <s-icon
              type={sectionIcon(node) as "link"}
              color={visible ? "base" : "subdued"}
            />
          </s-box>
          <s-stack gap="small-500">
            <s-stack direction="inline" gap="small-200" alignItems="center">
              <s-heading>{title}</s-heading>
              {!movable && (
                <s-badge tone="neutral" icon="lock">
                  Fixed position
                </s-badge>
              )}
              {!visible && <s-badge tone="warning">Hidden</s-badge>}
            </s-stack>
            <s-paragraph color="subdued" lineClamp={1}>
              {sectionSummary(node)}
            </s-paragraph>
          </s-stack>
          <s-stack direction="inline" gap="small-300" alignItems="center">
            {movable && (
              <>
                <s-button
                  icon="arrow-up"
                  variant="tertiary"
                  accessibilityLabel={`Move ${title} up`}
                  disabled={isFirst}
                  onClick={() => ctx.change(shiftNode(ctx.design, node.id, -1))}
                />
                <s-button
                  icon="arrow-down"
                  variant="tertiary"
                  accessibilityLabel={`Move ${title} down`}
                  disabled={isLast}
                  onClick={() => ctx.change(shiftNode(ctx.design, node.id, 1))}
                />
              </>
            )}
            {node.type !== "header" && (
              <SwitchField
                label={`Show ${title}`}
                labelAccessibilityVisibility="exclusive"
                checked={visible}
                onChange={(show) =>
                  ctx.change(updateNode(ctx.design, node.id, { hidden: !show }))
                }
              />
            )}
            <s-button
              icon="paint-brush-flat"
              onClick={() => ctx.designSection(node.id)}
            >
              Design
            </s-button>
            {node.type === "canvas" ? (
              <s-button
                icon="layout-block"
                variant="primary"
                onClick={() => ctx.openCanvas(node.id)}
              >
                Edit canvas
              </s-button>
            ) : (
              <s-button
                icon={open ? "chevron-up" : "chevron-down"}
                variant={open ? "secondary" : "primary"}
                onClick={() => onOpenChange(!open)}
              >
                {open ? "Close" : "Customize"}
              </s-button>
            )}
            {node.type !== "header" && (
              <>
                <s-button
                  icon="delete"
                  variant="tertiary"
                  tone="critical"
                  accessibilityLabel={`Delete ${title} and everything in it`}
                  interestFor={`delete-${node.id}`}
                  onClick={() => {
                    ctx.change(removeNode(ctx.design, node.id));
                    shopify.toast.show(`${title} deleted`, {
                      action: "Undo",
                      onAction: ctx.undo,
                    });
                  }}
                />
                {/* Outside the row's layout: a shown tooltip must not take a gap slot (the buttons would shift). */}
                <span className="chm-tooltip-anchor">
                  <s-tooltip id={`delete-${node.id}`}>
                    Delete section and everything in it
                  </s-tooltip>
                </span>
              </>
            )}
          </s-stack>
        </s-grid>
        {open && (
          <div className="chm-enter">
            <s-stack gap="base">
              <s-divider />
              {children}
            </s-stack>
          </div>
        )}
      </s-stack>
    </s-section>
  );
}
