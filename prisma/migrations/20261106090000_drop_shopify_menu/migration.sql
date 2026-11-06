-- Menus no longer create a Shopify navigation menu: linked resources are
-- stored as reference metafields at publish time instead.
ALTER TABLE "Menu" DROP COLUMN IF EXISTS "shopifyMenuId",
  DROP COLUMN IF EXISTS "shopifyMenuHandle";
