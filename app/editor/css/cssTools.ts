/**
 * Checks and formatting for the merchant's custom CSS. No dependencies: the
 * browser itself (CSS.supports) decides which properties and values exist.
 */
import { CUSTOM_CSS_MAX } from "@chopi/menu-core";

export interface CssProblem {
  from: number;
  to: number;
  severity: "error" | "warning";
  message: string;
}

/** Comments and strings blanked out (same length), so offsets stay true. */
function mask(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?(\*\/|$)/g, (match) => " ".repeat(match.length))
    .replace(/"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g, (match) =>
      match.length > 2
        ? match[0] + " ".repeat(match.length - 2) + match[match.length - 1]
        : match,
    );
}

const supports = (property: string, value: string) =>
  typeof CSS !== "undefined" && typeof CSS.supports === "function"
    ? CSS.supports(property, value)
    : true;

/** Errors (broken blocks, blocked rules) and warnings (unknown properties or values). */
export function lintCss(text: string): CssProblem[] {
  const problems: CssProblem[] = [];
  const masked = mask(text);
  const open: number[] = [];
  let start = 0;

  const declaration = (from: number, to: number) => {
    const raw = masked.slice(from, to);
    const body = raw.trim();
    if (!body || !open.length) return;
    const offset = from + raw.indexOf(body);
    const colon = body.indexOf(":");
    if (colon < 0) {
      problems.push({
        from: offset,
        to: offset + body.length,
        severity: "warning",
        message: "Expected “property: value”.",
      });
      return;
    }
    const property = body.slice(0, colon).trim().toLowerCase();
    const value = body
      .slice(colon + 1)
      .replace(/!important\s*$/i, "")
      .trim();
    if (property.startsWith("--") || !/^[a-z-]+$/.test(property)) return;
    if (!supports(property, "inherit")) {
      problems.push({
        from: offset,
        to: offset + colon,
        severity: "warning",
        message: `Unknown property “${property}”.`,
      });
      return;
    }
    // Values with variables or functions are only known when the menu renders.
    if (
      value &&
      !/var\(|env\(|calc\(|attr\(/.test(value) &&
      !supports(property, value)
    )
      problems.push({
        from: offset + colon + 1,
        to: offset + body.length,
        severity: "warning",
        message: `“${value}” isn't a valid value for ${property}.`,
      });
  };

  for (let index = 0; index < masked.length; index++) {
    const char = masked[index];
    if (char === "{") {
      open.push(index);
      start = index + 1;
    } else if (char === "}") {
      if (!open.length)
        problems.push({
          from: index,
          to: index + 1,
          severity: "error",
          message: "This “}” closes nothing.",
        });
      else {
        declaration(start, index);
        open.pop();
      }
      start = index + 1;
    } else if (char === ";") {
      declaration(start, index);
      start = index + 1;
    }
  }
  for (const position of open)
    problems.push({
      from: position,
      to: position + 1,
      severity: "error",
      message: "This “{” is never closed.",
    });

  for (const match of masked.matchAll(
    /@import\b|expression\s*\(|javascript\s*:/gi,
  ))
    problems.push({
      from: match.index ?? 0,
      to: (match.index ?? 0) + match[0].length,
      severity: "error",
      message: `${match[0].replace(/\s*[(:]$/, "")} isn't allowed: it would load or run something from elsewhere.`,
    });

  if (text.length > CUSTOM_CSS_MAX)
    problems.push({
      from: CUSTOM_CSS_MAX,
      to: text.length,
      severity: "error",
      message: `Custom CSS can be at most ${CUSTOM_CSS_MAX.toLocaleString()} characters; the rest is left out.`,
    });
  return problems;
}

/**
 * Neatly formatted CSS: one declaration per line, two-space indents, a
 * blank line between rules. Comments and strings are kept as written.
 */
export function formatCss(text: string): string {
  let out = "";
  let depth = 0;
  let line = "";
  const indent = () => "  ".repeat(depth);
  const flush = () => {
    const trimmed = line.replace(/\s+/g, " ").trim();
    if (trimmed) out += `${indent()}${trimmed}\n`;
    line = "";
  };

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    // Comments and strings are copied as they are.
    if (char === "/" && text[index + 1] === "*") {
      const end = text.indexOf("*/", index + 2);
      const stop = end < 0 ? text.length : end + 2;
      const comment = text.slice(index, stop);
      // A comment on its own line stays as written (line breaks included).
      if (!line.trim()) out += `${indent()}${comment}\n`;
      else line += comment;
      index = stop - 1;
      continue;
    }
    if (char === '"' || char === "'") {
      let stop = index + 1;
      while (stop < text.length && text[stop] !== char) {
        if (text[stop] === "\\") stop++;
        stop++;
      }
      line += text.slice(index, stop + 1);
      index = stop;
      continue;
    }
    if (char === "{") {
      line = `${line.replace(/\s+/g, " ").trim()} {`;
      flush();
      depth++;
    } else if (char === "}") {
      // A last declaration without ";" still gets "property: value" spacing.
      if (line.includes(":"))
        line = line.replace(/^\s*([\w-]+)\s*:\s*/, "$1: ");
      flush();
      depth = Math.max(0, depth - 1);
      out += `${indent()}}\n`;
      if (depth === 0) out += "\n";
    } else if (char === ";") {
      // "color:red" → "color: red".
      line = line.replace(/^\s*([\w-]+)\s*:\s*/, "$1: ") + ";";
      flush();
    } else {
      line += char === "\n" ? " " : char;
    }
  }
  flush();
  return out.replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
