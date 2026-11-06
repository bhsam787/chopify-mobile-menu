/**
 * Storefront loader, bundled as extensions/chopify-menu/assets/chopify-menu.js.
 * Kept tiny: reads the JSON the app embed prints, takes over the theme's burger
 * button below the breakpoint and loads the full menu (chopify-menu-app.js)
 * when the page is idle or on the first tap.
 */
import type { Design } from "@chopify/menu-core";
import { triggerSelector } from "./adapters";
import type { MenuController } from "./behavior";
import type { RenderContext } from "./context";
import type { MenuApp } from "./menu-app";

interface EmbedData {
  menu: Design;
  /** The shopper's language only (one metafield per language). */
  translations?: Record<string, string> | null;
  appUrl: string;
  liveAllowed: boolean;
  designMode: boolean;
  triggerOverride?: string;
  context: Omit<RenderContext, "editor">;
}

declare global {
  interface Window {
    Shopify?: { theme?: { role?: string; schema_name?: string } };
    ChopifyMenu?: { open: () => void; close: () => void };
    __chopifyMenuApp?: MenuApp;
  }
}

function readData(): EmbedData | null {
  const element = document.getElementById("chopify-menu-data");
  if (!element?.textContent) return null;
  try {
    return JSON.parse(element.textContent) as EmbedData;
  } catch {
    return null;
  }
}

let appPromise: Promise<MenuApp> | null = null;

function loadApp(url: string): Promise<MenuApp> {
  appPromise ??= new Promise((resolve, reject) => {
    if (window.__chopifyMenuApp) return resolve(window.__chopifyMenuApp);
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.onload = () =>
      window.__chopifyMenuApp
        ? resolve(window.__chopifyMenuApp)
        : reject(new Error("Menu failed to load"));
    script.onerror = () => {
      appPromise = null;
      reject(new Error("Menu failed to load"));
    };
    document.head.appendChild(script);
  });
  return appPromise;
}

function start() {
  const data = readData();
  if (!data?.menu?.screens?.length) return;
  if (data.translations)
    data.menu = {
      ...data.menu,
      translations: {
        ...data.menu.translations,
        [data.context.locale]: data.translations,
      },
    };

  const theme = window.Shopify?.theme;
  // Free plan: the menu only runs on unpublished (preview) themes and in the theme editor.
  if (!data.liveAllowed && !data.designMode && theme?.role === "main") return;

  const selector = triggerSelector(theme?.schema_name, data.triggerOverride);
  const mobile = window.matchMedia(
    `(max-width: ${data.menu.behavior.breakpoint - 0.02}px)`,
  );

  let controller: MenuController | null = null;
  let trigger: HTMLElement | null = null;
  // Set when the menu can't load: clicks then reach the theme's own menu.
  let fallingBack = false;

  const onClose = () => {
    document.documentElement.style.removeProperty("overflow");
    trigger?.setAttribute("aria-expanded", "false");
    trigger?.focus({ preventScroll: true });
  };

  const open = async () => {
    try {
      const app = await loadApp(data.appUrl);
      controller ??= app.mount(data.menu, data.context, onClose);
    } catch {
      // Fall back to the theme's own menu rather than leaving the shopper stuck.
      fallingBack = true;
      trigger?.click();
      return;
    }
    document.documentElement.style.overflow = "hidden";
    trigger?.setAttribute("aria-expanded", "true");
    const menu = controller;
    // Two frames, so the opening transition runs after first render.
    requestAnimationFrame(() => requestAnimationFrame(() => menu.open()));
  };

  window.addEventListener(
    "click",
    (event) => {
      if (fallingBack || !mobile.matches) return;
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest<HTMLElement>(selector);
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      trigger = button;
      open().catch(() => undefined);
    },
    true,
  );

  mobile.addEventListener("change", () => {
    if (!mobile.matches) controller?.close();
  });

  // Warm up the full menu once the page is idle, only on mobile widths.
  if (mobile.matches) {
    const idle =
      window.requestIdleCallback ??
      ((callback: () => void) => window.setTimeout(callback, 1500));
    idle(() => loadApp(data.appUrl).catch(() => undefined));
  }

  window.ChopifyMenu = {
    open: () => void open(),
    close: () => controller?.close(),
  };
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
