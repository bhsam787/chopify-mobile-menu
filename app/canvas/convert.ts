import type {
  CanvasNode,
  ContainerNode,
  Design,
  Frame,
  Node,
  ShapeNode,
  AccordionNode,
  TabsNode,
} from "@chopi/menu-core";
import { CANVAS_WIDTH, newId, NODE_LABELS, TAB_GAP } from "@chopi/menu-core";
import { MENU_CSS, renderMenu, type RenderContext } from "@chopi/menu-renderer";
import { layersFromElement } from "./detach";
import { PREVIEW_FONT } from "./layers";

/** Widgets that, repeated in a grid or stack, make a smart list. */
const LIST_ITEMS = new Set<Node["type"]>([
  "card",
  "row",
  "chip",
  "button",
  "banner",
]);

/**
 * Converts a screen built from sections (stacks, grids, cards, banners…) into a
 * free canvas that looks the same: the screen is rendered off-screen at the
 * canvas width, every element is measured, and each becomes a canvas child at
 * its measured position. Boxes with a background or border become shapes
 * behind their content. Runs in the browser (it needs layout).
 */
export function convertScreenToCanvas(
  design: Design,
  screenId: string,
  context: Omit<RenderContext, "editor">,
): { design: Design; canvasId: string } {
  const screen = design.screens.find((candidate) => candidate.id === screenId);
  if (!screen) throw new Error("Screen not found");

  // Off-screen render at exactly the canvas width.
  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${CANVAS_WIDTH}px;height:4000px;opacity:0;pointer-events:none;font-family:${PREVIEW_FONT}`;
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });
  // No transitions: accordions are opened to be measured and must lay out at once.
  shadow.innerHTML = `<style>${MENU_CSS} .chm-panel{width:${CANVAS_WIDTH}px!important} .chm-body{overflow:visible!important} *{transition:none!important;animation:none!important}</style><div style="height:100%">${renderMenu(
    design,
    { ...context, editor: true },
    { screenId },
  )}</div>`;

  try {
    const section = shadow.querySelector<HTMLElement>(
      `.chm-screen[data-chm-screen-id="${CSS.escape(screenId)}"]`,
    );
    // Measure from the screen's content box (sub-menus have a back bar above it).
    const rootElement = section?.querySelector<HTMLElement>(
      `[data-chm-node="${CSS.escape(screen.root.id)}"]`,
    );
    if (!section || !rootElement) throw new Error("Screen didn't render");
    const origin = rootElement.getBoundingClientRect();
    const children: Node[] = [];

    const frameIn = (element: Element, within: DOMRect): Frame => {
      const rect = element.getBoundingClientRect();
      return {
        x: Math.round(rect.left - within.left),
        y: Math.round(rect.top - within.top),
        w: Math.max(8, Math.round(Math.min(rect.width, CANVAS_WIDTH))),
        h: Math.max(8, Math.round(rect.height)),
      };
    };
    const elementOf = (node: Node) =>
      section.querySelector<HTMLElement>(
        `[data-chm-node="${CSS.escape(node.id)}"]`,
      );

    /** Adds `node` (measured inside `within`) to `out` as canvas layers. */
    const visit = (node: Node, out: Node[], within: DOMRect) => {
      if (node.hidden) return;
      const element = elementOf(node);
      if (!element) return;

      if (node.type === "container" && node.layout === "scroll") {
        // Scroll rows become frames that scroll sideways, with each item a layer.
        const rect = element.getBoundingClientRect();
        const items: Node[] = [];
        node.children.forEach((child) => visit(child, items, rect));
        out.push({
          id: newId("sh"),
          type: "shape",
          name: node.name ?? "Scroll row",
          scroll: "x",
          // A smart list: items can be added, reordered and nested.
          list: { direction: "row", gap: node.gap ?? 8 },
          link: { type: "none" },
          frame: frameIn(element, within),
          children: items,
        });
        return;
      }

      // Grids and stacks dissolve into their children; their visible box becomes a shape.
      if (node.type === "container") {
        const box = node.box;
        if (box && (box.background || box.gradient || box.borderWidth)) {
          out.push({
            id: newId("sh"),
            type: "shape",
            name: node.name ?? "Background",
            fill: box.background,
            gradient: box.gradient,
            radius: box.radius,
            borderWidth: box.borderWidth,
            borderColor: box.borderColor,
            link: { type: "none" },
            frame: frameIn(element, within),
          });
        }
        // Repeated items (cards, rows, chips…) become a smart list.
        const items = node.children.filter((child) => !child.hidden);
        const repeated =
          items.length >= 2 &&
          LIST_ITEMS.has(items[0].type) &&
          items.every((child) => child.type === items[0].type);
        if (repeated) {
          const measured: Node[] = [];
          const rects = items
            .map((child) => elementOf(child)?.getBoundingClientRect())
            .filter((rect): rect is DOMRect => Boolean(rect));
          if (rects.length) {
            // The list hugs its items (the container's padding stays outside).
            const left = Math.min(...rects.map((rect) => rect.left));
            const top = Math.min(...rects.map((rect) => rect.top));
            const right = Math.max(...rects.map((rect) => rect.right));
            const bottom = Math.max(...rects.map((rect) => rect.bottom));
            const area = new DOMRect(left, top, right - left, bottom - top);
            items.forEach((child) => visit(child, measured, area));
            out.push({
              id: newId("sh"),
              type: "shape",
              name: node.name ?? `${NODE_LABELS[items[0].type]}s`,
              link: { type: "none" },
              list:
                node.layout === "grid"
                  ? {
                      direction: "grid",
                      gap: node.gap ?? 12,
                      columns: node.columns ?? 2,
                    }
                  : { direction: "column", gap: node.gap ?? 8 },
              frame: {
                x: Math.round(left - within.left),
                y: Math.round(top - within.top),
                w: Math.round(right - left),
                h: Math.round(bottom - top),
              },
              children: measured,
            });
            return;
          }
        }
        node.children.forEach((child) => visit(child, out, within));
        return;
      }

      if (
        node.type === "tabs" &&
        node.tabs.every((tab) => tab.child.type === "container")
      ) {
        out.push(convertTabs(node, element, within));
        return;
      }

      if (node.type === "accordion") {
        out.push(convertAccordion(node, element, within));
        return;
      }

      // Everything else (cards, banners, rows…) stays one widget layer.
      out.push({ ...node, frame: frameIn(element, within) });
    };

    /**
     * Tabs become free tabs: each panel is shown in turn, measured, and its
     * sections become layers of that tab's panel.
     */
    const convertTabs = (
      node: TabsNode,
      element: HTMLElement,
      within: DOMRect,
    ): Node => {
      const list = element.querySelector<HTMLElement>(
        ":scope > .chm-tabs__list",
      );
      const panels = [
        ...element.querySelectorAll<HTMLElement>(
          ":scope > [data-chm-tabpanel]",
        ),
      ];
      const barHeight = Math.round(list?.getBoundingClientRect().height ?? 36);
      let tallest = 0;
      const tabs = node.tabs.map((tab, index) => {
        panels.forEach(
          (panel, panelIndex) => (panel.hidden = panelIndex !== index),
        );
        const panelElement = panels[index];
        const panelRect = panelElement.getBoundingClientRect();
        tallest = Math.max(tallest, Math.ceil(panelRect.height));
        const layers: Node[] = [];
        visit(tab.child, layers, panelRect);
        const child: ShapeNode = {
          id: newId("sh"),
          type: "shape",
          name: tab.label,
          link: { type: "none" },
          children: layers,
        };
        return { ...tab, child };
      });
      panels.forEach((panel, panelIndex) => (panel.hidden = panelIndex !== 0));
      const frame = frameIn(element, within);
      return {
        ...node,
        barHeight,
        tabs,
        frame: { ...frame, h: barHeight + TAB_GAP + tallest },
      };
    };

    /**
     * Accordions become collapsible frames: the header becomes layers (with a
     * chevron that turns), the opened links become layers below it.
     */
    const convertAccordion = (
      node: AccordionNode,
      element: HTMLElement,
      within: DOMRect,
    ): Node => {
      const head = element.querySelector<HTMLElement>(
        ":scope > .chm-acc__head",
      );
      const closed = Math.round(head?.getBoundingClientRect().height ?? 56);
      const wasOpen = element.classList.contains("is-open");
      element.classList.add("is-open");
      const rect = element.getBoundingClientRect();
      const layers: Node[] = [];
      if (head) {
        const headRect = head.getBoundingClientRect();
        const chevron = head.querySelector(".chm-acc__chevron");
        for (const layer of layersFromElement(head)) {
          layers.push({
            ...layer,
            frame: layer.frame && {
              ...layer.frame,
              x: layer.frame.x + Math.round(headRect.left - rect.left),
              y: layer.frame.y + Math.round(headRect.top - rect.top),
            },
          });
        }
        if (chevron) {
          layers.push({
            id: newId("ic"),
            type: "shape",
            name: "Chevron",
            icon: "chevron",
            iconColor: getComputedStyle(chevron).color,
            link: { type: "none" },
            frame: frameIn(chevron, rect),
          });
        }
      }
      visit(node.child, layers, rect);
      const frame = frameIn(element, within);
      if (!wasOpen) element.classList.remove("is-open");
      return {
        id: newId("sh"),
        type: "shape",
        name: node.title,
        fill: node.box?.background,
        radius: node.box?.radius,
        link: { type: "none" },
        clip: true,
        collapsible: { height: closed, open: node.open || undefined },
        frame: { ...frame, h: Math.ceil(rect.height) },
        children: layers,
      };
    };

    screen.root.children.forEach((child) => visit(child, children, origin));
    const height = Math.max(120, Math.ceil(origin.height));
    // Containers may add outer padding: keep at least the content height.
    const contentBottom = children.reduce(
      (bottom, child) =>
        Math.max(bottom, (child.frame?.y ?? 0) + (child.frame?.h ?? 0)),
      0,
    );

    const canvas: CanvasNode = {
      id: newId("cv"),
      type: "canvas",
      name: "Canvas",
      // The main screen of a template-made menu can be reverted to that template.
      template:
        design.template && design.screens[0]?.id === screenId
          ? design.template
          : undefined,
      height: Math.max(height, contentBottom + 16),
      background: screen.root.box?.background ?? "",
      children,
    };
    const root: ContainerNode = {
      ...screen.root,
      gap: 0,
      box: { ...screen.root.box, padding: 0 },
      children: [canvas],
    };
    return {
      design: {
        ...design,
        screens: design.screens.map((candidate) =>
          candidate.id === screenId ? { ...candidate, root } : candidate,
        ),
      },
      canvasId: canvas.id,
    };
  } finally {
    host.remove();
  }
}

/** A screen that is already just one canvas has nothing to convert. */
export function isCanvasScreen(design: Design, screenId: string): boolean {
  const screen = design.screens.find((candidate) => candidate.id === screenId);
  return Boolean(
    screen &&
    screen.root.children.length === 1 &&
    screen.root.children[0].type === "canvas",
  );
}
