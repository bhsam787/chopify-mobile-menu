import { useEffect, useId, useState, type ReactNode } from "react";
import { useFetcher } from "react-router";
import type { LinkRef, ResourceLink, RouteKey, Screen } from "@chopi/menu-core";
import { ROUTES, resourceKey } from "@chopi/menu-core";
import type { ResolvedResource } from "@chopi/menu-renderer";
import { TextField } from "./controls";

interface LinkFieldProps {
  label: string;
  value: LinkRef;
  onChange: (link: LinkRef) => void;
  screens: Screen[];
  onCreateScreen: (title: string) => string;
  /** Opens a sub-menu screen in the editor. */
  onOpenScreen?: (screenId: string) => void;
  /** Lets the preview show a picked resource's image right away. */
  onResource: (key: string, resource: ResolvedResource) => void;
  /** Offer "Sub-menu…" (not for items that are already a second level). */
  allowSubMenu?: boolean;
}

type ListKind = "page" | "blog" | "article" | "screen";

const TYPE_INFO: Record<LinkRef["type"], { name: string; icon: string }> = {
  none: { name: "No link", icon: "link" },
  url: { name: "Link", icon: "link" },
  route: { name: "Store page", icon: "store" },
  product: { name: "Product", icon: "product" },
  collection: { name: "Collection", icon: "collection" },
  page: { name: "Page", icon: "page" },
  blog: { name: "Blog", icon: "blog" },
  article: { name: "Blog post", icon: "note" },
  screen: { name: "Sub-menu", icon: "menu" },
};

const ROUTE_ICONS: Record<RouteKey, string> = {
  root: "home",
  search: "search",
  collections: "collection-list",
  all_products: "product",
  account: "person",
  account_login: "enter",
  cart: "cart",
};

/** A collection or product as Shopify's resource picker returns it. */
export interface PickedResource {
  id: string;
  handle: string;
  title: string;
  image?: { originalSrc?: string; url?: string } | null;
  images?: { originalSrc?: string; url?: string }[];
}

/**
 * The link to a picked collection or product. Its image goes to the preview
 * right away (`onResource`), before the page loads it.
 */
export function linkToPicked(
  type: "collection" | "product",
  picked: PickedResource,
  onResource: (key: string, resource: ResolvedResource) => void,
): ResourceLink<"collection" | "product"> {
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
    type,
    id: picked.id,
    handle: picked.handle,
    title: picked.title,
    url,
  };
}

/**
 * Link input that works like Shopify's menu editor: "Browse" picks store
 * content (kept by ID, so links survive handle changes), a store page, or a
 * sub-menu; anything else can be pasted as a URL.
 */
export function LinkField({
  label,
  value,
  onChange,
  screens,
  onCreateScreen,
  onOpenScreen,
  onResource,
  allowSubMenu = true,
}: LinkFieldProps) {
  const menuId = `link-menu-${useId().replace(/:/g, "")}`;
  const [list, setList] = useState<ListKind | null>(null);
  const [busy, setBusy] = useState(false);

  const choose = (link: LinkRef) => {
    onChange(link);
    setList(null);
  };

  const pickResource = async (type: "collection" | "product") => {
    setBusy(true);
    setList(null);
    try {
      const selection = (await shopify.resourcePicker({
        type,
        action: "select",
        multiple: false,
      })) as PickedResource[] | undefined;
      const picked = selection?.[0];
      if (picked) choose(linkToPicked(type, picked, onResource) as LinkRef);
    } finally {
      setBusy(false);
    }
  };

  const options: { label: string; icon: string; run: () => void }[] = [
    {
      label: "Home page",
      icon: "home",
      run: () => choose({ type: "route", route: "root" }),
    },
    {
      label: "Search",
      icon: "search",
      run: () => choose({ type: "route", route: "search" }),
    },
    {
      label: "Collections…",
      icon: "collection",
      run: () => pickResource("collection"),
    },
    {
      label: "All collections",
      icon: "collection-list",
      run: () => choose({ type: "route", route: "collections" }),
    },
    { label: "Products…", icon: "product", run: () => pickResource("product") },
    {
      label: "All products",
      icon: "product",
      run: () => choose({ type: "route", route: "all_products" }),
    },
    { label: "Pages…", icon: "page", run: () => setList("page") },
    { label: "Blogs…", icon: "blog", run: () => setList("blog") },
    { label: "Blog posts…", icon: "note", run: () => setList("article") },
    {
      label: "Customer account",
      icon: "person",
      run: () => choose({ type: "route", route: "account" }),
    },
    {
      label: "Customer login",
      icon: "enter",
      run: () => choose({ type: "route", route: "account_login" }),
    },
    {
      label: "Cart",
      icon: "cart",
      run: () => choose({ type: "route", route: "cart" }),
    },
    ...(allowSubMenu
      ? [{ label: "Sub-menu…", icon: "menu", run: () => setList("screen") }]
      : []),
  ];

  const isObject = value.type !== "url" && value.type !== "none";
  const info = TYPE_INFO[value.type];
  const icon = value.type === "route" ? ROUTE_ICONS[value.route] : info.icon;
  const screen =
    value.type === "screen"
      ? screens.find((candidate) => candidate.id === value.screenId)
      : undefined;

  const title =
    value.type === "route"
      ? ROUTES[value.route].label
      : value.type === "screen"
        ? screen?.title || "Untitled sub-menu"
        : "title" in value
          ? value.title || value.url
          : "";
  const sample = value.type === "route" && value.sample;
  const subtitle = sample
    ? "Sample link from the template · replace it with your own"
    : value.type === "route"
      ? "Store page · always the right language and market"
      : value.type === "screen"
        ? `Sub-menu · ${screen?.root.children.length ?? 0} items, opens with a back button`
        : "url" in value
          ? `${info.name} · ${value.url}`
          : info.name;

  const browse = (
    <s-button icon="search" loading={busy} commandFor={menuId}>
      {isObject ? "Change" : "Browse"}
    </s-button>
  );

  return (
    <s-stack gap="small-300">
      <s-text>{label}</s-text>
      {isObject ? (
        <s-box
          padding="small"
          border="base"
          borderRadius="large"
          background="base"
        >
          <s-grid
            gridTemplateColumns="auto minmax(0, 1fr) auto"
            gap="small"
            alignItems="center"
          >
            <s-box padding="small-200" background="subdued" borderRadius="base">
              <s-icon type={icon as "link"} />
            </s-box>
            <s-stack gap="small-500">
              <s-stack direction="inline" gap="small-200" alignItems="center">
                <s-paragraph lineClamp={1}>
                  <s-text type="strong">{title}</s-text>
                </s-paragraph>
                {sample && <s-badge tone="warning">Sample</s-badge>}
              </s-stack>
              <s-paragraph color="subdued" lineClamp={1}>
                {subtitle}
              </s-paragraph>
            </s-stack>
            <s-stack direction="inline" gap="small-300" alignItems="center">
              {value.type === "screen" && onOpenScreen && (
                <s-button
                  icon="edit"
                  onClick={() => onOpenScreen(value.screenId)}
                >
                  Edit sub-menu
                </s-button>
              )}
              {browse}
              <s-button
                icon="x"
                variant="tertiary"
                accessibilityLabel={`Remove the link of ${label}`}
                onClick={() => choose({ type: "none" })}
              />
            </s-stack>
          </s-grid>
        </s-box>
      ) : (
        <s-grid
          gridTemplateColumns="minmax(0, 1fr) auto"
          gap="small"
          alignItems="center"
        >
          <TextField
            label={label}
            labelAccessibilityVisibility="exclusive"
            value={value.type === "url" ? value.url : ""}
            placeholder="Paste a link or browse your store"
            onChange={(url) =>
              onChange(url ? { type: "url", url } : { type: "none" })
            }
          />
          {browse}
        </s-grid>
      )}
      <s-text color="subdued">
        {sample
          ? "The template links here so it works right away. Choose where this should go in your store."
          : isObject
            ? value.type === "route" || value.type === "screen"
              ? "Linked to the page itself."
              : `Linked to the ${info.name.toLowerCase()} itself: the link keeps working when its URL changes.`
            : "Browse your store, or paste any link (for example an external page)."}
      </s-text>

      <s-menu id={menuId} accessibilityLabel={`Choose a link for ${label}`}>
        {options.map((option) => (
          <s-button
            key={option.label}
            icon={option.icon as "link"}
            onClick={option.run}
          >
            {option.label}
          </s-button>
        ))}
      </s-menu>

      <s-box>
        {list === "screen" ? (
          <ScreenList
            screens={screens.slice(1)}
            onPick={(screenId) => choose({ type: "screen", screenId })}
            onCreate={() =>
              choose({
                type: "screen",
                screenId: onCreateScreen(
                  title && value.type !== "none" ? title : "Sub-menu",
                ),
              })
            }
            onClose={() => setList(null)}
          />
        ) : list ? (
          <ContentList
            kind={list}
            onPick={choose}
            onClose={() => setList(null)}
          />
        ) : null}
      </s-box>
    </s-stack>
  );
}

function ListFrame({
  heading,
  onClose,
  children,
}: {
  heading: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <s-box
      padding="small"
      border="base"
      borderRadius="large"
      background="subdued"
    >
      <s-stack gap="small">
        <s-grid
          gridTemplateColumns="minmax(0, 1fr) auto"
          gap="small"
          alignItems="center"
        >
          <s-text type="strong">{heading}</s-text>
          <s-button
            icon="x"
            variant="tertiary"
            accessibilityLabel="Close list"
            onClick={onClose}
          />
        </s-grid>
        {children}
      </s-stack>
    </s-box>
  );
}

function OptionRow({
  title,
  subtitle,
  onClick,
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <s-clickable
      accessibilityLabel={`Link to ${title}`}
      paddingInline="small"
      paddingBlock="small-200"
      borderRadius="base"
      background="base"
      onClick={onClick}
    >
      <s-grid
        gridTemplateColumns="minmax(0, 1fr) auto"
        gap="small"
        alignItems="center"
      >
        <s-stack gap="small-500">
          <s-paragraph lineClamp={1}>
            <s-text type="strong">{title}</s-text>
          </s-paragraph>
          <s-paragraph color="subdued" lineClamp={1}>
            {subtitle}
          </s-paragraph>
        </s-stack>
        <s-icon type="chevron-right" color="subdued" />
      </s-grid>
    </s-clickable>
  );
}

function ScreenList({
  screens,
  onPick,
  onCreate,
  onClose,
}: {
  screens: Screen[];
  onPick: (id: string) => void;
  onCreate: () => void;
  onClose: () => void;
}) {
  return (
    <ListFrame heading="Sub-menus" onClose={onClose}>
      <s-stack gap="small-400">
        {screens.map((screen) => (
          <OptionRow
            key={screen.id}
            title={screen.title || "Untitled sub-menu"}
            subtitle={`${screen.root.children.length} items`}
            onClick={() => onPick(screen.id)}
          />
        ))}
        {screens.length === 0 && (
          <s-text color="subdued">No sub-menus yet.</s-text>
        )}
      </s-stack>
      <s-button icon="plus" onClick={onCreate}>
        New sub-menu
      </s-button>
    </ListFrame>
  );
}

const LIST_LABELS: Record<
  Exclude<ListKind, "screen">,
  { heading: string; noun: string }
> = {
  page: { heading: "Pages", noun: "pages" },
  blog: { heading: "Blogs", noun: "blogs" },
  article: { heading: "Blog posts", noun: "blog posts" },
};

function ContentList({
  kind,
  onPick,
  onClose,
}: {
  kind: Exclude<ListKind, "screen">;
  onPick: (link: ResourceLink) => void;
  onClose: () => void;
}) {
  const fetcher =
    useFetcher<Record<"page" | "blog" | "article", ResourceLink[]>>();
  const [term, setTerm] = useState("");

  useEffect(() => {
    const timer = setTimeout(
      () => fetcher.load(`/app/api/link-options?q=${encodeURIComponent(term)}`),
      term ? 250 : 0,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const options = fetcher.data?.[kind] ?? [];
  const { heading, noun } = LIST_LABELS[kind];

  return (
    <ListFrame heading={heading} onClose={onClose}>
      <TextField
        label={`Search ${noun}`}
        labelAccessibilityVisibility="exclusive"
        placeholder={`Search ${noun}`}
        value={term}
        onChange={setTerm}
      />
      {fetcher.state === "loading" && !fetcher.data ? (
        <s-stack alignItems="center" padding="base">
          <s-spinner accessibilityLabel="Loading" />
        </s-stack>
      ) : options.length === 0 ? (
        <s-text color="subdued">No {noun} found.</s-text>
      ) : (
        <s-stack gap="small-400">
          {options.map((option) => (
            <OptionRow
              key={option.id}
              title={option.title}
              subtitle={option.url}
              onClick={() => onPick(option)}
            />
          ))}
        </s-stack>
      )}
    </ListFrame>
  );
}
