import type { Design } from "@chopify/menu-core";
import { compile } from "@chopify/menu-core";
import { DEFAULT_ROUTES } from "@chopify/menu-renderer";
import type { PreviewContext } from "../components/MenuPreview";
import { gql, type Admin } from "./admin-graphql.server";
import { resolvePreviewResources } from "./resources.server";

const SHOP_LOCALES = `#graphql
  query PreviewShop {
    shop { name }
    shopLocales(published: true) { locale name primary }
  }
`;

const SHOP_NAME = `#graphql
  query PreviewShopName {
    shop { name }
  }
`;

export interface ShopLocale {
  locale: string;
  name: string;
  primary: boolean;
}

/** Shop name and published languages. Languages need `read_locales`; without it we fall back to none. */
export async function fetchShopBasics(
  admin: Admin,
): Promise<{ shopName: string; locales: ShopLocale[] }> {
  try {
    const data = await gql<{
      shop: { name: string };
      shopLocales: ShopLocale[];
    }>(admin, SHOP_LOCALES);
    return { shopName: data.shop.name, locales: data.shopLocales };
  } catch {
    const data = await gql<{ shop: { name: string } }>(admin, SHOP_NAME);
    return { shopName: data.shop.name, locales: [] };
  }
}

/** Everything the editor preview needs to render designs like the storefront would. */
export async function buildPreviewContext(
  admin: Admin,
  designs: Design[],
): Promise<{ context: PreviewContext; locales: ShopLocale[] }> {
  const needs = new Map(
    designs
      .flatMap((design) => compile(design).resources)
      .map((need) => [need.key, need]),
  );
  const [{ shopName, locales }, resources] = await Promise.all([
    fetchShopBasics(admin),
    resolvePreviewResources(admin, [...needs.values()]),
  ]);
  const primary = locales.find((locale) => locale.primary)?.locale ?? "en";
  return {
    locales,
    context: {
      locale: primary,
      shopName,
      resources,
      routes: DEFAULT_ROUTES,
      customerLoggedIn: false,
      localization: {
        action: "/localization",
        returnTo: "/",
        language: primary,
        country: "",
        countries: [],
        languages: locales.map((locale) => ({
          code: locale.locale,
          name: locale.name,
        })),
      },
    },
  };
}
