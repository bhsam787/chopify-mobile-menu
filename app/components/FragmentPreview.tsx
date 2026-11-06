import { useEffect, useRef } from "react";
import type { Design, Node } from "@chopify/menu-core";
import {
  MENU_CSS,
  renderFragment,
  type RenderContext,
} from "@chopify/menu-renderer";

const PREVIEW_FONT = `-apple-system, BlinkMacSystemFont, "San Francisco", "Segoe UI", Roboto, "Helvetica Neue", sans-serif`;

/** Renders one node with the storefront renderer (no drawer around it), isolated in a shadow root. */
export function FragmentPreview({
  design,
  node,
  context,
  bare = false,
}: {
  design: Design;
  node: Node;
  context: Omit<RenderContext, "editor">;
  /** No padding or background around the node. */
  bare?: boolean;
}) {
  const host = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const shadow = element.shadowRoot ?? element.attachShadow({ mode: "open" });
    // Previews are pictures: no clicks into links, tabs or accordions.
    const bareCss = bare
      ? ".chm-fragment{padding:0;background:transparent;display:block}"
      : "";
    // The menu's editor styles turn clicks back on (.chm-editor); a picture
    // must never be clicked into (its links would navigate the admin).
    shadow.innerHTML = `<style>${MENU_CSS} :host{pointer-events:none} .chm-root,.chm-root *{pointer-events:none!important}${bareCss}</style>${renderFragment(design, [node], { ...context, editor: true })}`;
  }, [design, node, context, bare]);

  // Never follow a link of the menu inside the editor.
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

  // A span (display: block) so it can sit inside a <button>.
  return (
    <span
      ref={host}
      aria-hidden="true"
      style={{
        display: "block",
        height: "100%",
        fontFamily: PREVIEW_FONT,
        color: "#1a1a1a",
      }}
    />
  );
}
