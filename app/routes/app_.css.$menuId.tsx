import { useCallback, useEffect, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LinksFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData, useRouteError } from "react-router";
import type { Prisma } from "@prisma/client";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import {
  compile,
  CUSTOM_CSS_MAX,
  MenuTooLargeError,
  parseDesign,
  type Design,
} from "@chopi/menu-core";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { buildPreviewContext } from "../services/preview-context.server";
import CustomCssPanel from "../editor/css/CustomCssPanel";
import { DEFAULT_DEVICE, DEVICES, type Device } from "../components/devices";
import editorStyles from "../editor/editor.css?url";
import studioStyles from "../editor/css/cssEditor.css?url";

/**
 * Full-screen custom CSS editor for one menu. Opened by the menu editor in
 * an App Bridge max modal (`src` route): a code editor needs its own page,
 * as HTML-content modals can't host one.
 */
export const links: LinksFunction = () => [
  { rel: "stylesheet", href: editorStyles },
  { rel: "stylesheet", href: studioStyles },
];

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const menu = await prisma.menu.findFirst({
    where: { id: params.menuId, shop: { shop: session.shop } },
  });
  if (!menu) throw new Response("Menu not found", { status: 404 });
  const design = menu.draft as unknown as Design;
  const { context } = await buildPreviewContext(admin, [design]);
  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    menu: { id: menu.id, name: menu.name },
    design,
    context,
  };
};

/** Saves the CSS into the menu's latest draft (other changes stay as they are). */
export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const menu = await prisma.menu.findFirst({
    where: { id: params.menuId, shop: { shop: session.shop } },
  });
  if (!menu) throw new Response("Menu not found", { status: 404 });
  const css = (await request.formData()).get("css");
  if (typeof css !== "string" || css.length > CUSTOM_CSS_MAX)
    return {
      ok: false,
      error: `Custom CSS can be at most ${CUSTOM_CSS_MAX.toLocaleString()} characters.`,
    };
  try {
    const draft = parseDesign(menu.draft);
    const design: Design = {
      ...draft,
      customCss: css.trim() ? css : undefined,
    };
    compile(design);
    await prisma.menu.update({
      where: { id: menu.id },
      data: { draft: design as unknown as Prisma.InputJsonValue },
    });
    return { ok: true };
  } catch (error) {
    if (!(error instanceof MenuTooLargeError))
      console.error(`Custom CSS save failed for ${session.shop}`, error);
    return {
      ok: false,
      error:
        error instanceof MenuTooLargeError
          ? error.message
          : "Couldn't save the CSS. Please try again.",
    };
  }
};

/** Tells the menu editor (which opened this page in a modal) to close it and reload. */
function notifyDone() {
  window.parent?.postMessage(
    { type: "chopi:css-done" },
    window.location.origin,
  );
}

/** The page itself (exported for tests that render it without the app shell). */
export function CssEditorPage() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [design, setDesign] = useState<Design>(data.design);
  const [saved, setSaved] = useState(data.design.customCss ?? "");
  const [device, setDevice] = useState<Device>(DEFAULT_DEVICE);
  const [closing, setClosing] = useState(false);
  const css = design.customCss ?? "";
  const dirty = css !== saved;
  const busy = fetcher.state !== "idle";

  const save = useCallback(
    () => fetcher.submit({ css }, { method: "post" }),
    [fetcher, css],
  );

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (fetcher.data.ok) {
      setSaved(css);
      if (closing) notifyDone();
      else shopify.toast.show("CSS saved");
    } else {
      setClosing(false);
      shopify.toast.show(fetcher.data.error ?? "Couldn't save", {
        isError: true,
      });
    }
    // Runs once per finished save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, fetcher.data]);

  // ⌘S / Ctrl+S saves, like in a code editor.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (dirty && !busy) save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, busy, save]);

  const done = () => {
    if (!dirty) return notifyDone();
    setClosing(true);
    save();
  };

  return (
    <div className="chm-csspage">
      <header className="chm-csspage__bar">
        <div className="chm-csspage__title">
          <span className="chm-csspage__badge" aria-hidden="true">
            {"{ }"}
          </span>
          <span className="chm-csspage__names">
            <strong>Custom CSS</strong>
            <span>{data.menu.name} · styles this menu only</span>
          </span>
          <span className={`chm-csspage__state${dirty ? " is-dirty" : ""}`}>
            {dirty ? "Unsaved" : "Saved"}
          </span>
        </div>
        <div className="chm-csspage__actions">
          <label className="chm-csspage__select">
            <span className="chm-visually-hidden">Phone</span>
            <select
              value={device.id}
              onChange={(event) =>
                setDevice(
                  DEVICES.find(
                    (candidate) => candidate.id === event.target.value,
                  ) ?? DEFAULT_DEVICE,
                )
              }
            >
              {DEVICES.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.label} ({candidate.width} × {candidate.height})
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="chm-csspage__btn"
            disabled={!dirty || busy}
            onClick={save}
          >
            {busy && !closing ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="chm-csspage__btn chm-csspage__btn--primary"
            disabled={busy && closing}
            onClick={done}
          >
            {busy && closing ? "Saving…" : "Done"}
          </button>
        </div>
      </header>
      <main className="chm-csspage__body">
        <CustomCssPanel
          design={design}
          context={data.context}
          device={device}
          onChange={(customCss) =>
            setDesign((current) => ({ ...current, customCss }))
          }
        />
      </main>
    </div>
  );
}

export default function CssRoute() {
  const data = useLoaderData<typeof loader>();
  return (
    <AppProvider apiKey={data.apiKey}>
      <CssEditorPage />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) =>
  boundary.headers(headersArgs);
