import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type {
  ActionFunctionArgs,
  LinksFunction,
  LoaderFunctionArgs,
} from "react-router";
import {
  useFetcher,
  useLoaderData,
  useRevalidator,
  useSearchParams,
} from "react-router";
import type { Prisma } from "@prisma/client";
import type { ContainerNode, Design, Node } from "@chopi/menu-core";
import {
  addScreen,
  compile,
  insertNode,
  childNodes,
  locate,
  mapNode,
  METAFIELD_WARN_BYTES,
  MenuTooLargeError,
  NODE_LABELS,
  nodeLabel,
  TooManyLinksError,
  parseDesign,
  removeNode,
  removeScreen,
  replaceTemplateImages,
  updateNode,
} from "@chopi/menu-core";
import type { ResolvedResource } from "@chopi/menu-renderer";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { MenuPreview } from "../components/MenuPreview";
import { GuideBot } from "../components/GuideBot";
import {
  setGuidePref,
  useGuidePrefs,
  type GuideLine,
} from "../components/GuideBot";
import { BackBarFields } from "../editor/BackBarFields";
import { ModeSwitch, type PreviewMode } from "../components/ModeSwitch";
import { DEFAULT_DEVICE, DEVICES, type Device } from "../components/devices";
import { buildPreviewContext } from "../services/preview-context.server";
import { topSearches } from "../services/top-searches.server";
import { publishMenu, unpublishMenu } from "../services/publish.server";
import { currentPlan, publishCheck } from "../services/billing.server";
import {
  PAID_PLANS,
  PLAN_NAMES,
  TRIAL_DAYS,
  type PaidPlanKey,
} from "../billing/plans";
import {
  ImagesProcessingError,
  importTemplateImages,
} from "../services/template-images.server";
import { ShopifyUserError } from "../services/admin-graphql.server";
import {
  DesignSettings,
  Inspector,
  type InspectorContext,
} from "../editor/Inspector";
import { NodeList, SectionCard, type ListContext } from "../editor/SectionList";
import { isItemList, isPanel, sectionTitle } from "../editor/sections";
import { DesignWorkspace, lowerFirst } from "../editor/DesignWorkspace";
import { SEARCH_RESULTS_TARGET } from "../editor/LiveSearchFields";
import { previewSearchResults as sampleSearch } from "../editor/searchPreview";
import { TranslationsPanel } from "../editor/TranslationsPanel";
import {
  DesignFocusContext,
  Segmented,
  type DesignFocus,
} from "../editor/designControls";
import { hasItemColors, ItemColorFields } from "../editor/ItemColors";
import { SelectField, TextField } from "../editor/controls";
import { cleanMenuName } from "../models/menu-name";
import { useHistory } from "../editor/useHistory";
import { SectionLibrary } from "../editor/SectionLibrary";
import { convertScreenToCanvas, isCanvasScreen } from "../canvas/convert";
import { reorder, SortableItem, SortableList } from "../editor/Sortable";
import editorStyles from "../editor/editor.css?url";
import showcaseStyles from "../components/showcase.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: editorStyles },
  { rel: "stylesheet", href: showcaseStyles },
];

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const menu = await prisma.menu.findFirst({
    where: { id: params.id, shop: { shop: session.shop } },
  });
  if (!menu) throw new Response("Menu not found", { status: 404 });
  const design = menu.draft as unknown as Design;
  const [{ context: baseContext, locales }, top, planState] = await Promise.all(
    [
      buildPreviewContext(admin, [design]),
      // The store's top searches for live search (refreshed at most daily).
      topSearches(admin),
      // Publishing needs a plan (cached for a few minutes).
      currentPlan(admin, session.shop),
    ],
  );
  const context = {
    ...baseContext,
    topSearches: top.available ? top.terms : null,
  };
  // Only one menu is live per store: publishing this one replaces it.
  const liveMenu = await prisma.menu.findFirst({
    where: {
      shopId: menu.shopId,
      id: { not: menu.id },
      publishedAt: { not: null },
    },
    select: { name: true },
  });
  // What's live is the last published version: have there been edits since?
  const lastPublished = menu.publishedAt
    ? await prisma.menuVersion.findFirst({
        where: { menuId: menu.id, label: "Published" },
        orderBy: { createdAt: "desc" },
        select: { design: true },
      })
    : null;
  const changedSincePublish = Boolean(
    lastPublished &&
    JSON.stringify(lastPublished.design) !== JSON.stringify(menu.draft),
  );
  return {
    menu: {
      id: menu.id,
      name: menu.name,
      publishedAt: menu.publishedAt?.toISOString() ?? null,
    },
    changedSincePublish,
    liveMenuName: liveMenu?.name ?? null,
    plan: planState.plan,
    design,
    context,
    locales,
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = String(form.get("intent"));
  const menu = await prisma.menu.findFirst({
    where: { id: params.id, shop: { shop: session.shop } },
    select: {
      id: true,
      name: true,
      draft: true,
      publishedAt: true,
    },
  });
  if (!menu) throw new Response("Menu not found", { status: 404 });

  if (intent === "rename") {
    const name = cleanMenuName(form.get("name"));
    if (!name)
      return {
        ok: false as const,
        intent,
        error: "Enter a name for the menu.",
      };
    try {
      await prisma.menu.update({ where: { id: menu.id }, data: { name } });
      return { ok: true as const, intent, name };
    } catch (error) {
      console.error(`Menu rename failed for ${session.shop}`, error);
      return {
        ok: false as const,
        intent,
        error: "Couldn't rename the menu. Please try again.",
      };
    }
  }

  if (intent === "unpublish") {
    // Off the storefront: the theme's own menu shows again. The draft stays.
    // Only the live menu can be unpublished: a stale tab must not take
    // another (live) menu off the store.
    if (!menu.publishedAt) return { ok: true as const, intent };
    try {
      await unpublishMenu(admin);
      await prisma.menu.update({
        where: { id: menu.id },
        data: { publishedAt: null },
      });
      return { ok: true as const, intent };
    } catch (error) {
      console.error(`Menu unpublish failed for ${session.shop}`, error);
      return {
        ok: false as const,
        intent,
        error: "Couldn't unpublish the menu. Please try again.",
      };
    }
  }

  try {
    const design = parseDesign(JSON.parse(String(form.get("draft"))));
    const { bytes } = compile(design);
    // Big structural changes (converting to a canvas) keep the previous draft as a version.
    if (form.get("snapshot")) {
      await prisma.menuVersion.create({
        data: {
          menuId: menu.id,
          design: menu.draft as Prisma.InputJsonValue,
          label: String(form.get("snapshot")).slice(0, 80),
        },
      });
    }
    // Template sample images go to the store's Shopify Files on save, so the
    // menu (and the Files gallery) use the merchant's own copies.
    const imported = await importTemplateImages(admin, design);
    const saved = imported.design;
    // Shopify file URLs are longer than the sample paths: check the size again.
    if (imported.imported > 0) compile(saved);
    // Template images copied to Shopify Files (path → URL): the editor applies
    // them to the design, which the merchant may have kept editing.
    const imageUrls = { ...imported.urls };
    /** Published, but the live theme needs this plan to show it. */
    let liveNeedsPlan: PaidPlanKey | null = null;
    await prisma.menu.update({
      where: { id: menu.id },
      data: {
        draft: saved as unknown as Prisma.InputJsonValue,
        schemaVersion: saved.schemaVersion,
      },
    });
    if (intent === "publish") {
      // Publishing is free: the menu runs on draft themes and in the theme
      // editor. The live theme also needs a plan that covers it (Starter for
      // template menus, Pro for canvas), which the storefront checks.
      const { livePlan } = await currentPlan(admin, session.shop);
      const check = publishCheck(livePlan, saved);
      liveNeedsPlan = check.allowed ? null : check.required;
      // Not published until every image has its Shopify copy.
      if (imported.pending > 0)
        return {
          ok: false as const,
          intent,
          error: new ImagesProcessingError().message,
          imageUrls,
        };
      const result = await publishMenu(admin, session.shop, menu.id);
      Object.assign(imageUrls, result.imageUrls);
    }
    return {
      ok: true as const,
      intent,
      imageUrls,
      liveNeedsPlan,
      bytes,
      warnSize: bytes > METAFIELD_WARN_BYTES,
    };
  } catch (error) {
    const message =
      error instanceof MenuTooLargeError ||
      error instanceof TooManyLinksError ||
      error instanceof ShopifyUserError ||
      error instanceof ImagesProcessingError
        ? error.message
        : error instanceof Error && error.name === "InvalidDesignError"
          ? error.message
          : "Something went wrong. Please try again.";
    if (
      !(error instanceof MenuTooLargeError) &&
      !(error instanceof TooManyLinksError)
    )
      console.error(`Menu ${intent} failed for ${session.shop}`, error);
    return { ok: false as const, intent, error: message };
  }
};

const SAVE_BAR_ID = "menu-save-bar";

/** Style properties copied by "Use this design for all items here". */
const ITEM_STYLE_KEYS = [
  "variant",
  "box",
  "titleStyle",
  "subtitleStyle",
  "arrow",
  "ratio",
  "thumbSize",
  "thumbRadius",
  "accent",
  "accentText",
  "style",
  "background",
  "color",
  "radius",
  "height",
  "chevron",
] as const;

/** What items are called in "All 6 chips". */
const ITEM_PLURALS: Partial<Record<Node["type"], string>> = {
  chip: "chips",
  row: "links",
  card: "cards",
  pill: "pills",
  button: "buttons",
  image: "images",
  accordion: "fold-outs",
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Applies to `sibling` only what changed between `before` and `patch` (for
 * nested styles, only the changed fields), so making all chips bigger keeps
 * each chip's own background.
 */
function applyChangedFields(
  sibling: Node,
  before: Node,
  patch: Partial<Node>,
): Node {
  const target = { ...sibling } as Record<string, unknown>;
  const old = before as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    const previous = old[key];
    if (isPlainObject(value) && isPlainObject(previous)) {
      const merged = { ...(isPlainObject(target[key]) ? target[key] : {}) };
      for (const field of new Set([
        ...Object.keys(value),
        ...Object.keys(previous),
      ])) {
        if (JSON.stringify(value[field]) !== JSON.stringify(previous[field]))
          merged[field] = value[field];
      }
      target[key] = merged;
    } else {
      target[key] = value;
    }
  }
  return target as unknown as Node;
}

/** Whether two items share the same design (the style properties). */
function sameItemDesign(a: Node, b: Node): boolean {
  const left = a as unknown as Record<string, unknown>;
  const right = b as unknown as Record<string, unknown>;
  return ITEM_STYLE_KEYS.every(
    (key) => JSON.stringify(left[key]) === JSON.stringify(right[key]),
  );
}

interface Step {
  node: Node;
  movable: boolean;
  isFirst: boolean;
  isLast: boolean;
}

/** A Customize card's part of a section, outlined on the phone. */
type PreviewFocus = DesignFocus & { nodeId: string };

/** A top-level block of a screen: one section, or a group (a box around several sections). */
type Block =
  | { kind: "step"; step: Step }
  | { kind: "group"; panel: ContainerNode; steps: Step[] };

interface Outline {
  header: Step;
  blocks: Block[];
  footer: Step[];
}

/** Sections in storefront order: fixed header, the screen's blocks, fixed footer blocks. */
function buildOutline(design: Design, screenId: string): Outline {
  const screen =
    design.screens.find((candidate) => candidate.id === screenId) ??
    design.screens[0];
  const children = screen.root.children;
  return {
    header: {
      node: design.header,
      movable: false,
      isFirst: true,
      isLast: true,
    },
    blocks: children.map((child, index): Block =>
      isPanel(child)
        ? {
            kind: "group",
            panel: child,
            steps: child.children.map((node, inner) => ({
              node,
              movable: true,
              isFirst: inner === 0,
              isLast: inner === child.children.length - 1,
            })),
          }
        : {
            kind: "step",
            step: {
              node: child,
              movable: true,
              isFirst: index === 0,
              isLast: index === children.length - 1,
            },
          },
    ),
    footer: (design.footer?.children ?? []).map((node) => ({
      node,
      movable: false,
      isFirst: true,
      isLast: true,
    })),
  };
}

type ModalElement = HTMLElementTagNameMap["s-modal"];

function Modal({
  id,
  heading,
  modalRef,
  size = "large",
  onClosed,
  children,
}: {
  id: string;
  heading: string;
  modalRef: RefObject<ModalElement>;
  size?: "large" | "large-100";
  /** After the close animation: clear what the modal was editing. */
  onClosed?: () => void;
  children: ReactNode;
}) {
  return (
    <s-modal
      id={id}
      heading={heading}
      size={size}
      ref={modalRef}
      onAfterHide={onClosed}
    >
      {children}
      <s-button
        slot="primary-action"
        variant="primary"
        commandFor={id}
        command="--hide"
      >
        Done
      </s-button>
    </s-modal>
  );
}

/**
 * After publishing without a plan that covers the menu: it already works on
 * draft themes; the live theme needs this plan.
 */
function PlanNeeded({
  needs,
  plan,
}: {
  needs: PaidPlanKey | null;
  plan: keyof typeof PLAN_NAMES;
}) {
  if (!needs) return null;
  const needed = PAID_PLANS.find((candidate) => candidate.key === needs)!;
  const steps: [string, string][] = [
    ["Open Online Store → Themes", "in your Shopify admin."],
    ["Pick a theme that isn't live", "and choose Preview or Customize."],
    [
      "Look at it on a phone",
      "(or the editor's mobile view) and tap the menu icon.",
    ],
  ];
  return (
    <div className="chm-published">
      <div className="chm-published__hero">
        <div className="chm-published__bot">
          <GuideBot variant="hero" />
        </div>
        <div className="chm-published__intro">
          <span className="chm-hero__eyebrow">Published</span>
          <h3 className="chm-published__title">
            Your menu is ready to try{" "}
            <span className="chm-hero__brand">on your store</span>
          </h3>
          <p className="chm-published__text">
            It already works on your draft themes and in the theme editor, so
            you can see it exactly like a shopper will.
          </p>
        </div>
      </div>

      <ol className="chm-published__steps">
        {steps.map(([title, rest], index) => (
          <li key={title}>
            <span className="chm-published__num">{index + 1}</span>
            <span>
              <strong>{title}</strong> {rest}
            </span>
          </li>
        ))}
      </ol>

      <div className="chm-published__plan">
        <div className="chm-published__plan-copy">
          <span className="chm-published__plan-label">For your live theme</span>
          <span className="chm-published__plan-name">
            {needed.name}
            <span className="chm-published__plan-price">
              {needed.price}/month
            </span>
          </span>
          <span className="chm-published__plan-text">
            {needs === "PRO"
              ? plan === "STARTER"
                ? "This menu uses the free-form canvas: Starter covers template menus, canvas menus need Pro."
                : "This menu uses the free-form canvas, which shows on your live theme with Pro."
              : "Shows template and section menus on your live theme. Pro adds canvas menus."}
          </span>
        </div>
        <span className="chm-plan__trial">{TRIAL_DAYS}-day free trial</span>
      </div>
    </div>
  );
}

function nodeName(node: Node): string {
  if ("title" in node && typeof node.title === "string") return node.title;
  if ("label" in node && typeof node.label === "string") return node.label;
  return "item";
}

export default function MenuEditor() {
  const data = useLoaderData<typeof loader>();
  const history = useHistory<Design>(data.design);
  const design = history.value;
  const [savedDesign, setSavedDesign] = useState(data.design);
  /** The saved design that is live on the store (null: the saved one differs). */
  const [liveDesign, setLiveDesign] = useState<Design | null>(
    data.changedSincePublish ? null : data.design,
  );
  const [screenId, setScreenId] = useState(data.design.screens[0].id);
  const primaryLocale =
    data.locales.find((locale) => locale.primary)?.locale ??
    data.context.locale;
  const [locale, setLocale] = useState(primaryLocale);
  const [extraResources, setExtraResources] = useState<
    Record<string, ResolvedResource>
  >({});
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  /** The section opened last: the preview scrolls to it and the helper points at it. */
  const [pointedId, setPointedId] = useState<string | null>(null);
  /** The merchant's choice in an item's dialog: design this item or all like it. */
  const [itemScope, setItemScope] = useState<{
    id: string;
    scope: "one" | "all";
  } | null>(null);
  const [designId, setDesignId] = useState<string | null>(null);
  const [published, setPublished] = useState(Boolean(data.menu.publishedAt));
  /** The plan publishing needs, when the shop's plan doesn't have it (shows the plan dialog). */
  const [needsPlan, setNeedsPlan] = useState<PaidPlanKey | null>(null);
  const planModal = useRef<ModalElement>(null);
  const [menuName, setMenuName] = useState(data.menu.name);
  /** Another menu that's live now (publishing this one replaces it). */
  const [liveMenuName, setLiveMenuName] = useState(data.liveMenuName);
  const [nameDraft, setNameDraft] = useState(data.menu.name);
  const renameModal = useRef<ModalElement>(null);
  const replaceModal = useRef<ModalElement>(null);
  // The Translations manager renders on first open only.
  const [translationsOpened, setTranslationsOpened] = useState(false);
  const translationsModal = useRef<ModalElement>(null);
  // The Menu design dialog's phone renders on first open only.
  const [menuDesignOpened, setMenuDesignOpened] = useState(false);

  // The library's live previews render on first open only.
  const [libraryOpened, setLibraryOpened] = useState(false);
  /** Phone the live preview shows the menu on (real width and screen height). */
  const [device, setDevice] = useState<Device>(DEFAULT_DEVICE);
  /** Live preview: "edit" (click to select) or "preview" (works like the store). */
  const [previewMode, setPreviewMode] = useState<PreviewMode>("edit");
  const fetcher = useFetcher<typeof action>();
  const revalidator = useRevalidator();
  const [searchParams, setSearchParams] = useSearchParams();
  const canvasModal = () =>
    document.getElementById("canvas-editor") as UIModalElement | null;
  /** Set when the canvas editor closes: the next loader data replaces the design. */
  const reloadFromServer = useRef(false);
  /** Canvas to open once the pending save finishes (the canvas editor works on the saved draft). */
  const pendingCanvas = useRef<string | null>(null);
  /**
   * Opens the canvas editor. The src is set on the element right before
   * showing (not through React), with a fresh `v` so the modal always loads the
   * latest saved draft, also when the same canvas is reopened.
   */
  const showCanvas = useCallback(
    (canvasId: string) => {
      const modal = canvasModal();
      if (!modal) return;
      modal.src = `/app/canvas/${data.menu.id}/${canvasId}?v=${Date.now()}`;
      if (modal.show) void modal.show();
      else void shopify.modal.show("canvas-editor");
    },
    [data.menu.id],
  );

  /**
   * Opens the custom CSS editor (a full page in a max modal, like the
   * canvas). It works on the saved draft, so unsaved changes are saved first.
   */
  const pendingCss = useRef(false);
  const showCss = useCallback(() => {
    const modal = document.getElementById(
      "css-editor",
    ) as UIModalElement | null;
    if (!modal) return;
    modal.src = `/app/css/${data.menu.id}?v=${Date.now()}`;
    if (modal.show) void modal.show();
    else void shopify.modal.show("css-editor");
  }, [data.menu.id]);

  const itemModal = useRef<ModalElement>(null);
  const designModal = useRef<ModalElement>(null);
  const menuModal = useRef<ModalElement>(null);
  const libraryModal = useRef<ModalElement>(null);
  const convertModal = useRef<ModalElement>(null);

  const dirty = design !== savedDesign;
  const busy = fetcher.state !== "idle";
  const pendingIntent = busy ? fetcher.formData?.get("intent") : null;
  const translating = locale !== primaryLocale;
  // The sub-menu may be gone (undo, discard): fall back to the main screen.
  const screen =
    design.screens.find((candidate) => candidate.id === screenId) ??
    design.screens[0];
  const isMainScreen = screen.id === design.screens[0].id;
  useEffect(() => {
    if (screen.id !== screenId) setScreenId(screen.id);
  }, [screen.id, screenId]);

  const resources = useMemo(
    () => ({ ...data.context.resources, ...extraResources }),
    [data.context.resources, extraResources],
  );
  const context = useMemo(
    () => ({ ...data.context, locale, resources }),
    [data.context, locale, resources],
  );

  useEffect(() => {
    if (dirty) shopify.saveBar.show(SAVE_BAR_ID);
    else shopify.saveBar.hide(SAVE_BAR_ID);
  }, [dirty]);

  // Save / publish results.
  const lastResult = useRef<unknown>(null);
  const submittedDesign = useRef<Design | null>(null);
  useEffect(() => {
    const result = fetcher.data;
    if (!result || result === lastResult.current || fetcher.state !== "idle")
      return;
    lastResult.current = result;
    // Template images now in Shopify Files: point the design at them, keeping
    // anything the merchant changed while the save was running.
    const imageUrls =
      "imageUrls" in result && result.imageUrls ? result.imageUrls : {};
    const copiedImages = Object.keys(imageUrls).length > 0;
    if (copiedImages)
      history.reset(replaceTemplateImages(history.value, imageUrls));
    if (!result.ok) {
      // A canvas or CSS editor waiting for this save must not open later.
      pendingCanvas.current = null;
      pendingCss.current = false;
      if (copiedImages && submittedDesign.current)
        setSavedDesign(
          replaceTemplateImages(submittedDesign.current, imageUrls),
        );
      shopify.toast.show(result.error, { isError: true });
      return;
    }
    if (result.intent === "rename" && "name" in result && result.name) {
      setMenuName(result.name);
      shopify.toast.show("Menu renamed");
      return;
    }
    if (result.intent === "unpublish") {
      setPublished(false);
      shopify.toast.show("Menu unpublished. Your theme's menu shows again.");
      return;
    }
    const nowSaved =
      submittedDesign.current &&
      replaceTemplateImages(submittedDesign.current, imageUrls);
    if (nowSaved) setSavedDesign(nowSaved);
    if (result.intent === "publish" && nowSaved) setLiveDesign(nowSaved);
    if (pendingCanvas.current) {
      const canvasId = pendingCanvas.current;
      pendingCanvas.current = null;
      showCanvas(canvasId);
      return;
    }
    if (pendingCss.current) {
      pendingCss.current = false;
      showCss();
      return;
    }
    if (result.intent === "publish") {
      setPublished(true);
      setLiveMenuName(null);
      // Published for draft themes; the live theme needs a plan first.
      if ("liveNeedsPlan" in result && result.liveNeedsPlan) {
        setNeedsPlan(result.liveNeedsPlan);
        planModal.current?.showOverlay();
        return;
      }
    }
    shopify.toast.show(
      result.intent === "publish" ? "Menu published" : "Menu saved",
    );
    if (result.warnSize)
      shopify.toast.show(
        "This menu is close to Shopify's size limit. Remove some translations or sections.",
        { isError: true },
      );
  }, [fetcher.data, fetcher.state, showCanvas, showCss, history]);

  const unpublishModal = useRef<ModalElement>(null);
  const rename = () => {
    const name = cleanMenuName(nameDraft);
    if (!name) return;
    renameModal.current?.hideOverlay();
    if (name !== menuName)
      fetcher.submit({ intent: "rename", name }, { method: "post" });
  };
  /** Publish; when another menu is live, confirm replacing it first. */
  const requestPublish = () => {
    if (liveMenuName && !published) replaceModal.current?.showOverlay();
    else submit("publish");
  };
  const unpublish = () => {
    unpublishModal.current?.hideOverlay();
    fetcher.submit({ intent: "unpublish" }, { method: "post" });
  };

  const submit = (intent: "save" | "publish") => {
    submittedDesign.current = design;
    fetcher.submit(
      { intent, draft: JSON.stringify(design) },
      { method: "post" },
    );
  };

  const change = useCallback(
    (next: Design, key?: string) => history.set(next, key),
    [history],
  );
  const onResource = useCallback(
    (key: string, resource: ResolvedResource) =>
      setExtraResources((current) => ({ ...current, [key]: resource })),
    [],
  );

  const createScreen = useCallback(
    (title: string) => {
      const { design: next, screenId: id } = addScreen(design, title);
      history.set(next);
      return id;
    },
    [design, history],
  );

  /** Opens the full-screen canvas editor; unsaved changes are saved first. */
  const openCss = () => {
    if (design !== savedDesign) {
      pendingCss.current = true;
      submit("save");
    } else {
      showCss();
    }
  };

  const openCanvas = (canvasId: string) => {
    itemModal.current?.hideOverlay();
    designModal.current?.hideOverlay();
    if (design !== savedDesign) {
      pendingCanvas.current = canvasId;
      submit("save");
    } else {
      showCanvas(canvasId);
    }
  };

  // Start from scratch lands here with ?canvas=<id>: open the canvas editor right away.
  useEffect(() => {
    const canvasId = searchParams.get("canvas");
    if (!canvasId) return;
    setSearchParams(
      (params) => {
        params.delete("canvas");
        return params;
      },
      { replace: true },
    );
    showCanvas(canvasId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The canvas editor saves to the database; reload the design when it closes.
  useEffect(() => {
    const modal = canvasModal();
    const cssModal = document.getElementById("css-editor");
    const onDone = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "chopi:canvas-done") canvasModal()?.hide?.();
      if (event.data?.type === "chopi:css-done")
        (
          document.getElementById("css-editor") as UIModalElement | null
        )?.hide?.();
    };
    const onHide = () => {
      reloadFromServer.current = true;
      revalidator.revalidate();
    };
    window.addEventListener("message", onDone);
    modal?.addEventListener("hide", onHide);
    cssModal?.addEventListener("hide", onHide);
    return () => {
      window.removeEventListener("message", onDone);
      modal?.removeEventListener("hide", onHide);
      cssModal?.removeEventListener("hide", onHide);
    };
  }, [revalidator]);

  // After the canvas editor closes, take over the design it saved.
  useEffect(() => {
    if (!reloadFromServer.current) return;
    reloadFromServer.current = false;
    history.reset(data.design);
    setSavedDesign(data.design);
    setLiveDesign(data.changedSincePublish ? null : data.design);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.design]);

  const openScreen = (id: string) => {
    itemModal.current?.hideOverlay();
    designModal.current?.hideOverlay();
    setEditingId(null);
    setScreenId(id);
    setOpenSections(new Set());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setTranslation = (key: string, value: string) =>
    history.set(
      (current) => ({
        ...current,
        translations: {
          ...current.translations,
          [locale]: { ...current.translations[locale], [key]: value },
        },
      }),
      `t:${locale}:${key}`,
    );

  const inspectorContext = (
    overrides: Partial<InspectorContext> = {},
  ): InspectorContext => ({
    design,
    locale,
    primaryLocale,
    update: (id, patch) =>
      history.set(
        (current) => updateNode(current, id, patch),
        `${id}:${Object.keys(patch).join(",")}`,
      ),
    setTranslation,
    createScreen,
    onOpenScreen: openScreen,
    onOpenCanvas: openCanvas,
    onResource,
    preview: context,
    ...overrides,
  });

  const editItem = (id: string) => {
    setEditingId(id);
    itemModal.current?.showOverlay();
  };
  const designSection = (id: string) => {
    setDesignId(id);
    designModal.current?.showOverlay();
  };

  /** Turns the current screen into a canvas, saves (keeping a version) and opens the canvas editor. */
  const convertToCanvas = () => {
    try {
      const { design: next, canvasId } = convertScreenToCanvas(
        design,
        screen.id,
        context,
      );
      history.set(next);
      submittedDesign.current = next;
      pendingCanvas.current = canvasId;
      fetcher.submit(
        {
          intent: "save",
          draft: JSON.stringify(next),
          snapshot: "Before converting to canvas",
        },
        { method: "post" },
      );
      convertModal.current?.hideOverlay();
    } catch (error) {
      shopify.toast.show(
        error instanceof Error ? error.message : "Couldn't convert this screen",
        { isError: true },
      );
    }
  };

  const listContext: ListContext = {
    design,
    resources,
    change: (next) => change(next),
    editItem,
    designSection,
    onResource,
    openCanvas,
    undo: history.undo,
  };

  const outline = buildOutline(design, screen.id);
  const stepIds = new Set(
    [
      outline.header,
      ...outline.footer,
      ...outline.blocks.flatMap((block) =>
        block.kind === "step" ? [block.step] : block.steps,
      ),
    ].map((step) => step.node.id),
  );
  const toggleSection = (id: string, open: boolean) => {
    setOpenSections((current) => {
      const next = new Set(current);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
    setPointedId((current) => (open ? id : current === id ? null : current));
  };

  /** Clicking the preview opens the section it belongs to, and the item's editor. */
  const selectFromPreview = (id: string) => {
    const location = locate(design, id);
    if (!location) return;
    // Anything on a canvas (or the canvas itself) opens the canvas editor.
    if (location.node.type === "canvas") {
      openCanvas(location.node.id);
      return;
    }
    // Layers can sit inside shapes on a canvas: open the nearest canvas above.
    const canvasId = [...location.path]
      .reverse()
      .find((ancestor) => locate(design, ancestor)?.node.type === "canvas");
    if (canvasId) {
      openCanvas(canvasId);
      return;
    }
    const sectionId = [...location.path, id].find((candidate) =>
      stepIds.has(candidate),
    );
    if (sectionId) {
      toggleSection(sectionId, true);
      requestAnimationFrame(() =>
        document
          .getElementById(`section-${sectionId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
    const node = location.node;
    if (sectionId !== id && node.type !== "container" && node.type !== "tabs")
      editItem(id);
  };

  const editing = editingId ? locate(design, editingId) : undefined;
  /**
   * Items of a list (chips, link rows, cards…) share their design, set in the
   * section's Design; their own dialog offers only colors.
   */
  const editingInList = Boolean(
    editing?.parent && isItemList(editing.parent as Node),
  );
  /** Items like the edited one in the same list (same type). */
  const editingSiblings = editing?.parent
    ? childNodes(editing.parent).filter(
        (sibling) => sibling.type === editing.node.type,
      )
    : [];
  const siblingsMatch =
    editing !== undefined &&
    editingSiblings.every((sibling) => sameItemDesign(sibling, editing.node));
  /** Whether design changes go to every item like this one, or only to it. */
  const designScope: "one" | "all" =
    // List items only set their own colors; shared design is the section's.
    editingInList || editingSiblings.length < 2
      ? "one"
      : itemScope && itemScope.id === editingId
        ? itemScope.scope
        : siblingsMatch
          ? "all"
          : "one";
  const designing = designId ? locate(design, designId)?.node : undefined;

  /** Copies the edited item's design to every sibling of the same type. */
  const applyDesignToSiblings = () => {
    if (!editing?.parent) return;
    const source = editing.node as unknown as Record<string, unknown>;
    const style = Object.fromEntries(
      ITEM_STYLE_KEYS.filter((key) => key in source).map((key) => [
        key,
        source[key],
      ]),
    );
    let next = design;
    for (const sibling of childNodes(editing.parent)) {
      if (sibling.id !== editing.node.id && sibling.type === editing.node.type)
        next = updateNode(next, sibling.id, style as Partial<Node>);
    }
    change(next);
    shopify.toast.show("Design applied to all items here");
  };

  /**
   * The part of a section a Customize card changes, outlined on the phone
   * while the card is hovered (or was last touched), like in Design.
   */
  const [hoverFocus, setHoverFocus] = useState<PreviewFocus | null>(null);
  const [touchFocus, setTouchFocus] = useState<PreviewFocus | null>(null);
  const previewFocus = hoverFocus ?? touchFocus;
  // Working on the search results: the phone shows them, with samples.
  const showSearchSample = previewFocus?.target === SEARCH_RESULTS_TARGET;
  const previewContext = useMemo(
    () =>
      showSearchSample
        ? { ...context, searchSample: sampleSearch(context) }
        : context,
    [context, showSearchSample],
  );
  /** What the preview outlines, scrolls to and the helper points at. */
  const previewSelectedId = previewFocus?.nodeId ?? editingId ?? pointedId;

  // The helper says, in plain words, what's being looked at.
  const guide = useGuidePrefs().shown;
  const [guideLine, setGuideLine] = useState<GuideLine | null>(null);
  const guideLineId = useRef(0);
  const pointedNode = previewSelectedId
    ? locate(design, previewSelectedId)?.node
    : undefined;
  const pointedFocus = previewFocus?.label;
  useEffect(() => {
    if (!pointedNode) return;
    const isSection = stepIds.has(pointedNode.id);
    const kind = lowerFirst(
      isSection ? sectionTitle(pointedNode) : NODE_LABELS[pointedNode.type],
    );
    // A merchant's own name stays as written; built-in names read as words.
    const thing = pointedNode.name ? `“${pointedNode.name}”` : `the ${kind}`;
    const title = isSection ? undefined : nodeLabel(pointedNode);
    setGuideLine({
      id: ++guideLineId.current,
      caption: pointedFocus ? sectionTitle(pointedNode) : title,
      text: pointedFocus
        ? `You're editing the ${lowerFirst(pointedFocus)}`
        : isSection
          ? `You're looking at ${thing}`
          : `You're editing ${thing}`,
    });
    // Only when it points somewhere else (edits don't repeat the line).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointedNode?.id, pointedFocus]);
  const focusFor = (nodeId: string) => ({
    hover: (focus: DesignFocus | null) =>
      setHoverFocus(focus ? { ...focus, nodeId } : null),
    touch: (focus: DesignFocus) => setTouchFocus({ ...focus, nodeId }),
  });
  // A closed section's part isn't outlined any longer.
  useEffect(() => {
    if (touchFocus && !openSections.has(touchFocus.nodeId)) setTouchFocus(null);
  }, [openSections, touchFocus]);

  const customize = (node: Node) => {
    switch (node.type) {
      case "container":
        return <NodeList container={node} ctx={listContext} />;
      case "tabs":
        return (
          <s-stack gap="base">
            <Inspector
              node={node}
              context={inspectorContext()}
              part="content"
            />
            {node.tabs.map((tab, index) => (
              // Each tab is its own block: a line and room above, then its sections.
              <s-box key={tab.id} paddingBlockStart="large">
                <s-stack gap="base">
                  <s-divider />
                  <s-box paddingBlockStart="small">
                    <s-stack gap="small-500">
                      <s-heading>Tab “{tab.label}”</s-heading>
                      <s-text color="subdued">
                        Tab {index + 1} of {node.tabs.length} · what shoppers
                        see when this tab is selected
                      </s-text>
                    </s-stack>
                  </s-box>
                  {tab.child.type === "container" && (
                    <NodeList container={tab.child} ctx={listContext} />
                  )}
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        );
      case "accordion":
        return (
          <s-stack gap="base">
            <Inspector
              node={node}
              context={inspectorContext()}
              part="content"
            />
            <s-heading>Links inside</s-heading>
            <NodeList container={node.child} ctx={listContext} />
          </s-stack>
        );
      default:
        return (
          <Inspector node={node} context={inspectorContext()} part="content" />
        );
    }
  };

  // Numbers follow the storefront, top to bottom: header, sections, footer.
  // Worked out up front: rows render through drag-and-drop render props,
  // so a counter increased while rendering would skip and repeat.
  const numbers = new Map(
    [
      outline.header,
      ...outline.blocks.flatMap((block) =>
        block.kind === "step" ? [block.step] : block.steps,
      ),
      ...outline.footer,
    ].map((step, index) => [step.node.id, index + 1]),
  );
  const renderStep = (step: Step, handle?: ReactNode) => {
    const number = numbers.get(step.node.id) ?? 0;
    return (
      <div id={`section-${step.node.id}`} className="chm-enter">
        <SectionCard
          node={step.node}
          number={number}
          movable={step.movable}
          isFirst={step.isFirst}
          isLast={step.isLast}
          open={openSections.has(step.node.id)}
          onOpenChange={(open) => toggleSection(step.node.id, open)}
          ctx={listContext}
          handle={handle}
        >
          {/* Hovering a settings card outlines its part on the phone. */}
          <DesignFocusContext.Provider value={focusFor(step.node.id)}>
            {customize(step.node)}
          </DesignFocusContext.Provider>
        </SectionCard>
      </div>
    );
  };

  /** Sections of one group; movable ones can be dragged within their group. */
  const renderSteps = (steps: Step[]) => {
    const movable = steps.filter((step) => step.movable);
    if (movable.length < 2)
      return steps.map((step) => (
        <div key={step.node.id}>{renderStep(step)}</div>
      ));
    return (
      <SortableList
        ids={movable.map((step) => step.node.id)}
        onReorder={(active, over) => change(reorder(design, active, over))}
      >
        <s-stack gap="base">
          {steps.map((step) => (
            <SortableItem
              key={step.node.id}
              id={step.node.id}
              label={step.node.name ?? step.node.type}
            >
              {(handle) => renderStep(step, handle)}
            </SortableItem>
          ))}
        </s-stack>
      </SortableList>
    );
  };

  /** Live, but the store shows an older version than what's here. */
  const changesNotLive = published && (dirty || savedDesign !== liveDesign);
  const statusBadge = dirty ? (
    <s-badge tone="caution">Unsaved changes</s-badge>
  ) : changesNotLive ? (
    <s-badge tone="info">Changes not published</s-badge>
  ) : published ? (
    <s-badge tone="success">Published</s-badge>
  ) : (
    <s-badge tone="warning">Not published yet</s-badge>
  );

  return (
    <s-page heading={menuName} inlineSize="large">
      <s-link slot="breadcrumb-actions" href="/app">
        Home
      </s-link>
      <s-button
        slot="primary-action"
        variant="primary"
        loading={pendingIntent === "publish"}
        disabled={busy || (published && !changesNotLive)}
        onClick={requestPublish}
      >
        {!published
          ? "Publish"
          : changesNotLive
            ? "Publish changes"
            : "Published"}
      </s-button>
      <s-button
        slot="secondary-actions"
        commandFor="rename-modal"
        command="--show"
        onClick={() => setNameDraft(menuName)}
      >
        Rename
      </s-button>
      <s-modal id="rename-modal" heading="Rename menu" ref={renameModal}>
        <TextField
          label="Menu name"
          value={nameDraft}
          onChange={setNameDraft}
          details="Only you see this name, in the app."
        />
        <s-button
          slot="primary-action"
          variant="primary"
          disabled={busy || !cleanMenuName(nameDraft)}
          onClick={rename}
        >
          Save name
        </s-button>
        <s-button
          slot="secondary-actions"
          commandFor="rename-modal"
          command="--hide"
        >
          Cancel
        </s-button>
      </s-modal>
      <s-modal id="plan-modal" heading="Menu published" ref={planModal}>
        <PlanNeeded needs={needsPlan} plan={data.plan} />
        <s-button slot="primary-action" variant="primary" href="/app/pricing">
          See plans
        </s-button>
        <s-button
          slot="secondary-actions"
          commandFor="plan-modal"
          command="--hide"
        >
          Got it
        </s-button>
      </s-modal>
      <s-modal
        id="replace-modal"
        heading={`Replace “${liveMenuName ?? ""}” on your store?`}
        ref={replaceModal}
      >
        <s-text>
          Your store shows one menu at a time. Publishing “{menuName}” takes “
          {liveMenuName}” off your store; it stays here as a draft, and you can
          publish it again any time.
        </s-text>
        <s-button
          slot="primary-action"
          variant="primary"
          onClick={() => {
            replaceModal.current?.hideOverlay();
            submit("publish");
          }}
        >
          Publish “{menuName}”
        </s-button>
        <s-button
          slot="secondary-actions"
          commandFor="replace-modal"
          command="--hide"
        >
          Cancel
        </s-button>
      </s-modal>
      {published && (
        <s-button
          slot="secondary-actions"
          commandFor="unpublish-modal"
          command="--show"
          disabled={busy}
          loading={pendingIntent === "unpublish"}
        >
          Unpublish
        </s-button>
      )}
      <s-modal
        id="unpublish-modal"
        heading="Unpublish this menu?"
        ref={unpublishModal}
      >
        <s-text>
          The menu is taken off your store and your theme&apos;s own menu shows
          again. Your design is kept, and you can publish it again any time.
        </s-text>
        <s-button
          slot="primary-action"
          variant="primary"
          tone="critical"
          onClick={unpublish}
        >
          Unpublish
        </s-button>
        <s-button
          slot="secondary-actions"
          commandFor="unpublish-modal"
          command="--hide"
        >
          Cancel
        </s-button>
      </s-modal>

      <ui-save-bar id={SAVE_BAR_ID}>
        <button
          variant="primary"
          onClick={() => submit("save")}
          disabled={busy}
        >
          Save
        </button>
        <button
          onClick={() => history.reset(savedDesign)}
          disabled={busy || undefined}
        >
          Discard
        </button>
      </ui-save-bar>

      <div className="chm-editor">
        {/* Left: everything to edit, in storefront order. */}
        <s-stack gap="base">
          <s-section>
            <s-stack gap="base">
              <s-grid
                gridTemplateColumns="auto minmax(0, 1fr)"
                gap="base"
                alignItems="center"
              >
                <s-box padding="small" background="subdued" borderRadius="base">
                  <s-icon type="menu" />
                </s-box>
                <s-stack gap="small-300">
                  <s-stack
                    direction="inline"
                    gap="small-200"
                    alignItems="center"
                  >
                    <s-heading>
                      {isMainScreen
                        ? "Mobile menu"
                        : `Sub-menu “${screen.title || "Untitled"}”`}
                    </s-heading>
                    {statusBadge}
                  </s-stack>
                  <s-text color="subdued">
                    {isMainScreen
                      ? "Opens from your theme's menu icon on phones. Changes show in the preview right away; Publish sends them to your store."
                      : "Opens when a shopper taps a card or link that points to it, with a back button at the top."}
                  </s-text>
                </s-stack>
              </s-grid>
              {/* One tidy row of actions: history on the left, tools on the right. */}
              <div className="chm-editor-toolbar">
                <div className="chm-editor-toolbar__group">
                  <s-button
                    icon="undo"
                    variant="tertiary"
                    accessibilityLabel="Undo"
                    disabled={!history.canUndo}
                    onClick={history.undo}
                  />
                  <s-button
                    icon="redo"
                    variant="tertiary"
                    accessibilityLabel="Redo"
                    disabled={!history.canRedo}
                    onClick={history.redo}
                  />
                  {data.locales.length > 1 && (
                    <div className="chm-editor-toolbar__language">
                      <SelectField
                        label="Language"
                        labelAccessibilityVisibility="exclusive"
                        value={locale}
                        options={data.locales.map((candidate) => ({
                          value: candidate.locale,
                          label: `${candidate.name}${candidate.primary ? " (default)" : ""}`,
                        }))}
                        onChange={setLocale}
                      />
                    </div>
                  )}
                </div>
                <div className="chm-editor-toolbar__group">
                  <s-button
                    icon="language"
                    onClick={() => {
                      setTranslationsOpened(true);
                      translationsModal.current?.showOverlay();
                    }}
                  >
                    Quick translation
                  </s-button>
                  <s-button
                    icon="paint-brush-flat"
                    onClick={() => {
                      setMenuDesignOpened(true);
                      menuModal.current?.showOverlay();
                    }}
                  >
                    Menu design
                  </s-button>
                  <s-button icon="code" onClick={openCss}>
                    Custom CSS
                  </s-button>
                  {isCanvasScreen(design, screen.id) ? (
                    <s-button
                      icon="layout-block"
                      variant="primary"
                      onClick={() => openCanvas(screen.root.children[0].id)}
                    >
                      Edit canvas
                    </s-button>
                  ) : (
                    <s-button
                      icon="layout-block"
                      onClick={() => convertModal.current?.showOverlay()}
                    >
                      Edit as canvas
                    </s-button>
                  )}
                </div>
              </div>
            </s-stack>
          </s-section>

          {translating && (
            <s-banner tone="info">
              You&apos;re editing the{" "}
              {
                data.locales.find((candidate) => candidate.locale === locale)
                  ?.name
              }{" "}
              texts. Empty fields use the default language. Links, images and
              design are shared by all languages.
            </s-banner>
          )}

          {!isMainScreen && (
            <s-stack direction="inline">
              <s-button
                icon="arrow-left"
                onClick={() => openScreen(design.screens[0].id)}
              >
                Back to main menu
              </s-button>
            </s-stack>
          )}

          <s-grid
            gridTemplateColumns="minmax(0, 1fr) auto"
            gap="base"
            alignItems="end"
          >
            <s-stack gap="small-500">
              <s-heading>
                {isMainScreen
                  ? "Menu, top to bottom"
                  : "Sub-menu, top to bottom"}
              </s-heading>
              <s-text color="subdued">
                Customize edits a section&apos;s content, Design its colors and
                sizes. Click anything in the preview to edit it.
              </s-text>
            </s-stack>
            <s-button
              variant="tertiary"
              icon={openSections.size ? "chevron-up" : "chevron-down"}
              onClick={() =>
                setOpenSections(
                  openSections.size ? new Set() : new Set(stepIds),
                )
              }
            >
              {openSections.size ? "Collapse all" : "Expand all"}
            </s-button>
          </s-grid>

          {renderStep(outline.header)}

          <SortableList
            ids={outline.blocks.map((block) =>
              block.kind === "step" ? block.step.node.id : block.panel.id,
            )}
            onReorder={(active, over) => change(reorder(design, active, over))}
          >
            <s-stack gap="base">
              {outline.blocks.map((block) =>
                block.kind === "step" ? (
                  <SortableItem
                    key={block.step.node.id}
                    id={block.step.node.id}
                    label={block.step.node.name ?? block.step.node.type}
                  >
                    {(handle) => renderStep(block.step, handle)}
                  </SortableItem>
                ) : (
                  <SortableItem
                    key={block.panel.id}
                    id={block.panel.id}
                    label="group"
                  >
                    {(handle) => (
                      <s-box
                        padding="small"
                        border="base"
                        borderRadius="large-100"
                        background="subdued"
                      >
                        <s-stack gap="small">
                          <s-grid
                            gridTemplateColumns="auto minmax(0, 1fr) auto"
                            gap="small"
                            alignItems="center"
                          >
                            {handle}
                            <s-stack gap="small-500">
                              <s-text type="strong">Group</s-text>
                              <s-text color="subdued">
                                These sections share a box (spacing, background,
                                corners).
                              </s-text>
                            </s-stack>
                            <s-stack
                              direction="inline"
                              gap="small-200"
                              alignItems="center"
                            >
                              <s-button
                                icon="paint-brush-flat"
                                onClick={() => designSection(block.panel.id)}
                              >
                                Group design
                              </s-button>
                              <s-button
                                variant="tertiary"
                                tone="critical"
                                icon="delete"
                                accessibilityLabel={`Delete group and its ${block.steps.length} sections`}
                                interestFor={`delete-group-${block.panel.id}`}
                                onClick={() => {
                                  change(removeNode(design, block.panel.id));
                                  shopify.toast.show("Group deleted", {
                                    action: "Undo",
                                    onAction: history.undo,
                                  });
                                }}
                              />
                              {/* Outside the row's layout, so showing it never shifts the buttons. */}
                              <span className="chm-tooltip-anchor">
                                <s-tooltip
                                  id={`delete-group-${block.panel.id}`}
                                >
                                  Delete group and its sections
                                </s-tooltip>
                              </span>
                            </s-stack>
                          </s-grid>
                          {renderSteps(block.steps)}
                        </s-stack>
                      </s-box>
                    )}
                  </SortableItem>
                ),
              )}
            </s-stack>
          </SortableList>

          {outline.footer.map((step) => (
            <div key={step.node.id}>{renderStep(step)}</div>
          ))}

          <s-stack direction="inline">
            <s-button
              icon="plus"
              onClick={() => {
                setLibraryOpened(true);
                libraryModal.current?.showOverlay();
              }}
            >
              Add section
            </s-button>
          </s-stack>

          {!isMainScreen && (
            <s-section heading="Sub-menu settings">
              <DesignSettings
                design={design}
                screen={screen}
                translating={translating}
                locale={locale}
                setTranslation={setTranslation}
                onChange={(next) => change(next, "screen")}
                onRemoveScreen={() => {
                  history.set(removeScreen(design, screen.id));
                  openScreen(design.screens[0].id);
                }}
                screenOnly
              />
            </s-section>
          )}
          {!isMainScreen && !translating && (
            <s-section heading="Back to the level above">
              <BackBarFields
                design={design}
                screenId={screen.id}
                context={context}
                onChange={(next, key) => change(next, key)}
              />
            </s-section>
          )}
        </s-stack>

        {/* Right: live preview, stays in view while scrolling. */}
        <div className="chm-editor__preview">
          <s-section heading="Live preview">
            <s-stack gap="base" alignItems="center">
              <div className="chm-preview-tools">
                <ModeSwitch value={previewMode} onChange={setPreviewMode} />
                <div className="chm-preview-tools__pickers">
                  <SelectField
                    label="Phone"
                    labelAccessibilityVisibility="exclusive"
                    value={device.id}
                    options={DEVICES.map((candidate) => ({
                      value: candidate.id,
                      label: `${candidate.label} (${candidate.width} × ${candidate.height})`,
                    }))}
                    onChange={(id) =>
                      setDevice(
                        DEVICES.find((candidate) => candidate.id === id) ??
                          DEFAULT_DEVICE,
                      )
                    }
                  />
                </div>
              </div>
              <MenuPreview
                width={device.width + 20}
                height={device.height + 20}
                design={design}
                context={previewContext}
                screenId={screen.id}
                selectedId={previewSelectedId}
                focusSelector={previewFocus?.target ?? null}
                focusLabel={previewFocus?.label}
                onSelect={selectFromPreview}
                onScreenChange={(id) => id !== screen.id && openScreen(id)}
                scale={0.86}
                interactive={previewMode === "preview"}
                guide
                guideLine={guideLine}
              />
              <s-text color="subdued">
                {previewMode === "edit"
                  ? "Click anything to edit it."
                  : "Works like your store: switch tabs, open accordions and sub-menus, swipe rows. Links stay here."}
              </s-text>
              {!guide && previewMode === "edit" && (
                <s-button
                  variant="tertiary"
                  onClick={() => setGuidePref("shown", true)}
                >
                  Show helper
                </s-button>
              )}
            </s-stack>
          </s-section>
        </div>
      </div>

      <Modal
        id="item-editor"
        heading={editing ? `Edit “${nodeName(editing.node)}”` : "Edit"}
        modalRef={itemModal}
        size="large-100"
        onClosed={() => setEditingId(null)}
      >
        {editing ? (
          <DesignWorkspace
            key={`ws-${editing.node.id}`}
            design={design}
            context={context}
            screenId={screen.id}
            selectedId={editing.node.id}
            alsoSelectedIds={
              designScope === "all"
                ? editingSiblings
                    .filter((sibling) => sibling.id !== editing.node.id)
                    .map((sibling) => sibling.id)
                : undefined
            }
            label={
              designScope === "all"
                ? `All ${editingSiblings.length} ${ITEM_PLURALS[editing.node.type] ?? "items"}`
                : nodeName(editing.node)
            }
            device={device}
          >
            <s-stack gap="large">
              <s-stack gap="base">
                <s-heading>Content</s-heading>
                <Inspector
                  key={`c-${editing.node.id}`}
                  node={editing.node}
                  context={inspectorContext()}
                  part="content"
                />
              </s-stack>
              {!translating && editingInList && editing.parent && (
                <>
                  <s-divider />
                  <s-stack gap="base">
                    <s-heading>Design</s-heading>
                    {hasItemColors(editing.node) && (
                      <ItemColorFields
                        node={editing.node}
                        onChange={(patch) =>
                          inspectorContext().update(editing.node.id, patch)
                        }
                      />
                    )}
                    <s-box
                      padding="base"
                      background="subdued"
                      borderRadius="large"
                    >
                      <s-grid
                        gridTemplateColumns="minmax(0, 1fr) auto"
                        gap="base"
                        alignItems="center"
                      >
                        <s-text color="subdued">
                          Size, spacing, font, corners and border are shared by
                          all {editingSiblings.length}{" "}
                          {ITEM_PLURALS[editing.node.type] ?? "items"}, so they
                          always match.
                        </s-text>
                        <s-button
                          icon="paint-brush-flat"
                          onClick={() => {
                            const listId = editing.parent!.id;
                            itemModal.current?.hideOverlay();
                            designSection(listId);
                          }}
                        >
                          Edit shared design
                        </s-button>
                      </s-grid>
                    </s-box>
                  </s-stack>
                </>
              )}
              {!translating && !editingInList && (
                <>
                  <s-divider />
                  <s-stack gap="base">
                    <s-grid
                      gridTemplateColumns="minmax(0, 1fr) auto"
                      alignItems="center"
                    >
                      <s-heading>Design</s-heading>
                    </s-grid>
                    {editingSiblings.length > 1 && (
                      <s-stack gap="small-200">
                        <Segmented
                          label="Design applies to"
                          value={designScope}
                          options={[
                            {
                              value: "one",
                              label: `Only “${nodeName(editing.node)}”`,
                            },
                            {
                              value: "all",
                              label: `All ${editingSiblings.length} ${ITEM_PLURALS[editing.node.type] ?? "items"}`,
                            },
                          ]}
                          onChange={(scope) =>
                            setItemScope({ id: editing.node.id, scope })
                          }
                        />
                        <s-text color="subdued">
                          {designScope === "all"
                            ? "Each change applies to all of them, so they stay consistent. Only the setting you change is copied."
                            : "Changes apply to this one only, for a one-off look."}
                        </s-text>
                        {designScope === "all" && !siblingsMatch && (
                          <s-stack direction="inline">
                            <s-button
                              icon="duplicate"
                              onClick={applyDesignToSiblings}
                            >
                              Make all match this one
                            </s-button>
                          </s-stack>
                        )}
                      </s-stack>
                    )}
                    <Inspector
                      key={`d-${editing.node.id}`}
                      node={editing.node}
                      context={
                        designScope === "all"
                          ? inspectorContext({
                              // Every item like this one gets the changed setting.
                              update: (_id, patch) =>
                                history.set(
                                  (current) => {
                                    let next = current;
                                    for (const sibling of editingSiblings)
                                      next = mapNode(next, sibling.id, (node) =>
                                        applyChangedFields(
                                          node,
                                          editing.node,
                                          patch,
                                        ),
                                      );
                                    return next;
                                  },
                                  `all-items:${editing.node.id}:${Object.keys(patch).join(",")}`,
                                ),
                            })
                          : inspectorContext()
                      }
                      part="design"
                    />
                  </s-stack>
                </>
              )}
            </s-stack>
          </DesignWorkspace>
        ) : null}
      </Modal>

      <Modal
        id="section-design"
        heading={designing?.type === "container" ? "Layout & design" : "Design"}
        modalRef={designModal}
        onClosed={() => setDesignId(null)}
        size="large-100"
      >
        {designing ? (
          <DesignWorkspace
            key={`ws-${designing.id}`}
            design={design}
            context={context}
            screenId={screen.id}
            selectedId={designing.id}
            label={sectionTitle(designing)}
            device={device}
          >
            <s-stack gap="base">
              <s-text color="subdued">
                Changes show on the phone right away.
              </s-text>
              {designing.type === "container" && (
                <Inspector
                  key={`l-${designing.id}`}
                  node={designing}
                  context={inspectorContext()}
                  part="content"
                />
              )}
              <Inspector
                key={`s-${designing.id}`}
                node={designing}
                context={inspectorContext()}
                part="design"
              />
              {designing.type === "container" &&
                isItemList(designing) &&
                designing.children[0] &&
                !translating && (
                  <>
                    <s-divider />
                    <s-stack gap="small-200">
                      <s-heading>
                        All {designing.children.length}{" "}
                        {ITEM_PLURALS[designing.children[0].type] ?? "items"}:
                        shared design
                      </s-heading>
                      <s-text color="subdued">
                        Applies to every item, so they stay consistent. Colors
                        can still be set per item in its Edit.
                      </s-text>
                    </s-stack>
                    <Inspector
                      key={`i-${designing.id}`}
                      node={designing.children[0]}
                      part="design"
                      context={inspectorContext({
                        // Every change applies to all items of the same type in this section.
                        update: (_id, patch) =>
                          history.set(
                            (current) => {
                              const type = designing.children[0].type;
                              let next = current;
                              for (const child of designing.children) {
                                if (child.type === type)
                                  // Only the changed setting: each item keeps
                                  // its own colors.
                                  next = mapNode(next, child.id, (node) =>
                                    applyChangedFields(
                                      node,
                                      designing.children[0],
                                      patch,
                                    ),
                                  );
                              }
                              return next;
                            },
                            `all:${designing.id}:${Object.keys(patch).join(",")}`,
                          ),
                      })}
                    />
                  </>
                )}
            </s-stack>
          </DesignWorkspace>
        ) : null}
      </Modal>

      <ui-modal id="canvas-editor" variant="max">
        <ui-title-bar title="Canvas editor"></ui-title-bar>
      </ui-modal>

      <Modal
        id="convert-canvas"
        heading="Edit this screen as a canvas?"
        modalRef={convertModal}
      >
        <s-stack gap="base">
          <s-paragraph>
            Every section on this screen becomes a free element you can move,
            resize and layer in the full-screen canvas editor. It looks exactly
            the same until you change it.
          </s-paragraph>
          <s-unordered-list>
            <s-list-item>
              Boxes behind sections (backgrounds, rounded panels) become shapes.
            </s-list-item>
            <s-list-item>
              Tabs, accordions and swipeable rows stay one element each.
            </s-list-item>
            <s-list-item>
              The current version is kept, so you can restore it later.
            </s-list-item>
          </s-unordered-list>
          <s-stack direction="inline" justifyContent="end">
            <s-button
              variant="primary"
              icon="layout-block"
              loading={busy}
              onClick={convertToCanvas}
            >
              Convert and open canvas editor
            </s-button>
          </s-stack>
        </s-stack>
      </Modal>

      <Modal
        id="translations"
        heading="Quick translation"
        modalRef={translationsModal}
        size="large-100"
      >
        {translationsOpened && (
          <TranslationsPanel
            design={design}
            context={context}
            languages={data.locales}
            device={device}
            onTranslate={(language, key, value) =>
              history.set(
                (current) => ({
                  ...current,
                  translations: {
                    ...current.translations,
                    [language]: {
                      ...current.translations[language],
                      [key]: value,
                    },
                  },
                }),
                `t:${language}:${key}`,
              )
            }
          />
        )}
      </Modal>

      <ui-modal id="css-editor" variant="max">
        <ui-title-bar title="Custom CSS"></ui-title-bar>
      </ui-modal>

      <Modal
        id="menu-design"
        heading="Menu design"
        modalRef={menuModal}
        size="large-100"
      >
        {menuDesignOpened && (
          <DesignWorkspace
            design={design}
            context={context}
            screenId={design.screens[0].id}
            selectedId={design.screens[0].root.id}
            label="Main menu"
            device={device}
          >
            <DesignSettings
              design={design}
              screen={design.screens[0]}
              translating={translating}
              locale={locale}
              setTranslation={setTranslation}
              onChange={(next) => change(next, "settings")}
              onRemoveScreen={() => undefined}
            />
          </DesignWorkspace>
        )}
      </Modal>

      <Modal
        id="section-library"
        heading="Add a section"
        modalRef={libraryModal}
        size="large-100"
        // Unmounted when closed: its many previews would re-render on every edit.
        onClosed={() => setLibraryOpened(false)}
      >
        {libraryOpened && (
          <SectionLibrary
            design={design}
            context={context}
            resources={resources}
            onAdd={({ node, screens }) => {
              // Template sections bring the sub-menus their arrows open.
              const withNode = insertNode(design, screen.root.id, node);
              change(
                screens.length
                  ? { ...withNode, screens: [...withNode.screens, ...screens] }
                  : withNode,
              );
              libraryModal.current?.hideOverlay();
              setOpenSections((current) => new Set(current).add(node.id));
              requestAnimationFrame(() => {
                const added = document.getElementById(`section-${node.id}`);
                added?.scrollIntoView({ behavior: "smooth", block: "center" });
                // A short ring shows where the new section landed.
                added?.classList.add("chm-flash");
                window.setTimeout(
                  () => added?.classList.remove("chm-flash"),
                  1500,
                );
              });
            }}
          />
        )}
      </Modal>
    </s-page>
  );
}
