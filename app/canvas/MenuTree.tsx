import type { Design, Node } from "@chopify/menu-core";
import { childNodes, describeLink, nodeLabel } from "@chopify/menu-core";
import { isList, itemLink, itemTitle } from "./items";
import { isCanvasScreen } from "./convert";

interface TreeItem {
  node: Node;
  /** The sub-menu this item opens, if any. */
  screenId?: string;
}

interface TreeList {
  list: Node;
  items: TreeItem[];
}

/** The smart lists of a screen's canvas, and links outside lists. */
function screenContent(design: Design, screenId: string) {
  const screen = design.screens.find((candidate) => candidate.id === screenId);
  if (!screen || !isCanvasScreen(design, screenId)) return null;
  const lists: TreeList[] = [];
  const loose: TreeItem[] = [];
  const asItem = (node: Node): TreeItem => {
    const link = itemLink(node);
    return {
      node,
      screenId: link?.type === "screen" ? link.screenId : undefined,
    };
  };
  const visit = (node: Node) => {
    if (isList(node)) {
      lists.push({ list: node, items: (node.children ?? []).map(asItem) });
      return;
    }
    const link = itemLink(node);
    if (link && link.type !== "none") loose.push(asItem(node));
    else childNodes(node).forEach(visit);
  };
  childNodes(screen.root.children[0]).forEach(visit);
  return { lists, loose };
}

/**
 * The Menu tab: the whole menu as a tree, like a site map. Main menu, its
 * items, the sub-menus they open and theirs, with buttons to add items and
 * sub-menus at every level, so the structure is clear without designing.
 */
export function MenuTree({
  design,
  currentScreenId,
  onOpenScreen,
  onSelectItem,
  onAddItem,
  onAddSubMenu,
}: {
  design: Design;
  currentScreenId: string | undefined;
  onOpenScreen: (screenId: string) => void;
  onSelectItem: (screenId: string, itemId: string) => void;
  onAddItem: (screenId: string, listId: string) => void;
  onAddSubMenu: (screenId: string, itemId: string) => void;
}) {
  const main = design.screens[0];
  if (!main) return null;

  const renderItem = (screenId: string, item: TreeItem, seen: Set<string>) => {
    const link = itemLink(item.node);
    return (
      <li key={item.node.id}>
        <div className="cve-tree__row">
          <button
            type="button"
            className="cve-tree__name"
            title="Select it on the canvas"
            onClick={() => onSelectItem(screenId, item.node.id)}
          >
            <span>{itemTitle(item.node) || nodeLabel(item.node)}</span>
            {!item.screenId && link && (
              <span className="cve-tree__link">{describeLink(link)}</span>
            )}
          </button>
          {item.screenId ? (
            <button
              type="button"
              className="cve-tree__action"
              onClick={() => onOpenScreen(item.screenId!)}
            >
              Open
            </button>
          ) : (
            <button
              type="button"
              className="cve-tree__action"
              title="Give it a sub-menu with its own items"
              onClick={() => onAddSubMenu(screenId, item.node.id)}
            >
              + Sub-menu
            </button>
          )}
        </div>
        {item.screenId &&
          !seen.has(item.screenId) &&
          renderScreen(item.screenId, new Set([...seen, item.screenId]))}
      </li>
    );
  };

  function renderScreen(screenId: string, seen: Set<string>) {
    const content = screenContent(design, screenId);
    if (!content)
      return (
        <p className="cve-tree__note">
          Built from sections.{" "}
          <button
            type="button"
            className="cve-tree__action"
            onClick={() => onOpenScreen(screenId)}
          >
            Open as canvas
          </button>
        </p>
      );
    if (!content.lists.length && !content.loose.length)
      return (
        <p className="cve-tree__note">
          No links yet. Add a Link list from Elements.
        </p>
      );
    return (
      <ul className="cve-tree__level">
        {content.lists.map(({ list, items }) => (
          <li key={list.id}>
            <div className="cve-tree__list">
              <span>{nodeLabel(list)}</span>
              <button
                type="button"
                className="cve-tree__action"
                onClick={() => onAddItem(screenId, list.id)}
              >
                + Add item
              </button>
            </div>
            <ul className="cve-tree__level">
              {items.map((item) => renderItem(screenId, item, seen))}
            </ul>
          </li>
        ))}
        {content.loose.map((item) => renderItem(screenId, item, seen))}
      </ul>
    );
  }

  return (
    <div className="cve-tree">
      <p className="cve-tree__note">
        Your menu as a map: items, the sub-menus they open, and theirs. Click a
        name to select it on the canvas.
      </p>
      <div
        className={`cve-tree__screen${currentScreenId === main.id ? " is-current" : ""}`}
      >
        <button
          type="button"
          className="cve-tree__title"
          onClick={() => onOpenScreen(main.id)}
        >
          Main menu
        </button>
      </div>
      {renderScreen(main.id, new Set([main.id]))}
    </div>
  );
}
