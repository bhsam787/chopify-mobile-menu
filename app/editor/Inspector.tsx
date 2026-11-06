import { useState, type ReactNode } from "react";
import type {
  ContainerNode,
  Design,
  IconName,
  ImageRef,
  LinkRef,
  Node,
  Screen,
  ShapeIcon,
  SocialNetwork,
  TabsLook,
  ContactKind,
  ContactNode,
} from "@chopi/menu-core";
import {
  applyTabsLook,
  childNodes,
  isInSideTabs,
  contactHref,
  NO_LINK,
  ICON_NAMES,
  NODE_LABELS,
  SHAPE_ICONS,
  SOCIAL_NETWORKS,
  newId,
  richToPlain,
  tabsLook,
} from "@chopi/menu-core";
import type { ResolvedResource } from "@chopi/menu-renderer";
import {
  ColorField,
  FieldRow,
  NumberField,
  SelectField,
  SwitchField,
  TextField,
} from "./controls";
import { ImageField } from "./ImageField";
import { RichTextField } from "./RichTextField";
import { LinkField } from "./LinkField";
import {
  ChoiceTiles,
  ColorPicker,
  DESIGN_ICONS,
  DesignGroup,
  FocusArea,
  LAYOUT_PICTURES,
  Segmented,
  SliderField,
} from "./designControls";
import { BadgeFields, BoxFields, TextStyleFields } from "./StyleFields";
import { isPanel } from "./sections";
import { ScreenSpacingFields } from "./ScreenSpacing";
import { HeaderFields } from "./HeaderFields";
import { SearchDesignFields } from "./LiveSearchFields";
import { ItemList } from "./ItemList";
import { CollectionField } from "./CollectionField";
import { addTab, fillLikeFirstTab, placeTabs } from "../canvas/tabPlacement";
import type { PreviewContext } from "../components/MenuPreview";

export interface InspectorContext {
  design: Design;
  /** Locale being edited; translations are edited when it isn't the primary one. */
  locale: string;
  primaryLocale: string;
  update: (id: string, patch: Partial<Node>) => void;
  setTranslation: (key: string, value: string) => void;
  createScreen: (title: string) => string;
  onOpenScreen?: (screenId: string) => void;
  /** Opens the full-screen canvas editor for a canvas node. */
  onOpenCanvas?: (canvasId: string) => void;
  onResource: (key: string, resource: ResolvedResource) => void;
  /** Store data for live previews inside the panel (e.g. header styles). */
  preview?: PreviewContext;
}

/**
 * Whether a container groups whole sections (not items). A plain boolean on
 * purpose: the isPanel type guard would narrow the rest of a switch case away.
 */
function groupsSections(node: Node): boolean {
  return isPanel(node);
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <s-stack gap="small-300">
      <s-heading>{title}</s-heading>
      {children}
    </s-stack>
  );
}

const ICON_OPTIONS = [
  { value: "", label: "No icon" },
  ...ICON_NAMES.map((name) => ({
    value: name,
    label: name[0].toUpperCase() + name.slice(1),
  })),
];
const iconLabel = (name: string) =>
  (name[0].toUpperCase() + name.slice(1)).replace("-", " ");
const GRADIENT_OPTIONS = [
  { value: "", label: "None" },
  { value: "custom", label: "Two colors (custom)" },
  {
    value: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%)",
    label: "Dark at bottom",
  },
  {
    value: "linear-gradient(90deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 70%)",
    label: "Dark on the left",
  },
  {
    value:
      "linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 60%)",
    label: "Soft shine",
  },
];
const SHAPE_ICON_OPTIONS = [
  { value: "", label: "No icon" },
  ...SHAPE_ICONS.map((name) => ({ value: name, label: iconLabel(name) })),
];
const SOCIAL_OPTIONS = SOCIAL_NETWORKS.map((network) => ({
  value: network,
  label: network === "x" ? "X" : network[0].toUpperCase() + network.slice(1),
}));
/** The tab bar styles, each with a small picture of it. */
const TAB_LOOKS: { value: TabsLook; label: string; picture: ReactNode }[] = [
  {
    value: "pills",
    label: "Separate pills",
    picture: (
      <svg viewBox="0 0 48 36" width="48" height="36">
        <rect x="4" y="12" width="19" height="12" rx="6" fill="currentColor" />
        <rect
          x="25"
          y="12"
          width="19"
          height="12"
          rx="6"
          fill="currentColor"
          opacity=".25"
        />
      </svg>
    ),
  },
  {
    value: "track",
    label: "Pill track",
    picture: (
      <svg viewBox="0 0 48 36" width="48" height="36">
        <rect
          x="3"
          y="10"
          width="42"
          height="16"
          rx="8"
          fill="currentColor"
          opacity=".2"
        />
        <rect x="5" y="12" width="20" height="12" rx="6" fill="currentColor" />
      </svg>
    ),
  },
  {
    value: "underline",
    label: "Underline",
    picture: (
      <svg viewBox="0 0 48 36" width="48" height="36">
        <rect x="7" y="14" width="12" height="4" rx="2" fill="currentColor" />
        <rect
          x="29"
          y="14"
          width="12"
          height="4"
          rx="2"
          fill="currentColor"
          opacity=".35"
        />
        <rect x="4" y="23" width="18" height="2" fill="currentColor" />
        <rect
          x="4"
          y="25"
          width="40"
          height="1"
          fill="currentColor"
          opacity=".25"
        />
      </svg>
    ),
  },
];
const CONTACT_OPTIONS: { value: ContactKind; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone call" },
  { value: "whatsapp", label: "WhatsApp chat" },
  { value: "link", label: "A page (help, FAQ, contact…)" },
];
const CONTACT_VALUE_LABELS: Record<Exclude<ContactKind, "link">, string> = {
  email: "Email address",
  phone: "Phone number",
  whatsapp: "WhatsApp number",
};
const CONTACT_PLACEHOLDERS: Record<Exclude<ContactKind, "link">, string> = {
  email: "help@yourstore.com",
  phone: "Number with country code, e.g. +44 20 7946 0000",
  whatsapp: "Number with country code, e.g. +49 151 2345 6789",
};
const ARROW_OPTIONS = [
  { value: "none", label: "No arrow" },
  { value: "light", label: "White circle" },
  { value: "filled", label: "Filled circle" },
  { value: "plain", label: "Plain arrow" },
];

/**
 * Editing panel for the selected node. Text fields edit translations when a
 * non-primary language is selected.
 */
export function Inspector({
  node,
  context,
  part = "all",
}: {
  node: Node;
  context: InspectorContext;
  /** content: what "Customize" shows · design: what "Design" shows · all: both, with the layer name. */
  part?: "content" | "design" | "all";
}) {
  const { design, locale, primaryLocale } = context;
  const translating = locale !== primaryLocale;
  const set = (patch: Record<string, unknown>) =>
    context.update(node.id, patch as Partial<Node>);

  /**
   * Translation-aware text field for a top-level string property. `rich`
   * shows the rich text editor (bold, italic, links) instead of a plain field.
   */
  const text = (
    field: string,
    label: string,
    options: {
      multiline?: boolean;
      rich?: boolean;
      allowLinks?: boolean;
      key?: string;
      value?: string;
      onChange?: (value: string) => void;
    } = {},
  ) => {
    const key = options.key ?? `${node.id}.${field}`;
    const original =
      options.value ??
      String((node as unknown as Record<string, unknown>)[field] ?? "");
    const fieldLabel = translating
      ? `${label} (${locale.toUpperCase()})`
      : label;
    const value = translating
      ? (design.translations[locale]?.[key] ?? "")
      : original;
    const onChange = (next: string) =>
      translating
        ? context.setTranslation(key, next)
        : options.onChange
          ? options.onChange(next)
          : set({ [field]: next });
    const details = translating ? "Empty = default language" : undefined;

    if (options.rich) {
      return (
        <RichTextField
          key={`${key}:${locale}`}
          label={fieldLabel}
          value={value}
          placeholder={translating ? richToPlain(original) : undefined}
          details={details}
          allowLinks={options.allowLinks}
          onChange={onChange}
        />
      );
    }
    return (
      <TextField
        label={fieldLabel}
        value={value}
        placeholder={translating ? original : undefined}
        multiline={options.multiline}
        details={details}
        onChange={onChange}
      />
    );
  };

  const link = (
    value: LinkRef,
    onChange: (link: LinkRef) => void = (next) => set({ link: next }),
  ) => (
    <LinkField
      label="Link"
      value={value}
      onChange={onChange}
      screens={design.screens}
      onCreateScreen={context.createScreen}
      onOpenScreen={context.onOpenScreen}
      onResource={context.onResource}
      allowSubMenu={!inSideTabs}
    />
  );

  const image = (
    value: ImageRef | undefined,
    label = "Image",
    details?: string,
  ) => (
    <ImageField
      label={label}
      value={value}
      details={details}
      onChange={(next) => set({ image: next })}
    />
  );

  /**
   * A just-picked collection's products, so the preview shows them right
   * away (they're otherwise loaded with the page).
   */
  const loadProducts = (collectionId: string) => {
    fetch(`/app/api/collection-products?id=${encodeURIComponent(collectionId)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { key: string; resource: ResolvedResource } | null) => {
        if (data) context.onResource(data.key, data.resource);
      })
      .catch(() => {
        // The preview fills in when the page next loads; nothing is lost.
      });
  };

  const inSideTabs = isInSideTabs(design, node.id);
  const content: ReactNode[] = [];
  const style: ReactNode[] = [];

  switch (node.type) {
    case "container":
      // A group of sections: they always stack. Arranging whole sections in
      // a grid squeezes them (e.g. tabs into a third of the width).
      if (groupsSections(node)) {
        content.push(
          <DesignGroup
            key="layout"
            title="Layout"
            icon={DESIGN_ICONS.layout}
            target=":scope"
            help="How the items in this section are arranged: under each other, in a grid, or in a row shoppers swipe."
          >
            {node.layout !== "stack" && (
              <s-banner tone="warning">
                The sections in this group are side by side, which squeezes
                them.
                <s-button
                  slot="secondary-actions"
                  onClick={() => set({ layout: "stack", columns: undefined })}
                >
                  Stack sections again
                </s-button>
              </s-banner>
            )}
            <SliderField
              label="Gap between sections"
              value={node.gap}
              max={64}
              onChange={(gap) => set({ gap })}
            />
            <s-text color="subdued">
              Sections in a group stack one under the other. To change cards per
              row, open that section&apos;s Design.
            </s-text>
          </DesignGroup>,
        );
        style.push(
          <BoxFields
            key="box"
            value={node.box}
            onChange={(box) => set({ box })}
          />,
        );
        break;
      }
      content.push(
        <DesignGroup
          key="layout"
          title="Layout"
          icon={DESIGN_ICONS.layout}
          target=":scope"
          help="How the items in this section are arranged: under each other, in a grid, or in a row shoppers swipe."
        >
          <ChoiceTiles
            label="Layout"
            value={node.layout}
            options={[
              {
                value: "stack",
                label: "Stack",
                picture: LAYOUT_PICTURES.stack,
              },
              { value: "grid", label: "Grid", picture: LAYOUT_PICTURES.grid },
              {
                value: "scroll",
                label: "Scroll row",
                picture: LAYOUT_PICTURES.scroll,
              },
            ]}
            onChange={(layout) => set({ layout })}
          />
          {node.layout === "grid" && (
            <Segmented
              label="Columns"
              value={node.columns ?? 2}
              options={([1, 2, 3, 4] as const).map((value) => ({
                value,
                label: String(value),
              }))}
              onChange={(columns) => set({ columns })}
            />
          )}
          {node.layout === "scroll" && (
            <SliderField
              label="Item width"
              value={node.itemWidth}
              min={40}
              max={400}
              placeholder="Auto"
              onChange={(itemWidth) => set({ itemWidth })}
            />
          )}
          <SliderField
            label="Gap between items"
            value={node.gap}
            max={64}
            onChange={(gap) => set({ gap })}
          />
        </DesignGroup>,
      );
      style.push(
        <BoxFields
          key="box"
          value={node.box}
          onChange={(box) => set({ box })}
        />,
      );
      break;

    case "tabs": {
      // Card grids inside the tabs (a tab's own grid, or grids in it).
      const grids = node.tabs.flatMap((tab) =>
        tab.child.type !== "container"
          ? []
          : tab.child.layout === "grid"
            ? [tab.child]
            : tab.child.children.filter(
                (child): child is ContainerNode =>
                  child.type === "container" && child.layout === "grid",
              ),
      );
      if (grids.length)
        style.push(
          <DesignGroup
            key="grid"
            title="Cards per row"
            icon={DESIGN_ICONS.layout}
            hint="In every tab"
            target=".chm-c--grid"
            help="How many cards sit side by side in each tab, and the space between them."
          >
            <Segmented
              label="Columns"
              value={grids[0].columns ?? 2}
              options={([1, 2, 3, 4] as const).map((value) => ({
                value,
                label: String(value),
              }))}
              onChange={(columns) =>
                grids.forEach((grid) => context.update(grid.id, { columns }))
              }
            />
            <SliderField
              label="Gap between cards"
              value={grids[0].gap}
              max={40}
              onChange={(gap) =>
                grids.forEach((grid) => context.update(grid.id, { gap }))
              }
            />
          </DesignGroup>,
        );
      content.push(
        ...node.tabs.map((tab, index) => (
          <s-stack
            key={tab.id}
            direction="inline"
            gap="small-200"
            alignItems="end"
          >
            <s-box inlineSize="100%">
              {text("label", `Tab ${index + 1}`, {
                key: `${tab.id}.label`,
                value: tab.label,
                onChange: (label) =>
                  set({
                    tabs: node.tabs.map((candidate) =>
                      candidate.id === tab.id
                        ? { ...candidate, label }
                        : candidate,
                    ),
                  }),
              })}
            </s-box>
            {index > 0 && childNodes(tab.child).length === 0 && (
              <s-button
                variant="tertiary"
                icon="duplicate"
                onClick={() =>
                  context.update(node.id, fillLikeFirstTab(node, tab.id))
                }
              >
                Start like Tab 1
              </s-button>
            )}
            {node.tabs.length > 2 && (
              <s-button
                variant="tertiary"
                icon="delete"
                accessibilityLabel={`Remove tab ${index + 1}`}
                onClick={() =>
                  set({
                    tabs: node.tabs.filter(
                      (candidate) => candidate.id !== tab.id,
                    ),
                  })
                }
              />
            )}
          </s-stack>
        )),
        <s-button
          key="add"
          icon="plus"
          onClick={() => context.update(node.id, addTab(node))}
        >
          Add tab
        </s-button>,
      );
      const look = tabsLook(node);
      const underline = look === "underline";
      style.push(
        <DesignGroup
          key="look"
          title="Style"
          icon={DESIGN_ICONS.layout}
          target=".chm-tabs__list"
          help="How the tab buttons look. Your colors carry over when you switch."
        >
          <Segmented
            label="Tabs position"
            value={node.placement ?? "top"}
            options={[
              { value: "top", label: "On top" },
              { value: "side", label: "On the side" },
            ]}
            onChange={(placement) =>
              context.update(node.id, placeTabs(node, placement))
            }
          />
          <ChoiceTiles
            label="Tab style"
            value={look}
            options={TAB_LOOKS}
            onChange={(next) => set({ style: applyTabsLook(node, next) })}
          />
          {node.placement === "side" && (
            <SliderField
              label="Width of the tab column"
              value={node.railWidth}
              min={56}
              max={200}
              onChange={(railWidth) => set({ railWidth })}
            />
          )}
        </DesignGroup>,
        <DesignGroup
          key="active"
          title="Selected tab"
          icon={DESIGN_ICONS.look}
          target='[data-chm-tab][aria-selected="true"]'
          help={
            underline
              ? "The tab shoppers are on: its text and underline color."
              : "The tab shoppers are on: its background and text color."
          }
        >
          <FieldRow>
            {!underline && (
              <ColorField
                label="Background"
                value={node.style?.activeBackground}
                onChange={(activeBackground) =>
                  set({ style: { ...node.style, activeBackground } })
                }
              />
            )}
            <ColorField
              label={underline ? "Text and underline" : "Text"}
              value={node.style?.activeColor}
              onChange={(activeColor) =>
                set({ style: { ...node.style, activeColor } })
              }
            />
          </FieldRow>
        </DesignGroup>,
        <DesignGroup
          key="inactive"
          title="Other tabs"
          icon={DESIGN_ICONS.look}
          target='[data-chm-tab][aria-selected="false"]'
          help={
            underline
              ? "The tabs shoppers can switch to: their text color."
              : "The tabs shoppers can switch to: their background and text color."
          }
        >
          <FieldRow>
            {look === "pills" && (
              <ColorField
                label="Background"
                value={node.style?.inactiveBackground}
                onChange={(inactiveBackground) =>
                  set({ style: { ...node.style, inactiveBackground } })
                }
              />
            )}
            <ColorField
              label="Text"
              value={node.style?.inactiveColor}
              onChange={(inactiveColor) =>
                set({ style: { ...node.style, inactiveColor } })
              }
            />
          </FieldRow>
        </DesignGroup>,
        <DesignGroup
          key="track"
          title="Tab bar"
          icon={DESIGN_ICONS.spacing}
          target=".chm-tabs__list"
          help="The strip the tab buttons sit on: its color and the space at its sides."
        >
          {look === "track" && (
            <ColorPicker
              label="Track behind the tabs"
              value={node.style?.track}
              onChange={(track) => set({ style: { ...node.style, track } })}
            />
          )}
          <SliderField
            label="Side spacing"
            value={node.style?.inset}
            max={60}
            onChange={(inset) => set({ style: { ...node.style, inset } })}
          />
        </DesignGroup>,
        <TextStyleFields
          key="text"
          value={node.style?.text}
          part="style.text"
          onChange={(textStyle) =>
            set({ style: { ...node.style, text: textStyle } })
          }
        />,
      );
      break;
    }

    case "products":
      content.push(
        <CollectionField
          key="collection"
          value={node.collection}
          details="Its products show with their current photo, title and price, in each shopper's currency."
          onChange={(collection) => {
            // Real products replace the sample ones for good.
            set({
              collection,
              ...(collection ? { sample: undefined } : {}),
            });
            if (collection) loadProducts(collection.id);
          }}
        />,
        <NumberField
          key="limit"
          label="Number of products"
          value={node.limit ?? 6}
          min={1}
          max={12}
          onChange={(limit) => set({ limit })}
        />,
        <Segmented
          key="layout"
          label="Layout"
          value={node.layout}
          options={[
            { value: "row", label: "Swipe sideways" },
            { value: "grid", label: "Two columns" },
          ]}
          onChange={(layout) => set({ layout })}
        />,
        <SwitchField
          key="price"
          label="Show prices"
          checked={node.showPrice !== false}
          onChange={(showPrice) => set({ showPrice })}
        />,
      );
      style.push(
        <DesignGroup
          key="cards"
          title="Cards"
          icon={DESIGN_ICONS.layout}
          target=".chm-product"
          help="The size of each product card and the color behind its photo."
        >
          {node.layout !== "grid" && (
            <SliderField
              label="Card width"
              value={node.cardWidth}
              min={90}
              max={260}
              onChange={(cardWidth) => set({ cardWidth })}
            />
          )}
          <Segmented
            label="Photo shape"
            value={node.ratio ?? 1.2}
            options={[
              { value: 1, label: "Square" },
              { value: 1.2, label: "Portrait" },
              { value: 1.5, label: "Tall" },
            ]}
            onChange={(ratio) => set({ ratio })}
          />
          <ColorPicker
            label="Behind the photo"
            value={node.imageBackground}
            onChange={(imageBackground) => set({ imageBackground })}
          />
          <ColorPicker
            label="Sale price"
            value={node.saleColor}
            onChange={(saleColor) => set({ saleColor })}
          />
        </DesignGroup>,
        <BoxFields
          key="box"
          value={node.box}
          onChange={(box) => set({ box })}
        />,
        <TextStyleFields
          key="title"
          value={node.titleStyle}
          part="productTitleStyle"
          onChange={(titleStyle) => set({ titleStyle })}
        />,
        <TextStyleFields
          key="price"
          value={node.priceStyle}
          part="priceStyle"
          onChange={(priceStyle) => set({ priceStyle })}
        />,
      );
      break;

    case "perks":
      content.push(
        <ItemList
          key="items"
          label="Perks"
          items={node.items}
          max={6}
          addLabel="Add perk"
          create={() => ({ id: newId("pi"), icon: "check", text: "Perk" })}
          onChange={(items) => set({ items })}
        >
          {(item) => (
            <>
              <SelectField
                label="Icon"
                value={item.icon}
                options={ICON_OPTIONS.filter((option) => option.value)}
                onChange={(icon) =>
                  set({
                    items: node.items.map((candidate) =>
                      candidate.id === item.id
                        ? { ...candidate, icon: icon as IconName }
                        : candidate,
                    ),
                  })
                }
              />
              {text("text", "Text", {
                key: `${item.id}.text`,
                value: item.text,
                onChange: (value) =>
                  set({
                    items: node.items.map((candidate) =>
                      candidate.id === item.id
                        ? { ...candidate, text: value }
                        : candidate,
                    ),
                  }),
              })}
            </>
          )}
        </ItemList>,
      );
      style.push(
        <DesignGroup
          key="layout"
          title="Layout"
          icon={DESIGN_ICONS.layout}
          target=".chm-perk"
          help="How many perks sit side by side, and where the icon goes."
        >
          <Segmented
            label="Per line"
            value={node.columns ?? 3}
            options={[2, 3, 4].map((value) => ({
              value,
              label: String(value),
            }))}
            onChange={(columns) => set({ columns })}
          />
          <Segmented
            label="Icon"
            value={node.variant ?? "stacked"}
            options={[
              { value: "stacked", label: "Above the text" },
              { value: "inline", label: "Next to the text" },
            ]}
            onChange={(variant) => set({ variant })}
          />
          <ColorPicker
            label="Icon color"
            value={node.iconColor}
            onChange={(iconColor) => set({ iconColor })}
          />
        </DesignGroup>,
        <BoxFields
          key="box"
          value={node.box}
          onChange={(box) => set({ box })}
        />,
        <TextStyleFields
          key="style"
          value={node.style}
          part="style"
          onChange={(value) => set({ style: value })}
        />,
      );
      break;

    case "contact": {
      const setItem = (
        id: string,
        patch: Partial<ContactNode["items"][number]>,
      ) =>
        set({
          items: node.items.map((candidate) =>
            candidate.id === id ? { ...candidate, ...patch } : candidate,
          ),
        });
      content.push(
        text("title", "Title"),
        <ItemList
          key="items"
          label="Buttons"
          items={node.items}
          max={4}
          addLabel="Add button"
          create={(): ContactNode["items"][number] => ({
            id: newId("ci"),
            kind: "email",
            label: "Email us",
            value: "",
          })}
          onChange={(items) => set({ items })}
        >
          {(item) => (
            <>
              <SelectField
                label="Opens"
                value={item.kind}
                options={CONTACT_OPTIONS}
                onChange={(kind) =>
                  setItem(item.id, {
                    kind: kind as ContactKind,
                    link: kind === "link" ? (item.link ?? NO_LINK) : undefined,
                  })
                }
              />
              {text("label", "Button text", {
                key: `${item.id}.label`,
                value: item.label,
                onChange: (label) => setItem(item.id, { label }),
              })}
              {item.kind === "link" ? (
                link(item.link ?? NO_LINK, (next) =>
                  setItem(item.id, { link: next }),
                )
              ) : (
                <TextField
                  label={CONTACT_VALUE_LABELS[item.kind]}
                  value={item.value ?? ""}
                  placeholder={CONTACT_PLACEHOLDERS[item.kind]}
                  details={
                    contactHref(item.kind, item.value)
                      ? undefined
                      : "Hidden on your store until this is filled in correctly"
                  }
                  onChange={(value) => setItem(item.id, { value })}
                />
              )}
            </>
          )}
        </ItemList>,
      );
      style.push(
        <DesignGroup
          key="layout"
          title="Layout"
          icon={DESIGN_ICONS.layout}
          target=".chm-contact__items"
          help="Buttons side by side, or rows one under the other."
        >
          <Segmented
            label="Show as"
            value={node.variant ?? "buttons"}
            options={[
              { value: "buttons", label: "Buttons" },
              { value: "rows", label: "Rows" },
            ]}
            onChange={(variant) => set({ variant })}
          />
          <ColorPicker
            label="Icon color"
            value={node.iconColor}
            onChange={(iconColor) => set({ iconColor })}
          />
        </DesignGroup>,
        <BoxFields
          key="box"
          value={node.box}
          onChange={(box) => set({ box })}
        />,
        <TextStyleFields
          key="title"
          value={node.titleStyle}
          part="titleStyle"
          onChange={(titleStyle) => set({ titleStyle })}
        />,
        <TextStyleFields
          key="style"
          value={node.style}
          part="contactStyle"
          onChange={(value) => set({ style: value })}
        />,
      );
      break;
    }

    case "discount":
      content.push(
        text("title", "Title"),
        text("text", "Text"),
        <TextField
          key="code"
          label="Discount code"
          value={node.code}
          details="Create the code in Shopify under Discounts first. It's the same in every language."
          onChange={(code) => set({ code: code.replace(/\s+/g, "") })}
        />,
        <SwitchField
          key="apply"
          label="Show an Apply button"
          details="Puts the code on the shopper's cart for them"
          checked={Boolean(node.applyLink)}
          onChange={(applyLink) => set({ applyLink })}
        />,
      );
      style.push(
        <DesignGroup
          key="code"
          title="Code and button"
          icon={DESIGN_ICONS.look}
          target=".chm-discount__row"
          help="The colors of the code box and the Copy button."
        >
          <FieldRow>
            <ColorField
              label="Code background"
              value={node.codeBackground}
              onChange={(codeBackground) => set({ codeBackground })}
            />
            <ColorField
              label="Code text"
              value={node.codeColor}
              onChange={(codeColor) => set({ codeColor })}
            />
          </FieldRow>
          <FieldRow>
            <ColorField
              label="Button background"
              value={node.buttonBackground}
              onChange={(buttonBackground) => set({ buttonBackground })}
            />
            <ColorField
              label="Button text"
              value={node.buttonColor}
              onChange={(buttonColor) => set({ buttonColor })}
            />
          </FieldRow>
        </DesignGroup>,
        <BoxFields
          key="box"
          value={node.box}
          onChange={(box) => set({ box })}
        />,
        <TextStyleFields
          key="title"
          value={node.titleStyle}
          part="titleStyle"
          onChange={(titleStyle) => set({ titleStyle })}
        />,
        <TextStyleFields
          key="text"
          value={node.textStyle}
          part="textStyle"
          onChange={(textStyle) => set({ textStyle })}
        />,
      );
      break;

    case "ticker":
      content.push(
        <ItemList
          key="items"
          label="Messages"
          items={node.items}
          max={8}
          addLabel="Add message"
          create={() => ({ id: newId("ti"), text: "New message" })}
          onChange={(items) => set({ items })}
        >
          {(item, index) =>
            text("text", `Message ${index + 1}`, {
              key: `${item.id}.text`,
              value: item.text,
              onChange: (value) =>
                set({
                  items: node.items.map((candidate) =>
                    candidate.id === item.id
                      ? { ...candidate, text: value }
                      : candidate,
                  ),
                }),
            })
          }
        </ItemList>,
        <TextField
          key="separator"
          label="Between messages"
          value={node.separator ?? ""}
          details="A symbol such as • or ✦. Empty = just space."
          onChange={(separator) => set({ separator: separator.slice(0, 3) })}
        />,
      );
      style.push(
        <DesignGroup
          key="motion"
          title="Motion"
          icon={DESIGN_ICONS.spacing}
          target=":scope"
          help="How fast the messages move. Shoppers who turn off motion on their phone see them still, and can swipe instead."
        >
          <SliderField
            label="Speed"
            value={node.speed}
            min={10}
            max={120}
            unit=" px/s"
            onChange={(speed) => set({ speed })}
          />
        </DesignGroup>,
        <BoxFields
          key="box"
          value={node.box}
          onChange={(box) => set({ box })}
        />,
        <TextStyleFields
          key="style"
          value={node.style}
          part="style"
          onChange={(value) => set({ style: value })}
        />,
      );
      break;

    case "header":
      content.push(
        <HeaderFields
          key="header"
          design={design}
          node={node}
          context={context.preview}
          set={set}
          replace={(header) => context.update(node.id, header)}
          text={(field, label) => text(field, label)}
          termText={(id, value, label, onChange) =>
            text("text", label, { key: `${id}.text`, value, onChange })
          }
        />,
      );
      style.push(
        <ColorField
          key="icon"
          label="Icon color"
          value={node.iconColor}
          onChange={(iconColor) => set({ iconColor })}
        />,
        <SearchDesignFields key="search" node={node} set={set} />,
        <BoxFields
          key="box"
          value={node.box}
          border={false}
          onChange={(box) => set({ box })}
        />,
      );
      break;

    case "heading":
    case "text":
      content.push(
        node.type === "heading"
          ? text("text", "Heading")
          : text("text", "Text", { rich: true }),
      );
      style.push(
        <TextStyleFields
          key="style"
          value={node.style}
          part="style"
          onChange={(value) => set({ style: value })}
        />,
      );
      break;

    case "card":
      content.push(
        <SelectField
          key="variant"
          label="Style"
          value={node.variant}
          options={[
            { value: "studio", label: "Studio – text left, image right" },
            { value: "product", label: "Product – title, image below" },
            { value: "overlay", label: "Overlay – full image with text" },
            {
              value: "label",
              label: "Tile – photo tile, title and arrow below",
            },
            { value: "circle", label: "Circle – title above a round photo" },
            { value: "tile", label: "Fade – photo fading into the card color" },
          ]}
          onChange={(variant) => set({ variant })}
        />,
        text("title", "Title"),
        text("subtitle", "Subtitle"),
        <BadgeFields
          key="badge"
          value={node.badge}
          onChange={(badge) => set({ badge })}
          text={text("badge", "Badge", {
            value: node.badge?.text ?? "",
            onChange: (value) =>
              set({
                badge: value ? { ...node.badge, text: value } : undefined,
              }),
          })}
        />,
        link(node.link),
        image(
          node.image,
          "Image",
          "Empty = the linked collection's or product's image",
        ),
      );
      style.push(
        <FocusArea key="arrow" target=".chm-arrow" label="Arrow">
          <FieldRow>
            <SelectField
              label="Arrow"
              value={node.arrow ?? "none"}
              options={ARROW_OPTIONS}
              onChange={(arrow) => set({ arrow })}
            />
            <NumberField
              label="Height ÷ width"
              value={node.ratio}
              min={0.4}
              max={2}
              step={0.05}
              onChange={(ratio) => set({ ratio })}
            />
          </FieldRow>
        </FocusArea>,
        node.arrow && node.arrow !== "none" ? (
          <FocusArea key="arrow-colors" target=".chm-arrow" label="Arrow">
            <FieldRow>
              <ColorField
                label="Arrow background"
                value={node.arrowBackground}
                onChange={(arrowBackground) => set({ arrowBackground })}
              />
              <ColorField
                label="Arrow color"
                value={node.arrowColor}
                onChange={(arrowColor) => set({ arrowColor })}
              />
            </FieldRow>
          </FocusArea>
        ) : null,
        node.variant === "label" || node.variant === "circle" ? (
          <ColorField
            key="image-bg"
            label="Photo background"
            value={node.imageBackground}
            onChange={(imageBackground) => set({ imageBackground })}
          />
        ) : null,
        <Group key="box" title="Card">
          <BoxFields
            value={node.box}
            padding={false}
            onChange={(box) => set({ box })}
          />
        </Group>,
        <TextStyleFields
          key="title"
          value={node.titleStyle}
          part="titleStyle"
          onChange={(titleStyle) => set({ titleStyle })}
        />,
      );
      break;

    case "row":
      content.push(
        <SelectField
          key="variant"
          label="Style"
          value={node.variant}
          options={[
            { value: "thumb", label: "With image" },
            { value: "icon", label: "With icon" },
            { value: "plain", label: "Text only" },
          ]}
          onChange={(variant) => set({ variant })}
        />,
        text("title", "Title"),
        text("subtitle", "Subtitle"),
        <BadgeFields
          key="badge"
          value={node.badge}
          onChange={(badge) => set({ badge })}
          text={text("badge", "Badge", {
            value: node.badge?.text ?? "",
            onChange: (value) =>
              set({
                badge: value ? { ...node.badge, text: value } : undefined,
              }),
          })}
        />,
        link(node.link),
        node.variant === "thumb"
          ? image(
              node.image,
              "Image",
              "Empty = the linked collection's or product's image",
            )
          : null,
        node.variant === "icon" ? (
          <SelectField
            key="icon"
            label="Icon"
            value={node.icon ?? ""}
            options={ICON_OPTIONS}
            onChange={(icon) =>
              set({ icon: (icon || undefined) as IconName | undefined })
            }
          />
        ) : null,
        <SwitchField
          key="chevron"
          label="Show chevron"
          checked={Boolean(node.chevron)}
          onChange={(chevron) => set({ chevron })}
        />,
      );
      style.push(
        node.variant === "thumb" ? (
          <FocusArea key="thumb" target=".chm-row__thumb" label="Image">
            <FieldRow>
              <NumberField
                label="Image size"
                value={node.thumbSize}
                min={24}
                max={140}
                suffix="px"
                onChange={(thumbSize) => set({ thumbSize })}
              />
              <NumberField
                label="Image radius"
                value={node.thumbRadius}
                min={0}
                max={999}
                suffix="px"
                onChange={(thumbRadius) => set({ thumbRadius })}
              />
            </FieldRow>
          </FocusArea>
        ) : null,
        node.variant === "thumb" ? (
          <FocusArea key="thumb-bg" target=".chm-row__thumb" label="Image">
            <ColorField
              label="Behind the image (none for icons)"
              value={node.thumbBackground}
              onChange={(thumbBackground) =>
                set({ thumbBackground: thumbBackground || undefined })
              }
            />
          </FocusArea>
        ) : null,
        <Group key="box" title="Row">
          <BoxFields value={node.box} onChange={(box) => set({ box })} />
        </Group>,
        <TextStyleFields
          key="title"
          value={node.titleStyle}
          part="titleStyle"
          onChange={(titleStyle) => set({ titleStyle })}
        />,
        <TextStyleFields
          key="subtitle"
          value={node.subtitleStyle}
          part="subtitleStyle"
          onChange={(subtitleStyle) => set({ subtitleStyle })}
        />,
      );
      break;

    case "accordion":
      content.push(
        text("title", "Title"),
        text("subtitle", "Subtitle"),
        image(node.image),
        <SwitchField
          key="open"
          label="Open by default"
          checked={Boolean(node.open)}
          onChange={(open) => set({ open })}
        />,
        <s-text key="hint" color="subdued">
          Add links inside the accordion from the layers panel.
        </s-text>,
      );
      style.push(
        <BoxFields
          key="box"
          value={node.box}
          border={false}
          onChange={(box) => set({ box })}
        />,
        <TextStyleFields
          key="title"
          value={node.titleStyle}
          part="titleStyle"
          onChange={(titleStyle) => set({ titleStyle })}
        />,
      );
      break;

    case "banner":
      content.push(
        <SelectField
          key="variant"
          label="Style"
          value={node.variant}
          options={[
            { value: "promo", label: "Promo – image, text, arrow" },
            { value: "highlight", label: "Highlight – big card with button" },
            { value: "split", label: "Split – color and photo" },
            { value: "feature", label: "Feature – image with outline button" },
          ]}
          onChange={(variant) => set({ variant })}
        />,
        node.variant === "highlight" || node.variant === "feature"
          ? text("eyebrow", "Eyebrow")
          : null,
        text("title", "Title"),
        text("text", "Text", { rich: true, allowLinks: false }),
        node.variant === "highlight" || node.variant === "feature"
          ? text("cta", "Button label")
          : null,
        node.variant === "highlight" ? (
          <BadgeFields
            key="badge"
            value={node.badge}
            onChange={(badge) => set({ badge })}
            text={text("badge", "Badge", {
              value: node.badge?.text ?? "",
              onChange: (value) =>
                set({
                  badge: value ? { ...node.badge, text: value } : undefined,
                }),
            })}
          />
        ) : null,
        link(node.link),
        image(node.image),
      );
      style.push(
        <FocusArea
          key="accent"
          target=".chm-arrow, .chm-banner__cta, .chm-badge"
          label="Accent"
        >
          <FieldRow>
            <ColorField
              label="Accent"
              value={node.accent}
              onChange={(accent) => set({ accent })}
            />
            <ColorField
              label="Accent text"
              value={node.accentText}
              onChange={(accentText) => set({ accentText })}
            />
          </FieldRow>
        </FocusArea>,
        <BoxFields
          key="box"
          value={node.box}
          onChange={(box) => set({ box })}
        />,
        <TextStyleFields
          key="title"
          value={node.titleStyle}
          part="titleStyle"
          onChange={(titleStyle) => set({ titleStyle })}
        />,
        <TextStyleFields
          key="text"
          value={node.textStyle}
          part="textStyle"
          onChange={(textStyle) => set({ textStyle })}
        />,
      );
      break;

    case "countdown":
      content.push(
        text("title", "Title"),
        text("text", "Text", { rich: true, allowLinks: false }),
        <SelectField
          key="mode"
          label="Timer"
          value={node.endsAt ? "date" : "daily"}
          options={[
            { value: "daily", label: "Daily – resets at midnight" },
            { value: "date", label: "Until a date" },
          ]}
          onChange={(mode) =>
            set({
              endsAt:
                mode === "daily"
                  ? ""
                  : new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 16),
            })
          }
        />,
        node.endsAt ? (
          <TextField
            key="ends"
            label="Ends at (YYYY-MM-DDTHH:MM)"
            value={node.endsAt}
            onChange={(endsAt) => set({ endsAt })}
          />
        ) : null,
        <SwitchField
          key="hide"
          label="Hide when the timer ends"
          checked={Boolean(node.hideWhenEnded)}
          onChange={(hideWhenEnded) => set({ hideWhenEnded })}
        />,
        link(node.link),
      );
      style.push(
        <FieldRow key="timer">
          <ColorField
            label="Timer background"
            value={node.timerBackground}
            onChange={(timerBackground) => set({ timerBackground })}
          />
          <ColorField
            label="Timer text"
            value={node.timerColor}
            onChange={(timerColor) => set({ timerColor })}
          />
        </FieldRow>,
        <BoxFields
          key="box"
          value={node.box}
          onChange={(box) => set({ box })}
        />,
        <TextStyleFields
          key="title"
          value={node.titleStyle}
          part="titleStyle"
          onChange={(titleStyle) => set({ titleStyle })}
        />,
        <TextStyleFields
          key="text"
          value={node.textStyle}
          part="textStyle"
          onChange={(textStyle) => set({ textStyle })}
        />,
      );
      break;

    case "pill":
      content.push(
        text("text", "Text"),
        <SelectField
          key="icon"
          label="Icon"
          value={node.icon ?? ""}
          options={ICON_OPTIONS}
          onChange={(icon) =>
            set({ icon: (icon || undefined) as IconName | undefined })
          }
        />,
        link(node.link),
      );
      style.push(
        <BoxFields
          key="box"
          value={node.box}
          onChange={(box) => set({ box })}
        />,
        <TextStyleFields
          key="style"
          value={node.style}
          part="style"
          onChange={(value) => set({ style: value })}
        />,
      );
      break;

    case "chip":
      content.push(
        text("label", "Label"),
        image(node.image, "Icon image"),
        link(node.link),
      );
      style.push(
        <BoxFields
          key="box"
          value={node.box}
          onChange={(box) => set({ box })}
        />,
        <TextStyleFields
          key="style"
          value={node.style}
          part="style"
          onChange={(value) => set({ style: value })}
        />,
      );
      break;

    case "button":
      content.push(
        text("label", "Label"),
        <SelectField
          key="variant"
          label="Style"
          value={node.variant}
          options={[
            { value: "filled", label: "Filled" },
            { value: "outline", label: "Outline with arrow" },
          ]}
          onChange={(variant) => set({ variant })}
        />,
        link(node.link),
      );
      style.push(
        <FieldRow key="colors">
          <ColorField
            label={node.variant === "filled" ? "Background" : "Border"}
            value={node.background}
            onChange={(background) => set({ background })}
          />
          <ColorField
            label="Text"
            value={node.color}
            onChange={(color) => set({ color })}
          />
        </FieldRow>,
        <FieldRow key="size">
          <NumberField
            label="Height"
            value={node.height}
            min={32}
            max={80}
            suffix="px"
            onChange={(height) => set({ height })}
          />
          <NumberField
            label="Corner radius"
            value={node.radius}
            min={0}
            max={999}
            suffix="px"
            onChange={(radius) => set({ radius })}
          />
        </FieldRow>,
        <TextStyleFields
          key="style"
          value={node.style}
          part="style"
          onChange={(value) => set({ style: value })}
        />,
      );
      break;

    case "stories":
      content.push(
        <SelectField
          key="source"
          label="Show"
          value={node.source}
          options={[
            { value: "collection", label: "Products from a collection" },
            { value: "manual", label: "Links I choose" },
          ]}
          onChange={(source) => set({ source })}
        />,
      );
      if (node.source === "collection") {
        content.push(
          <CollectionField
            key="collection"
            value={node.collection}
            details="Its products show as circles, always current."
            onChange={(collection) => {
              set({ collection });
              if (collection) loadProducts(collection.id);
            }}
          />,
          <NumberField
            key="limit"
            label="Number of products"
            value={node.limit}
            min={2}
            max={12}
            onChange={(limit) => set({ limit })}
          />,
        );
      } else {
        content.push(
          ...node.items.map((item, index) => (
            <s-box
              key={item.id}
              padding="small"
              border="base"
              borderRadius="base"
            >
              <s-stack gap="small-200">
                {text("title", `Item ${index + 1}`, {
                  key: `${item.id}.title`,
                  value: item.title,
                  onChange: (title) =>
                    set({
                      items: node.items.map((candidate) =>
                        candidate.id === item.id
                          ? { ...candidate, title }
                          : candidate,
                      ),
                    }),
                })}
                <LinkField
                  label="Link"
                  value={item.link}
                  screens={design.screens}
                  onCreateScreen={context.createScreen}
                  onResource={context.onResource}
                  onChange={(next) =>
                    set({
                      items: node.items.map((candidate) =>
                        candidate.id === item.id
                          ? {
                              ...candidate,
                              link: next,
                              title:
                                candidate.title ||
                                ("title" in next ? next.title : ""),
                            }
                          : candidate,
                      ),
                    })
                  }
                />
                <ImageField
                  label="Image"
                  value={item.image}
                  onChange={(next) =>
                    set({
                      items: node.items.map((candidate) =>
                        candidate.id === item.id
                          ? { ...candidate, image: next }
                          : candidate,
                      ),
                    })
                  }
                />
                <s-button
                  variant="tertiary"
                  tone="critical"
                  onClick={() =>
                    set({
                      items: node.items.filter(
                        (candidate) => candidate.id !== item.id,
                      ),
                    })
                  }
                >
                  Remove item
                </s-button>
              </s-stack>
            </s-box>
          )),
          <s-button
            key="add"
            icon="plus"
            onClick={() =>
              set({
                items: [
                  ...node.items,
                  { id: newId("i"), title: "", link: { type: "none" } },
                ],
              })
            }
          >
            Add item
          </s-button>,
        );
      }
      style.push(
        <FocusArea key="size" target=".chm-story__ring" label="Circles">
          <FieldRow>
            <NumberField
              label="Circle size"
              value={node.size}
              min={48}
              max={160}
              suffix="px"
              onChange={(size) => set({ size })}
            />
            <ColorField
              label="Ring color"
              value={node.ringColor}
              onChange={(ringColor) => set({ ringColor })}
            />
          </FieldRow>
        </FocusArea>,
        <FocusArea key="ring-width" target=".chm-story__ring" label="Circles">
          <NumberField
            label="Ring thickness"
            value={node.ringWidth ?? 3}
            min={0}
            max={8}
            suffix="px"
            onChange={(ringWidth) => set({ ringWidth })}
          />
        </FocusArea>,
        <ColorField
          key="bg"
          label="Image background"
          value={node.imageBackground}
          onChange={(imageBackground) => set({ imageBackground })}
        />,
        <TextStyleFields
          key="label"
          value={node.labelStyle}
          part="labelStyle"
          onChange={(labelStyle) => set({ labelStyle })}
        />,
      );
      break;

    case "review":
      content.push(
        text("quote", "Quote", { rich: true }),
        text("author", "Author"),
        <ImageField
          key="avatar"
          label="Author photo"
          value={node.avatar}
          onChange={(avatar) => set({ avatar })}
        />,
        <SelectField
          key="stars"
          label="Stars"
          value={String(node.stars ?? 0)}
          options={["0", "1", "2", "3", "4", "5"].map((value) => ({
            value,
            label: value === "0" ? "No stars" : `${value} stars`,
          }))}
          onChange={(stars) => set({ stars: Number(stars) })}
        />,
      );
      style.push(
        <FieldRow key="colors">
          <ColorField
            label="Stars"
            value={node.starColor}
            onChange={(starColor) => set({ starColor })}
          />
          <ColorField
            label="Quote mark"
            value={node.markColor}
            onChange={(markColor) => set({ markColor })}
          />
        </FieldRow>,
        <BoxFields
          key="box"
          value={node.box}
          onChange={(box) => set({ box })}
        />,
        <TextStyleFields
          key="quote"
          value={node.quoteStyle}
          part="quoteStyle"
          onChange={(quoteStyle) => set({ quoteStyle })}
        />,
      );
      break;

    case "social-proof":
      content.push(
        text("text", "Text", { rich: true }),
        <SwitchField
          key="verified"
          label="Verified badge"
          checked={Boolean(node.verified)}
          onChange={(verified) => set({ verified })}
        />,
        ...[0, 1].map((index) => (
          <ImageField
            key={`avatar-${index}`}
            label={`Avatar ${index + 1}`}
            value={node.avatars[index]}
            onChange={(avatar) => {
              const avatars = [...node.avatars];
              if (avatar) avatars[index] = avatar;
              else avatars.splice(index, 1);
              set({ avatars: avatars.filter(Boolean) });
            }}
          />
        )),
      );
      style.push(
        <BoxFields
          key="box"
          value={node.box}
          onChange={(box) => set({ box })}
        />,
        <TextStyleFields
          key="style"
          value={node.style}
          part="style"
          onChange={(value) => set({ style: value })}
        />,
      );
      break;

    case "account-bar":
      content.push(
        <SwitchField
          key="account"
          label="Account link"
          checked={node.showAccount !== false}
          onChange={(showAccount) => set({ showAccount })}
        />,
        text("loginLabel", "Label when logged out"),
        text("accountLabel", "Label when logged in"),
        ...node.socials.map((social, index) => (
          <s-stack
            key={`${social.network}-${index}`}
            direction="inline"
            gap="small-200"
            alignItems="end"
          >
            <SelectField
              label="Network"
              value={social.network}
              options={SOCIAL_OPTIONS}
              onChange={(network) =>
                set({
                  socials: node.socials.map((candidate, i) =>
                    i === index
                      ? { ...candidate, network: network as SocialNetwork }
                      : candidate,
                  ),
                })
              }
            />
            <s-box inlineSize="100%">
              <TextField
                label="Profile URL"
                value={social.url}
                placeholder="https://…"
                onChange={(url) =>
                  set({
                    socials: node.socials.map((candidate, i) =>
                      i === index ? { ...candidate, url } : candidate,
                    ),
                  })
                }
              />
            </s-box>
            <s-button
              variant="tertiary"
              icon="delete"
              accessibilityLabel="Remove"
              onClick={() =>
                set({ socials: node.socials.filter((_, i) => i !== index) })
              }
            />
          </s-stack>
        )),
        <s-button
          key="add"
          icon="plus"
          onClick={() =>
            set({
              socials: [...node.socials, { network: "instagram", url: "" }],
            })
          }
        >
          Add social link
        </s-button>,
        <s-text key="hint" color="subdued">
          Icons without a URL are hidden in your store.
        </s-text>,
      );
      style.push(
        <ColorField
          key="icon"
          label="Icon color"
          value={node.iconColor}
          onChange={(iconColor) => set({ iconColor })}
        />,
        <BoxFields
          key="box"
          value={node.box}
          onChange={(box) => set({ box })}
        />,
        <TextStyleFields
          key="style"
          value={node.style}
          part="style"
          onChange={(value) => set({ style: value })}
        />,
      );
      break;

    case "localization":
      content.push(
        <SwitchField
          key="country"
          label="Country / currency"
          checked={node.showCountry !== false}
          onChange={(showCountry) => set({ showCountry })}
        />,
        <SwitchField
          key="language"
          label="Language"
          checked={node.showLanguage !== false}
          onChange={(showLanguage) => set({ showLanguage })}
        />,
        <s-text key="hint" color="subdued">
          Only shown when your store sells in more than one country or language.
        </s-text>,
      );
      style.push(
        <BoxFields
          key="box"
          value={node.box}
          onChange={(box) => set({ box })}
        />,
        <TextStyleFields
          key="style"
          value={node.style}
          part="style"
          onChange={(value) => set({ style: value })}
        />,
      );
      break;

    case "image":
      content.push(image(node.image), link(node.link));
      style.push(
        <FieldRow key="size">
          <NumberField
            label="Height ÷ width"
            value={node.ratio}
            min={0.2}
            max={2}
            step={0.05}
            onChange={(ratio) => set({ ratio })}
          />
          <NumberField
            label="Corner radius"
            value={node.radius}
            min={0}
            max={999}
            suffix="px"
            onChange={(radius) => set({ radius })}
          />
        </FieldRow>,
        <FieldRow key="fit">
          <SelectField
            label="Fit"
            value={node.fit ?? "cover"}
            options={[
              { value: "cover", label: "Fill (crop)" },
              { value: "contain", label: "Show whole image" },
            ]}
            onChange={(fit) => set({ fit: fit === "cover" ? undefined : fit })}
          />
          <SelectField
            label="Focus"
            value={node.focus ?? "center"}
            options={[
              { value: "center", label: "Center" },
              { value: "top", label: "Top" },
              { value: "bottom", label: "Bottom" },
              { value: "left", label: "Left" },
              { value: "right", label: "Right" },
            ]}
            onChange={(focus) =>
              set({ focus: focus === "center" ? undefined : focus })
            }
          />
        </FieldRow>,
      );
      break;

    case "divider":
      style.push(
        <FieldRow key="divider">
          <ColorField
            label="Color"
            value={node.color}
            onChange={(color) => set({ color })}
          />
          <NumberField
            label="Thickness"
            value={node.thickness}
            min={1}
            max={8}
            suffix="px"
            onChange={(thickness) => set({ thickness })}
          />
        </FieldRow>,
      );
      break;

    case "canvas":
      content.push(
        <s-stack key="open" gap="small-200">
          <s-text color="subdued">
            Place text, images, shapes and widgets anywhere. The design scales
            to every phone size.
          </s-text>
          {context.onOpenCanvas && (
            <s-stack direction="inline">
              <s-button
                variant="primary"
                icon="layout-block"
                onClick={() => context.onOpenCanvas?.(node.id)}
              >
                Open canvas editor
              </s-button>
            </s-stack>
          )}
        </s-stack>,
      );
      style.push(
        <FieldRow key="size">
          <NumberField
            label="Height"
            value={node.height}
            min={40}
            max={4000}
            suffix="px"
            onChange={(height) => set({ height: height ?? 360 })}
          />
          <ColorField
            label="Background"
            value={node.background}
            onChange={(background) => set({ background })}
          />
        </FieldRow>,
      );
      break;

    case "shape":
      content.push(link(node.link));
      style.push(
        <FieldRow key="fill">
          <ColorField
            label="Fill"
            value={node.fill}
            onChange={(fill) => set({ fill })}
          />
          <NumberField
            label="Opacity"
            value={
              node.opacity === undefined ? 100 : Math.round(node.opacity * 100)
            }
            min={0}
            max={100}
            suffix="%"
            onChange={(value) =>
              set({ opacity: value === undefined ? undefined : value / 100 })
            }
          />
        </FieldRow>,
        <FieldRow key="shape">
          <NumberField
            label="Corner radius"
            value={node.radius}
            min={0}
            max={999}
            suffix="px"
            onChange={(radius) => set({ radius })}
          />
          <NumberField
            label="Border"
            value={node.borderWidth}
            min={0}
            max={20}
            suffix="px"
            onChange={(borderWidth) => set({ borderWidth })}
          />
        </FieldRow>,
        (node.borderWidth ?? 0) > 0 ? (
          <FieldRow key="border">
            <ColorField
              label="Border color"
              value={node.borderColor}
              onChange={(borderColor) => set({ borderColor })}
            />
            <SelectField
              label="Border style"
              value={node.borderStyle ?? "solid"}
              options={[
                { value: "solid", label: "Solid" },
                { value: "dashed", label: "Dashed" },
                { value: "dotted", label: "Dotted" },
              ]}
              onChange={(borderStyle) =>
                set({
                  borderStyle:
                    borderStyle === "solid" ? undefined : borderStyle,
                })
              }
            />
          </FieldRow>
        ) : null,
        <FieldRow key="icon">
          <SelectField
            label="Icon"
            value={node.icon ?? ""}
            options={SHAPE_ICON_OPTIONS}
            onChange={(icon) =>
              set({ icon: (icon || undefined) as ShapeIcon | undefined })
            }
          />
          {node.icon ? (
            <ColorField
              label="Icon color"
              value={node.iconColor}
              onChange={(iconColor) => set({ iconColor })}
            />
          ) : (
            <span />
          )}
        </FieldRow>,
        node.children?.length ? (
          <SelectField
            key="overflow"
            label="Layers that stick out"
            value={node.scroll === "x" ? "scroll" : node.clip ? "clip" : "show"}
            options={[
              { value: "show", label: "Show them" },
              { value: "clip", label: "Cut off at the frame" },
              { value: "scroll", label: "Scroll sideways (carousel)" },
            ]}
            onChange={(value) =>
              set({
                clip: value === "clip" || undefined,
                scroll: value === "scroll" ? "x" : undefined,
              })
            }
          />
        ) : null,
        node.frame ? (
          <SwitchField
            key="collapsible"
            label="Accordion: tap the top to open"
            checked={Boolean(node.collapsible)}
            onChange={(on) =>
              set({
                collapsible: on
                  ? { height: Math.min(64, node.frame?.h ?? 64) }
                  : undefined,
              })
            }
          />
        ) : null,
        node.collapsible ? (
          <FieldRow key="collapsible-fields">
            <NumberField
              label="Closed height"
              value={node.collapsible.height}
              min={8}
              max={node.frame?.h}
              suffix="px"
              onChange={(height) =>
                set({
                  collapsible: { ...node.collapsible!, height: height ?? 56 },
                })
              }
            />
            <SwitchField
              label="Open at first"
              checked={Boolean(node.collapsible.open)}
              onChange={(open) =>
                set({
                  collapsible: {
                    ...node.collapsible!,
                    open: open || undefined,
                  },
                })
              }
            />
          </FieldRow>
        ) : null,
        <SelectField
          key="gradient"
          label="Gradient"
          value={node.fillGradient ? "custom" : (node.gradient ?? "")}
          options={GRADIENT_OPTIONS}
          onChange={(value) =>
            set(
              value === "custom"
                ? {
                    gradient: undefined,
                    fillGradient: {
                      from: node.fill || "#FFFFFF",
                      to: "#E3F1FF",
                      angle: 135,
                    },
                  }
                : { gradient: value || undefined, fillGradient: undefined },
            )
          }
        />,
        node.fillGradient ? (
          <FieldRow key="gradient-colors">
            <ColorField
              label="From"
              value={node.fillGradient.from}
              onChange={(from) =>
                set({ fillGradient: { ...node.fillGradient!, from } })
              }
            />
            <ColorField
              label="To"
              value={node.fillGradient.to}
              onChange={(to) =>
                set({ fillGradient: { ...node.fillGradient!, to } })
              }
            />
          </FieldRow>
        ) : null,
        node.fillGradient ? (
          <NumberField
            key="gradient-angle"
            label="Gradient angle"
            value={node.fillGradient.angle}
            min={0}
            max={360}
            suffix="°"
            onChange={(angle) =>
              set({
                fillGradient: { ...node.fillGradient!, angle: angle ?? 0 },
              })
            }
          />
        ) : null,
      );
      break;

    case "spacer":
      style.push(
        <NumberField
          key="height"
          label="Height"
          value={node.height}
          min={0}
          max={200}
          suffix="px"
          onChange={(height) => set({ height: height ?? 0 })}
        />,
      );
      break;
  }

  const fields = (list: ReactNode[]) =>
    list.filter(Boolean).map((field, index) => <div key={index}>{field}</div>);

  if (part === "content") {
    const shown = fields(content);
    return shown.length ? (
      <s-stack gap="base">{shown}</s-stack>
    ) : (
      <s-text color="subdued">
        Nothing to fill in here. Use Design to change how it looks.
      </s-text>
    );
  }
  if (part === "design") {
    const shown = fields(style);
    if (translating)
      return (
        <s-text color="subdued">
          Design is shared by all languages. Switch to the default language to
          change it.
        </s-text>
      );
    return shown.length ? (
      <s-stack gap="base">{shown}</s-stack>
    ) : (
      <s-text color="subdued">This section has no design settings.</s-text>
    );
  }

  return (
    <s-stack gap="base">
      <s-stack direction="inline" gap="small-200" alignItems="center">
        <s-badge>{NODE_LABELS[node.type]}</s-badge>
        {node.hidden && <s-badge tone="warning">Hidden</s-badge>}
      </s-stack>
      <TextField
        label="Layer name"
        value={node.name ?? ""}
        placeholder={NODE_LABELS[node.type]}
        onChange={(name) => set({ name: name || undefined })}
      />
      {content.filter(Boolean).length > 0 && (
        <Group title="Content">
          {content.map((field, index) => (
            <div key={index}>{field}</div>
          ))}
        </Group>
      )}
      {!translating && style.filter(Boolean).length > 0 && (
        <>
          <s-divider />
          <Group title="Design">
            {style.map((field, index) => (
              <div key={index}>{field}</div>
            ))}
          </Group>
        </>
      )}
    </s-stack>
  );
}

/** Settings shown when nothing is selected: the whole menu's colors and behavior, and the screen's title. */
export function DesignSettings({
  design,
  screen,
  onChange,
  onRemoveScreen,
  translating,
  locale,
  setTranslation,
  screenOnly = false,
}: {
  design: Design;
  screen: Screen;
  onChange: (design: Design) => void;
  onRemoveScreen: () => void;
  translating: boolean;
  locale: string;
  setTranslation: (key: string, value: string) => void;
  /** Only the sub-menu's own settings (title, delete), not the whole menu's design. */
  screenOnly?: boolean;
}) {
  const tokens = design.tokens;
  const behavior = design.behavior;
  const setTokens = (patch: Partial<Design["tokens"]>) =>
    onChange({ ...design, tokens: { ...tokens, ...patch } });
  const setBehavior = (patch: Partial<Design["behavior"]>) =>
    onChange({ ...design, behavior: { ...behavior, ...patch } });
  const isMain = screen.id === design.screens[0].id;
  /** Menu design: spacing changes go to every sub-menu too (or the main menu only). */
  const [spacingEverywhere, setSpacingEverywhere] = useState(true);
  const hasSubMenus = design.screens.length > 1;

  return (
    <s-stack gap="base">
      {!translating && !isMain && screenOnly && (
        <ScreenSpacingFields
          design={design}
          sourceScreenId={screen.id}
          targetScreenIds={[screen.id]}
          hint="Only this sub-menu"
          onChange={onChange}
        />
      )}
      {!translating && isMain && !screenOnly && (
        <s-stack gap="small-200">
          <ScreenSpacingFields
            design={design}
            sourceScreenId={screen.id}
            targetScreenIds={
              spacingEverywhere
                ? design.screens.map((candidate) => candidate.id)
                : [screen.id]
            }
            hint={
              hasSubMenus && spacingEverywhere
                ? "Main menu and sub-menus"
                : undefined
            }
            onChange={onChange}
          />
          {hasSubMenus && (
            <SwitchField
              label="Same spacing in all sub-menus"
              checked={spacingEverywhere}
              onChange={setSpacingEverywhere}
            />
          )}
        </s-stack>
      )}
      {!isMain && (
        <Group title="Sub-menu">
          {translating ? (
            <TextField
              label={`Title (${locale.toUpperCase()})`}
              value={design.translations[locale]?.[`${screen.id}.title`] ?? ""}
              placeholder={screen.title}
              onChange={(value) => setTranslation(`${screen.id}.title`, value)}
            />
          ) : (
            <TextField
              label="Title (shown in the back bar)"
              value={screen.title}
              onChange={(title) =>
                onChange({
                  ...design,
                  screens: design.screens.map((candidate) =>
                    candidate.id === screen.id
                      ? { ...candidate, title }
                      : candidate,
                  ),
                })
              }
            />
          )}
          <s-button
            tone="critical"
            variant="secondary"
            onClick={onRemoveScreen}
          >
            Delete sub-menu
          </s-button>
        </Group>
      )}
      {!translating && !screenOnly && (
        <>
          <Group title="Colors">
            <FieldRow>
              <ColorField
                label="Text"
                value={tokens.text}
                onChange={(text) => setTokens({ text })}
              />
              <ColorField
                label="Muted text"
                value={tokens.mutedText}
                onChange={(mutedText) => setTokens({ mutedText })}
              />
            </FieldRow>
            <FieldRow>
              <ColorField
                label="Panels"
                value={tokens.background}
                onChange={(background) => setTokens({ background })}
              />
              <ColorField
                label="Menu background"
                value={tokens.canvas}
                onChange={(canvas) => setTokens({ canvas })}
              />
            </FieldRow>
            <FieldRow>
              <ColorField
                label="Accent"
                value={tokens.accent}
                onChange={(accent) => setTokens({ accent })}
              />
              <ColorField
                label="Text on accent"
                value={tokens.accentText}
                onChange={(accentText) => setTokens({ accentText })}
              />
            </FieldRow>
          </Group>
          <s-divider />
          <Group title="Typography & shape">
            <SelectField
              label="Font"
              value={tokens.fontFamily}
              options={[
                { value: "theme", label: "Same as my theme" },
                {
                  value: "system-ui, -apple-system, sans-serif",
                  label: "System sans-serif",
                },
                {
                  value: "Georgia, 'Times New Roman', serif",
                  label: "Classic serif",
                },
              ]}
              onChange={(fontFamily) => setTokens({ fontFamily })}
            />
            <NumberField
              label="Default corner radius"
              value={tokens.radius}
              min={0}
              max={32}
              suffix="px"
              onChange={(radius) => setTokens({ radius: radius ?? 0 })}
            />
          </Group>
          <s-divider />
          <Group title="Behavior">
            <FieldRow>
              <SelectField
                label="Opens from"
                value={behavior.side}
                options={[
                  { value: "left", label: "Left" },
                  { value: "right", label: "Right" },
                ]}
                onChange={(side) => setBehavior({ side })}
              />
              <SelectField
                label="Width"
                value={behavior.width === "full" ? "full" : "panel"}
                options={[
                  { value: "full", label: "Full screen" },
                  { value: "panel", label: "Panel (85%)" },
                ]}
                onChange={(width) =>
                  setBehavior({ width: width === "full" ? "full" : 360 })
                }
              />
            </FieldRow>
            <NumberField
              label="Replace the theme menu below"
              value={behavior.breakpoint}
              min={320}
              max={1600}
              suffix="px"
              onChange={(breakpoint) =>
                setBehavior({ breakpoint: breakpoint ?? 990 })
              }
            />
            <ColorField
              label="Overlay"
              value={behavior.overlayColor}
              onChange={(overlayColor) => setBehavior({ overlayColor })}
            />
          </Group>
        </>
      )}
    </s-stack>
  );
}
