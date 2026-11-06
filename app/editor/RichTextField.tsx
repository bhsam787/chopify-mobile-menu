import { useEffect, useId, useRef, useState } from "react";
import { isSafeUrl, richToHtml } from "@chopify/menu-core";
import { TextField } from "./controls";

/**
 * Converts the editor's DOM back to rich text markup (see menu-core
 * richtext.ts). Only bold, italic, links and line breaks survive; everything
 * else becomes plain text. Browsers put each new line in a <div>/<p>.
 */
export function toMarkup(root: Node): string {
  const isBlock = (node: Node) =>
    node instanceof HTMLElement &&
    (node.tagName === "DIV" || node.tagName === "P");

  const children = (parent: Node): string => {
    let out = "";
    for (const child of parent.childNodes) {
      if (isBlock(child)) {
        // A block starts on its own line and ends one; "<div><br></div>" is an empty line.
        if (out && !out.endsWith("\n")) out += "\n";
        const inner = children(child);
        out += (inner === "\n" ? "" : inner) + "\n";
      } else {
        out += node(child);
      }
    }
    return out;
  };

  const wrap = (marker: string, text: string) =>
    text.trim() ? `${marker}${text}${marker}` : text;

  const node = (current: Node): string => {
    if (current.nodeType === Node.TEXT_NODE)
      return (current.textContent ?? "").replace(/\u00a0/g, " ");
    if (!(current instanceof HTMLElement)) return "";
    switch (current.tagName) {
      case "BR":
        return "\n";
      case "B":
      case "STRONG":
        return wrap("**", children(current));
      case "I":
      case "EM":
        return wrap("_", children(current));
      case "A": {
        const href = current.getAttribute("href") ?? "";
        const text = children(current);
        return isSafeUrl(href) && text.trim()
          ? `[${text.replace(/[[\]]/g, "")}](${href})`
          : text;
      }
      default:
        if (
          current.style.fontWeight === "bold" ||
          Number(current.style.fontWeight) >= 600
        )
          return wrap("**", children(current));
        if (current.style.fontStyle === "italic")
          return wrap("_", children(current));
        return children(current);
    }
  };

  return children(root).replace(/\n+$/, "");
}

interface RichTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  details?: string;
  /** Links aren't clickable inside tappable banners; hide the button there. */
  allowLinks?: boolean;
}

/**
 * Small rich text editor (bold, italic, links) styled like a Polaris field.
 * Stores markup, never HTML.
 */
export function RichTextField({
  label,
  value,
  onChange,
  placeholder,
  details,
  allowLinks = true,
}: RichTextFieldProps) {
  const id = useId();
  const editor = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const [linking, setLinking] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const emitted = useRef(value);

  // Load external changes (undo, language switch) unless they came from typing here.
  useEffect(() => {
    const element = editor.current;
    if (!element || value === emitted.current) return;
    emitted.current = value;
    element.innerHTML = richToHtml(value);
  }, [value]);

  useEffect(() => {
    if (editor.current) editor.current.innerHTML = richToHtml(value);
    // Initial content only; later changes go through the effect above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => {
    if (!editor.current) return;
    const markup = toMarkup(editor.current);
    emitted.current = markup;
    onChange(markup);
  };

  const run = (command: "bold" | "italic" | "removeFormat") => {
    editor.current?.focus();
    document.execCommand(command);
    if (command === "removeFormat") document.execCommand("unlink");
    emit();
  };

  const startLink = () => {
    const selection = window.getSelection();
    savedRange.current =
      selection &&
      selection.rangeCount &&
      editor.current?.contains(selection.anchorNode)
        ? selection.getRangeAt(0).cloneRange()
        : null;
    setUrl("");
    setError(null);
    setLinking(true);
  };

  const applyLink = () => {
    const href = url.trim();
    if (!isSafeUrl(href)) {
      setError(
        "Use a full web address (https://…), a store path (/collections/…), mailto: or tel:.",
      );
      return;
    }
    editor.current?.focus();
    const selection = window.getSelection();
    if (savedRange.current && selection) {
      selection.removeAllRanges();
      selection.addRange(savedRange.current);
    }
    if (!selection || selection.isCollapsed) {
      const link = document.createElement("a");
      link.href = href;
      link.textContent = href;
      savedRange.current?.insertNode(link) ?? editor.current?.appendChild(link);
    } else {
      document.execCommand("createLink", false, href);
    }
    setLinking(false);
    emit();
  };

  return (
    <s-stack gap="small-200">
      <label htmlFor={id} className="chm-rich__label">
        {label}
      </label>
      <div className="chm-rich">
        {/* mousedown default would move focus out of the text and lose the selection */}
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <div
          className="chm-rich__toolbar"
          onMouseDown={(event) => event.preventDefault()}
        >
          <s-button
            variant="tertiary"
            icon="text-bold"
            accessibilityLabel="Bold"
            onClick={() => run("bold")}
          />
          <s-button
            variant="tertiary"
            icon="text-italic"
            accessibilityLabel="Italic"
            onClick={() => run("italic")}
          />
          {allowLinks && (
            <s-button
              variant="tertiary"
              icon="link"
              accessibilityLabel="Link"
              onClick={startLink}
            />
          )}
          <s-button
            variant="tertiary"
            icon="text-color"
            accessibilityLabel="Clear formatting"
            onClick={() => run("removeFormat")}
          />
        </div>
        <div
          id={id}
          ref={editor}
          className="chm-rich__input"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={label}
          tabIndex={0}
          data-placeholder={placeholder ?? ""}
          onInput={emit}
          onPaste={(event) => {
            // Paste as plain text; formatting from other sites isn't wanted.
            event.preventDefault();
            document.execCommand(
              "insertText",
              false,
              event.clipboardData.getData("text/plain"),
            );
          }}
        />
      </div>
      {linking && (
        <s-box padding="small" background="subdued" borderRadius="base">
          <s-grid
            gridTemplateColumns="minmax(0, 1fr) auto auto"
            gap="small"
            alignItems="end"
          >
            <TextField
              label="Link to"
              value={url}
              placeholder="https://… or /collections/sale"
              onChange={setUrl}
            />
            <s-button variant="primary" onClick={applyLink}>
              Add link
            </s-button>
            <s-button variant="tertiary" onClick={() => setLinking(false)}>
              Cancel
            </s-button>
          </s-grid>
          {error && <s-text tone="critical">{error}</s-text>}
        </s-box>
      )}
      {details && <s-text color="subdued">{details}</s-text>}
    </s-stack>
  );
}
