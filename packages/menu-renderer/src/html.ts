import type { BoxStyle, Spacing, TextStyle } from "@chopify/menu-core";
import { richToHtml } from "@chopify/menu-core";

export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Rich text markup (**bold**, _italic_, [links](url)) as escaped HTML.
 * Pass `links: false` inside tappable elements (no nested links).
 */
export function rich(value: string, links = true): string {
  return richToHtml(value, { links });
}

/** Only allow plain CSS color/gradient values into inline styles. */
function safeCss(value: string): string {
  return /^[#a-zA-Z0-9(),.%\s-]+$/.test(value) ? value : "";
}

function spacing(value: Spacing): string {
  return Array.isArray(value)
    ? value.map((part) => `${part}px`).join(" ")
    : `${value}px`;
}

export function boxCss(box: BoxStyle | undefined): string {
  if (!box) return "";
  const parts: string[] = [];
  if (box.background) parts.push(`background-color:${safeCss(box.background)}`);
  if (box.gradient) parts.push(`background-image:${safeCss(box.gradient)}`);
  if (box.padding !== undefined) parts.push(`padding:${spacing(box.padding)}`);
  if (box.radius !== undefined) parts.push(`border-radius:${box.radius}px`);
  if (box.borderWidth) {
    parts.push(
      `border:${box.borderWidth}px solid ${safeCss(box.borderColor || "currentColor")}`,
    );
  }
  return parts.join(";");
}

const FONTS: Record<NonNullable<TextStyle["font"]>, string> = {
  sans: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
  serif: 'Georgia,"Times New Roman",serif',
  mono: "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace",
  rounded: 'ui-rounded,"SF Pro Rounded","Nunito","Varela Round",sans-serif',
};

export function textCss(style: TextStyle | undefined): string {
  if (!style) return "";
  const parts: string[] = [];
  if (style.size) parts.push(`font-size:${style.size}px`);
  if (style.weight) parts.push(`font-weight:${style.weight}`);
  if (style.color) parts.push(`color:${safeCss(style.color)}`);
  if (style.transform && style.transform !== "none")
    parts.push(`text-transform:${style.transform}`);
  if (style.letterSpacing)
    parts.push(`letter-spacing:${style.letterSpacing}px`);
  if (style.italic) parts.push("font-style:italic");
  if (style.underline) parts.push("text-decoration:underline");
  if (style.font && FONTS[style.font])
    parts.push(`font-family:${FONTS[style.font]}`);
  if (style.align && style.align !== "left")
    parts.push(`text-align:${style.align === "right" ? "right" : "center"}`);
  if (style.lineHeight) parts.push(`line-height:${Number(style.lineHeight)}`);
  return parts.join(";");
}

type CssPart = string | false | 0 | null | undefined;

export function css(...parts: CssPart[]): string {
  return parts.filter(Boolean).join(";");
}

export function styleAttr(...parts: CssPart[]): string {
  const value = css(...parts);
  return value ? ` style="${esc(value)}"` : "";
}

export function color(value: string | undefined): string {
  return value ? safeCss(value) : "";
}

/** Adds a width to Shopify CDN image URLs so we never download originals. */
export function sized(url: string, width: number): string {
  if (!url) return url;
  if (!/cdn\.shopify\.com|\/cdn\/shop\//.test(url)) return url;
  try {
    const parsed = new URL(url, "https://cdn.shopify.com");
    parsed.searchParams.set("width", String(width));
    return url.startsWith("//") || url.startsWith("http")
      ? parsed.toString()
      : parsed.pathname + parsed.search;
  } catch {
    return url;
  }
}

export function img(
  url: string | undefined,
  width: number,
  alt: string,
  className: string,
): string {
  if (!url)
    return `<span class="${className} chm-img--empty" aria-hidden="true"></span>`;
  return `<img class="${className}" src="${esc(sized(url, width))}" srcset="${esc(sized(url, width))} 1x, ${esc(
    sized(url, width * 2),
  )} 2x" alt="${esc(alt)}" loading="lazy" decoding="async">`;
}
