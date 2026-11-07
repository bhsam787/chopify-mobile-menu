import type { Design, LinkRef } from "@chopi/menu-core";
import { walkDesign } from "@chopi/menu-core";

const goesSomewhere = (link: LinkRef | undefined) =>
  Boolean(link && link.type !== "none");

/** Items that are only useful when they lead somewhere (unlike banners or accordions). */
const TAPPABLE = new Set(["row", "chip", "card", "button"]);

/**
 * Items shoppers expect to tap (rows, chips, cards, buttons, stories) that
 * go nowhere yet, for the home page.
 */
export function countUnlinked(design: Design): number {
  let unlinked = 0;
  walkDesign(design, (node) => {
    if (
      "link" in node &&
      TAPPABLE.has(node.type) &&
      !goesSomewhere(node.link as LinkRef)
    )
      unlinked++;
    if (node.type === "stories" && node.source !== "collection")
      for (const item of node.items) if (!goesSomewhere(item.link)) unlinked++;
  });
  return unlinked;
}
