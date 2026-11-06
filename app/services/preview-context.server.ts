import type { Design } from "@chopi/menu-core";
import { compile } from "@chopi/menu-core";
import { DEFAULT_ROUTES } from "@chopi/menu-renderer";
import type { PreviewContext } from "../components/MenuPreview";
import { gql, type Admin } from "./admin-graphql.server";
import { resolvePreviewResources } from "./resources.server";

const SHOP_LOCALES = `#graphql
  query PreviewShop {
    shop { name currencyCode }
    shopLocales(published: true) { locale name primary }
  }
`;

const SHOP_NAME = `#graphql
  query PreviewShopName {
    shop { name currencyCode }
  }
`;

export interface ShopLocale {
  locale: string;
  name: string;
  primary: boolean;
}

/**
 * Shop name, currency and published languages. Languages need
 * `read_locales`; without it we fall back to none.
 */
export async function fetchShopBasics(admin: Admin): Promise<{
  shopName: string;
  currency: string;
  locales: ShopLocale[];
}> {
  try {
    const data = await gql<{
      shop: { name: string; currencyCode: string };
      shopLocales: ShopLocale[];
    }>(admin, SHOP_LOCALES);
    return {
      shopName: data.shop.name,
      currency: data.shop.currencyCode,
      locales: data.shopLocales,
    };
  } catch {
    const data = await gql<{ shop: { name: string; currencyCode: string } }>(
      admin,
      SHOP_NAME,
    );
    return {
      shopName: data.shop.name,
      currency: data.shop.currencyCode,
      locales: [],
    };
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
  const [{ shopName, currency, locales }, resources] = await Promise.all([
    fetchShopBasics(admin),
    resolvePreviewResources(admin, [...needs.values()]),
  ]);
  const primary = locales.find((locale) => locale.primary)?.locale ?? "en";
  return {
    locales,
    context: {
      locale: primary,
      shopName,
      currency,
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
