import type {
  HeadersFunction,
  LinksFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import { ensureShop } from "../models/shop.server";
import motionStyles from "../components/motion.css?url";
import guideBotStyles from "../components/guide-bot.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: motionStyles },
  // Chopi, the helper robot: on the home page and beside every preview.
  { rel: "stylesheet", href: guideBotStyles },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  await ensureShop(session.shop, admin);

  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider apiKey={apiKey}>
      <s-app-nav>
        {/* The app's name in the sidebar opens the home page: rel="home"
            sets it and keeps it out of the menu as a separate "Home" item
            (App Bridge reads the attribute; Polaris' types don't list it). */}
        <s-link href="/app" {...({ rel: "home" } as object)}>
          Home
        </s-link>
        <s-link href="/app/templates">Templates</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
