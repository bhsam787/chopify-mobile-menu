/** Longest custom CSS a menu may have (it travels in the menu metafield). */
export const CUSTOM_CSS_MAX = 20_000;

/**
 * At-rules that load other files, matched outside strings only (a ";" or an
 * "@\\" inside quotes is just text). The whole statement goes, so a leftover
 * "url(…);" can't eat the next rule.
 */
const BLOCKED_AT_RULES: [RegExp, string][] = [
  [/@import\b[^;{}]*;?/gi, "/* blocked */"],
  // An escaped at-rule name ("@\\69mport") is read as @import by browsers.
  [/@\\[^;{}]*;?/g, "/* blocked */"],
];

/**
 * Things that could run code, blocked everywhere (strings included). The
 * replacements don't match again, so cleaning twice (compile, then the
 * storefront) gives the same CSS.
 */
const BLOCKED: [RegExp, string][] = [
  [/expression\s*\(/gi, "/* blocked */("],
  [/javascript\s*:/gi, "blocked:"],
  [/-moz-binding\s*:/gi, "/* blocked */:"],
  // Not scroll-behavior / overscroll-behavior.
  [/(^|[;{\s])behavior\s*:/gi, "$1/* blocked */:"],
];

const STRING = /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g;
/** Placeholder for a string while at-rules are matched (NULs are stripped first). */
// eslint-disable-next-line no-control-regex -- NUL marks a placeholder.
const PLACEHOLDER = /\u0000(\d+)\u0000/g;

/**
 * Safety bound only: the editor and the save action limit what merchants
 * type to CUSTOM_CSS_MAX. Cleaned CSS is longer (every declaration gets
 * !important), so cutting at CUSTOM_CSS_MAX here would drop the end of the
 * merchant's CSS when it's cleaned a second time on the storefront.
 */
const CLEAN_LIMIT = CUSTOM_CSS_MAX * 4;

/**
 * The merchant's CSS made safe to put in the menu: nothing that loads other
 * files or runs code, and no "<" (it can't close the style element). The
 * menu's shadow root keeps it away from the theme.
 */
export function cleanCustomCss(css: string | undefined): string {
  if (!css) return "";
  const strings: string[] = [];
  let clean = css
    .slice(0, CLEAN_LIMIT)
    // eslint-disable-next-line no-control-regex -- NUL is our placeholder marker.
    .replace(/\u0000/g, "")
    .replace(/</g, "\\3C ")
    .replace(STRING, (match) => `\u0000${strings.push(match) - 1}\u0000`);
  for (const [pattern, replacement] of BLOCKED_AT_RULES)
    clean = clean.replace(pattern, replacement);
  clean = clean.replace(PLACEHOLDER, (_, index: string) => strings[+index]);
  for (const [pattern, replacement] of BLOCKED)
    clean = clean.replace(pattern, replacement);
  return withPriority(clean);
}

/**
 * Every declaration marked !important, so the merchant's CSS wins over the
 * settings made in the editor (applied as inline styles). Not inside
 * @keyframes, @font-face, @property or @counter-style, where browsers
 * ignore declarations marked !important.
 */
function withPriority(css: string): string {
  // Comments and strings blanked out (same length) to find the real syntax.
  const masked = css
    .replace(/\/\*[\s\S]*?(\*\/|$)/g, (match) => " ".repeat(match.length))
    // Strings become "x"s, not spaces: they're part of a value.
    .replace(/"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g, (match) =>
      "x".repeat(match.length),
    )
    // Unquoted url(...) too: a data URI's ";" doesn't end the declaration.
    .replace(/url\([^)]*\)/gi, (match) => "x".repeat(match.length));
  const inserts: number[] = [];
  const blocks: { plain: boolean }[] = [];
  let start = 0;
  const declaration = (end: number) => {
    const body = masked.slice(start, end);
    if (
      blocks.length &&
      !blocks.some((block) => block.plain) &&
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
      blocks.push({
        plain: /@((-\w+-)?keyframes|font-face|property|counter-style)\b/i.test(
          prelude,
        ),
      });
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
