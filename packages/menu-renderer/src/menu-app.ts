/**
 * Full menu (renderer, behavior, styles). Bundled as
 * extensions/chopi-menu/assets/chopi-menu-app.js and loaded by the
 * storefront loader when the page is idle, or on the first tap.
 */
import type { Design } from "@chopi/menu-core";
import { attachBehavior, type MenuController } from "./behavior";
import type { RenderContext } from "./context";
import { renderMenu } from "./render";
import { cleanCustomCss } from "@chopi/menu-core";
import { MENU_CSS } from "./styles";

export interface MenuApp {
  mount(
    design: Design,
    context: RenderContext,
    onClose: () => void,
  ): MenuController;
}

const app: MenuApp = {
  mount(design, context, onClose) {
    // Rendered first: if it throws, no empty host is left in the page.
    const markup = renderMenu(design, context);
    // A custom tag plus inline !important, so theme rules can't hide it:
    // a shadow host has no light-DOM children, and Dawn-based themes hide
    // every `div:empty`.
    const host = document.createElement("chopi-menu");
    host.id = "chopi-menu";
    host.style.setProperty("display", "block", "important");
    // Closed, the drawer is only moved off-screen: inert keeps its links out
    // of the tab order and away from screen readers.
    host.inert = true;
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    // The merchant's own CSS last, so it wins; cleaned again here in case.
    style.textContent = MENU_CSS + cleanCustomCss(design.customCss);
    const root = document.createElement("div");
    root.innerHTML = markup;
    shadow.append(style, root);
    document.body.appendChild(host);
    const controller = attachBehavior(root, {
      onClose: () => {
        host.inert = true;
        onClose();
      },
    });
    return {
      ...controller,
      open(options) {
        host.inert = false;
        controller.open(options);
      },
    };
  },
};

declare global {
  interface Window {
    __chopiMenuApp?: MenuApp;
  }
}

window.__chopiMenuApp = app;
