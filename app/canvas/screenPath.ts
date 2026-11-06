import type { Design, Screen } from "@chopi/menu-core";
import { walkDesign } from "@chopi/menu-core";

/**
 * The way from the main menu to a sub-menu, following the links that open
 * sub-menus (rows, cards, story circles…): [main, …, screen]. A sub-menu no
 * item opens yet is reached straight from the main menu.
 */
export function screenPath(design: Design, screenId: string): Screen[] {
  const main = design.screens[0];
  if (!main) return [];
  const byId = new Map(design.screens.map((screen) => [screen.id, screen]));
  // Which screen opens which (first link found wins, in menu order).
  const parentOf = new Map<string, string>();
  for (const screen of design.screens) {
    const visit = (link: unknown) => {
      const target = link as { type?: string; screenId?: string } | undefined;
      if (
        target?.type === "screen" &&
        target.screenId &&
        target.screenId !== screen.id &&
        !parentOf.has(target.screenId)
      )
        parentOf.set(target.screenId, screen.id);
    };
    walkDesign(
      {
        ...design,
        header: { ...design.header },
        footer: undefined,
        screens: [screen],
      },
      (node) => {
        if ("link" in node) visit(node.link);
        if (node.type === "stories")
          node.items.forEach((item) => visit(item.link));
      },
    );
  }
  const path: Screen[] = [];
  const seen = new Set<string>();
  for (
    let id: string | undefined = screenId;
    id && !seen.has(id);
    id = parentOf.get(id)
  ) {
    seen.add(id);
    const screen = byId.get(id);
    if (screen) path.unshift(screen);
    if (id === main.id) return path;
  }
  return path[0]?.id === main.id ? path : [main, ...path];
}
