import prisma from "../db.server";
import { freeMenuName } from "./menu-name";

/**
 * `base`, or "base 2", "base 3"… when the shop already has a menu with that
 * name, so new menus are easy to tell apart.
 */
export async function uniqueMenuName(
  shopDomain: string,
  base: string,
): Promise<string> {
  const existing = await prisma.menu.findMany({
    where: { shop: { shop: shopDomain }, name: { startsWith: base } },
    select: { name: true },
  });
  return freeMenuName(
    base,
    existing.map((menu) => menu.name),
  );
}
