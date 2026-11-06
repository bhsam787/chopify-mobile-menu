/**
 * Links inside a link: a row in a list can become a fold-out (accordion)
 * with its own links, and a fold-out can become a single link again. Both
 * keep the item's look so the menu doesn't jump.
 */
import { cloneWithNewIds, locate, mapNode } from "./edit";
import { childNodes, newId } from "./tree";
import type {
  AccordionNode,
  ContainerNode,
  Design,
  ImageRef,
  LinkRef,
  Node,
  RowNode,
} from "./types";

/** A fold-out next to `id` in the same list, to copy the look of its links from. */
function siblingAccordion(
  design: Design,
  id: string,
): AccordionNode | undefined {
  const parent = locate(design, id)?.parent;
  if (!parent) return undefined;
  return childNodes(parent).find(
    (child): child is AccordionNode =>
      child.type === "accordion" && child.id !== id,
  );
}

/** A link inside a fold-out, styled like the other fold-outs' links. */
function innerLink(
  like: Node | undefined,
  title: string,
  link: LinkRef,
): RowNode {
  if (like?.type === "row")
    return {
      ...cloneWithNewIds(like),
      title,
      subtitle: undefined,
      badge: undefined,
      image: undefined,
      useResourceImage: like.useResourceImage ?? like.variant === "thumb",
      name: undefined,
      hidden: undefined,
      link,
    };
  return {
    id: newId("r"),
    type: "row",
    variant: "plain",
    title,
    chevron: false,
    link,
    box: { padding: [10, 8, 10, 8] },
    titleStyle: { size: 14 },
  };
}

/**
 * Turns row `id` into a fold-out. Its link becomes the first link inside
 * ("Shop all …") so shoppers can still reach it. `image` is the picture the
 * row showed (its own or its collection's), since fold-outs keep a fixed one.
 */
export function addLinksInside(
  design: Design,
  id: string,
  image?: ImageRef,
): { design: Design } {
  const row = locate(design, id)?.node;
  if (row?.type !== "row") return { design };
  const sibling = siblingAccordion(design, id);
  const like = sibling?.child.children.find((child) => child.type === "row");
  const first =
    row.link.type === "none"
      ? innerLink(like, "New link", { type: "none" })
      : innerLink(like, `Shop all ${row.title}`, row.link);
  const child: ContainerNode = sibling
    ? {
        ...cloneWithNewIds({ ...sibling.child, children: [] }),
        children: [first],
      }
    : {
        id: newId("c"),
        type: "container",
        layout: "stack",
        gap: 0,
        box: { padding: [4, 16, 8, 16] },
        children: [first],
      };
  const accordion: AccordionNode = {
    id: row.id,
    type: "accordion",
    name: row.name,
    hidden: row.hidden,
    title: row.title,
    subtitle: row.subtitle,
    image: row.variant === "thumb" ? (row.image ?? image) : undefined,
    open: true,
    box: row.box,
    titleStyle: row.titleStyle,
    subtitleStyle: row.subtitleStyle,
    child,
  };
  return { design: mapNode(design, id, () => accordion) };
}

/**
 * Turns fold-out `id` back into one link. It goes where its first link went;
 * the links inside are dropped.
 */
export function removeLinksInside(design: Design, id: string): Design {
  const accordion = locate(design, id)?.node;
  if (accordion?.type !== "accordion") return design;
  const first = accordion.child.children.find(
    (child): child is Node & { link: LinkRef } => "link" in child,
  );
  const row: RowNode = {
    id: accordion.id,
    type: "row",
    name: accordion.name,
    hidden: accordion.hidden,
    variant: accordion.image ? "thumb" : "plain",
    title: accordion.title,
    subtitle: accordion.subtitle,
    image: accordion.image,
    chevron: false,
    link: first?.link ?? { type: "none" },
    box: accordion.box,
    titleStyle: accordion.titleStyle,
    subtitleStyle: accordion.subtitleStyle,
    thumbSize: accordion.image ? 64 : undefined,
    thumbRadius: accordion.image ? 8 : undefined,
  };
  return mapNode(design, id, () => row);
}
