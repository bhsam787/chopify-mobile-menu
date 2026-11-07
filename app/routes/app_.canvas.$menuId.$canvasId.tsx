import type {
  ActionFunctionArgs,
  HeadersFunction,
  LinksFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData, useRouteError } from "react-router";
import type { Prisma } from "@prisma/client";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import type { Design } from "@chopi/menu-core";
import {
  compile,
  locate,
  MenuTooLargeError,
  parseDesign,
} from "@chopi/menu-core";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { buildPreviewContext } from "../services/preview-context.server";
import { CanvasEditor } from "../canvas/CanvasEditor";
import editorStyles from "../editor/editor.css?url";
import canvasStyles from "../canvas/canvas.css?url";
import guideBotStyles from "../components/guide-bot.css?url";

/**
 * Full-screen canvas editor. Opened by the menu editor inside an App Bridge
 * max modal (`src` route), so it lives outside the `/app` layout (no nav).
 */
export const links: LinksFunction = () => [
  { rel: "stylesheet", href: editorStyles },
  { rel: "stylesheet", href: canvasStyles },
  { rel: "stylesheet", href: guideBotStyles },
];

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const menu = await prisma.menu.findFirst({
    where: { id: params.menuId, shop: { shop: session.shop } },
  });
  if (!menu) throw new Response("Menu not found", { status: 404 });
  const design = menu.draft as unknown as Design;
  const { context, locales } = await buildPreviewContext(admin, [design]);
  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    menu: { id: menu.id, name: menu.name },
    canvasId: params.canvasId ?? "",
    design,
    context,
    locales,
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const menu = await prisma.menu.findFirst({
    where: { id: params.menuId, shop: { shop: session.shop } },
    select: { id: true },
  });
  if (!menu) throw new Response("Menu not found", { status: 404 });
  try {
    const design = parseDesign(
      JSON.parse(String((await request.formData()).get("draft"))),
    );
    if (locate(design, params.canvasId ?? "")?.node.type !== "canvas")
      throw new Error("Canvas missing");
    compile(design);
    await prisma.menu.update({
      where: { id: menu.id },
      data: {
        draft: design as unknown as Prisma.InputJsonValue,
        schemaVersion: design.schemaVersion,
      },
    });
    return { ok: true };
  } catch (error) {
    if (!(error instanceof MenuTooLargeError))
      console.error(`Canvas save failed for ${session.shop}`, error);
    return {
      ok: false,
      error:
        error instanceof MenuTooLargeError
          ? error.message
          : "Couldn't save the canvas. Please try again.",
    };
  }
};

export default function CanvasRoute() {
  const data = useLoaderData<typeof loader>();
  return (
    <AppProvider apiKey={data.apiKey}>
      <CanvasEditor
        menuName={data.menu.name}
        canvasId={data.canvasId}
        design={data.design}
        context={data.context}
        locales={data.locales}
      />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) =>
  boundary.headers(headersArgs);
