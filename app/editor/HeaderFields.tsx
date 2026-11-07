import type { ReactNode } from "react";
import {
  applyHeaderStyle,
  DEFAULT_ANNOUNCEMENT,
  HEADER_ICONS,
  HEADER_STYLES,
  headerButtonOrder,
  newId,
  headerStyleOf,
  type Design,
  type HeaderButton,
  type HeaderIcon,
  type HeaderNode,
} from "@chopi/menu-core";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FragmentPreview } from "../components/FragmentPreview";
import type { PreviewContext } from "../components/MenuPreview";
import { ColorField, FieldRow, SwitchField } from "./controls";
import {
  ALIGN_ICONS,
  DesignGroup,
  Segmented,
  SliderField,
} from "./designControls";
import { ImageField } from "./ImageField";
import { ItemList, updateItem } from "./ItemList";
import { LIVE_SEARCH_OFF, LiveSearchFields } from "./LiveSearchFields";

const line = (body: ReactNode) => (
  <svg
    viewBox="0 0 20 20"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {body}
  </svg>
);

/** Small line icons for the header's cards and buttons. */
const ICONS = {
  style: line(
    <>
      <rect x="3" y="4" width="14" height="5" rx="1.5" />
      <path d="M3 13h14M3 16h9" />
    </>,
  ),
  logo: line(
    <>
      <rect x="3" y="4" width="14" height="12" rx="2" />
      <path d="M3 13l4-4 3 3 2-2 5 5" />
    </>,
  ),
  buttons: line(
    <>
      <circle cx="5" cy="10" r="2.2" />
      <circle cx="10" cy="10" r="2.2" />
      <circle cx="15" cy="10" r="2.2" />
    </>,
  ),
  search: line(
    <>
      <circle cx="9" cy="9" r="5" />
      <path d="M13 13l4 4" />
    </>,
  ),
  account: line(
    <>
      <circle cx="10" cy="7" r="3" />
      <path d="M4 17c.6-3.2 3-5 6-5s5.4 1.8 6 5" />
    </>,
  ),
  cart: line(<path d="M4 7h12l-1 10H5zM7.5 7V5.5a2.5 2.5 0 015 0V7" />),
  language: line(
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M3 10h14M10 3c2 2 2.8 4.5 2.8 7s-.8 5-2.8 7c-2-2-2.8-4.5-2.8-7S8 5 10 3z" />
    </>,
  ),
  announcement: line(
    <>
      <path d="M4 8v4h3l6 3V5L7 8z" />
      <path d="M16 8.5v3" />
    </>,
  ),
};

/** Mini pictures of the search field styles. */
const FIELD_PICTURES = {
  pill: (
    <svg viewBox="0 0 32 14" width="32" height="14" aria-hidden="true">
      <rect
        x="1"
        y="2"
        width="30"
        height="10"
        rx="5"
        fill="currentColor"
        opacity=".22"
      />
    </svg>
  ),
  box: (
    <svg viewBox="0 0 32 14" width="32" height="14" aria-hidden="true">
      <rect
        x="1.5"
        y="2.5"
        width="29"
        height="9"
        rx="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  ),
  underline: (
    <svg viewBox="0 0 32 14" width="32" height="14" aria-hidden="true">
      <path d="M1 11.5h30" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
};

const CLOSE_PICTURES = {
  plain: line(<path d="M6 6l8 8M14 6l-8 8" />),
  circle: (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="currentColor" opacity=".14" />
      <path
        d="M7 7l6 6M13 7l-6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
};

/**
 * Everything the header shows, in cards like the Design settings: a style
 * to start from, then the logo, the buttons, the search field and the promo
 * line. Hovering a card outlines its part of the header on the phone.
 */
export function HeaderFields({
  design,
  node,
  context,
  set,
  replace,
  text,
  termText,
}: {
  design: Design;
  node: HeaderNode;
  context?: PreviewContext;
  set: (patch: Partial<HeaderNode>) => void;
  /** Replaces the whole header (a ready-made style). */
  replace: (header: HeaderNode) => void;
  /** A translation-aware text field for one of the header's texts. */
  text: (
    field: "announcement" | "searchPlaceholder",
    label: string,
  ) => ReactNode;
  /** A translation-aware text field for a popular search term. */
  termText: (
    id: string,
    value: string,
    label: string,
    onChange: (value: string) => void,
  ) => ReactNode;
}) {
  const icons = node.icons ?? [];
  const toggleIcon = (name: HeaderIcon) =>
    set({
      // Keep the usual order (search, account, cart) whatever the clicks.
      icons: HEADER_ICONS.filter((candidate) =>
        candidate === name ? !icons.includes(name) : icons.includes(candidate),
      ),
    });
  const hasAnnouncement = node.announcement !== undefined;

  return (
    <s-stack gap="base">
      <DesignGroup
        title="Style"
        icon={ICONS.style}
        target=":scope"
        help="A ready-made layout to start from. Your logo, colors and spacing stay as they are."
      >
        <HeaderStylePicker
          design={design}
          node={node}
          context={context}
          onChange={replace}
        />
      </DesignGroup>

      <DesignGroup
        title="Logo"
        icon={ICONS.logo}
        target=".chm-header__brand"
        help="Your store's logo, or its name when there's no logo."
      >
        <SwitchField
          label="Show logo"
          checked={!node.hideBrand}
          onChange={(show) => set({ hideBrand: !show })}
        />
        {!node.hideBrand && (
          <>
            <ImageField
              label="Logo image"
              value={node.logo}
              details="Empty = the logo from your Shopify settings, or your store name"
              onChange={(logo) => set({ logo })}
            />
            <SliderField
              label="Logo width"
              // 96 is the width the header uses when none is set.
              value={node.logoWidth ?? 96}
              min={40}
              max={240}
              onChange={(logoWidth) => set({ logoWidth })}
            />
            <Segmented
              label="Position"
              value={node.logoAlign ?? "start"}
              options={[
                { value: "start", label: ALIGN_ICONS.left, title: "Left" },
                { value: "center", label: ALIGN_ICONS.center, title: "Center" },
              ]}
              onChange={(logoAlign) => set({ logoAlign })}
            />
          </>
        )}
      </DesignGroup>

      <DesignGroup
        title="Buttons"
        icon={ICONS.buttons}
        // The buttons themselves: centered headers have them on both sides.
        target=".chm-header__icon, .chm-header .chm-select, .chm-close"
        help="Shortcuts shoppers can tap in the header, and how the close button looks."
      >
        <div className="chm-field">
          <div className="chm-field__top">
            <span className="chm-field__label">Show in the header</span>
          </div>
          <HeaderButtonChips
            node={node}
            onToggle={(button) =>
              button === "language"
                ? set({ showLanguage: !node.showLanguage })
                : toggleIcon(button)
            }
            onReorder={(buttonOrder) => set({ buttonOrder })}
          />
          <s-text color="subdued">Tap to show or hide · drag to reorder</s-text>
        </div>
        <Segmented
          label="Close button"
          value={node.close ?? "plain"}
          options={[
            { value: "plain", label: CLOSE_PICTURES.plain, title: "Plain" },
            {
              value: "circle",
              label: CLOSE_PICTURES.circle,
              title: "In a circle",
            },
          ]}
          onChange={(close) => set({ close })}
        />
      </DesignGroup>

      <DesignGroup
        title="Search field"
        icon={ICONS.search}
        target=".chm-header__search"
        help="A search field under the logo. Shoppers type and press Search to see your store's results."
      >
        <SwitchField
          label="Show a search field"
          checked={Boolean(node.searchBar)}
          onChange={(searchBar) => set({ searchBar })}
        />
        {(node.searchBar || node.liveSearch?.enabled) && (
          <>
            <Segmented
              label="Field style"
              value={node.liveSearch?.field ?? "pill"}
              options={[
                { value: "pill", label: FIELD_PICTURES.pill, title: "Rounded" },
                { value: "box", label: FIELD_PICTURES.box, title: "Outlined" },
                {
                  value: "underline",
                  label: FIELD_PICTURES.underline,
                  title: "Underlined",
                },
              ]}
              onChange={(field) =>
                set({
                  liveSearch: {
                    ...(node.liveSearch ?? LIVE_SEARCH_OFF),
                    field,
                  },
                })
              }
            />
            <s-stack gap="small-100">
              {text("searchPlaceholder", "Placeholder text")}
              <s-text color="subdued">
                Empty = “Search”, already translated for each language.
              </s-text>
            </s-stack>
          </>
        )}
      </DesignGroup>

      <LiveSearchFields
        design={design}
        node={node}
        context={context}
        set={set}
        termText={termText}
      />

      <DesignGroup
        title="Announcement"
        icon={ICONS.announcement}
        target=".chm-header__announce"
        help="A short promo line above the logo, e.g. free shipping or a new drop."
      >
        <SwitchField
          label="Show an announcement"
          checked={hasAnnouncement}
          onChange={(on) =>
            set({ announcement: on ? DEFAULT_ANNOUNCEMENT : undefined })
          }
        />
        {hasAnnouncement && (
          <>
            <Segmented
              label="Style"
              value={node.announcementMode ?? "still"}
              options={[
                { value: "still", label: "Still" },
                { value: "ticker", label: "Scrolling ticker" },
              ]}
              onChange={(announcementMode) => set({ announcementMode })}
            />
            {text(
              "announcement",
              node.announcementMode === "ticker" ? "Message 1" : "Text",
            )}
            {node.announcementMode === "ticker" && (
              <>
                <ItemList
                  label="More messages"
                  items={node.announcementItems ?? []}
                  min={0}
                  max={6}
                  addLabel="Add message"
                  create={() => ({ id: newId("an"), text: "" })}
                  onChange={(announcementItems) => set({ announcementItems })}
                >
                  {(item, index) =>
                    termText(
                      item.id,
                      item.text,
                      `Message ${index + 2}`,
                      (value) =>
                        set({
                          announcementItems: updateItem(
                            node.announcementItems ?? [],
                            item.id,
                            { text: value },
                          ),
                        }),
                    )
                  }
                </ItemList>
                <SliderField
                  label="Speed"
                  value={node.announcementSpeed ?? 40}
                  min={10}
                  max={120}
                  unit=" px/s"
                  onChange={(announcementSpeed) => set({ announcementSpeed })}
                />
              </>
            )}
            <FieldRow>
              <ColorField
                label="Background"
                value={node.announcementBackground}
                onChange={(announcementBackground) =>
                  set({
                    announcementBackground: announcementBackground || undefined,
                  })
                }
              />
              <ColorField
                label="Text color"
                value={node.announcementColor}
                onChange={(announcementColor) =>
                  set({ announcementColor: announcementColor || undefined })
                }
              />
            </FieldRow>
          </>
        )}
      </DesignGroup>
    </s-stack>
  );
}

/**
 * Ready-made header designs, each shown as the real header with the
 * merchant's logo and colors. Picking one changes only the layout.
 */
function HeaderStylePicker({
  design,
  node,
  context,
  onChange,
}: {
  design: Design;
  node: HeaderNode;
  context?: PreviewContext;
  onChange: (header: HeaderNode) => void;
}) {
  const current = headerStyleOf(node);
  return (
    <s-stack gap="small-300">
      <div
        className="chm-header-styles"
        role="radiogroup"
        aria-label="Header style"
      >
        {HEADER_STYLES.map((style) => {
          const preview = applyHeaderStyle(node, style.key);
          return (
            <button
              key={style.key}
              type="button"
              role="radio"
              aria-checked={current === style.key}
              className="chm-header-style"
              onClick={() => onChange(preview)}
            >
              {context && (
                <span className="chm-header-style__stage">
                  <span className="chm-header-style__preview">
                    <FragmentPreview
                      bare
                      design={{ ...design, header: preview }}
                      node={preview}
                      context={context}
                    />
                  </span>
                </span>
              )}
              <span className="chm-header-style__name">{style.name}</span>
              <span className="chm-header-style__description">
                {style.description}
              </span>
            </button>
          );
        })}
      </div>
      {current === null && (
        <s-text color="subdued">
          Custom: your header mixes several styles. Pick one to start over.
        </s-text>
      )}
    </s-stack>
  );
}

const BUTTON_LABELS: Record<HeaderButton, string> = {
  search: "Search",
  account: "Account",
  cart: "Cart",
  language: "Language",
};

/**
 * The header's buttons as chips: tap one to show or hide it, drag it to
 * change the order (arrow keys move the focused chip too).
 */
function HeaderButtonChips({
  node,
  onToggle,
  onReorder,
}: {
  node: HeaderNode;
  onToggle: (button: HeaderButton) => void;
  onReorder: (order: HeaderButton[]) => void;
}) {
  const order = headerButtonOrder(node);
  const isOn = (button: HeaderButton) =>
    button === "language"
      ? Boolean(node.showLanguage)
      : (node.icons ?? []).includes(button);
  const sensors = useSensors(
    // A short drag reorders; a tap still toggles.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // Keyboard: Enter shows or hides, Space picks up to move with the arrows.
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: {
        start: ["Space"],
        cancel: ["Escape"],
        end: ["Space", "Enter"],
      },
    }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = order.indexOf(active.id as HeaderButton);
    const to = order.indexOf(over.id as HeaderButton);
    onReorder(arrayMove(order, from, to));
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={order} strategy={rectSortingStrategy}>
        <div className="chm-hchips">
          {order.map((button) => (
            <ButtonChip
              key={button}
              button={button}
              on={isOn(button)}
              onToggle={() => onToggle(button)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function ButtonChip({
  button,
  on,
  onToggle,
}: {
  button: HeaderButton;
  on: boolean;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: button });
  return (
    <button
      ref={setNodeRef}
      type="button"
      // dnd-kit's attributes first: the toggle's own aria-pressed wins.
      {...attributes}
      {...listeners}
      className={`chm-hchip${isDragging ? " is-dragging" : ""}`}
      aria-pressed={on}
      aria-label={`${BUTTON_LABELS[button]}: ${on ? "shown" : "hidden"}. Enter shows or hides it; Space, then arrow keys, moves it.`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      onClick={onToggle}
    >
      {ICONS[button]}
      {BUTTON_LABELS[button]}
    </button>
  );
}
