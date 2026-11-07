import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import type { CanvasNode, Design, Frame } from "@chopi/menu-core";
import {
  CANVAS_WIDTH,
  canvasLayout,
  childNodes,
  isFreeTabs,
  SIDE_TAB_GAP,
  SIDE_TAB_HEIGHT,
  TAB_BAR_HEIGHT,
  TAB_RAIL_WIDTH,
} from "@chopi/menu-core";
import {
  MENU_CSS,
  renderFragment,
  type RenderContext,
} from "@chopi/menu-renderer";
import { toMarkup } from "../editor/RichTextField";
import { HANDLES, resize, snapMove, type Guide, type Handle } from "./geometry";
import {
  contains,
  enterAt,
  flattenLayers,
  frameAt,
  isFrameLayer,
  parentOrigin,
  parentSize,
  pickAt,
  PREVIEW_FONT,
  hits,
  isOpenIn,
  type CanvasView,
  type LayerEntry,
} from "./layers";

export const ELEMENT_MIME = "application/x-chopi-element";

interface CanvasStageProps {
  design: Design;
  canvas: CanvasNode;
  context: Omit<RenderContext, "editor">;
  zoom: number;
  /** Selected layers; the last one is the primary (shown in the inspector). */
  selectedIds: string[];
  /** Texts can be edited in place (not while translating). */
  canEditText: boolean;
  /** Tabs shown and accordions shown open. */
  view: CanvasView;
  /** A tab was clicked in the tab bar of a free tabs layer. */
  onTab: (tabsId: string, tabId: string) => void;
  onSelect: (ids: string[]) => void;
  /** Live frame updates while dragging; `key` groups them into one undo step. */
  onFrames: (frames: { id: string; frame: Frame }[], key: string) => void;
  /** A moved layer was dropped into another frame (or back onto the canvas). */
  onReparent: (id: string, parentId: string, frame: Frame, key: string) => void;
  onHeight: (height: number, key: string) => void;
  /** An element from the panel was dropped at (x, y) inside `parentId`. */
  onDropElement: (key: string, parentId: string, x: number, y: number) => void;
  onText: (id: string, text: string) => void;
  /** A drag or resize finished (lists re-flow their items then). */
  onGestureEnd: (gesture: {
    kind: "move" | "resize";
    ids: string[];
    key: string;
  }) => void;
  /**
   * Right-click: the layer under the pointer is selected first (unless it's
   * already selected); `parentId`/`x`/`y` say where "add here" or "paste
   * here" would put new layers.
   */
  onContextMenu: (menu: {
    clientX: number;
    clientY: number;
    parentId: string;
    x: number;
    y: number;
  }) => void;
}

interface MovedLayer {
  id: string;
  parentId: string;
  start: Frame;
}

type Gesture =
  | {
      kind: "move";
      /** The layer under the pointer: it snaps, the others follow. */
      id: string;
      parentId: string;
      start: Frame;
      layers: MovedLayer[];
      x: number;
      y: number;
      key: string;
      moved: boolean;
    }
  | {
      kind: "marquee";
      from: { x: number; y: number };
      to: { x: number; y: number };
    }
  | {
      kind: "resize";
      id: string;
      parentId: string;
      start: Frame;
      handle: Handle;
      x: number;
      y: number;
      key: string;
    }
  | { kind: "height"; start: number; y: number; key: string };

/** How far around its list an item can be dragged and still stay in it (canvas units). */
const LIST_MARGIN = 48;

/** Pointer travel (screen px) before a press becomes a drag, so clicks don't nudge layers. */
const DRAG_THRESHOLD = 3;

const rectOf = (
  a: { x: number; y: number },
  b: { x: number; y: number },
): Frame => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  w: Math.abs(a.x - b.x),
  h: Math.abs(a.y - b.y),
});

const intersects = (a: Frame, b: Frame) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const boxStyle = (frame: Frame) => ({
  left: frame.x,
  top: frame.y,
  width: frame.w,
  height: frame.h,
});

/**
 * The editable canvas: the real storefront rendering (shadow DOM) with an
 * editing layer on top. Works like Figma: click selects at the current level,
 * double-click goes into a frame or edits a text, Cmd/Ctrl-click selects the
 * innermost layer, and dragging a layer into a frame puts it inside.
 */
export function CanvasStage({
  design,
  canvas,
  context,
  zoom,
  selectedIds,
  canEditText,
  view,
  onTab,
  onSelect,
  onFrames,
  onReparent,
  onHeight,
  onDropElement,
  onText,
  onContextMenu,
  onGestureEnd,
}: CanvasStageProps) {
  const host = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [dropping, setDropping] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  /** Frame a moved layer would go into when released. */
  const [targetId, setTargetId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  /** Bumped to throw away an in-place edit (re-renders the canvas). */
  const [renderVersion, setRenderVersion] = useState(0);
  const lastFrame = useRef<Frame | null>(null);
  /** Editor scroll position of sideways-scrolling frames (mouse wheel over them). */
  const [scroll, setScroll] = useState<Record<string, number>>({});
  const fullView = useMemo(() => ({ ...view, scroll }), [view, scroll]);
  const height = Math.max(40, canvas.height);
  // Open accordions make the canvas taller than its design height.
  const shownHeight =
    height + canvasLayout(canvas.children, isOpenIn(view)).extra;

  const entries = useMemo(
    () => flattenLayers(canvas, fullView),
    [canvas, fullView],
  );
  // Locked layers (and everything in a locked frame) can't be picked on the canvas.
  const pickable = useMemo(() => {
    const locked = new Set(
      entries
        .filter((entry) => entry.node.locked)
        .map((entry) => entry.node.id),
    );
    return entries.filter(
      (entry) =>
        !locked.has(entry.node.id) &&
        !entry.ancestors.some((id) => locked.has(id)),
    );
  }, [entries]);
  const entryOf = (id: string | null) =>
    id ? entries.find((entry) => entry.node.id === id) : undefined;
  const selectedId = selectedIds[selectedIds.length - 1] ?? null;
  const selection = selectedIds
    .map((id) => entryOf(id))
    .filter((entry): entry is LayerEntry => Boolean(entry));
  const selected = selection.length === 1 ? selection[0] : undefined;

  // Render the canvas exactly like the storefront (at 1:1, the stage is 390 wide).
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const shadow = element.shadowRoot ?? element.attachShadow({ mode: "open" });
    // The editing layer above takes every click; only a text being edited in
    // place takes the pointer (inline style), never a link of the menu.
    shadow.innerHTML = `<style>${MENU_CSS} :host{pointer-events:none} .chm-root,.chm-root *{pointer-events:none} .chm-fragment{padding:0} [contenteditable]{outline:none;cursor:text}</style>${renderFragment(
      design,
      [{ ...canvas, hidden: false }],
      {
        ...context,
        editor: true,
        activeTabs: view.activeTabs,
        expanded: view.expanded,
      },
    )}`;
    for (const [id, left] of Object.entries(scroll)) {
      const frame = shadow.querySelector<HTMLElement>(
        `[data-chm-node="${CSS.escape(id)}"]`,
      );
      if (frame) frame.scrollLeft = left;
    }
  }, [design, canvas, context, renderVersion, view, scroll]);

  /** Mouse wheel over a sideways-scrolling frame scrolls it, as on a phone. */
  const onWheel = (event: ReactWheelEvent) => {
    const point = toCanvas(event.clientX, event.clientY);
    for (let index = entries.length - 1; index >= 0; index--) {
      const entry = entries[index];
      if (entry.node.type !== "shape" || entry.node.scroll !== "x") continue;
      if (!hits(entry, point.x, point.y)) continue;
      const content = Math.max(
        0,
        ...childNodes(entry.node).map((child) =>
          child.frame ? child.frame.x + child.frame.w : 0,
        ),
      );
      const max = Math.max(0, content - entry.abs.w);
      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;
      const id = entry.node.id;
      setScroll((current) => ({
        ...current,
        [id]: Math.min(max, Math.max(0, (current[id] ?? 0) + delta / zoom)),
      }));
      return;
    }
  };

  // Never follow a link of the menu inside the editor (e.g. while editing a text).
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const stop = (event: Event) => {
      if (
        (event.composedPath()[0] as Element | undefined)?.closest?.("a[href]")
      )
        event.preventDefault();
    };
    element.addEventListener("click", stop, true);
    return () => element.removeEventListener("click", stop, true);
  }, []);

  // In-place text editing: the rendered text itself becomes editable.
  useEffect(() => {
    const node = entryOf(editingId)?.node;
    const element = editingId
      ? host.current?.shadowRoot?.querySelector<HTMLElement>(
          `[data-chm-node="${CSS.escape(editingId)}"]`,
        )
      : null;
    if (!node || !element || (node.type !== "text" && node.type !== "heading"))
      return;
    const hostElement = host.current!;
    hostElement.style.pointerEvents = "auto";
    element.style.pointerEvents = "auto";
    element.contentEditable =
      node.type === "heading" ? "plaintext-only" : "true";
    element.focus();
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    let cancelled = false;
    const finish = () => {
      element.removeEventListener("blur", finish);
      element.contentEditable = "false";
      element.style.pointerEvents = "";
      hostElement.style.pointerEvents = "";
      setEditingId(null);
      if (cancelled) {
        setRenderVersion((version) => version + 1);
        return;
      }
      const text =
        node.type === "heading"
          ? element.innerText.replace(/\s+/g, " ").trim()
          : toMarkup(element).trim();
      if (text !== node.text) onText(node.id, text);
    };
    const onKey = (event: KeyboardEvent) => {
      event.stopPropagation();
      if (event.key === "Escape") {
        cancelled = true;
        element.blur();
      } else if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        element.blur();
      }
    };
    element.addEventListener("blur", finish);
    element.addEventListener("keydown", onKey);
    return () => {
      element.removeEventListener("blur", finish);
      element.removeEventListener("keydown", onKey);
    };
    // Only (re)starts when another layer is edited.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  const toCanvas = (clientX: number, clientY: number) => {
    const rect = layer.current!.getBoundingClientRect();
    return { x: (clientX - rect.left) / zoom, y: (clientY - rect.top) / zoom };
  };

  const siblings = (exclude: string[], parentId: string) =>
    entries
      .filter(
        (entry) =>
          entry.parentId === parentId &&
          !exclude.includes(entry.node.id) &&
          !entry.node.hidden,
      )
      .map((entry) => entry.node.frame!);

  const offsetGuides = (list: Guide[], origin: { x: number; y: number }) =>
    list.map((guide) => ({
      ...guide,
      at: guide.at + (guide.axis === "x" ? origin.x : origin.y),
    }));

  /** The phone screen the canvas scrolls in (the editor's device preview). */
  const scroller = () =>
    layer.current?.closest<HTMLElement>("[data-cve-scroller]") ?? null;
  /** Scroll position when the gesture started: scrolling while dragging moves the layer too. */
  const scrollStart = useRef(0);
  const scrolled = () =>
    ((scroller()?.scrollTop ?? 0) - scrollStart.current) / zoom;

  const start = (event: ReactPointerEvent, next: Gesture) => {
    event.stopPropagation();
    event.preventDefault();
    layer.current?.setPointerCapture(event.pointerId);
    lastFrame.current = null;
    scrollStart.current = scroller()?.scrollTop ?? 0;
    setGesture(next);
  };

  /** Dragging near the top or bottom of the phone screen scrolls it. */
  const autoScroll = (clientY: number) => {
    const element = scroller();
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const edge = 48;
    if (clientY > rect.bottom - edge)
      element.scrollTop += Math.ceil((clientY - (rect.bottom - edge)) / 3);
    else if (clientY < rect.top + edge)
      element.scrollTop -= Math.ceil((rect.top + edge - clientY) / 3);
  };

  /** Which layer a click at (x, y) selects. The selection keeps priority so it can be dragged even under others. */
  const pick = (x: number, y: number, deep: boolean): LayerEntry | null => {
    if (!deep) {
      const held = selection.find(
        (entry) =>
          !entry.node.hidden && !entry.node.locked && hits(entry, x, y),
      );
      if (held) return held;
    }
    return pickAt(pickable, canvas.id, selectedId, x, y, deep);
  };

  /** The tab under the point when it's on the tab bar of free tabs. */
  const tabAt = (x: number, y: number) => {
    for (let index = pickable.length - 1; index >= 0; index--) {
      const { node, abs } = pickable[index];
      if (!isFreeTabs(node) || !hits(pickable[index], x, y)) continue;
      let position: number;
      if (node.placement === "side") {
        // A column of tabs on the left: which one is under the point.
        if (x > abs.x + (node.railWidth ?? TAB_RAIL_WIDTH)) return null;
        const step = (node.barHeight ?? SIDE_TAB_HEIGHT) + SIDE_TAB_GAP;
        position = Math.floor((y - abs.y) / step);
        if (position >= node.tabs.length) return null;
      } else {
        if (y > abs.y + (node.barHeight ?? TAB_BAR_HEIGHT)) return null;
        position = Math.floor(((x - abs.x) / abs.w) * node.tabs.length);
      }
      const tab =
        node.tabs[Math.min(node.tabs.length - 1, Math.max(0, position))];
      return { tabsId: node.id, tabId: tab.id };
    }
    return null;
  };

  const onPointerDown = (event: ReactPointerEvent) => {
    if (event.button !== 0) return;
    const point = toCanvas(event.clientX, event.clientY);
    const tab = tabAt(point.x, point.y);
    if (tab) onTab(tab.tabsId, tab.tabId);
    const entry = pick(point.x, point.y, event.metaKey || event.ctrlKey);
    if (!entry) {
      // Empty area: drag a selection box (Shift adds to the selection).
      if (!event.shiftKey) onSelect([]);
      start(event, { kind: "marquee", from: point, to: point });
      return;
    }
    const id = entry.node.id;
    let ids: string[];
    if (event.shiftKey) {
      ids = selectedIds.includes(id)
        ? selectedIds.filter((candidate) => candidate !== id)
        : [...selectedIds, id];
    } else {
      ids = selectedIds.includes(id)
        ? [...selectedIds.filter((candidate) => candidate !== id), id]
        : [id];
    }
    onSelect(ids);
    if (!ids.includes(id)) return;
    // Tab panels follow their tabs; they don't move on their own.
    if (entry.fixed) return;
    const layers = ids
      .map((candidate) => entryOf(candidate))
      .filter((candidate): candidate is LayerEntry =>
        Boolean(candidate && !candidate.node.locked && !candidate.fixed),
      )
      .map((candidate) => ({
        id: candidate.node.id,
        parentId: candidate.parentId,
        start: candidate.node.frame!,
      }));
    start(event, {
      kind: "move",
      id,
      parentId: entry.parentId,
      start: entry.node.frame!,
      layers,
      x: event.clientX,
      y: event.clientY,
      key: `move:${id}:${Date.now()}`,
      moved: false,
    });
  };

  const onRightClick = (event: ReactMouseEvent) => {
    event.preventDefault();
    const point = toCanvas(event.clientX, event.clientY);
    const entry = pick(point.x, point.y, event.metaKey || event.ctrlKey);
    if (!entry) onSelect([]);
    else if (!selectedIds.includes(entry.node.id)) onSelect([entry.node.id]);
    const parentId = frameAt(canvas, pickable, point.x, point.y);
    const origin = parentOrigin(entries, parentId);
    onContextMenu({
      clientX: event.clientX,
      clientY: event.clientY,
      parentId,
      x: Math.round(point.x - origin.x),
      y: Math.round(point.y - origin.y),
    });
  };

  const onDoubleClick = (event: ReactMouseEvent) => {
    if (!selected) return;
    const point = toCanvas(event.clientX, event.clientY);
    if (isFrameLayer(selected.node) || isFreeTabs(selected.node)) {
      const inner = enterAt(pickable, selected.node.id, point.x, point.y);
      if (inner) onSelect([inner.node.id]);
      return;
    }
    if (
      canEditText &&
      (selected.node.type === "text" || selected.node.type === "heading")
    )
      setEditingId(selected.node.id);
  };

  const onPointerMove = (event: ReactPointerEvent) => {
    if (!gesture) {
      const point = toCanvas(event.clientX, event.clientY);
      const id =
        pick(point.x, point.y, event.metaKey || event.ctrlKey)?.node.id ?? null;
      if (id !== hoveredId) setHoveredId(id);
      return;
    }
    const threshold = 5 / zoom;
    const snap = !event.altKey;
    autoScroll(event.clientY);
    if (gesture.kind === "marquee") {
      const to = toCanvas(event.clientX, event.clientY);
      setGesture({ ...gesture, to });
      const box = rectOf(gesture.from, to);
      // Like Figma: the box picks layers at the top level it touches.
      const touched = pickable
        .filter(
          (entry) =>
            entry.parentId === canvas.id &&
            !entry.node.hidden &&
            intersects(entry.abs, box),
        )
        .map((entry) => entry.node.id);
      const ids = event.shiftKey
        ? [...new Set([...selectedIds, ...touched])]
        : touched;
      if (ids.join() !== selectedIds.join()) onSelect(ids);
      return;
    }
    if (gesture.kind === "height") {
      onHeight(
        Math.max(
          80,
          Math.round(
            gesture.start + (event.clientY - gesture.y) / zoom + scrolled(),
          ),
        ),
        gesture.key,
      );
      return;
    }
    if (gesture.kind === "move" && !gesture.moved) {
      if (
        Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) <
        DRAG_THRESHOLD
      )
        return;
      setGesture({ ...gesture, moved: true });
    }
    const dx = (event.clientX - gesture.x) / zoom;
    const dy = (event.clientY - gesture.y) / zoom + scrolled();
    const bounds = parentSize(canvas, entries, gesture.parentId);
    const origin = parentOrigin(entries, gesture.parentId);
    // Snap against siblings that aren't moving along.
    const moving =
      gesture.kind === "move"
        ? gesture.layers.map((layer) => layer.id)
        : [gesture.id];
    const others = siblings(moving, gesture.parentId);
    const result =
      gesture.kind === "move"
        ? snapMove(
            {
              ...gesture.start,
              x: gesture.start.x + dx,
              y: gesture.start.y + dy,
            },
            others,
            bounds,
            threshold,
            snap,
          )
        : resize(
            gesture.start,
            gesture.handle,
            dx,
            dy,
            others,
            bounds,
            threshold,
            { snap, keepRatio: event.shiftKey },
          );
    setGuides(offsetGuides(result.guides, origin));
    lastFrame.current = result.frame;
    if (gesture.kind === "move") {
      // The others keep their distance to the layer under the pointer.
      const deltaX = result.frame.x - gesture.start.x;
      const deltaY = result.frame.y - gesture.start.y;
      onFrames(
        gesture.layers.map((layer) =>
          layer.id === gesture.id
            ? { id: layer.id, frame: result.frame }
            : {
                id: layer.id,
                frame: {
                  ...layer.start,
                  x: layer.start.x + deltaX,
                  y: layer.start.y + deltaY,
                },
              },
        ),
        gesture.key,
      );
    } else {
      onFrames([{ id: gesture.id, frame: result.frame }], gesture.key);
    }

    if (gesture.kind === "move" && gesture.layers.length === 1) {
      const cx = origin.x + result.frame.x + result.frame.w / 2;
      const cy = origin.y + result.frame.y + result.frame.h / 2;
      // A list item stays in its list while dragged around it (to reorder,
      // even to the very first or last place); it leaves only when dragged
      // clearly away.
      const list = entryOf(gesture.parentId);
      const nearList =
        list?.node.type === "shape" &&
        list.node.list &&
        contains(
          {
            x: list.abs.x - LIST_MARGIN,
            y: list.abs.y - LIST_MARGIN,
            w: list.abs.w + LIST_MARGIN * 2,
            h: list.abs.h + LIST_MARGIN * 2,
          },
          cx,
          cy,
        );
      const target = nearList
        ? gesture.parentId
        : frameAt(canvas, entries, cx, cy, gesture.id);
      setTargetId(target === gesture.parentId ? null : target);
    }
    // Grow the canvas when a layer is dragged past its bottom.
    const bottom = origin.y + result.frame.y + result.frame.h;
    if (bottom > height - 16) onHeight(Math.round(bottom + 40), gesture.key);
  };

  const end = () => {
    if (
      gesture?.kind === "move" &&
      gesture.layers.length === 1 &&
      targetId &&
      lastFrame.current
    ) {
      const from = parentOrigin(entries, gesture.parentId);
      const to =
        targetId === canvas.id
          ? { x: 0, y: 0 }
          : parentOrigin(entries, targetId);
      const frame = lastFrame.current;
      onReparent(
        gesture.id,
        targetId,
        {
          ...frame,
          x: Math.round(from.x + frame.x - to.x),
          y: Math.round(from.y + frame.y - to.y),
        },
        gesture.key,
      );
    }
    // After a possible move into another frame: lists re-flow their items.
    if (gesture?.kind === "move" && gesture.moved)
      onGestureEnd({
        kind: "move",
        ids: gesture.layers.map((layer) => layer.id),
        key: gesture.key,
      });
    if (gesture?.kind === "resize")
      onGestureEnd({ kind: "resize", ids: [gesture.id], key: gesture.key });
    setGesture(null);
    setGuides([]);
    setTargetId(null);
  };

  const onDragOver = (event: DragEvent) => {
    if (!event.dataTransfer.types.includes(ELEMENT_MIME)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDropping(true);
    const point = toCanvas(event.clientX, event.clientY);
    const target = frameAt(canvas, entries, point.x, point.y);
    setTargetId(target === canvas.id ? null : target);
  };

  const onDrop = (event: DragEvent) => {
    const key = event.dataTransfer.getData(ELEMENT_MIME);
    setDropping(false);
    setTargetId(null);
    if (!key) return;
    event.preventDefault();
    const point = toCanvas(event.clientX, event.clientY);
    const parentId = frameAt(canvas, entries, point.x, point.y);
    const origin = parentOrigin(entries, parentId);
    onDropElement(key, parentId, point.x - origin.x, point.y - origin.y);
  };

  const hovered =
    hoveredId && !selectedIds.includes(hoveredId) && !gesture
      ? entryOf(hoveredId)
      : undefined;
  const selectionBox =
    selection.length > 1
      ? rectOf(
          {
            x: Math.min(...selection.map((entry) => entry.abs.x)),
            y: Math.min(...selection.map((entry) => entry.abs.y)),
          },
          {
            x: Math.max(...selection.map((entry) => entry.abs.x + entry.abs.w)),
            y: Math.max(...selection.map((entry) => entry.abs.y + entry.abs.h)),
          },
        )
      : null;
  const parent =
    selected && selected.parentId !== canvas.id
      ? entryOf(selected.parentId)
      : undefined;
  const target = entryOf(targetId);

  // Distances to the parent's edges while dragging or resizing, like Figma.
  const measuring =
    gesture &&
    ((gesture.kind === "move" && gesture.moved) || gesture.kind === "resize");
  const measured = measuring ? (selectionBox ?? selected?.abs) : undefined;
  const measureParent = (() => {
    if (!measured) return undefined;
    const parentId = selection.length === 1 ? selection[0].parentId : canvas.id;
    if (parentId === canvas.id)
      return { x: 0, y: 0, w: CANVAS_WIDTH, h: shownHeight };
    return entryOf(parentId)?.abs;
  })();
  const editing = Boolean(editingId);
  /** Handles and labels keep their screen size at any zoom. */
  const unscaled = { transform: `scale(${1 / zoom})` };

  return (
    <div
      className="cve-canvas"
      style={{ width: CANVAS_WIDTH * zoom, height: shownHeight * zoom }}
    >
      <div
        className="cve-canvas__scale"
        style={{
          width: CANVAS_WIDTH,
          height: shownHeight,
          transform: `scale(${zoom})`,
        }}
      >
        <div
          ref={host}
          className="cve-canvas__render"
          style={{ fontFamily: PREVIEW_FONT }}
        />
        <div
          ref={layer}
          className={`cve-canvas__layer${dropping && !target ? " is-dropping" : ""}${gesture ? " is-busy" : ""}${editing ? " is-editing" : ""}`}
          role="presentation"
          onPointerDown={onPointerDown}
          onDoubleClick={onDoubleClick}
          onContextMenu={onRightClick}
          onPointerMove={onPointerMove}
          onWheel={onWheel}
          onPointerLeave={() => !gesture && setHoveredId(null)}
          onPointerUp={end}
          onPointerCancel={end}
          onDragOver={onDragOver}
          onDragLeave={() => {
            setDropping(false);
            setTargetId(null);
          }}
          onDrop={onDrop}
        >
          {parent && (
            <div className="cve-box is-parent" style={boxStyle(parent.abs)} />
          )}
          {hovered && (
            <div className="cve-box is-hover" style={boxStyle(hovered.abs)} />
          )}
          {target && (
            <div className="cve-box is-target" style={boxStyle(target.abs)} />
          )}
          {selection.length > 1 &&
            selection.map((entry) => (
              <div
                key={entry.node.id}
                className="cve-box is-member"
                style={boxStyle(entry.abs)}
              />
            ))}
          {selectionBox && (
            <div className="cve-box is-selected" style={boxStyle(selectionBox)}>
              <span className="cve-box__size" style={unscaled}>
                {selection.length} layers
              </span>
            </div>
          )}
          {gesture?.kind === "marquee" && (
            <div
              className="cve-marquee"
              style={boxStyle(rectOf(gesture.from, gesture.to))}
            />
          )}
          {selected && (
            <div
              className={`cve-box is-selected${selected.node.hidden ? " is-hidden" : ""}`}
              style={boxStyle(selected.abs)}
            >
              {!editing && !selected.node.locked && !selected.fixed && (
                <>
                  <span className="cve-box__size" style={unscaled}>
                    {selected.abs.w} × {selected.abs.h}
                  </span>
                  {HANDLES.map((handle) => (
                    <span
                      key={handle}
                      className={`cve-handle cve-handle--${handle}`}
                      style={unscaled}
                      onPointerDown={(event) =>
                        start(event, {
                          kind: "resize",
                          id: selected.node.id,
                          parentId: selected.parentId,
                          start: selected.node.frame!,
                          handle,
                          x: event.clientX,
                          y: event.clientY,
                          key: `resize:${selected.node.id}:${Date.now()}`,
                        })
                      }
                    />
                  ))}
                </>
              )}
            </div>
          )}
          {!gesture && selected && (
            <ListGaps entries={entries} item={selected} zoom={zoom} />
          )}
          {measured && measureParent && (
            <Distances box={measured} parent={measureParent} zoom={zoom} />
          )}
          {guides.map((guide, index) =>
            guide.axis === "x" ? (
              <span
                key={index}
                className="cve-guide cve-guide--x"
                style={{ left: guide.at, borderLeftWidth: 1 / zoom }}
              />
            ) : (
              <span
                key={index}
                className="cve-guide cve-guide--y"
                style={{ top: guide.at, borderTopWidth: 1 / zoom }}
              />
            ),
          )}
          {canvas.children.length === 0 && !dropping && (
            <div className="cve-empty" style={unscaled}>
              Drag elements here from the left
            </div>
          )}
        </div>
        <button
          type="button"
          className="cve-canvas__height"
          aria-label="Drag to change the canvas height"
          onPointerDown={(event) =>
            start(event, {
              kind: "height",
              start: height,
              y: event.clientY,
              key: `height:${Date.now()}`,
            })
          }
          style={unscaled}
        >
          ⇕
        </button>
      </div>
    </div>
  );
}

/**
 * Red distance lines from a box to its parent's four edges, with the
 * distance in canvas units (px at the design width).
 */
function Distances({
  box,
  parent,
  zoom,
}: {
  box: Frame;
  parent: Frame;
  zoom: number;
}) {
  const midX = box.x + box.w / 2;
  const midY = box.y + box.h / 2;
  const lines = [
    { axis: "x", from: parent.x, to: box.x, at: midY },
    { axis: "x", from: box.x + box.w, to: parent.x + parent.w, at: midY },
    { axis: "y", from: parent.y, to: box.y, at: midX },
    { axis: "y", from: box.y + box.h, to: parent.y + parent.h, at: midX },
  ] as const;
  return (
    <>
      {lines.map((line, index) => {
        const length = Math.round(line.to - line.from);
        if (length <= 0) return null;
        const style =
          line.axis === "x"
            ? {
                left: line.from,
                top: line.at,
                width: length,
                borderTopWidth: 1 / zoom,
              }
            : {
                left: line.at,
                top: line.from,
                height: length,
                borderLeftWidth: 1 / zoom,
              };
        return (
          <span
            key={index}
            className={`cve-distance cve-distance--${line.axis}`}
            style={style}
          >
            <span
              className="cve-distance__label"
              style={{ transform: `translate(-50%, -50%) scale(${1 / zoom})` }}
            >
              {length}
            </span>
          </span>
        );
      })}
    </>
  );
}

/**
 * The spacing between the items of a smart list, shown while one of its
 * items is selected (like Figma's spacing indicators), so it stays even.
 */
function ListGaps({
  entries,
  item,
  zoom,
}: {
  entries: LayerEntry[];
  item: LayerEntry;
  zoom: number;
}) {
  const list = entries.find((entry) => entry.node.id === item.parentId);
  if (list?.node.type !== "shape" || !list.node.list) return null;
  const direction = list.node.list.direction;
  const items = entries.filter((entry) => entry.parentId === list.node.id);
  const gaps: Frame[] = [];
  for (let index = 1; index < items.length; index++) {
    const a = items[index - 1].abs;
    const b = items[index].abs;
    if (
      direction !== "row" &&
      b.y > a.y + a.h - 0.5 &&
      Math.abs(a.x - b.x) < 1
    ) {
      gaps.push({ x: b.x, y: a.y + a.h, w: b.w, h: b.y - (a.y + a.h) });
    } else if (
      direction !== "column" &&
      b.x > a.x + a.w - 0.5 &&
      Math.abs(a.y - b.y) < 1
    ) {
      gaps.push({ x: a.x + a.w, y: a.y, w: b.x - (a.x + a.w), h: a.h });
    }
  }
  return (
    <>
      {gaps
        .filter((gap) => gap.w > 0 && gap.h > 0)
        .map((gap, index) => (
          <span key={index} className="cve-gap" style={boxStyle(gap)}>
            {index === 0 && (
              <span
                className="cve-gap__label"
                style={{
                  transform: `translate(-50%, -50%) scale(${1 / zoom})`,
                }}
              >
                {Math.round(direction === "row" ? gap.w : gap.h)}
              </span>
            )}
          </span>
        ))}
    </>
  );
}
