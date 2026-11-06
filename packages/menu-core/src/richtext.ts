/**
 * Rich text is stored as a tiny markup, never as HTML, so merchant text can't
 * inject markup into storefronts:
 *
 *   **bold**   _italic_   [label](https://… | /path | mailto:… | tel:…)   line breaks
 *
 * The editor converts its contenteditable DOM to this markup; the renderer
 * turns it back into escaped HTML.
 */

export type RichToken =
  | { type: "text"; text: string }
  | { type: "break" }
  | { type: "bold"; children: RichToken[] }
  | { type: "italic"; children: RichToken[] }
  | { type: "link"; href: string; children: RichToken[] };

const SAFE_URL = /^(https?:\/\/|\/(?!\/)|mailto:|tel:|#)/i;

export function isSafeUrl(url: string): boolean {
  return SAFE_URL.test(url.trim());
}

/** Parses markup into tokens. Unbalanced markers stay as plain text. */
export function parseRich(markup: string): RichToken[] {
  const tokens: RichToken[] = [];
  let text = "";
  const flush = () => {
    if (text) tokens.push({ type: "text", text });
    text = "";
  };

  let i = 0;
  while (i < markup.length) {
    const rest = markup.slice(i);
    if (rest[0] === "\n") {
      flush();
      tokens.push({ type: "break" });
      i += 1;
      continue;
    }
    if (rest.startsWith("**")) {
      const end = markup.indexOf("**", i + 2);
      if (end > i + 2) {
        flush();
        tokens.push({
          type: "bold",
          children: parseRich(markup.slice(i + 2, end)),
        });
        i = end + 2;
        continue;
      }
    }
    if (rest[0] === "_") {
      const end = markup.indexOf("_", i + 1);
      // Only treat _x_ as italic at word boundaries, so snake_case stays text.
      const before = i === 0 ? " " : markup[i - 1];
      const after = markup[end + 1] ?? " ";
      if (end > i + 1 && !/\w/.test(before) && !/\w/.test(after)) {
        flush();
        tokens.push({
          type: "italic",
          children: parseRich(markup.slice(i + 1, end)),
        });
        i = end + 1;
        continue;
      }
    }
    if (rest[0] === "[") {
      const match = /^\[([^\]\n]+)\]\(([^)\s]+)\)/.exec(rest);
      if (match && isSafeUrl(match[2])) {
        flush();
        tokens.push({
          type: "link",
          href: match[2],
          children: parseRich(match[1]),
        });
        i += match[0].length;
        continue;
      }
    }
    text += rest[0];
    i += 1;
  }
  flush();
  return tokens;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escaped HTML for markup. With `links: false` (text inside a tappable card or
 * banner, where nested links are invalid) links render as underlined text.
 */
export function richToHtml(
  markup: string,
  options: { links?: boolean } = {},
): string {
  const links = options.links ?? true;
  const render = (tokens: RichToken[]): string =>
    tokens
      .map((token) => {
        switch (token.type) {
          case "text":
            return escapeHtml(token.text);
          case "break":
            return "<br>";
          case "bold":
            return `<strong>${render(token.children)}</strong>`;
          case "italic":
            return `<em>${render(token.children)}</em>`;
          case "link":
            return links
              ? `<a href="${escapeHtml(token.href)}"${/^https?:/i.test(token.href) ? ' target="_blank" rel="noopener"' : ""}>${render(token.children)}</a>`
              : `<u>${render(token.children)}</u>`;
        }
      })
      .join("");
  return render(parseRich(markup));
}

/** Plain text without markup (layer names, summaries). */
export function richToPlain(markup: string): string {
  const plain = (tokens: RichToken[]): string =>
    tokens
      .map((token) =>
        token.type === "text"
          ? token.text
          : token.type === "break"
            ? " "
            : plain(token.children),
      )
      .join("");
  return plain(parseRich(markup));
}
