import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFetcher } from "react-router";
import {
  type CanvasNode,
  type Design,
  type Frame,
  type Node,
  CANVAS_WIDTH,
  canvasLayout,
  childNodes,
  duplicateNode,
  insertNode,
  isFreeTabs,
  locate,
  mapNode,
  moveNode,
  nodeLabel,
  removeNode,
  TEMPLATES,
  findTemplate,
  updateNode,
  type Template,
} from "@chopify/menu-core";
import type { RenderContext, ResolvedResource } from "@chopify/menu-renderer";
import { Inspector, type InspectorContext } from "../editor/Inspector";
import {
  ColorField,
  FieldRow,
  NumberField,
  SearchField,
  SelectField,
} from "../editor/controls";
import { reorder, SortableItem, SortableList } from "../editor/Sortable";
import { useHistory } from "../editor/useHistory";
import { CanvasStage, ELEMENT_MIME } from "./CanvasStage";
import {
  CANVAS_ELEMENTS,
  elementPreview,
  placeElement,
  searchElements,
} from "./elements";
import { canDetach, detachToLayers } from "./detach";
import { isFrameLayer } from "./layers";
import {
  alignLayers,
  areaOf,
  distributeLayers,
  growToFit,
  pasteAt,
  placeCopy,
  groupLayers,
  pasteLayers,
  setFrames,
  ungroupLayer,
  type Align,
} from "./arrange";
import { AlignBar } from "./AlignBar";
import {
  addCanvasScreen,
  addItem,
  createSubMenu,
  duplicateItem,
  listOf,
  relayout,
  reorderByPosition,
  resizeAll,
} from "./lists";
import { isList } from "./items";
import { ListPanel } from "./ListPanel";
import { MenuTree } from "./MenuTree";
import { BackBarFields, BackBarPreview } from "../editor/BackBarFields";
import { screenPath } from "./screenPath";
import { ContextMenu, type MenuEntry } from "./ContextMenu";
import { ModeSwitch, type PreviewMode } from "../components/ModeSwitch";
import {
  DEFAULT_DEVICE,
  deviceViewport,
  deviceScale,
  DEVICES,
  type Device,
} from "../components/devices";
import { LayerEffectsFields } from "./LayerEffectsFields";
import { TranslationsPanel } from "../editor/TranslationsPanel";
import { LayerBoxFields } from "./LayerBoxFields";
import { convertScreenToCanvas, isCanvasScreen } from "./convert";
import { FragmentPreview } from "../components/FragmentPreview";
import { MenuPreview } from "../components/MenuPreview";
import { SAMPLE_LOCALIZATION } from "../editor/widgetSamples";

export interface CanvasEditorProps {
  menuName: string;
  canvasId: string;
  design: Design;
  context: Omit<RenderContext, "editor">;
  locales: { locale: string; name: string; primary: boolean }[];
}

interface SaveResult {
  ok: boolean;
  error?: string;
}

function isEmptyCanvas(design: Design, canvasId: string): boolean {
  const node = locate(design, canvasId)?.node;
  return node?.type === "canvas" && node.children.length === 0;
}

/** Tells the main editor (which opened us in a full-screen modal) to close and reload. */
function notifyDone() {
  const message = { type: "chopify:canvas-done" };
  window.opener?.postMessage(message, window.location.origin);
  window.parent?.postMessage(message, window.location.origin);
}

/**
 * Full-screen canvas editor: elements on the left (drag onto the canvas),
 * the canvas in the middle (move, resize, smart guides), properties on the right.
 */
export function CanvasEditor({
  menuName,
  canvasId: openedCanvasId,
  design: initial,
  context: baseContext,
  locales,
}: CanvasEditorProps) {
  const history = useHistory<Design>(initial);
  const design = history.value;
  /** The canvas being edited: the one opened, or a sub-menu's canvas. */
  const [canvasId, setCanvasId] = useState(openedCanvasId);
  /** Tabs picked in the tab bar of free tabs layers (tabs id → tab id). */
  const [chosenTabs, setChosenTabs] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(initial);
  /** Selected layers; the last one is the primary (its fields show on the right). */
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedId = selectedIds[selectedIds.length - 1] ?? null;
  const setSelectedId = useCallback(
    (id: string | null) => setSelectedIds(id ? [id] : []),
    [],
  );
  /** Each layer's place before "Full width" (this editor session). */
  const fullWidthMemory = useRef(new Map<string, Frame>());
  /** Layers copied with ⌘C, pasted with ⌘V (this editor only). */
  const clipboard = useRef<Node[]>([]);
  const [zoom, setZoom] = useState(1);
  /** The sub-menu's back bar is selected (its style picker shows on the right). */
  const [backSelected, setBackSelected] = useState(false);
  useEffect(() => {
    if (selectedIds.length) setBackSelected(false);
  }, [selectedIds]);
  // Another screen: its own back bar isn't selected.
  useEffect(() => setBackSelected(false), [canvasId]);
  /** Edit (design tools) or Preview (the menu works like on the store). */
  const [previewMode, setPreviewMode] = useState<PreviewMode>("edit");
  /** The screen shown in Preview (sub-menus open there like on the store). */
  const [previewScreen, setPreviewScreen] = useState<string | null>(null);
  /** Phone the canvas is previewed on (it scales to the phone's width). */
  const [device, setDevice] = useState<Device>(DEFAULT_DEVICE);
  // The Translations manager renders on first open only.
  const [translationsOpened, setTranslationsOpened] = useState(false);
  const translationsModal = useRef<HTMLElementTagNameMap["s-modal"]>(null);
  /** Search in the Elements panel. */
  const [elementQuery, setElementQuery] = useState("");
  const [tab, setTab] = useState<"elements" | "templates" | "layers" | "menu">(
    // An empty canvas opens on Templates, so starting from a design is the first choice.
    isEmptyCanvas(initial, openedCanvasId) ? "templates" : "elements",
  );
  /** Template waiting for "Replace current canvas?" confirmation. */
  /**
   * A template shown on the phone before it replaces the canvas: its
   * converted canvas and the design it came from.
   */
  const [templatePreview, setTemplatePreview] = useState<{
    template: Template;
    source: Design;
    canvas: CanvasNode;
    /** Back to the stock template this canvas came from (its sub-menus stay as they are). */
    revert?: boolean;
  } | null>(null);
  const [extraResources, setExtraResources] = useState<
    Record<string, ResolvedResource>
  >({});
  const primaryLocale =
    locales.find((locale) => locale.primary)?.locale ?? baseContext.locale;
  const [locale, setLocale] = useState(primaryLocale);
  const fetcher = useFetcher<SaveResult>();
  const closeAfterSave = useRef(false);
  const submitted = useRef<Design | null>(null);

  const canvas = locate(design, canvasId)?.node as CanvasNode | undefined;
  // The selection can be any layer on this canvas, also inside frames.
  const selectedLocation = selectedId ? locate(design, selectedId) : undefined;
  const selected =
    canvas && selectedLocation?.path.includes(canvasId)
      ? selectedLocation.node
      : undefined;
  const selectedParent = selected ? selectedLocation?.parent : undefined;

  /**
   * What the canvas shows: the chosen tab of each tabs layer, switched to the
   * tab holding the selection, and accordions open while something in them
   * is selected.
   */
  const view = useMemo(() => {
    const activeTabs = { ...chosenTabs };
    const expanded: string[] = [];
    if (selectedLocation) {
      const path = [...selectedLocation.path, selectedLocation.node.id];
      path.forEach((id, index) => {
        const node = locate(design, id)?.node;
        if (node?.type === "tabs") {
          const tab = node.tabs.find(
            (candidate) => candidate.child.id === path[index + 1],
          );
          if (tab) activeTabs[node.id] = tab.id;
        }
        if (node?.type === "shape" && node.collapsible) expanded.push(node.id);
      });
    }
    return { activeTabs, expanded };
  }, [chosenTabs, design, selectedLocation]);

  /** Sub-menu screens can be canvases too; each one is edited here. */
  const canvasOfScreen = (screenId: string) => {
    const screen = design.screens.find(
      (candidate) => candidate.id === screenId,
    );
    return isCanvasScreen(design, screenId)
      ? (screen!.root.children[0] as CanvasNode)
      : undefined;
  };
  const currentScreenId = design.screens.find(
    (screen) => screen.root.children[0]?.id === canvasId,
  )?.id;
  const isSubMenu = Boolean(
    currentScreenId && currentScreenId !== design.screens[0]?.id,
  );

  /** A new sub-menu whose content is a canvas. */
  const openScreen = (value: string) => {
    if (value === "new") {
      const result = addCanvasScreen(
        design,
        `Sub-menu ${design.screens.length}`,
      );
      history.set(result.design);
      setCanvasId(result.canvasId);
    } else {
      const existing = canvasOfScreen(value);
      if (existing) {
        setCanvasId(existing.id);
      } else {
        // A sub-menu built from sections: turn it into a canvas that looks the same.
        try {
          const converted = convertScreenToCanvas(design, value, context);
          history.set(converted.design);
          setCanvasId(converted.canvasId);
        } catch (error) {
          shopify.toast.show(
            error instanceof Error
              ? error.message
              : "Couldn't open this sub-menu",
            { isError: true },
          );
          return;
        }
      }
    }
    setSelectedIds([]);
  };
  const multiple = selectedIds.length > 1;
  /** Size of the area the primary layer sits in (the canvas or its frame). */
  const parentArea = {
    w:
      selectedParent?.type === "shape"
        ? (selectedParent.frame?.w ?? CANVAS_WIDTH)
        : CANVAS_WIDTH,
    h:
      selectedParent?.type === "shape"
        ? (selectedParent.frame?.h ?? 0)
        : (canvas?.height ?? 0),
  };
  const dirty = design !== saved;
  const saving = fetcher.state !== "idle";
  const context = useMemo(
    () => ({
      ...baseContext,
      locale,
      resources: { ...baseContext.resources, ...extraResources },
    }),
    [baseContext, locale, extraResources],
  );

  const save = useCallback(
    (close: boolean) => {
      closeAfterSave.current = close;
      if (!dirty) {
        if (close) notifyDone();
        return;
      }
      submitted.current = design;
      fetcher.submit(
        { intent: "save", draft: JSON.stringify(design) },
        { method: "post" },
      );
    },
    [design, dirty, fetcher],
  );

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (!fetcher.data.ok) {
      shopify.toast.show(fetcher.data.error ?? "Couldn't save", {
        isError: true,
      });
      closeAfterSave.current = false;
      return;
    }
    if (submitted.current) setSaved(submitted.current);
    shopify.toast.show("Canvas saved");
    if (closeAfterSave.current) notifyDone();
    closeAfterSave.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, fetcher.data]);

  const setFrame = useCallback(
    (id: string, frame: Frame, key: string) =>
      history.set((current) => updateNode(current, id, { frame }), key),
    [history],
  );
  const updateFrames = useCallback(
    (frames: { id: string; frame: Frame }[], key: string) =>
      history.set((current) => setFrames(current, frames), key),
    [history],
  );
  const setHeight = useCallback(
    (height: number, key: string) =>
      history.set((current) => updateNode(current, canvasId, { height }), key),
    [history, canvasId],
  );

  const detachContext = useMemo(
    () => ({
      ...baseContext,
      locale: primaryLocale,
      localization: SAMPLE_LOCALIZATION,
    }),
    [baseContext, primaryLocale],
  );

  /**
   * Adds an element from the panel. Dropped: at the drop point, inside the
   * frame under it. Clicked: on the canvas, below the lowest layer.
   */
  const addElement = useCallback(
    (key: string, drop?: { parentId: string; x: number; y: number }) => {
      const element = CANVAS_ELEMENTS.find(
        (candidate) => candidate.key === key,
      );
      if (!element || !canvas) return;
      const parentId = drop?.parentId ?? canvasId;
      const parent =
        parentId === canvasId ? undefined : locate(design, parentId)?.node;
      // Frames, tab panels and the canvas: the area the element lands in.
      const bounds = areaOf(design, parentId) ?? {
        w: CANVAS_WIDTH,
        h: canvas.height,
      };
      // Closed accordions count with their closed height.
      const placedFrames = canvasLayout(canvas.children, (node) =>
        Boolean(node.type === "shape" && node.collapsible?.open),
      ).frames;
      const lowest = [...placedFrames.values()].reduce(
        (bottom, frame) => Math.max(bottom, frame.y + frame.h),
        0,
      );
      const point = drop ?? {
        x: bounds.w / 2,
        y: lowest + 16 + element.size.h / 2,
      };
      let node = placeElement(element, point.x, point.y, bounds);
      if (element.layers)
        node = detachToLayers(design, node, detachContext) ?? node;
      history.set((current) => {
        const next = insertNode(current, parentId, node);
        const bottom = (node.frame?.y ?? 0) + (node.frame?.h ?? 0);
        // The canvas keeps some room below; a tab or frame grows just enough.
        return growToFit(next, parentId, bottom, parent ? 0 : 24);
      });
      setSelectedId(node.id);
    },
    [canvas, canvasId, design, detachContext, history, setSelectedId],
  );

  /** A layer dragged into another frame (or out onto the canvas) keeps its place on screen. */
  const reparent = useCallback(
    (id: string, parentId: string, frame: Frame, key: string) =>
      history.set((current) => {
        const target = locate(current, parentId)?.node;
        if (!target) return current;
        // A list the layer leaves closes the gap.
        const leftList = listOf(current, id);
        const moved = moveNode(
          current,
          id,
          parentId,
          childNodes(target).length,
        );
        const placed = updateNode(moved, id, { frame });
        return leftList && leftList.id !== parentId
          ? relayout(placed, leftList.id)
          : placed;
      }, key),
    [history],
  );

  /** After dragging or resizing list items, the list re-flows (one undo step). */
  const onGestureEnd = useCallback(
    ({
      kind,
      ids,
      key,
    }: {
      kind: "move" | "resize";
      ids: string[];
      key: string;
    }) =>
      history.set((current) => {
        let next = current;
        for (const id of ids) {
          const list = listOf(next, id);
          if (!list) continue;
          next =
            kind === "resize"
              ? resizeAll(next, id)
              : reorderByPosition(next, list.id);
        }
        return next;
      }, key),
    [history],
  );

  /** Splits the selected widget into layers (image, texts, shapes) inside a frame. */
  const detach = () => {
    if (!selected) return;
    const frame = detachToLayers(design, selected, detachContext);
    if (!frame) return;
    history.set((current) => mapNode(current, selected.id, () => frame));
    setSelectedId(frame.id);
    shopify.toast.show("Split into layers. Double-click to edit inside.");
  };

  const previewContext = useMemo(
    () => ({ ...context, localization: SAMPLE_LOCALIZATION }),
    [context],
  );
  /** Each tile shows its element exactly as it lands on the canvas, at its default size. */
  const previews = useMemo(
    () =>
      new Map(
        CANVAS_ELEMENTS.map((element) => {
          const { w, h } = element.size;
          const node: CanvasNode = {
            id: `preview-${element.key}`,
            type: "canvas",
            height: h,
            children: [
              { ...elementPreview(element), frame: { x: 0, y: 0, w, h } },
            ],
          };
          return [
            element.key,
            { node, w, h, scale: Math.min(0.6, 128 / w, 74 / Math.max(h, 1)) },
          ];
        }),
      ),
    [],
  );
  /** Larger "rich" previews for the hover card (e.g. a full row of story circles). */
  const hoverPreviews = useMemo(
    () =>
      new Map(
        CANVAS_ELEMENTS.map((element) => {
          const { w, h } = element.size;
          const node: CanvasNode = {
            id: `hover-${element.key}`,
            type: "canvas",
            height: h,
            children: [
              {
                ...elementPreview(element, { rich: true }),
                frame: { x: 0, y: 0, w, h },
              },
            ],
          };
          return [element.key, node];
        }),
      ),
    [],
  );

  // Hover card: opens after a short delay so it doesn't flicker while moving across tiles.
  const [hovered, setHovered] = useState<{
    key: string;
    center: number;
  } | null>(null);
  const hoverTimer = useRef<number | undefined>(undefined);
  const showHover = (key: string, target: HTMLElement) => {
    window.clearTimeout(hoverTimer.current);
    const rect = target.getBoundingClientRect();
    hoverTimer.current = window.setTimeout(
      () => setHovered({ key, center: rect.top + rect.height / 2 }),
      250,
    );
  };
  const hideHover = () => {
    window.clearTimeout(hoverTimer.current);
    setHovered(null);
  };

  const templateDesigns = useMemo(
    () => new Map(TEMPLATES.map((template) => [template.id, template.build()])),
    [],
  );

  /**
   * Fills the canvas with a template: its main screen is measured and turned
   * into canvas elements; its colors and sub-menus come along.
   */
  /** The template's main screen measured and turned into a canvas. */
  const templateCanvas = (
    template: Template,
  ): { template: Template; source: Design; canvas: CanvasNode } => {
    const source = template.build();
    const converted = convertScreenToCanvas(
      source,
      source.screens[0].id,
      context,
    );
    const canvasNode = converted.design.screens[0].root
      .children[0] as CanvasNode;
    return {
      template,
      source,
      canvas: {
        ...canvasNode,
        background:
          source.screens[0].root.box?.background || source.tokens.canvas,
      },
    };
  };

  /**
   * Puts a template on the canvas (undoable): its layers and colors, and its
   * sub-menus unless it's a revert (the canvas's sub-menus are already there).
   * The canvas remembers the template, so it can be reverted later.
   */
  const applyTemplate = (
    prepared: ReturnType<typeof templateCanvas> & { revert?: boolean },
  ) => {
    setTemplatePreview(null);
    history.set((current) => {
      const next = updateNode(current, canvasId, {
        children: prepared.canvas.children,
        height: prepared.canvas.height,
        background: prepared.canvas.background,
        template: prepared.template.id,
      });
      return {
        ...next,
        tokens: prepared.source.tokens,
        screens: prepared.revert
          ? next.screens
          : [...next.screens, ...prepared.source.screens.slice(1)],
      };
    });
    setSelectedIds([]);
    setTab("elements");
    shopify.toast.show(
      prepared.revert
        ? `Reverted to the “${prepared.template.name}” template`
        : `“${prepared.template.name}” placed on the canvas`,
    );
  };

  /** The built-in template this canvas came from, if any. */
  const sourceTemplate = canvas?.template
    ? findTemplate(canvas.template)
    : undefined;

  /** Shows the stock template on the phone, to revert to it. */
  const previewRevert = () => {
    if (!sourceTemplate) return;
    try {
      setSelectedIds([]);
      setTemplatePreview({ ...templateCanvas(sourceTemplate), revert: true });
    } catch (error) {
      shopify.toast.show(
        error instanceof Error ? error.message : "Couldn't load the template",
        { isError: true },
      );
    }
  };

  /**
   * Clicking a template: an empty canvas gets it right away; otherwise it's
   * shown on the phone first, to use or cancel.
   */
  const chooseTemplate = (template: Template) => {
    try {
      const prepared = templateCanvas(template);
      if (canvas?.children.length) {
        setSelectedIds([]);
        setTemplatePreview(prepared);
      } else applyTemplate(prepared);
    } catch (error) {
      shopify.toast.show(
        error instanceof Error ? error.message : "Couldn't load the template",
        { isError: true },
      );
    }
  };

  /** Moves the selected element in the layer order (later = on top). */
  const arrange = (to: "front" | "forward" | "backward" | "back") => {
    if (!selected || !selectedParent) return;
    const siblings = childNodes(selectedParent);
    const index = siblings.findIndex((child) => child.id === selected.id);
    const last = siblings.length - 1;
    const target =
      to === "front"
        ? last
        : to === "back"
          ? 0
          : to === "forward"
            ? Math.min(last, index + 1)
            : Math.max(0, index - 1);
    if (target === index) return;
    history.set((current) =>
      reorder(current, selected.id, siblings[target].id),
    );
  };

  /** The selected layers that are on this canvas, in selection order. */
  const selectedNodes = selectedIds
    .map((id) => locate(design, id))
    .filter(
      (location) => location?.path.includes(canvasId) && location.node.frame,
    )
    .map((location) => location!.node);

  const removeSelected = () => {
    history.set(
      selectedNodes.reduce((next, node) => removeNode(next, node.id), design),
    );
    setSelectedIds([]);
  };

  const copySelected = () => {
    clipboard.current = selectedNodes.map((node) => structuredClone(node));
  };

  /** Pastes next to the selection: into the same frame, or onto the canvas. */
  const paste = () => {
    if (!clipboard.current.length) return;
    const parent = selectedLocation?.path.includes(canvasId)
      ? selectedLocation.parent
      : undefined;
    const parentId = parent?.type === "shape" ? parent.id : canvasId;
    const result = pasteLayers(design, parentId, clipboard.current, 16);
    // Into a smart list: the pasted items line up with the others.
    history.set(
      isList(locate(design, parentId)?.node)
        ? relayout(result.design, parentId)
        : result.design,
    );
    setSelectedIds(result.ids);
    // Each further paste lands a little lower again.
    clipboard.current = clipboard.current.map((node) =>
      node.frame
        ? {
            ...node,
            frame: {
              ...node.frame,
              x: node.frame.x + 16,
              y: node.frame.y + 16,
            },
          }
        : node,
    );
  };

  const group = () => {
    const result = groupLayers(
      design,
      selectedNodes.map((node) => node.id),
    );
    if (!result) {
      shopify.toast.show("Only layers in the same frame can be grouped", {
        isError: true,
      });
      return;
    }
    history.set(result.design);
    setSelectedIds([result.groupId]);
  };

  const ungroup = () => {
    if (!selected) return;
    const result = ungroupLayer(design, selected.id);
    if (!result) return;
    history.set(result.design);
    setSelectedIds(result.ids);
  };

  const align = (mode: Align) =>
    history.set(
      alignLayers(
        design,
        selectedNodes.map((node) => node.id),
        mode,
        parentArea,
      ),
    );
  const distribute = (axis: "x" | "y") =>
    history.set(
      distributeLayers(
        design,
        selectedNodes.map((node) => node.id),
        axis,
      ),
    );

  const toggle = (field: "hidden" | "locked") => {
    if (!selectedNodes.length) return;
    const value = !selectedNodes.every((node) => node[field]);
    history.set(
      selectedNodes.reduce(
        (next, node) =>
          updateNode(next, node.id, { [field]: value || undefined }),
        design,
      ),
    );
  };

  // Keyboard shortcuts, as in Figma.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.composedPath()[0] as HTMLElement | undefined;
      const typing = Boolean(
        target &&
        (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) ||
          target.isContentEditable ||
          target.tagName.startsWith("S-")),
      );
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (mod && key === "s") {
        event.preventDefault();
        save(false);
        return;
      }
      if (typing) return;
      const has = selectedNodes.length > 0;
      const handled = () => event.preventDefault();
      if (mod && key === "z") {
        handled();
        if (event.shiftKey) history.redo();
        else history.undo();
      } else if (mod && key === "a") {
        handled();
        const level = selectedParent ?? canvas;
        if (level)
          setSelectedIds(
            childNodes(level)
              .filter((node) => node.frame && !node.locked)
              .map((node) => node.id),
          );
      } else if (mod && key === "c" && has) {
        handled();
        copySelected();
      } else if (mod && key === "x" && has) {
        handled();
        copySelected();
        removeSelected();
      } else if (mod && key === "v") {
        handled();
        paste();
      } else if (mod && key === "g" && has) {
        handled();
        if (event.shiftKey) ungroup();
        else group();
      } else if (mod && key === "d" && has) {
        handled();
        duplicate();
      } else if (mod && event.shiftKey && key === "l" && has) {
        handled();
        toggle("locked");
      } else if (mod && event.shiftKey && key === "h" && has) {
        handled();
        toggle("hidden");
      } else if (mod && (event.key === "]" || event.key === "[") && selected) {
        handled();
        arrange(
          event.key === "]"
            ? event.altKey
              ? "front"
              : "forward"
            : event.altKey
              ? "back"
              : "backward",
        );
      } else if (event.key === "Escape" && templatePreview) {
        setTemplatePreview(null);
      } else if (event.key === "Escape") {
        // Like Figma: Esc selects the frame around the layer.
        setSelectedId(
          !multiple && selectedParent?.type === "shape"
            ? selectedParent.id
            : null,
        );
      } else if (
        event.key === "Enter" &&
        selected &&
        isFrameLayer(selected) &&
        selected.children?.length
      ) {
        handled();
        setSelectedId(selected.children[selected.children.length - 1].id);
      } else if (has && event.key.startsWith("Arrow")) {
        handled();
        const step = event.shiftKey ? 10 : 1;
        const dx =
          event.key === "ArrowLeft"
            ? -step
            : event.key === "ArrowRight"
              ? step
              : 0;
        const dy =
          event.key === "ArrowUp"
            ? -step
            : event.key === "ArrowDown"
              ? step
              : 0;
        updateFrames(
          selectedNodes.map((node) => ({
            id: node.id,
            frame: {
              ...node.frame!,
              x: node.frame!.x + dx,
              y: node.frame!.y + dy,
            },
          })),
          `nudge:${selectedIds.join()}`,
        );
      } else if (has && (event.key === "Delete" || event.key === "Backspace")) {
        handled();
        removeSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /**
   * Duplicates the selection (⌘D). One layer goes to the next free spot, like
   * a grid filling up (beside it, or a new row), and its tab, frame or canvas
   * grows to fit. Several layers are offset together.
   */
  const duplicate = () => {
    let next = design;
    const ids: string[] = [];
    for (const node of selectedNodes) {
      // In a smart list the copy goes right after it and the list re-flows.
      if (listOf(next, node.id)) {
        const copied = duplicateItem(next, node.id);
        next = copied.design;
        if (copied.itemId) ids.push(copied.itemId);
        continue;
      }
      const result = duplicateNode(next, node.id);
      const parent = locate(next, node.id)?.parent;
      if (!result.newId || !parent) continue;
      let frame = {
        ...node.frame!,
        x: node.frame!.x + 16,
        y: node.frame!.y + 16,
      };
      if (selectedNodes.length === 1) {
        const siblings = childNodes(parent)
          .map((child) => child.frame)
          .filter((sibling): sibling is Frame => Boolean(sibling));
        frame = placeCopy(
          node.frame!,
          siblings,
          areaOf(next, parent.id)?.w ?? CANVAS_WIDTH,
          parent.type === "shape" && parent.scroll === "x",
        );
      }
      next = updateNode(result.design, result.newId, { frame });
      next = growToFit(next, parent.id, frame.y + frame.h);
      ids.push(result.newId);
    }
    if (!ids.length) return;
    history.set(next);
    setSelectedIds(ids);
  };

  /** The smart list the selection is, or is an item of. */
  const activeList = selected
    ? isList(selected)
      ? selected
      : listOf(design, selected.id)
    : undefined;

  /** A list item: the list places it, so X/Y and aligning don't apply. */
  const inList = Boolean(activeList && selected && !isList(selected));

  /** "Add sub-menu" on a list item: creates it (pre-filled) and links the item. */
  const addSubMenu = (itemId: string) => {
    const result = createSubMenu(design, itemId);
    if (!result) return;
    history.set(result.design);
    shopify.toast.show("Sub-menu added. Use “Open sub-menu” to design it.");
  };

  /** Right-click menu: where it opened and where "add/paste here" go. */
  const [menu, setMenu] = useState<{
    clientX: number;
    clientY: number;
    parentId: string;
    x: number;
    y: number;
  } | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);

  const pasteHere = () => {
    if (!menu || !clipboard.current.length) return;
    const result = pasteAt(
      design,
      menu.parentId,
      clipboard.current,
      menu.x,
      menu.y,
    );
    history.set(result.design);
    setSelectedIds(result.ids);
  };

  const menuEntries = (): MenuEntry[] => {
    const has = selectedNodes.length > 0;
    const single = selectedNodes.length === 1 ? selectedNodes[0] : undefined;
    const parentFrame =
      selectedParent?.type === "shape" ? selectedParent : undefined;
    const entries: MenuEntry[] = [
      {
        label: "Paste here",
        keys: "",
        onSelect: pasteHere,
        disabled: !clipboard.current.length,
      },
    ];
    if (!has) {
      entries.push({
        label: "Select all",
        keys: "⌘A",
        onSelect: () =>
          setSelectedIds(
            canvas!.children
              .filter((node) => !node.locked)
              .map((node) => node.id),
          ),
      });
      return entries;
    }
    entries.push(
      "separator",
      { label: "Duplicate", keys: "⌘D", onSelect: duplicate },
      { label: "Copy", keys: "⌘C", onSelect: copySelected },
      {
        label: "Cut",
        keys: "⌘X",
        onSelect: () => (copySelected(), removeSelected()),
      },
      {
        label: "Paste",
        keys: "⌘V",
        onSelect: paste,
        disabled: !clipboard.current.length,
      },
      "separator",
      {
        label: "Group",
        keys: "⌘G",
        onSelect: group,
        disabled: selectedNodes.length < 2,
      },
      {
        label: "Ungroup",
        keys: "⇧⌘G",
        onSelect: ungroup,
        disabled: !(single && isFrameLayer(single) && single.children?.length),
      },
    );
    if (single && canDetach(single))
      entries.push({ label: "Split into layers", onSelect: detach });
    if (single) {
      entries.push(
        "separator",
        {
          label: "Bring to front",
          keys: "⌥⌘]",
          onSelect: () => arrange("front"),
        },
        {
          label: "Bring forward",
          keys: "⌘]",
          onSelect: () => arrange("forward"),
        },
        {
          label: "Send backward",
          keys: "⌘[",
          onSelect: () => arrange("backward"),
        },
        { label: "Send to back", keys: "⌥⌘[", onSelect: () => arrange("back") },
      );
    }
    entries.push(
      "separator",
      {
        label: selectedNodes.every((node) => node.locked) ? "Unlock" : "Lock",
        keys: "⇧⌘L",
        onSelect: () => toggle("locked"),
      },
      {
        label: selectedNodes.every((node) => node.hidden) ? "Show" : "Hide",
        keys: "⇧⌘H",
        onSelect: () => toggle("hidden"),
      },
    );
    if (single && parentFrame) {
      entries.push({
        label: "Select parent",
        keys: "Esc",
        onSelect: () => setSelectedId(parentFrame.id),
      });
    }
    entries.push("separator", {
      label: "Delete",
      keys: "⌫",
      onSelect: removeSelected,
      critical: true,
    });
    return entries;
  };

  const inspectorContext: InspectorContext = {
    design,
    locale,
    primaryLocale,
    update: (id, patch) =>
      history.set(
        (current) => updateNode(current, id, patch),
        `${id}:${Object.keys(patch).join(",")}`,
      ),
    setTranslation: (key, value) =>
      history.set(
        (current) => ({
          ...current,
          translations: {
            ...current.translations,
            [locale]: { ...current.translations[locale], [key]: value },
          },
        }),
        `t:${locale}:${key}`,
      ),
    // Sub-menus made here are canvases, so they're designed the same way.
    createScreen: (title) => {
      const result = addCanvasScreen(design, title);
      history.set(result.design);
      return result.screenId;
    },
    onResource: (key, resource) =>
      setExtraResources((current) => ({ ...current, [key]: resource })),
  };

  if (!canvas) {
    return (
      <s-page heading="Canvas not found">
        <s-banner tone="critical">
          This canvas no longer exists in the menu. Close the editor and reload.
        </s-banner>
      </s-page>
    );
  }

  const found = searchElements(elementQuery);
  const changeMode = (mode: PreviewMode) => {
    // Preview starts on the screen being edited, with nothing selected.
    setSelectedIds([]);
    setMenu(null);
    setTemplatePreview(null);
    setPreviewScreen(null);
    setPreviewMode(mode);
  };

  const groups = [...new Set(found.map((element) => element.group))];
  const translating = locale !== primaryLocale;
  /** Where layers were before "Full width", so "Exit full width" puts them back. */
  const beforeFullWidth = fullWidthMemory.current;
  const isFullWidth = Boolean(
    selected?.frame &&
    selected.frame.x === 0 &&
    selected.frame.w === parentArea.w,
  );
  const toggleFullWidth = () => {
    if (!selected?.frame) return;
    if (!isFullWidth) {
      beforeFullWidth.set(selected.id, selected.frame);
      setSelectedFrame({ x: 0, w: parentArea.w });
      return;
    }
    // Back to where it was; without a remembered place, 16px from each side.
    const previous = beforeFullWidth.get(selected.id);
    beforeFullWidth.delete(selected.id);
    setSelectedFrame(
      previous
        ? { x: previous.x, w: previous.w }
        : { x: 16, w: Math.max(8, parentArea.w - 32) },
    );
  };
  const setSelectedFrame = (patch: Partial<Frame>) =>
    selected?.frame &&
    setFrame(
      selected.id,
      { ...selected.frame, ...patch },
      `frame:${selected.id}`,
    );

  return (
    <div className="cve">
      <header className="cve__bar">
        <div className="cve__title">
          <s-icon type="layout-block" />
          <s-text type="strong">{menuName}</s-text>
          <s-text color="subdued">· Canvas</s-text>
          {dirty ? (
            <s-badge tone="caution">Unsaved changes</s-badge>
          ) : (
            <s-badge tone="success">Saved</s-badge>
          )}
        </div>
        <div className="cve__tools">
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
          <span className="cve__sep" />
          <s-button
            icon="minus"
            variant="tertiary"
            accessibilityLabel="Zoom out"
            onClick={() =>
              setZoom((value) => Math.max(0.5, +(value - 0.1).toFixed(2)))
            }
          />
          <button
            type="button"
            className="cve__zoom"
            onClick={() => setZoom(1)}
            title="Reset zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <s-button
            icon="plus"
            variant="tertiary"
            accessibilityLabel="Zoom in"
            onClick={() =>
              setZoom((value) => Math.min(2, +(value + 0.1).toFixed(2)))
            }
          />
          <span className="cve__sep" />
          <s-box inlineSize="200px">
            <SelectField
              label="Screen"
              labelAccessibilityVisibility="exclusive"
              value={currentScreenId ?? ""}
              options={[
                ...design.screens.map((screen, index) => ({
                  value: screen.id,
                  label: `${index === 0 ? "Main menu" : `Sub-menu: ${screen.title}`}${
                    canvasOfScreen(screen.id) ? "" : " (convert to canvas)"
                  }`,
                })),
                { value: "new", label: "+ New sub-menu" },
              ]}
              onChange={openScreen}
            />
          </s-box>
          <s-box inlineSize="270px">
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
          </s-box>
          <span className="cve__sep" />
          <s-button
            icon="language"
            variant="tertiary"
            onClick={() => {
              setTranslationsOpened(true);
              translationsModal.current?.showOverlay();
            }}
          >
            Quick translation
          </s-button>
          {locales.length > 1 && (
            <>
              <span className="cve__sep" />
              <s-box inlineSize="170px">
                <SelectField
                  label="Language"
                  labelAccessibilityVisibility="exclusive"
                  value={locale}
                  options={locales.map((candidate) => ({
                    value: candidate.locale,
                    label: `${candidate.name}${candidate.primary ? " (default)" : ""}`,
                  }))}
                  onChange={setLocale}
                />
              </s-box>
            </>
          )}
        </div>
        <div className="cve__actions">
          {dirty && (
            <s-button
              variant="tertiary"
              disabled={saving}
              onClick={() => {
                // Back to the last saved version (this can be undone too).
                history.set(saved);
                setSelectedIds([]);
                // A sub-menu made after the last save is gone again.
                if (!locate(saved, canvasId)) setCanvasId(openedCanvasId);
              }}
            >
              Discard changes
            </s-button>
          )}
          <s-button
            disabled={!dirty || saving}
            loading={saving && !closeAfterSave.current}
            onClick={() => save(false)}
          >
            Save
          </s-button>
          <s-button
            variant="primary"
            loading={saving && closeAfterSave.current}
            onClick={() => save(true)}
          >
            Done
          </s-button>
        </div>
      </header>

      <aside className="cve__left" onScroll={hideHover}>
        <div className="cve__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "elements"}
            onClick={() => setTab("elements")}
          >
            Elements
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "layers"}
            onClick={() => setTab("layers")}
          >
            Layers
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "menu"}
            onClick={() => setTab("menu")}
          >
            Menu
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "templates"}
            onClick={() => setTab("templates")}
          >
            Templates
          </button>
        </div>
        {tab === "menu" ? (
          <div className="cve__panel">
            <MenuTree
              design={design}
              currentScreenId={currentScreenId}
              onOpenScreen={openScreen}
              onSelectItem={(screenId, itemId) => {
                if (screenId !== currentScreenId) openScreen(screenId);
                setSelectedIds([itemId]);
              }}
              onAddItem={(_screenId, listId) => {
                const result = addItem(design, listId);
                history.set(result.design);
              }}
              onAddSubMenu={(_screenId, itemId) => addSubMenu(itemId)}
            />
          </div>
        ) : tab === "templates" ? (
          <div className="cve__panel">
            <s-text color="subdued">
              Start from a template: its design is placed on the canvas as
              elements you can move and change.
            </s-text>
            {templatePreview && (
              <s-banner
                tone="info"
                heading={`Previewing “${templatePreview.template.name}”`}
              >
                <s-stack gap="small-300">
                  <s-text>
                    It&apos;s shown on the phone. Using it replaces this canvas;
                    you can undo that.
                  </s-text>
                  <s-stack direction="inline" gap="small-200">
                    <s-button
                      variant="primary"
                      onClick={() => applyTemplate(templatePreview)}
                    >
                      Use this template
                    </s-button>
                    <s-button onClick={() => setTemplatePreview(null)}>
                      Cancel
                    </s-button>
                  </s-stack>
                </s-stack>
              </s-banner>
            )}
            <div className="cve__templates">
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={`cve__template${templatePreview?.template.id === template.id ? " is-previewing" : ""}`}
                  aria-pressed={templatePreview?.template.id === template.id}
                  onClick={() => chooseTemplate(template)}
                >
                  <span className="cve__template-preview">
                    <MenuPreview
                      design={templateDesigns.get(template.id)!}
                      context={previewContext}
                      scale={0.3}
                    />
                  </span>
                  <span className="cve__tile-label">{template.name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : tab === "elements" ? (
          <div className="cve__panel">
            <SearchField
              label="Search elements"
              placeholder="Search elements, e.g. tabs, slider, badge"
              value={elementQuery}
              onChange={setElementQuery}
              onKeyDown={(event) => {
                // Enter adds the best match, so search + Enter is a quick insert.
                if (event.key === "Enter" && found[0]) {
                  event.preventDefault();
                  addElement(found[0].key);
                }
              }}
            />
            {found.length === 0 ? (
              <s-stack gap="small-200">
                <s-text color="subdued">
                  No elements match “{elementQuery}”.
                </s-text>
                <s-button
                  variant="tertiary"
                  onClick={() => setElementQuery("")}
                >
                  Show all elements
                </s-button>
              </s-stack>
            ) : (
              <s-text color="subdued">
                {elementQuery
                  ? `${found.length} found · Enter adds the first one.`
                  : "Drag onto the canvas, or click to add."}
              </s-text>
            )}
            {groups.map((group) => (
              <div key={group} className="cve__group">
                <div className="cve__group-title">{group}</div>
                <div className="cve__tiles">
                  {found
                    .filter((element) => element.group === group)
                    .map((element) => (
                      <button
                        key={element.key}
                        type="button"
                        className="cve__tile"
                        draggable
                        onDragStart={(event) => {
                          hideHover();
                          event.dataTransfer.setData(ELEMENT_MIME, element.key);
                          event.dataTransfer.effectAllowed = "copy";
                        }}
                        onMouseEnter={(event) =>
                          showHover(element.key, event.currentTarget)
                        }
                        onMouseLeave={hideHover}
                        onFocus={(event) =>
                          showHover(element.key, event.currentTarget)
                        }
                        onBlur={hideHover}
                        onClick={() => {
                          hideHover();
                          addElement(element.key);
                        }}
                      >
                        <span className="cve__tile-preview">
                          <span
                            className="cve__tile-scale"
                            style={{
                              width: previews.get(element.key)!.w,
                              height: previews.get(element.key)!.h,
                              transform: `translate(-50%, -50%) scale(${previews.get(element.key)!.scale})`,
                            }}
                          >
                            {/* The canvas renders at its design width; the tile crops to the element. */}
                            <span
                              style={{ display: "block", width: CANVAS_WIDTH }}
                            >
                              <FragmentPreview
                                bare
                                design={design}
                                node={previews.get(element.key)!.node}
                                context={previewContext}
                              />
                            </span>
                          </span>
                        </span>
                        <span className="cve__tile-label">{element.label}</span>
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="cve__panel">
            {canvas.children.length === 0 ? (
              <s-text color="subdued">No layers yet.</s-text>
            ) : (
              <LayerTree
                nodes={canvas.children}
                depth={0}
                selectedIds={selectedIds}
                selectedPath={selectedLocation?.path ?? []}
                onSelect={(id, additive) =>
                  setSelectedIds((current) =>
                    !additive
                      ? [id]
                      : current.includes(id)
                        ? current.filter((candidate) => candidate !== id)
                        : [...current, id],
                  )
                }
                onReorder={(active, over) =>
                  history.set(reorder(design, active, over))
                }
                onPatch={(id, patch) =>
                  history.set(updateNode(design, id, patch))
                }
              />
            )}
          </div>
        )}
      </aside>

      {menu && (
        <ContextMenu
          x={menu.clientX}
          y={menu.clientY}
          entries={menuEntries()}
          onAddElement={(key) =>
            addElement(key, { parentId: menu.parentId, x: menu.x, y: menu.y })
          }
          onClose={closeMenu}
        />
      )}

      {hovered && (
        <HoverCard
          elementKey={hovered.key}
          center={hovered.center}
          node={hoverPreviews.get(hovered.key)!}
          design={design}
          context={previewContext}
        />
      )}

      <main className="cve__stage">
        <div className="cve-mode">
          {currentScreenId && currentScreenId !== design.screens[0]?.id && (
            // In a sub-menu: the way back, like the menu's own back button.
            <nav className="cve-crumbs" aria-label="Sub-menu path">
              {(() => {
                const path = screenPath(design, currentScreenId);
                const parent = path[path.length - 2];
                const go = (screenId: string) => {
                  setPreviewScreen(null);
                  openScreen(screenId);
                };
                return (
                  <>
                    {parent && (
                      <button
                        type="button"
                        className="cve-crumbs__back"
                        disabled={!canvasOfScreen(parent.id)}
                        onClick={() => go(parent.id)}
                      >
                        ← Back
                      </button>
                    )}
                    {path.map((screen, index) => {
                      const label =
                        index === 0 ? "Main menu" : screen.title || "Sub-menu";
                      const last = index === path.length - 1;
                      return (
                        <span key={screen.id} className="cve-crumbs__step">
                          {index > 0 && <span aria-hidden="true">›</span>}
                          {last || !canvasOfScreen(screen.id) ? (
                            <span
                              aria-current={last ? "page" : undefined}
                              className={last ? "is-current" : undefined}
                            >
                              {label}
                            </span>
                          ) : (
                            <button type="button" onClick={() => go(screen.id)}>
                              {label}
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </>
                );
              })()}
            </nav>
          )}
          <ModeSwitch value={previewMode} onChange={changeMode} />
        </div>
        {templatePreview && (
          <div className="cve-preview-bar" role="status">
            <s-text>
              {templatePreview.revert ? "Stock" : "Previewing"}{" "}
              <strong>{templatePreview.template.name}</strong>: it replaces this
              canvas (you can undo).
            </s-text>
            <s-button
              variant="primary"
              onClick={() => applyTemplate(templatePreview)}
            >
              {templatePreview.revert
                ? "Revert to template"
                : "Use this template"}
            </s-button>
            <s-button onClick={() => setTemplatePreview(null)}>Cancel</s-button>
          </div>
        )}
        {previewMode === "preview" ? (
          // The whole menu (header included) working like on the store.
          <MenuPreview
            design={design}
            context={previewContext}
            width={device.width + 20}
            height={device.height + 20}
            scale={zoom}
            screenId={previewScreen ?? currentScreenId ?? design.screens[0].id}
            onScreenChange={setPreviewScreen}
            interactive
          />
        ) : (
          <div className="cve__phone">
            {/* The chosen phone's screen below the menu header: the canvas scrolls inside it. */}
            <div
              className="cve__screen"
              data-cve-scroller
              style={{
                width: device.width * zoom,
                height: deviceViewport(device) * zoom,
              }}
            >
              {!templatePreview && isSubMenu && currentScreenId && (
                // The sub-menu's way back, as shoppers see it; click to restyle it.
                <button
                  type="button"
                  className={`cve-backbar${backSelected ? " is-selected" : ""}`}
                  title="Back to the level above: click to change its style"
                  onClick={() => {
                    setSelectedIds([]);
                    setBackSelected(true);
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      width: CANVAS_WIDTH,
                      zoom: zoom * deviceScale(device),
                    }}
                  >
                    <BackBarPreview
                      design={design}
                      screenId={currentScreenId}
                      context={previewContext}
                    />
                  </span>
                </button>
              )}
              {templatePreview ? (
                // A picture of the template at the phone's size (CSS zoom keeps the scroll height right).
                <div
                  style={{
                    width: CANVAS_WIDTH,
                    zoom: zoom * deviceScale(device),
                  }}
                >
                  <FragmentPreview
                    bare
                    design={templatePreview.source}
                    node={templatePreview.canvas}
                    context={previewContext}
                  />
                </div>
              ) : (
                <CanvasStage
                  design={design}
                  canvas={canvas}
                  context={context}
                  zoom={zoom * deviceScale(device)}
                  selectedIds={selectedIds}
                  canEditText={!translating}
                  view={view}
                  onTab={(tabsId, tabId) => {
                    setChosenTabs((current) => ({
                      ...current,
                      [tabsId]: tabId,
                    }));
                    // Leave a layer of the other tab: select the tabs themselves.
                    if (selectedLocation?.path.includes(tabsId))
                      setSelectedIds([tabsId]);
                  }}
                  onSelect={setSelectedIds}
                  onFrames={updateFrames}
                  onReparent={reparent}
                  onHeight={setHeight}
                  onDropElement={(key, parentId, x, y) =>
                    addElement(key, { parentId, x, y })
                  }
                  onContextMenu={setMenu}
                  onGestureEnd={onGestureEnd}
                  onText={(id, text) =>
                    history.set((current) => updateNode(current, id, { text }))
                  }
                />
              )}
            </div>
          </div>
        )}
        <p className="cve__hint">
          {previewMode === "preview"
            ? "Preview: tap tabs, open accordions and sub-menus, drag rows to swipe. Links stay here. Switch to Edit to change things."
            : "Double-click to go inside a frame or edit a text · ⌘/Ctrl-click selects inside · drag into a frame to group · Esc selects the frame · Shift keeps proportions · Alt turns off snapping"}
        </p>
      </main>

      <aside className="cve__right">
        {backSelected &&
        isSubMenu &&
        !selected &&
        !multiple &&
        currentScreenId ? (
          <s-stack gap="base">
            <s-heading>Back to the level above</s-heading>
            <BackBarFields
              design={design}
              screenId={currentScreenId}
              context={previewContext}
              onChange={(next, key) => history.set(next, key)}
            />
          </s-stack>
        ) : multiple ? (
          <s-stack gap="base">
            <s-stack
              direction="inline"
              justifyContent="space-between"
              alignItems="center"
            >
              <s-heading>{selectedNodes.length} layers selected</s-heading>
              <s-stack direction="inline" gap="small-200">
                <s-button
                  icon="duplicate"
                  variant="tertiary"
                  accessibilityLabel="Duplicate"
                  onClick={duplicate}
                />
                <s-button
                  icon="delete"
                  variant="tertiary"
                  tone="critical"
                  accessibilityLabel="Delete"
                  onClick={removeSelected}
                />
              </s-stack>
            </s-stack>
            <AlignBar
              count={selectedNodes.length}
              onAlign={align}
              onDistribute={distribute}
            />
            <s-button-group>
              <s-button slot="secondary-actions" onClick={group}>
                Group (⌘G)
              </s-button>
              <s-button
                slot="secondary-actions"
                onClick={() => toggle("locked")}
              >
                Lock / unlock
              </s-button>
              <s-button
                slot="secondary-actions"
                onClick={() => toggle("hidden")}
              >
                Hide / show
              </s-button>
            </s-button-group>
            <s-text color="subdued">
              Shift-click layers or drag a box on the canvas to select several.
              Drag one to move them all. Several selected align to each other.
            </s-text>
          </s-stack>
        ) : selected && !selected.frame && selected.type === "shape" ? (
          <s-stack gap="base">
            <s-heading>Tab panel</s-heading>
            <s-text color="subdued">
              What this tab shows. Drop or paste layers into it; click the tabs
              on the canvas to switch between them.
            </s-text>
            <Inspector
              key={`panel-${selected.id}`}
              node={selected}
              context={inspectorContext}
              part="design"
            />
          </s-stack>
        ) : selected?.frame ? (
          <s-stack gap="base">
            <s-stack
              direction="inline"
              justifyContent="space-between"
              alignItems="center"
            >
              <s-heading>{nodeLabel(selected)}</s-heading>
              <s-stack direction="inline" gap="small-200">
                <s-button
                  icon="duplicate"
                  variant="tertiary"
                  accessibilityLabel="Duplicate"
                  onClick={duplicate}
                />
                <s-button
                  icon="delete"
                  variant="tertiary"
                  tone="critical"
                  accessibilityLabel="Delete"
                  onClick={removeSelected}
                />
              </s-stack>
            </s-stack>
            {activeList && !translating && (
              <>
                <ListPanel
                  design={design}
                  list={activeList}
                  selectedId={selected.id}
                  onChange={(next, key) => history.set(next, key)}
                  onSelect={setSelectedId}
                  onOpenScreen={openScreen}
                  onAddSubMenu={addSubMenu}
                />
                <s-divider />
              </>
            )}
            {!translating && (
              <>
                {inList ? (
                  <s-text color="subdued">
                    Its place is set by the list: drag it on the canvas or use
                    the arrows above to change the order.
                  </s-text>
                ) : (
                  <FieldRow>
                    <NumberField
                      label="X"
                      value={selected.frame.x}
                      onChange={(x) => setSelectedFrame({ x: x ?? 0 })}
                    />
                    <NumberField
                      label="Y"
                      value={selected.frame.y}
                      min={0}
                      onChange={(y) => setSelectedFrame({ y: y ?? 0 })}
                    />
                  </FieldRow>
                )}
                <FieldRow>
                  <NumberField
                    label="Width"
                    value={selected.frame.w}
                    min={8}
                    onChange={(w) =>
                      setSelectedFrame({ w: Math.max(8, w ?? 8) })
                    }
                  />
                  <NumberField
                    label="Height"
                    value={selected.frame.h}
                    min={8}
                    onChange={(h) =>
                      setSelectedFrame({ h: Math.max(8, h ?? 8) })
                    }
                  />
                </FieldRow>
                {!inList && (
                  <AlignBar
                    count={1}
                    onAlign={align}
                    onDistribute={distribute}
                  />
                )}
                <s-stack direction="inline" gap="small-200">
                  {!inList && (
                    <s-button onClick={toggleFullWidth}>
                      {isFullWidth ? "Exit full width" : "Full width"}
                    </s-button>
                  )}
                  {isFrameLayer(selected) && selected.children?.length ? (
                    <s-button onClick={ungroup}>Ungroup</s-button>
                  ) : null}
                </s-stack>
                <s-stack gap="small-200">
                  <s-text>Layer order</s-text>
                  <s-stack direction="inline" gap="small-200">
                    <s-button
                      icon="arrow-up"
                      onClick={() => arrange("forward")}
                    >
                      Bring forward
                    </s-button>
                    <s-button
                      icon="arrow-down"
                      onClick={() => arrange("backward")}
                    >
                      Send backward
                    </s-button>
                  </s-stack>
                  <s-text color="subdued">
                    Layers in front cover the ones behind. Right-click for “to
                    front” and “to back”.
                  </s-text>
                </s-stack>
                {canDetach(selected) && (
                  <s-banner tone="info">
                    Want to change its parts one by one, like in Figma? Split it
                    into layers: image, texts and shapes inside a frame.
                    <s-button slot="secondary-actions" onClick={detach}>
                      Split into layers
                    </s-button>
                  </s-banner>
                )}
                {isFrameLayer(selected) && (
                  <s-text color="subdued">
                    Frame: drag layers into it to group them. Double-click a
                    layer inside to select it.
                  </s-text>
                )}
                <s-divider />
              </>
            )}
            {!translating && (
              <>
                <s-heading>Box</s-heading>
                <LayerBoxFields
                  key={`box-${selected.id}`}
                  value={selected.layer}
                  onChange={(layer) =>
                    history.set(
                      (current) => updateNode(current, selected.id, { layer }),
                      `${selected.id}:layer`,
                    )
                  }
                />
                <s-divider />
                <s-heading>Layer</s-heading>
                <LayerEffectsFields
                  key={`fx-${selected.id}`}
                  value={selected.effects}
                  onChange={(effects) =>
                    history.set(
                      (current) =>
                        updateNode(current, selected.id, { effects }),
                      `${selected.id}:effects`,
                    )
                  }
                />
                <s-divider />
              </>
            )}
            <s-heading>Content</s-heading>
            <Inspector
              key={`c-${selected.id}`}
              node={selected}
              context={inspectorContext}
              part="content"
            />
            {!translating && (
              <>
                <s-divider />
                <s-heading>Design</s-heading>
                <Inspector
                  key={`d-${selected.id}`}
                  node={selected}
                  context={inspectorContext}
                  part="design"
                />
              </>
            )}
          </s-stack>
        ) : (
          <s-stack gap="base">
            <s-heading>Canvas</s-heading>
            {sourceTemplate && !translating && (
              <s-box padding="base" background="subdued" borderRadius="base">
                <s-stack gap="small-200">
                  <s-text>
                    Made from the <strong>{sourceTemplate.name}</strong>{" "}
                    template.
                  </s-text>
                  <s-text color="subdued">
                    Changed too much? Go back to the original template design.
                    You see it first, and you can undo it.
                  </s-text>
                  <s-stack direction="inline">
                    <s-button icon="undo" onClick={previewRevert}>
                      Revert to template
                    </s-button>
                  </s-stack>
                </s-stack>
              </s-box>
            )}
            <s-text color="subdued">
              Select an element to edit it. The canvas is designed at{" "}
              {CANVAS_WIDTH}px and scales to every phone.
            </s-text>
            <FieldRow>
              <NumberField
                label="Height"
                value={canvas.height}
                min={80}
                max={4000}
                suffix="px"
                onChange={(height) => setHeight(height ?? 360, "canvas-height")}
              />
              <ColorField
                label="Background"
                value={canvas.background}
                onChange={(background) =>
                  history.set(
                    updateNode(design, canvas.id, { background }),
                    "canvas-bg",
                  )
                }
              />
            </FieldRow>
          </s-stack>
        )}
      </aside>
      <s-modal
        id="canvas-translations"
        heading="Quick translation"
        size="large-100"
        ref={translationsModal}
      >
        {translationsOpened && (
          <TranslationsPanel
            design={design}
            context={baseContext}
            languages={locales}
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
        <s-button
          slot="primary-action"
          variant="primary"
          commandFor="canvas-translations"
          command="--hide"
        >
          Done
        </s-button>
      </s-modal>
    </div>
  );
}

interface LayerTreeProps {
  nodes: Node[];
  depth: number;
  selectedIds: string[];
  /** Ancestors of the selection, kept unfolded so it's visible. */
  selectedPath: string[];
  /** `additive`: Shift/⌘-click adds to (or removes from) the selection. */
  onSelect: (id: string, additive: boolean) => void;
  onReorder: (activeId: string, overId: string) => void;
  onPatch: (id: string, patch: Partial<Node>) => void;
  /** Names for tab panels ("Tab: Products"). */
  labels?: Map<string, string>;
}

/**
 * The Layers panel, like Figma's: a tree with the top layer first. Frames
 * fold; layers can be hidden, locked and renamed (double-click the name).
 */
function LayerTree(props: LayerTreeProps) {
  const {
    nodes,
    depth,
    selectedIds,
    selectedPath,
    onSelect,
    onReorder,
    onPatch,
  } = props;
  /**
   * Fold state chosen with the arrows. Without a choice, like Figma, layers
   * start folded and the ones holding the selection unfold to reveal it.
   */
  const [choice, setChoice] = useState<Map<string, boolean>>(() => new Map());
  const pathKey = selectedPath.join();
  useEffect(() => {
    // A new selection reveals itself, even inside layers folded earlier.
    setChoice((current) => {
      if (!selectedPath.some((id) => current.has(id))) return current;
      const next = new Map(current);
      selectedPath.forEach((id) => next.delete(id));
      return next;
    });
    // Only when the selection's ancestors change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathKey]);
  const [renaming, setRenaming] = useState<string | null>(null);
  const labelOf = (node: Node) => props.labels?.get(node.id) ?? nodeLabel(node);
  const ordered = [...nodes].reverse();
  return (
    <SortableList ids={ordered.map((node) => node.id)} onReorder={onReorder}>
      <div className="cve__layers">
        {ordered.map((node) => {
          // Frames hold layers; free tabs hold one panel per tab.
          const children = isFrameLayer(node)
            ? (node.children ?? [])
            : isFreeTabs(node)
              ? node.tabs.map((tab) => tab.child)
              : [];
          const open =
            children.length > 0 &&
            (choice.get(node.id) ?? selectedPath.includes(node.id));
          return (
            <SortableItem key={node.id} id={node.id} label={nodeLabel(node)}>
              {(handle) => (
                <>
                  <div
                    className={`cve__layer${selectedIds.includes(node.id) ? " is-selected" : ""}${node.hidden ? " is-hidden" : ""}`}
                    style={{ paddingLeft: 4 + depth * 16 }}
                  >
                    {handle}
                    {children.length > 0 ? (
                      <button
                        type="button"
                        className="cve__layer-fold"
                        aria-label={open ? "Fold" : "Unfold"}
                        aria-expanded={open}
                        onClick={() =>
                          setChoice((current) =>
                            new Map(current).set(node.id, !open),
                          )
                        }
                      >
                        <s-icon
                          type={open ? "chevron-down" : "chevron-right"}
                        />
                      </button>
                    ) : (
                      <span className="cve__layer-fold" />
                    )}
                    {renaming === node.id ? (
                      <input
                        className="cve__layer-input"
                        aria-label="Layer name"
                        defaultValue={nodeLabel(node)}
                        // eslint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus
                        onFocus={(event) => event.currentTarget.select()}
                        onBlur={(event) => {
                          const name = event.currentTarget.value.trim();
                          onPatch(node.id, { name: name || undefined });
                          setRenaming(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") event.currentTarget.blur();
                          if (event.key === "Escape") setRenaming(null);
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="cve__layer-name"
                        title="Double-click to rename"
                        onClick={(event) =>
                          onSelect(
                            node.id,
                            event.shiftKey || event.metaKey || event.ctrlKey,
                          )
                        }
                        onDoubleClick={() => setRenaming(node.id)}
                      >
                        {labelOf(node)}
                      </button>
                    )}
                    <button
                      type="button"
                      className={`cve__layer-toggle${node.locked ? " is-on" : ""}`}
                      aria-label={node.locked ? "Unlock" : "Lock"}
                      aria-pressed={Boolean(node.locked)}
                      title={node.locked ? "Unlock" : "Lock"}
                      onClick={() =>
                        onPatch(node.id, { locked: !node.locked || undefined })
                      }
                    >
                      <s-icon type="lock" />
                    </button>
                    <button
                      type="button"
                      className={`cve__layer-toggle${node.hidden ? " is-on" : ""}`}
                      aria-label={node.hidden ? "Show" : "Hide"}
                      aria-pressed={Boolean(node.hidden)}
                      title={node.hidden ? "Show" : "Hide"}
                      onClick={() =>
                        onPatch(node.id, { hidden: !node.hidden || undefined })
                      }
                    >
                      <s-icon type={node.hidden ? "hide" : "view"} />
                    </button>
                  </div>
                  {open && (
                    <LayerTree
                      {...props}
                      nodes={children}
                      depth={depth + 1}
                      labels={
                        isFreeTabs(node)
                          ? new Map(
                              node.tabs.map((tab) => [
                                tab.child.id,
                                `Tab: ${tab.label}`,
                              ]),
                            )
                          : props.labels
                      }
                    />
                  )}
                </>
              )}
            </SortableItem>
          );
        })}
      </div>
    </SortableList>
  );
}

/** Floating preview next to the Elements panel: the element at (up to) real size, with a description. */
function HoverCard({
  elementKey,
  center,
  node,
  design,
  context,
}: {
  elementKey: string;
  center: number;
  node: CanvasNode;
  design: Design;
  context: Omit<RenderContext, "editor">;
}) {
  const element = CANVAS_ELEMENTS.find(
    (candidate) => candidate.key === elementKey,
  );
  if (!element) return null;
  const { w, h } = element.size;
  const scale = Math.min(1, 360 / w, 320 / h);
  const height = h * scale + 96;
  const top = Math.min(
    Math.max(center - height / 2, 64),
    window.innerHeight - height - 16,
  );
  return (
    <div className="cve-hover" style={{ top }} role="tooltip">
      <div className="cve-hover__head">
        <strong>{element.label}</strong>
        <span>{element.description}</span>
      </div>
      <div className="cve-hover__preview">
        <span
          style={{
            display: "block",
            width: w * scale,
            height: h * scale,
            overflow: "hidden",
          }}
        >
          <span
            style={{
              display: "block",
              width: w,
              height: h,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <span style={{ display: "block", width: CANVAS_WIDTH }}>
              <FragmentPreview
                bare
                design={design}
                node={node}
                context={context}
              />
            </span>
          </span>
        </span>
      </div>
      <div className="cve-hover__foot">
        Drag onto the canvas or click to add
      </div>
    </div>
  );
}
