import { CANVAS_WIDTH } from "@chopi/menu-core";
import { countdownText, remaining } from "./countdown";
import { attachLiveSearch, type SearchSource } from "./liveSearch";

export interface MenuController {
  /** `focus: false` keeps keyboard focus where it is (the editor's preview). */
  open(options?: { focus?: boolean }): void;
  close(): void;
  showScreen(id: string): void;
  back(): void;
  destroy(): void;
}

/**
 * Shows the panel of tab button `tab`. Exported so the editor can restore the
 * open tab after a re-render without a click (a click there selects things).
 */
export function selectTab(tab: HTMLElement): void {
  const tabs = tab.closest(".chm-tabs");
  tabs
    ?.querySelectorAll<HTMLElement>(":scope > .chm-tabs__list > [data-chm-tab]")
    .forEach((button) => {
      button.setAttribute("aria-selected", String(button === tab));
    });
  tabs
    ?.querySelectorAll<HTMLElement>(":scope > [data-chm-tabpanel]")
    .forEach((tabPanel) => {
      tabPanel.hidden = tabPanel.dataset.chmTabpanel !== tab.dataset.chmTab;
    });
}

export interface BehaviorOptions {
  /** Editor preview: clicks select nodes instead of navigating. */
  editor?: boolean;
  /**
   * Admin "try it" preview: works like the storefront (tabs, accordions,
   * sub-menus) but never leaves the page: links and forms don't navigate and
   * the menu doesn't close.
   */
  sandbox?: boolean;
  onSelect?: (nodeId: string) => void;
  onScreenChange?: (screenId: string) => void;
  onClose?: () => void;
  /** Live search results from somewhere other than the store (the editor). */
  searchSource?: SearchSource;
}

/**
 * Wires the rendered menu: screens, tabs, accordions, countdowns, closing,
 * focus trapping. Uses event delegation on `root`, so re-rendering the
 * markup inside it needs no re-binding.
 */
export function attachBehavior(
  root: HTMLElement,
  options: BehaviorOptions = {},
): MenuController {
  const history: string[] = [];
  let timer: number | undefined;

  const menu = () => root.querySelector<HTMLElement>(".chm-root");
  const panel = () => root.querySelector<HTMLElement>(".chm-panel");

  const tickCountdowns = () => {
    const now = new Date();
    root
      .querySelectorAll<HTMLElement>("[data-chm-countdown]")
      .forEach((element) => {
        const left = remaining(element.dataset.chmCountdown ?? "", now);
        const output = element.querySelector("[data-chm-timer]");
        if (output) output.textContent = countdownText(left);
        element.classList.toggle("is-ended", left <= 0);
      });
  };

  const startTimer = () => {
    tickCountdowns();
    if (timer === undefined) timer = window.setInterval(tickCountdowns, 1000);
  };

  const stopTimer = () => {
    if (timer !== undefined) window.clearInterval(timer);
    timer = undefined;
  };

  const setScreen = (id: string, direction: "forward" | "back") => {
    root.querySelectorAll<HTMLElement>(".chm-screen").forEach((screen) => {
      const active = screen.dataset.chmScreenId === id;
      screen.classList.toggle("is-active", active);
      screen.classList.toggle("is-back", active && direction === "back");
      if (active) screen.removeAttribute("aria-hidden");
      else screen.setAttribute("aria-hidden", "true");
    });
    const body = root.querySelector(".chm-body");
    if (body) body.scrollTop = 0;
    options.onScreenChange?.(id);
  };

  const currentScreen = () =>
    root.querySelector<HTMLElement>(".chm-screen.is-active")?.dataset
      .chmScreenId ?? "main";

  const controller: MenuController = {
    open({ focus = true } = {}) {
      menu()?.classList.add("is-open");
      startTimer();
      // Focus for keyboard users, without scrolling the page behind the drawer.
      if (focus)
        window.setTimeout(() => panel()?.focus({ preventScroll: true }), 50);
    },
    close() {
      menu()?.classList.remove("is-open");
      stopTimer();
      options.onClose?.();
    },
    showScreen(id) {
      history.push(currentScreen());
      setScreen(id, "forward");
    },
    back() {
      setScreen(
        history.pop() ??
          root.querySelector<HTMLElement>(".chm-screen")?.dataset.chmScreenId ??
          "main",
        "back",
      );
    },
    destroy() {
      stopTimer();
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      root.removeEventListener("click", onClick);
      root.removeEventListener("change", onChange);
      root.removeEventListener("keydown", onKeydown);
      root.removeEventListener("submit", onSubmit);
      liveSearch?.destroy();
    },
  };

  function onClick(event: Event) {
    const target = event.target as HTMLElement;

    // Collapsible canvas frame: tapping its top part opens/closes it.
    const fold = target.closest<HTMLElement>("[data-chm-collapse]");
    if (fold && !target.closest("a[href], [data-chm-screen]")) {
      const rect = fold.getBoundingClientRect();
      const scale = rect.width / (parseFloat(fold.style.width) || rect.width);
      const y = ((event as MouseEvent).clientY - rect.top) / (scale || 1);
      if (y <= Number(fold.dataset.chmCollapse)) toggleCollapsible(fold);
    }

    const tab = target.closest<HTMLElement>("[data-chm-tab]");
    if (tab) selectTab(tab);

    const accordion = target.closest<HTMLElement>("[data-chm-accordion]");
    if (accordion) {
      const item = accordion.closest(".chm-acc");
      const open = !item?.classList.contains("is-open");
      item?.classList.toggle("is-open", open);
      accordion.setAttribute("aria-expanded", String(open));
    }

    if (options.editor) {
      const node = target.closest<HTMLElement>("[data-chm-node]");
      if (target.closest("a, select, form")) event.preventDefault();
      if (target.closest("[data-chm-back]")) controller.back();
      if (node?.dataset.chmNode) options.onSelect?.(node.dataset.chmNode);
      return;
    }

    // The header has a search field too: its search button goes to the
    // field (unfolding it first when it's tucked away).
    const searchButton = target.closest<HTMLElement>("[data-chm-search-field]");
    if (searchButton && !options.editor) {
      const form = root.querySelector<HTMLElement>(".chm-header__search");
      const field = form?.querySelector<HTMLInputElement>("input[name='q']");
      if (form && field) {
        event.preventDefault();
        form.classList.remove("is-folded");
        field.focus();
        return;
      }
    }

    const copyButton = target.closest<HTMLElement>("[data-chm-copy]");
    if (copyButton) {
      void copyCode(copyButton);
      return;
    }

    // A canvas frame's link is a tap area behind its layers, so a tap on
    // its picture or text is passed on to it.
    const hit = frameHitArea(target);
    if (hit) {
      hit.click();
      return;
    }

    if (options.sandbox && target.closest("a[href], form"))
      event.preventDefault();
    if (target.closest("[data-chm-close]")) {
      if (!options.sandbox) controller.close();
      return;
    }
    if (target.closest("[data-chm-back]")) {
      controller.back();
      return;
    }
    const screenLink = target.closest<HTMLElement>("[data-chm-screen]");
    if (screenLink?.dataset.chmScreen)
      controller.showScreen(screenLink.dataset.chmScreen);
  }

  /** An empty search would open an empty results page: stay and keep typing. */
  function onSubmit(event: Event) {
    const form = event.target as HTMLFormElement;
    const query = form.querySelector<HTMLInputElement>("input[name='q']");
    if (query && !query.value.trim()) {
      event.preventDefault();
      query.focus();
    }
  }

  function onChange(event: Event) {
    if (options.editor || options.sandbox) return;
    const select = (event.target as HTMLElement).closest<HTMLSelectElement>(
      "[data-chm-autosubmit]",
    );
    select?.form?.submit();
  }

  function onKeydown(event: KeyboardEvent) {
    // Escape leaves search first (in the admin preview too).
    if (event.key === "Escape" && liveSearch?.exit()) return;
    if (options.editor || options.sandbox) return;
    if (event.key === "Escape") {
      controller.close();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [
      ...(panel()?.querySelectorAll<HTMLElement>("a[href], button, select") ??
        []),
    ].filter((element) => element.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = (root.getRootNode() as Document | ShadowRoot).activeElement;
    if (event.shiftKey && (active === first || active === panel())) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  // Free canvases are designed at CANVAS_WIDTH; scale each stage to its real
  // width. Each canvas is observed itself, so it rescales when its screen opens.
  const scale = (canvas: HTMLElement) => {
    const stage = canvas.firstElementChild as HTMLElement | null;
    const width = canvas.clientWidth;
    if (stage && width)
      stage.style.transform =
        width === CANVAS_WIDTH ? "" : `scale(${width / CANVAS_WIDTH})`;
  };
  const resizeObserver =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver((entries) =>
          entries.forEach((entry) => scale(entry.target as HTMLElement)),
        );
  const watchCanvases = () => {
    resizeObserver?.disconnect();
    root
      .querySelectorAll<HTMLElement>("[data-chm-canvas]")
      .forEach((canvas) => {
        resizeObserver?.observe(canvas);
        scale(canvas);
      });
  };
  // The editor re-renders the markup inside root; watch the new canvases.
  const mutationObserver =
    typeof MutationObserver === "undefined"
      ? null
      : new MutationObserver(watchCanvases);
  mutationObserver?.observe(root, { childList: true });
  watchCanvases();

  const liveSearch = options.editor
    ? null
    : attachLiveSearch(root, {
        source: options.searchSource,
        sandbox: options.sandbox,
        onScreen: (id) => controller.showScreen(id),
      });
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  root.addEventListener("keydown", onKeydown);
  root.addEventListener("submit", onSubmit);
  if (options.editor) startTimer();

  return controller;
}

/**
 * Opens or closes a collapsible canvas frame and moves the layers below it
 * (same rule as `canvasLayout` in menu-core); a canvas grows or shrinks.
 */
function toggleCollapsible(item: HTMLElement) {
  item.toggleAttribute("data-chm-open", !item.hasAttribute("data-chm-open"));
  const container = item.parentElement;
  if (!container) return;
  const items = [...container.children].filter(
    (element): element is HTMLElement =>
      element instanceof HTMLElement && element.dataset.chmY !== undefined,
  );
  const changes = items
    .filter((element) => element.dataset.chmCollapse !== undefined)
    .map((element) => {
      const closed = Number(element.dataset.chmCollapse);
      const full = Number(element.dataset.chmFull);
      const size = (open: boolean) => (open ? full : closed);
      const height = size(element.hasAttribute("data-chm-open"));
      element.style.height = `${height}px`;
      return {
        below: Number(element.dataset.chmY) + closed,
        delta: height - size(element.hasAttribute("data-chm-default-open")),
      };
    });
  for (const element of items) {
    const y = Number(element.dataset.chmY);
    const shift = changes.reduce(
      (sum, change) => (y >= change.below - 0.5 ? sum + change.delta : sum),
      0,
    );
    element.style.top = `${y + shift}px`;
  }
  const base = Number(container.dataset.chmH);
  if (container.classList.contains("chm-canvas__stage") && base) {
    const height =
      base + changes.reduce((sum, change) => sum + change.delta, 0);
    container.style.height = `${height}px`;
    // The canvas keeps its aspect ratio; the scaling observer picks up the new size.
    const canvas = container.parentElement;
    if (canvas) canvas.style.aspectRatio = `${CANVAS_WIDTH}/${height}`;
  }
}

/**
 * The link of the canvas frame a tap landed in, when the tap hit one of its
 * layers (a picture, a text) rather than a link of its own.
 */
function frameHitArea(target: HTMLElement): HTMLElement | null {
  if (target.closest("a[href], button, select, input, label")) return null;
  for (
    let frame = target.closest<HTMLElement>(".chm-shape--frame");
    frame;
    frame =
      frame.parentElement?.closest<HTMLElement>(".chm-shape--frame") ?? null
  ) {
    const hit = frame.querySelector<HTMLElement>(":scope > .chm-shape__hit");
    if (hit) return hit;
  }
  return null;
}

/** Copies a discount code and says so on the button for a moment. */
async function copyCode(button: HTMLElement) {
  const code = button.dataset.chmCopy;
  if (!code || button.classList.contains("is-copied")) return;
  try {
    await navigator.clipboard.writeText(code);
  } catch {
    // Older browsers, or a page that blocks the clipboard API.
    const field = document.createElement("textarea");
    field.value = code;
    field.setAttribute("readonly", "");
    field.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.appendChild(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }
  const label = button.textContent;
  button.textContent = button.dataset.chmCopied || label;
  button.classList.add("is-copied");
  window.setTimeout(() => {
    button.textContent = label;
    button.classList.remove("is-copied");
  }, 2000);
}
