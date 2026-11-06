/** Longest custom CSS a menu may have (it travels in the menu metafield). */
export const CUSTOM_CSS_MAX = 20_000;

/** Parts of CSS that could load or run something from elsewhere. */
const BLOCKED: [RegExp, string][] = [
  [/@import\b/gi, "/* @import is not allowed */"],
  [/expression\s*\(/gi, "/* expression() is not allowed */("],
  [/javascript\s*:/gi, "blocked:"],
  [/-moz-binding\s*:/gi, "/* -moz-binding is not allowed */:"],
  [/behavior\s*:/gi, "/* behavior is not allowed */:"],
];

/**
 * The merchant's CSS made safe to put in the menu: nothing that loads other
 * files or runs code, and no "<" (it can't close the style element), within
 * CUSTOM_CSS_MAX. The menu's shadow root keeps it away from the theme.
 */
export function cleanCustomCss(css: string | undefined): string {
  if (!css) return "";
  let clean = css.slice(0, CUSTOM_CSS_MAX).replace(/</g, "\\3C ");
  for (const [pattern, replacement] of BLOCKED)
    clean = clean.replace(pattern, replacement);
  return withPriority(clean);
}

/**
 * Every declaration marked !important, so the merchant's CSS wins over the
 * settings made in the editor (applied as inline styles). Not inside
 * @keyframes, where browsers ignore !important declarations.
 */
function withPriority(css: string): string {
  // Comments and strings blanked out (same length) to find the real syntax.
  const masked = css
    .replace(/\/\*[\s\S]*?(\*\/|$)/g, (match) => " ".repeat(match.length))
    // Strings become "x"s, not spaces: they're part of a value.
    .replace(/"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g, (match) =>
      "x".repeat(match.length),
    );
  const inserts: number[] = [];
  const blocks: { keyframes: boolean }[] = [];
  let start = 0;
  const declaration = (end: number) => {
    const body = masked.slice(start, end);
    if (
      blocks.length &&
      !blocks.some((block) => block.keyframes) &&
      body.includes(":") &&
      !/!important\s*$/i.test(body.trim())
    ) {
      // Right after the value (before trailing spaces).
      inserts.push(start + body.trimEnd().length);
    }
  };
  for (let index = 0; index < masked.length; index++) {
    const char = masked[index];
    if (char === "{") {
      const prelude = masked.slice(start, index);
      blocks.push({ keyframes: /@(-\w+-)?keyframes\b/i.test(prelude) });
      start = index + 1;
    } else if (char === ";" || char === "}") {
      if (masked.slice(start, index).trim()) declaration(index);
      if (char === "}") blocks.pop();
      start = index + 1;
    }
  }
  let out = css;
  for (const position of inserts.reverse())
    out = `${out.slice(0, position)} !important${out.slice(position)}`;
  return out;
}
