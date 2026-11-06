import type { Design, LinkRef } from "@chopify/menu-core";
import { walkDesign } from "@chopify/menu-core";

export interface MenuStats {
  /** Tappable items that go somewhere (a page, collection, product or sub-menu). */
  links: number;
  subMenus: number;
  /** Designed on a free canvas (shown with a "Canvas" badge). */
  usesCanvas: boolean;
}

const goesSomewhere = (link: LinkRef | undefined) =>
  Boolean(link && link.type !== "none");

/** What a menu holds, for the home page. */
export function menuStats(design: Design): MenuStats {
  let links = 0;
  let usesCanvas = false;
  walkDesign(design, (node) => {
    if (node.type === "canvas") usesCanvas = true;
    if ("link" in node && goesSomewhere(node.link as LinkRef)) links++;
    if (node.type === "stories")
      links += node.items.filter((item) => goesSomewhere(item.link)).length;
  });
  return {
    links,
    subMenus: Math.max(0, design.screens.length - 1),
    usesCanvas,
  };
}
