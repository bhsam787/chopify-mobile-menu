/** Menu names: shared by the server (validation) and the forms that ask for one. */
export const MENU_NAME_MAX = 60;

/** Trims and shortens a menu name; empty names aren't allowed (null). */
export function cleanMenuName(raw: FormDataEntryValue | null): string | null {
  const name = String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MENU_NAME_MAX);
  return name || null;
}

/** `base`, or "base 2", "base 3"… when a menu already has that name. */
export function freeMenuName(base: string, taken: Iterable<string>): string {
  const names = new Set(taken);
  if (!names.has(base)) return base;
  let number = 2;
  while (names.has(`${base} ${number}`)) number++;
  return `${base} ${number}`;
}
