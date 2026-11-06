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
