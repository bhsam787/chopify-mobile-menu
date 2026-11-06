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
    const host = document.createElement("div");
    host.id = "chopi-menu";
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    // The merchant's own CSS last, so it wins; cleaned again here in case.
    style.textContent = MENU_CSS + cleanCustomCss(design.customCss);
    const root = document.createElement("div");
    root.innerHTML = renderMenu(design, context);
    shadow.append(style, root);
    return attachBehavior(root, { onClose });
  },
};

declare global {
  interface Window {
    __chopiMenuApp?: MenuApp;
  }
}

window.__chopiMenuApp = app;
