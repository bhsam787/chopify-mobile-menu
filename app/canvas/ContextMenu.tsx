import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SearchField } from "../editor/controls";
import { searchElements } from "./elements";

export type MenuEntry =
  | {
      label: string;
      keys?: string;
      onSelect: () => void;
      disabled?: boolean;
      critical?: boolean;
    }
  | "separator";

/**
 * The canvas right-click menu, like Figma's. Arrow keys move between items,
 * Enter picks, Esc or a click outside closes. "Add element here…" turns the
 * menu into a quick search of the elements.
 */
export function ContextMenu({
  x,
  y,
  entries,
  onAddElement,
  onClose,
}: {
  x: number;
  y: number;
  entries: MenuEntry[];
  /** Adds the element with `key` where the menu was opened. */
  onAddElement: (key: string) => void;
  onClose: () => void;
}) {
  const menu = useRef<HTMLDivElement>(null);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState({ left: x, top: y });

  // Keep the menu on screen near the pointer.
  useLayoutEffect(() => {
    const rect = menu.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({
      left: Math.max(8, Math.min(x, window.innerWidth - rect.width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - rect.height - 8)),
    });
  }, [x, y, adding]);

  useEffect(() => {
    if (!adding)
      menu.current
        ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
        ?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const buttons = [
        ...(menu.current?.querySelectorAll<HTMLButtonElement>(
          "button:not(:disabled)",
        ) ?? []),
      ];
      const index = buttons.indexOf(
        document.activeElement as HTMLButtonElement,
      );
      const next = event.key === "ArrowDown" ? index + 1 : index - 1;
      buttons[(next + buttons.length) % buttons.length]?.focus();
      event.preventDefault();
    };
    window.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [adding, onClose]);

  const results = searchElements(query).slice(0, 12);
  const add = (key: string) => {
    onAddElement(key);
    onClose();
  };

  return (
    <div
      ref={menu}
      className="cve-menu"
      role="menu"
      aria-label="Layer actions"
      style={position}
    >
      {adding ? (
        <>
          <SearchField
            label="Add element"
            placeholder="Add element: tabs, card, text…"
            value={query}
            onChange={setQuery}
            focusOnMount
            onKeyDown={(event) => {
              if (event.key === "Enter" && results[0]) {
                event.preventDefault();
                add(results[0].key);
              }
            }}
          />
          <div className="cve-menu__results">
            {results.length === 0 ? (
              <span className="cve-menu__item" aria-disabled="true">
                No elements match
              </span>
            ) : (
              results.map((element) => (
                <button
                  key={element.key}
                  type="button"
                  role="menuitem"
                  className="cve-menu__item"
                  onClick={() => add(element.key)}
                >
                  {element.label}
                  <span className="cve-menu__group">{element.group}</span>
                </button>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            role="menuitem"
            className="cve-menu__item"
            onClick={() => setAdding(true)}
          >
            Add element here…
          </button>
          {entries.map((entry, index) =>
            entry === "separator" ? (
              <div key={index} className="cve-menu__sep" role="separator" />
            ) : (
              <button
                key={entry.label}
                type="button"
                role="menuitem"
                className={`cve-menu__item${entry.critical ? " is-critical" : ""}`}
                disabled={entry.disabled}
                onClick={() => {
                  entry.onSelect();
                  onClose();
                }}
              >
                {entry.label}
                {entry.keys && (
                  <span className="cve-menu__keys">{entry.keys}</span>
                )}
              </button>
            ),
          )}
        </>
      )}
    </div>
  );
}
