/** Small builders that keep the template files close to the Figma designs they come from. */
import { defaultLiveSearch } from "../headerStyles";
import { NO_LINK } from "../links";
import { newId } from "../tree";
import type {
  AccountBarNode,
  Badge,
  BannerNode,
  ButtonNode,
  CardNode,
  ContainerNode,
  Design,
  HeaderNode,
  IconName,
  LinkRef,
  LiveSearch,
  Node,
  PillNode,
  RowNode,
  Screen,
  SocialNetwork,
  TabsNode,
  Tokens,
} from "../types";
import { SCHEMA_VERSION } from "../types";
import { templateImage, type TemplateImageName } from "./images";

const ALL_PRODUCTS: LinkRef = { type: "route", route: "all_products" };

export function stack(
  children: Node[],
  options: Partial<ContainerNode> = {},
): ContainerNode {
  return {
    id: newId("c"),
    type: "container",
    layout: "stack",
    gap: 12,
    children,
    ...options,
  };
}

export function grid(
  children: Node[],
  options: Partial<ContainerNode> = {},
): ContainerNode {
  return {
    id: newId("c"),
    type: "container",
    layout: "grid",
    columns: 2,
    gap: 12,
    children,
    ...options,
  };
}

export function scrollRow(
  children: Node[],
  options: Partial<ContainerNode> = {},
): ContainerNode {
  return {
    id: newId("c"),
    type: "container",
    layout: "scroll",
    gap: 8,
    children,
    ...options,
  };
}

export function card(
  variant: CardNode["variant"],
  title: string,
  image: TemplateImageName,
  options: Partial<CardNode> = {},
): CardNode {
  return {
    id: newId("k"),
    type: "card",
    variant,
    title,
    image: templateImage(image, title),
    link: NO_LINK,
    arrow: "light",
    ...options,
  };
}

export function row(title: string, options: Partial<RowNode> = {}): RowNode {
  return {
    id: newId("r"),
    type: "row",
    variant: "plain",
    title,
    chevron: true,
    link: NO_LINK,
    ...options,
  };
}

export function thumbRow(
  title: string,
  image: TemplateImageName,
  options: Partial<RowNode> = {},
): RowNode {
  return row(title, {
    variant: "thumb",
    image: templateImage(image, title),
    ...options,
  });
}

export function iconRow(
  title: string,
  icon: IconName,
  options: Partial<RowNode> = {},
): RowNode {
  return row(title, { variant: "icon", icon, ...options });
}

export function button(
  label: string,
  options: Partial<ButtonNode> = {},
): ButtonNode {
  return {
    id: newId("b"),
    type: "button",
    label,
    variant: "filled",
    link: ALL_PRODUCTS,
    radius: 999,
    height: 52,
    ...options,
  };
}

export function banner(
  variant: BannerNode["variant"],
  title: string,
  options: Partial<BannerNode> = {},
): BannerNode {
  return {
    id: newId("p"),
    type: "banner",
    variant,
    title,
    link: NO_LINK,
    ...options,
  };
}

export function pill(text: string, options: Partial<PillNode> = {}): PillNode {
  return {
    id: newId("pl"),
    type: "pill",
    icon: "gift",
    text,
    link: NO_LINK,
    ...options,
  };
}

export function badge(
  text: string,
  background: string,
  color = "#FFFFFF",
): Badge {
  return { text, background, color };
}

export function tabs(
  entries: { label: string; child: ContainerNode }[],
  style: TabsNode["style"],
): TabsNode {
  return {
    id: newId("t"),
    type: "tabs",
    tabs: entries.map((entry) => ({ id: newId("tab"), ...entry })),
    style,
  };
}

export function header(options: Partial<HeaderNode> = {}): HeaderNode {
  return {
    id: newId("h"),
    type: "header",
    logoAlign: "start",
    close: "plain",
    showLanguage: false,
    ...options,
  };
}

/**
 * Live search for a template header: results while typing, with the field
 * style and colors the template asks for.
 */
export function search(
  placeholder: string,
  options: Partial<LiveSearch> = {},
): Pick<HeaderNode, "searchPlaceholder" | "liveSearch"> {
  return {
    searchPlaceholder: placeholder,
    liveSearch: defaultLiveSearch(options),
  };
}

export function accountBar(
  socials: SocialNetwork[],
  options: Partial<AccountBarNode> = {},
): AccountBarNode {
  return {
    id: newId("a"),
    type: "account-bar",
    showAccount: true,
    loginLabel: "Log in",
    accountLabel: "My account",
    socials: socials.map((network) => ({ network, url: "" })),
    ...options,
  };
}

export function screen(title: string, root: ContainerNode): Screen {
  return { id: newId("s"), title, root };
}

/** Widgets that are tapped to go somewhere. */
const LINKED = new Set([
  "card",
  "row",
  "banner",
  "countdown",
  "pill",
  "chip",
  "button",
]);
const SAMPLE_LINK = {
  type: "route",
  route: "all_products",
  sample: true,
} as const;

/**
 * Templates come with working links: everything tappable without a link goes
 * to the store's "All products" page (exists in every store), marked as a
 * sample so the editor asks the merchant to choose the real destination.
 * Links to sub-menus are kept.
 */
function withSampleLinks<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withSampleLinks) as T;
  if (!value || typeof value !== "object") return value;
  const node = Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, withSampleLinks(child)]),
  ) as Record<string, unknown>;
  const link = node.link as { type?: string } | undefined;
  const linkable =
    LINKED.has(String(node.type)) ||
    (node.type === undefined && "title" in node && "link" in node); // story circle items
  if (linkable && link?.type === "none") node.link = { ...SAMPLE_LINK };
  return node as T;
}

/** What a template's sample sub-menu lists under "Shop all …". */
const SUB_ENTRIES = ["New in", "Bestsellers", "Sale"];

/**
 * A sample sub-menu for an item that shows an arrow, styled like the item:
 * rows open a list of rows like them, cards a list of rows with the card's
 * picture. Leaves get sample links later.
 */
function sampleSubMenu(item: RowNode | CardNode): Screen {
  const titles = [`Shop all ${item.title.toLowerCase()}`, ...SUB_ENTRIES];
  let children: Node[];
  let gap = 8;
  if (item.type === "row") {
    const lined = !item.box?.background;
    gap = lined ? 0 : 8;
    // Same look as the item, its icon or picture included (level two looks
    // like level one).
    const rows = titles.map((title): Node => ({
      ...item,
      id: newId("r"),
      title,
      subtitle: undefined,
      badge: undefined,
      chevron: false,
      link: NO_LINK,
    }));
    // Rows without a background are separated by thin lines, like their parent.
    children = lined
      ? rows.flatMap((child, index) =>
          index
            ? [
                {
                  id: newId("d"),
                  type: "divider",
                  color: "rgba(0,0,0,0.08)",
                  thickness: 1,
                } as Node,
                child,
              ]
            : [child],
        )
      : rows;
  } else {
    children = titles.map((title): Node => ({
      id: newId("r"),
      type: "row",
      variant: "thumb",
      title,
      image: item.image,
      useResourceImage: true,
      thumbSize: 56,
      thumbRadius: 10,
      chevron: false,
      link: NO_LINK,
      box: {
        background: item.box?.background ?? "#F5F5F5",
        radius: 12,
        padding: 10,
      },
      titleStyle: { size: 15, weight: 600, color: item.titleStyle?.color },
    }));
  }
  return screen(item.title, stack(children, { gap, box: { padding: 12 } }));
}

/**
 * Templates work all the way through: every row with an arrow and every card
 * with an arrow opens its own sample sub-menu (with a back button), so the
 * whole flow can be tried in the preview. Items already linking to a
 * sub-menu are kept.
 */
function withSubMenus(main: ContainerNode): {
  main: ContainerNode;
  screens: Screen[];
} {
  const screens: Screen[] = [];
  const visit = <T>(value: T): T => {
    if (Array.isArray(value)) return value.map(visit) as T;
    if (!value || typeof value !== "object") return value;
    const node = value as unknown as Node;
    const opens =
      ((node.type === "row" && node.chevron) ||
        (node.type === "card" && node.arrow && node.arrow !== "none")) &&
      node.link.type === "none";
    if (opens) {
      const sub = sampleSubMenu(node as RowNode | CardNode);
      screens.push(sub);
      return { ...node, link: { type: "screen", screenId: sub.id } } as T;
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, visit(child)]),
    ) as T;
  };
  return { main: visit(main), screens };
}

export function design(parts: {
  tokens: Tokens;
  header: HeaderNode;
  main: ContainerNode;
  footer?: ContainerNode;
  screens?: Screen[];
}): Design {
  const withArrows = withSubMenus(parts.main);
  return withSampleLinks({
    schemaVersion: SCHEMA_VERSION,
    tokens: parts.tokens,
    behavior: {
      breakpoint: 990,
      side: "left",
      width: "full",
      overlayColor: "rgba(0,0,0,0.4)",
    },
    header: parts.header,
    footer: parts.footer,
    screens: [
      { id: "main", title: "", root: withArrows.main },
      ...(parts.screens ?? []),
      ...withArrows.screens,
    ],
    translations: {},
  });
}
