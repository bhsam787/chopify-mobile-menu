import type { Design, LinkRef } from "@chopi/menu-core";
import { walkDesign } from "@chopi/menu-core";
import { usesCanvas } from "../billing/plans";

export interface MenuStats {
  /** Tappable items that go somewhere (a page, collection, product or sub-menu). */
  links: number;
  /** Items shoppers expect to tap (rows, chips, cards, buttons, stories) that go nowhere yet. */
  unlinked: number;
  subMenus: number;
  /** Designed on a free canvas (shown with a "Canvas" badge). */
  usesCanvas: boolean;
}

const goesSomewhere = (link: LinkRef | undefined) =>
  Boolean(link && link.type !== "none");

/** Items that are only useful when they lead somewhere (unlike banners or accordions). */
const TAPPABLE = new Set(["row", "chip", "card", "button"]);

/** What a menu holds, for the home page. */
export function menuStats(design: Design): MenuStats {
  let links = 0;
  let unlinked = 0;
  walkDesign(design, (node) => {
    if ("link" in node) {
      if (goesSomewhere(node.link as LinkRef)) links++;
      else if (TAPPABLE.has(node.type)) unlinked++;
    }
    if (node.type === "stories" && node.source !== "collection")
      for (const item of node.items) {
        if (goesSomewhere(item.link)) links++;
        else unlinked++;
      }
  });
  return {
    links,
    unlinked,
    subMenus: Math.max(0, design.screens.length - 1),
    usesCanvas: usesCanvas(design),
  };
}
