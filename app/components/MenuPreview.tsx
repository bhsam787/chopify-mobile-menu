import { useEffect, useRef } from "react";
import { morphChildren } from "./morph";
import type { Design } from "@chopi/menu-core";
import { cleanCustomCss } from "@chopi/menu-core";
import {
  attachBehavior,
  MENU_CSS,
  selectTab,
  renderMenu,
  type MenuController,
  type RenderContext,
} from "@chopi/menu-renderer";
import { previewSearch } from "../editor/searchPreview";
import {
  followTarget,
  GuideBot,
  useGuidePrefs,
  type GuideLine,
} from "./GuideBot";

export type PreviewContext = Omit<RenderContext, "editor">;

interface MenuPreviewProps {
  design: Design;
  context: PreviewContext;
  /** Phone width in px (the frame scales to fit `scale`). */
  width?: number;
  height?: number;
  scale?: number;
  screenId?: string;
  selectedId?: string | null;
  onSelect?: (nodeId: string) => void;
  onScreenChange?: (screenId: string) => void;
  /**
   * "Preview" mode: the menu works like on the storefront (tabs, accordions,
   * sub-menus, swiping rows) instead of clicks selecting things to edit.
   */
  interactive?: boolean;
  /**
   * Design dialogs: a name tag on the selected part ("Banner"), so it's clear
   * what the settings change.
   */
  highlightLabel?: string;
  /**
   * Design dialogs: the part of the selected item the hovered settings card
   * changes (a selector inside it, ":scope" for the item itself).
   */
  focusSelector?: string | null;
  /** Name tag for the focused part (it moves onto that part). */
  focusLabel?: string;
  /** Design dialogs: more items designed together with the selected one. */
  alsoSelectedIds?: string[];
  /**
   * CSS editor: picking parts. Hovering outlines a part and a click hands
   * the clicked element to `onPick` instead of working like the store.
   */
  picking?: boolean;
  onPick?: (element: Element) => void;
  /** CSS editor: every element this selector matches is outlined. */
  matchSelector?: string | null;
  /**
   * The helper robot beside the phone, pointing at the part being worked on.
   * Leave it out where there's no helper; `false` keeps its lane (hidden).
   */
  guide?: boolean;
  /** What the helper says (a new line pops a speech bubble). */
  guideLine?: GuideLine | null;
}

/**
 * The part a design dialog works on: the focused part of the selected item
 * (the first one shown), else the item itself.
 */
function designAnchor(mount: HTMLElement, selectedId: string) {
  const selected = mount.querySelector<HTMLElement>(
    `[data-chm-node="${CSS.escape(selectedId)}"]`,
  );
  if (!selected) return null;
  const focused = [...selected.querySelectorAll<HTMLElement>(".is-focus")]
    .concat(selected.classList.contains("is-focus") ? [selected] : [])
    .find((part) => part.getBoundingClientRect().width > 0);
  return { selected, focused: focused ?? null, anchor: focused ?? selected };
}

/** The name tag on the part being designed, and a soft glow around it. */
const PICK_CSS = `.chm-pick, .chm-pick * { cursor: crosshair !important; } .chm-pick .chm-pick-hover { outline: 2px solid #2c6ecb !important; outline-offset: -2px; background-color: rgba(44,110,203,.08); } .chm-pick-match { outline: 2px dashed #e8890c !important; outline-offset: -2px; }`;

const HIGHLIGHT_CSS = `.chm-editor .is-selected{box-shadow:0 0 0 4px rgba(44,110,203,.22)} .chm-has-tag .chm-body{position:relative} .chm-editor .is-focus{outline:2px dashed #E8890C!important;outline-offset:2px;box-shadow:0 0 0 5px rgba(232,137,12,.18)!important;transition:outline-color .15s} .chm-design-tag--focus{background:#E8890C!important} .chm-design-tag{position:absolute;z-index:20;transform:translateY(-100%);padding:3px 8px;border-radius:6px 6px 6px 0;background:#2C6ECB;color:#fff;font:600 11px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;white-space:nowrap;pointer-events:none;box-shadow:0 2px 6px rgba(0,0,0,.2)}`;

/** In "Preview" mode: hidden sections are hidden and nothing looks selectable. */
const TRY_CSS = `.chm-try a,.chm-try img{-webkit-user-drag:none;user-select:none} .chm-try.is-swiping{cursor:grabbing;user-select:none} .chm-try [data-chm-hidden]{display:none!important} .chm-try [data-chm-node]{cursor:auto} .chm-try :is(a[href],button,[data-chm-screen],[data-chm-tab],[data-chm-accordion],[data-chm-collapse],select,label){cursor:pointer} .chm-try :is(.chm-stories,.chm-c--scroll,.chm-shape--scroll){cursor:grab} .chm-try .is-selected,.chm-try .is-hovered{outline:none!important} .chm-try{position:relative} .chm-try-note{position:absolute;left:12px;right:12px;bottom:16px;z-index:5;padding:10px 14px;border-radius:12px;background:rgba(26,26,26,.92);color:#fff;font:500 13px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:center;pointer-events:none;animation:chm-try-note 1.8s ease forwards} @keyframes chm-try-note{0%{opacity:0;transform:translateY(6px)}10%,80%{opacity:1;transform:none}100%{opacity:0}}`;

/**
 * In "Preview" mode links don't leave the editor; a short note in the phone
 * tells where the link goes on the store instead, so every tap does something.
 */
function enableLinkNotes(
  root: HTMLElement,
  routes: Record<string, string>,
): () => void {
  const labels: Record<string, string> = {
    root: "your home page",
    search: "search",
    collections: "all collections",
    all_products: "all products",
    account: "the customer account",
    account_login: "customer login",
    cart: "the cart",
  };
  const onClick = (event: Event) => {
    const link = (event.target as Element).closest?.("a[href]");
    if (!link || event.defaultPrevented === false) return;
    const href = link.getAttribute("href") ?? "";
    const route = Object.entries(routes).find(([, path]) => path === href)?.[0];
    const note = document.createElement("div");
    note.className = "chm-try-note";
    note.textContent = `Opens ${route ? labels[route] : href} on your store`;
    root.querySelectorAll(".chm-try-note").forEach((old) => old.remove());
    root.appendChild(note);
    window.setTimeout(() => note.remove(), 1900);
  };
  root.addEventListener("click", onClick);
  return () => root.removeEventListener("click", onClick);
}

/** The scrolling row under an element, if any (rows, story circles, carousels). */
function sideScroller(from: Element | null): HTMLElement | null {
  for (let element = from; element; element = element.parentElement) {
    if (!(element instanceof HTMLElement)) continue;
    const overflow = getComputedStyle(element).overflowX;
    if (
      (overflow === "auto" || overflow === "scroll") &&
      element.scrollWidth > element.clientWidth + 1
    )
      return element;
  }
  return null;
}

/**
 * Lets a mouse drag swipe sideways-scrolling rows, like a finger on a phone.
 * A drag doesn't count as a click on what it started on.
 */
function enableDragScroll(root: HTMLElement): () => void {
  let drag: {
    scroller: HTMLElement;
    x: number;
    left: number;
    moved: boolean;
    /** The preview is scaled: screen pixels per pixel of the row. */
    scale: number;
  } | null = null;
  const onDown = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const scroller = sideScroller(event.target as Element);
    if (!scroller) return;
    drag = {
      scroller,
      x: event.clientX,
      left: scroller.scrollLeft,
      moved: false,
      scale:
        scroller.getBoundingClientRect().width / (scroller.offsetWidth || 1) ||
        1,
    };
  };
  const onMove = (event: PointerEvent) => {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 4) {
      drag.moved = true;
      root.classList.add("is-swiping");
    }
    if (drag.moved) drag.scroller.scrollLeft = drag.left - dx / drag.scale;
  };
  const onUp = () => {
    const moved = drag?.moved;
    drag = null;
    root.classList.remove("is-swiping");
    if (!moved) return;
    const swallow = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    root.addEventListener("click", swallow, { capture: true, once: true });
    window.setTimeout(
      () => root.removeEventListener("click", swallow, { capture: true }),
      0,
    );
  };
  // Links and images would start the browser's own drag-and-drop and swallow the swipe.
  const onDragStart = (event: DragEvent) => event.preventDefault();
  root.addEventListener("pointerdown", onDown);
  root.addEventListener("dragstart", onDragStart);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  return () => {
    root.removeEventListener("pointerdown", onDown);
    root.removeEventListener("dragstart", onDragStart);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };
}

const PREVIEW_FONT = `-apple-system, BlinkMacSystemFont, "San Francisco", "Segoe UI", Roboto, "Helvetica Neue", sans-serif`;

/**
 * Live phone preview. Uses the storefront renderer inside a shadow root, so
 * the preview is pixel-identical to the storefront and isolated from admin CSS.
 */
export function MenuPreview({
  design,
  context,
  width = 375,
  height = 760,
  scale = 1,
  screenId,
  selectedId,
  onSelect,
  onScreenChange,
  interactive = false,
  highlightLabel,
  focusSelector,
  focusLabel,
  alsoSelectedIds,
  picking = false,
  onPick,
  matchSelector,
  guide,
  guideLine = null,
}: MenuPreviewProps) {
  // A stable key, so a new array with the same ids doesn't re-run effects.
  const alsoKey = (alsoSelectedIds ?? []).join(",");
  const hostRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const botRef = useRef<HTMLDivElement>(null);
  // The helper shows where this preview offers it and the merchant hasn't
  // hidden it.
  const guidePrefs = useGuidePrefs();
  const showGuide = Boolean(guide) && guidePrefs.shown;
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<MenuController | null>(null);
  /** The selection last scrolled into view (null: nothing yet). */
  const revealedRef = useRef<string | null>(null);
  const startHidden = useRef(Boolean(highlightLabel));
  /** The focused part last scrolled to (scroll only when it changes). */
  const focusedRef = useRef<string | null | undefined>(null);
  const callbacks = useRef({
    onSelect,
    onScreenChange,
    routes: context.routes,
    context,
  });
  callbacks.current = {
    onSelect,
    onScreenChange,
    routes: context.routes,
    context,
  };

  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  // Picking parts (CSS editor): hover outlines, a click picks instead of
  // tapping. Listeners sit on the mount in the capture phase, so the menu's
  // own behavior never sees the click.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !picking) return;
    mount.classList.add("chm-pick");
    let hovered: Element | null = null;
    const onOver = (event: Event) => {
      const target = event.target as Element;
      if (target === hovered) return;
      hovered?.classList.remove("chm-pick-hover");
      hovered = target === mount ? null : target;
      hovered?.classList.add("chm-pick-hover");
    };
    const onLeave = () => {
      hovered?.classList.remove("chm-pick-hover");
      hovered = null;
    };
    const onClick = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      const target = event.target as Element;
      if (target !== mount) pickRef.current?.(target);
    };
    mount.addEventListener("pointerover", onOver);
    mount.addEventListener("pointerleave", onLeave);
    mount.addEventListener("click", onClick, true);
    return () => {
      onLeave();
      mount.classList.remove("chm-pick");
      mount.removeEventListener("pointerover", onOver);
      mount.removeEventListener("pointerleave", onLeave);
      mount.removeEventListener("click", onClick, true);
    };
  }, [picking]);

  // Everything the chosen selector matches, outlined (again after redraws).
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    mount
      .querySelectorAll(".chm-pick-match")
      .forEach((element) => element.classList.remove("chm-pick-match"));
    if (!matchSelector) return;
    try {
      mount
        .querySelectorAll(matchSelector)
        .forEach((element) => element.classList.add("chm-pick-match"));
    } catch {
      // A selector that's still being typed: nothing to outline.
    }
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host || mountRef.current) return;
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = MENU_CSS + TRY_CSS + HIGHLIGHT_CSS + PICK_CSS;
    // The menu's own custom CSS, filled by the effect after this one.
    const custom = document.createElement("style");
    custom.dataset.chmCustom = "";
    const mount = document.createElement("div");
    mount.style.height = "100%";
    if (interactive) mount.className = "chm-try";
    shadow.replaceChildren(style, custom, mount);
    mountRef.current = mount;
    // Design dialogs show the phone once the highlighted part is centered
    // (no frame of the menu's top before it jumps).
    if (startHidden.current) mount.style.visibility = "hidden";
    const onScreen = (id: string) => callbacks.current.onScreenChange?.(id);
    controllerRef.current = attachBehavior(
      mount,
      interactive
        ? {
            sandbox: true,
            onScreenChange: onScreen,
            // Live search answers from the products the editor knows.
            searchSource: async (query, limit) =>
              previewSearch(callbacks.current.context, query, limit),
          }
        : {
            editor: true,
            onSelect: (id) => callbacks.current.onSelect?.(id),
            onScreenChange: onScreen,
          },
    );
    const stopDragScroll = interactive ? enableDragScroll(mount) : undefined;
    const stopLinkNotes = interactive
      ? enableLinkNotes(mount, callbacks.current.routes)
      : undefined;
    return () => {
      stopDragScroll?.();
      stopLinkNotes?.();
      controllerRef.current?.destroy();
      controllerRef.current = null;
      mountRef.current = null;
      // A new phone (React may mount twice in development) is centered and
      // shown again from scratch.
      revealedRef.current = null;
      focusedRef.current = null;
    };
  }, [interactive]);

  // Custom CSS updates in place (no re-render of the menu). Declared after
  // the mount effect, so it also fills a freshly rebuilt style element.
  const customCss = design.customCss;
  useEffect(() => {
    const style = hostRef.current?.shadowRoot?.querySelector<HTMLStyleElement>(
      "style[data-chm-custom]",
    );
    if (style) style.textContent = cleanCustomCss(customCss);
  });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const previousBody = mount.querySelector(".chm-body");
    const scroll = previousBody?.scrollTop ?? 0;
    // Keep open tabs/accordions across re-renders.
    const openTabs = [
      ...mount.querySelectorAll<HTMLElement>(
        '[data-chm-tab][aria-selected="true"]',
      ),
    ].map((tab) => tab.dataset.chmTab);
    const openAccordions = [
      ...mount.querySelectorAll<HTMLElement>(".chm-acc.is-open[data-chm-node]"),
    ].map((item) => item.dataset.chmNode);

    // In place, not innerHTML: unchanged images and elements stay as they
    // are, so dragging a slider doesn't make the phone flicker.
    morphChildren(
      mount,
      renderMenu(design, { ...context, editor: true }, { screenId }),
    );

    // Not with .click(): in edit mode a click selects the section in the editor.
    openTabs.forEach((id) => {
      const tab = mount.querySelector<HTMLElement>(
        `[data-chm-tab="${CSS.escape(id ?? "")}"]`,
      );
      if (tab) selectTab(tab);
    });
    openAccordions.forEach((id) => {
      const item = mount.querySelector(`.chm-acc[data-chm-node="${id}"]`);
      item?.classList.add("is-open");
      item
        ?.querySelector("[data-chm-accordion]")
        ?.setAttribute("aria-expanded", "true");
    });
    // Updated in place, the scroll area keeps its position by itself. Only a
    // replaced one (e.g. another screen) gets it back. Setting it when it's
    // unchanged would cancel a smooth scroll that is running (dragging a
    // slider re-renders many times a second).
    const body = mount.querySelector(".chm-body");
    if (body && body !== previousBody) body.scrollTop = scroll;
    // Redraws keep the menu open without taking keyboard focus away from the
    // settings being typed into.
    if (interactive) controllerRef.current?.open({ focus: false });
  }, [design, context, screenId, interactive]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    mount
      .querySelectorAll(".is-selected")
      .forEach((element) => element.classList.remove("is-selected"));
    if (!selectedId || interactive) {
      mount.style.visibility = "";
      return;
    }
    const selected = mount.querySelector(
      `[data-chm-node="${CSS.escape(selectedId)}"]`,
    );
    selected?.classList.add("is-selected");
    // Items designed together with it are outlined as well.
    for (const id of alsoKey ? alsoKey.split(",") : [])
      mount
        .querySelector(`[data-chm-node="${CSS.escape(id)}"]`)
        ?.classList.add("is-selected");
    // Bring it into view inside the phone only: scrollIntoView would also
    // scroll the admin page around the preview.
    const body = mount.querySelector<HTMLElement>(".chm-body");
    if (!(selected instanceof HTMLElement) || !body) {
      // Nothing to center (e.g. it's in a tab that isn't shown): show as is.
      mount.style.visibility = "";
      return;
    }
    // Only when the selection changes: re-centering after every edit would
    // keep sliding the menu while the merchant works.
    if (revealedRef.current === selectedId) {
      // Already centered: never leave the phone hidden.
      mount.style.visibility = "";
      return;
    }
    const reveal = () => {
      const item = selected.getBoundingClientRect();
      const view = body.getBoundingClientRect();
      const scale = view.height / (body.clientHeight || view.height) || 1;
      // The first reveal (dialog opening) jumps; later ones glide.
      const behavior: ScrollBehavior = revealedRef.current ? "smooth" : "auto";
      revealedRef.current = selectedId;
      mount.style.visibility = "";
      if (highlightLabel) {
        // Design dialogs: center the part being designed.
        const offset =
          item.top + item.height / 2 - (view.top + view.height / 2);
        if (Math.abs(offset) > 4)
          body.scrollBy({ top: offset / scale, behavior });
      } else if (item.top < view.top || item.bottom > view.bottom) {
        const offset =
          item.top < view.top
            ? item.top - view.top - 12
            : item.bottom - view.bottom + 12;
        body.scrollBy({ top: offset / scale, behavior });
      }
    };
    // A preview built inside a closed dialog has no size yet: reveal once
    // it's shown.
    if (body.getBoundingClientRect().height > 0) {
      reveal();
      return;
    }
    const observer = new ResizeObserver(() => {
      if (body.getBoundingClientRect().height === 0) return;
      observer.disconnect();
      reveal();
    });
    observer.observe(body);
    return () => observer.disconnect();
  }, [selectedId, design, screenId, interactive, highlightLabel, alsoKey]);

  // Outline the part the hovered settings card changes (title, background…).
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    mount
      .querySelectorAll(".is-focus")
      .forEach((element) => element.classList.remove("is-focus"));
    if (!focusSelector || !selectedId || interactive) return;
    const selected = mount.querySelector<HTMLElement>(
      `[data-chm-node="${CSS.escape(selectedId)}"]`,
    );
    if (!selected) return;
    // The part in the selected item, and in every item designed with it.
    const items = [
      selected,
      ...(alsoKey ? alsoKey.split(",") : []).flatMap((id) => {
        const item = mount.querySelector<HTMLElement>(
          `[data-chm-node="${CSS.escape(id)}"]`,
        );
        return item ? [item] : [];
      }),
    ];
    const parts = items.flatMap((item) =>
      focusSelector === ":scope"
        ? [item]
        : [...item.querySelectorAll<HTMLElement>(focusSelector)],
    );
    parts.forEach((part) => part.classList.add("is-focus"));
    if (focusedRef.current === focusSelector) return;
    focusedRef.current = focusSelector;
    // Bring the part into view inside the phone if it's out of sight.
    const body = mount.querySelector<HTMLElement>(".chm-body");
    const shown = parts.find((part) => part.getBoundingClientRect().width > 0);
    if (!body || !shown) return;
    const item = shown.getBoundingClientRect();
    const view = body.getBoundingClientRect();
    if (item.top >= view.top && item.bottom <= view.bottom) return;
    const scale = view.height / (body.clientHeight || view.height) || 1;
    const offset = item.top + item.height / 2 - (view.top + view.height / 2);
    body.scrollBy({ top: offset / scale, behavior: "smooth" });
  }, [focusSelector, selectedId, design, screenId, interactive, alsoKey]);

  // The name tag sits on the selected part's top-left corner and follows it
  // when the phone scrolls (it lives in the same scroll container).
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    mount.querySelectorAll(".chm-design-tag").forEach((tag) => tag.remove());
    if (!highlightLabel || !selectedId || interactive) return;
    const selected = mount.querySelector<HTMLElement>(
      `[data-chm-node="${CSS.escape(selectedId)}"]`,
    );
    if (!selected) return;
    // On the part being worked on (the first one that's shown), else the item.
    const { focused, anchor } = designAnchor(mount, selectedId)!;
    // The scroll area is the tag's positioning box (set by .chm-has-tag, so
    // it survives re-renders, which replace the menu's markup).
    mount.classList.add("chm-has-tag");
    const container = selected.closest<HTMLElement>(".chm-body") ?? mount;
    const place = () => {
      const box = container.getBoundingClientRect();
      // Not measurable yet (dialog still closed): stay hidden.
      if (box.width === 0) return;
      const item = anchor.getBoundingClientRect();
      // The phone is scaled: convert screen pixels back to menu pixels.
      const scale = box.width / (container.offsetWidth || box.width) || 1;
      tag.style.left = `${(item.left - box.left) / scale + container.scrollLeft}px`;
      tag.style.top = `${(item.top - box.top) / scale + container.scrollTop - 4}px`;
      tag.style.visibility = "visible";
    };
    const tag = document.createElement("div");
    tag.className = focused
      ? "chm-design-tag chm-design-tag--focus"
      : "chm-design-tag";
    tag.style.visibility = "hidden";
    tag.textContent = focused && focusLabel ? focusLabel : highlightLabel;
    container.appendChild(tag);
    place();
    // Measured again once the preview has a size (dialogs build it hidden).
    const observer = new ResizeObserver(place);
    observer.observe(container);
    return () => {
      observer.disconnect();
      tag.remove();
      mount.classList.remove("chm-has-tag");
    };
  }, [
    highlightLabel,
    selectedId,
    design,
    screenId,
    interactive,
    focusSelector,
    focusLabel,
  ]);

  // The helper follows the part being worked on: the selected item (and
  // its focused part). With nothing to point at, it dances beside the phone.
  useEffect(() => {
    const bot = botRef.current;
    const frame = frameRef.current;
    const mount = mountRef.current;
    if (!showGuide || !bot || !frame || !mount) return;
    const anchor =
      selectedId && !interactive
        ? (designAnchor(mount, selectedId)?.anchor ?? null)
        : null;
    const view = anchor?.closest<HTMLElement>(".chm-body") ?? mount;
    return followTarget(bot, frame, view, anchor);
  }, [showGuide, selectedId, focusSelector, design, screenId, interactive]);

  // Design dialogs: when a setting changes and the part it changes has been
  // scrolled out of sight in the phone, bring it back (down/up, and sideways
  // inside a swipe row). Scrolling the phone by hand alone never triggers it.
  const lastDesignRef = useRef(design);
  useEffect(() => {
    const changed = lastDesignRef.current !== design;
    lastDesignRef.current = design;
    const mount = mountRef.current;
    if (!changed || !mount || !highlightLabel || !selectedId || interactive)
      return;
    const selected = mount.querySelector<HTMLElement>(
      `[data-chm-node="${CSS.escape(selectedId)}"]`,
    );
    if (!selected) return;
    const target =
      [...selected.querySelectorAll<HTMLElement>(".is-focus")].find(
        (part) => part.getBoundingClientRect().width > 0,
      ) ?? selected;
    const body = mount.querySelector<HTMLElement>(".chm-body");
    if (!body) return;
    const item = target.getBoundingClientRect();
    const view = body.getBoundingClientRect();
    const scale = view.height / (body.clientHeight || view.height) || 1;
    if (item.bottom < view.top + 8 || item.top > view.bottom - 8) {
      const offset = item.top + item.height / 2 - (view.top + view.height / 2);
      body.scrollBy({ top: offset / scale, behavior: "smooth" });
    }
    // A swipe row (chips, cards): bring the item back sideways too.
    const row = target.closest<HTMLElement>(".chm-c--scroll, .chm-stories");
    if (row) {
      const box = row.getBoundingClientRect();
      if (item.left < box.left || item.right > box.right) {
        const offset = item.left + item.width / 2 - (box.left + box.width / 2);
        row.scrollBy({ left: offset / scale, behavior: "smooth" });
      }
    }
  }, [design, highlightLabel, selectedId, interactive]);

  const phone = (
    <div
      ref={frameRef}
      className="chm-phone-frame"
      style={{
        position: "relative",
        width: width * scale,
        height: height * scale,
        // The bezel (padding) is inside the size, so it's even on all sides.
        boxSizing: "border-box",
        flex: "none",
        borderRadius: 36 * scale,
        padding: 10 * scale,
        background: "#1a1a1a",
        boxShadow: "0 12px 40px rgba(0,0,0,.18)",
      }}
    >
      <div
        style={{
          width: width - 20,
          height: height - 20,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          borderRadius: 28,
          overflow: "hidden",
          background: "#fff",
          fontFamily: PREVIEW_FONT,
          color: "#1a1a1a",
        }}
      >
        <div ref={hostRef} style={{ height: "100%" }} />
      </div>
      {showGuide && <GuideBot ref={botRef} line={guideLine} />}
    </div>
  );
  // The helper gets its own lane left of the phone, so nothing around the
  // preview (a card's edge) can cut it or its speech bubble off.
  // The lane is kept even while the helper is hidden (or before the choice
  // is read): the phone never shifts sideways when it comes and goes.
  return guide === undefined ? (
    phone
  ) : (
    <div className="chm-guide-lane">{phone}</div>
  );
}
