import type { ContactKind } from "./types";

/**
 * Where a contact button with a typed number or address goes, or null when
 * the value can't be used (the button is then left out on the store).
 */
export function contactHref(
  kind: Exclude<ContactKind, "link">,
  value: string | undefined,
): string | null {
  const typed = (value ?? "").trim();
  switch (kind) {
    case "phone": {
      const number = typed.replace(/[^\d+]/g, "");
      return number.replace(/\D/g, "").length >= 3 ? `tel:${number}` : null;
    }
    case "email":
      return /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(typed)
        ? `mailto:${typed}`
        : null;
    case "whatsapp": {
      // wa.me wants the full international number in digits, no "+" or 00.
      const digits = typed.replace(/\D/g, "").replace(/^0+/, "");
      return digits.length >= 6 ? `https://wa.me/${digits}` : null;
    }
  }
}
