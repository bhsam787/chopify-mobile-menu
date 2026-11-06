import { useEffect, useMemo, useRef, useState } from "react";
import { CUSTOM_CSS_MAX, type Design } from "@chopi/menu-core";
import { MenuPreview, type PreviewContext } from "../../components/MenuPreview";
import {
  CssCodeEditor,
  type CssEditorHandle,
  type EditorTheme,
} from "./CssCodeEditor";
import { STARTER_CSS } from "./cssParts";
import type { CssProblem } from "./cssTools";
import { countMatches, layersOf, type Layer } from "./selectors";

const THEME_KEY = "chopi-menu:css-theme";

type PhoneMode = "preview" | "select";
type Scope = "all" | "one";

/** What was picked on the phone: its layers, the one chosen, and how wide. */
interface Picked {
  layers: Layer[];
  index: number;
  scope: Scope;
  /** The phone's menu (to count matches). */
  root: ParentNode;
}

const selectorOf = (picked: Picked) => {
  const layer = picked.layers[picked.index];
  return picked.scope === "one" && layer.one ? layer.one : layer.all;
};

const SUN = (
  <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
    <circle
      cx="10"
      cy="10"
      r="3.6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <path
      d="M10 1.8v2.2M10 16v2.2M1.8 10h2.2M16 10h2.2M4.2 4.2l1.6 1.6M14.2 14.2l1.6 1.6M4.2 15.8l1.6-1.6M14.2 5.8l1.6-1.6"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);
const MOON = (
  <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
    <path
      d="M16.5 12.6A7 7 0 0 1 7.4 3.5a7 7 0 1 0 9.1 9.1z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Custom CSS for one menu: a VS Code-like editor on the left, the real menu
 * on a phone on the right, updated as you type. In "Select CSS" mode a click
 * on the phone adds a rule for that part; its layers (container, item,
 * title…) and scope (all alike or only this one) can then be changed.
 */
export default function CustomCssPanel({
  design,
  context,
  device,
  onChange,
}: {
  design: Design;
  context: PreviewContext;
  device: { width: number; height: number };
  onChange: (css: string) => void;
}) {
  const [draft, setDraft] = useState(design.customCss ?? STARTER_CSS);
  const [problems, setProblems] = useState<CssProblem[]>([]);
  const [theme, setTheme] = useState<EditorTheme>(() => {
    try {
      return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });
  const [mode, setMode] = useState<PhoneMode>("preview");
  const [picked, setPicked] = useState<Picked | null>(null);
  const editor = useRef<CssEditorHandle | null>(null);
  const [copied, setCopied] = useState(false);

  /** Copies the selector; falls back to a hidden field where the clipboard API is blocked. */
  const copySelector = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const previewDesign = useMemo(
    () => ({ ...design, customCss: draft }),
    [design, draft],
  );
  const errors = problems.filter((problem) => problem.severity === "error");
  const warnings = problems.length - errors.length;
  // The phone fills the stage's height (tools sit beside it).
  const scale = Math.min(0.8, 640 / (device.height + 20));
  const selector = picked ? selectorOf(picked) : null;

  const changeTheme = (next: EditorTheme) => {
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Only the choice isn't remembered.
    }
  };

  const pick = (element: Element) => {
    const layers = layersOf(element);
    if (!layers.length) return;
    const next: Picked = {
      layers,
      index: layers.length - 1,
      scope: "all",
      root: element.getRootNode() as ParentNode,
    };
    setPicked(next);
    editor.current?.addRule(selectorOf(next));
  };

  /** Another layer or scope: the rule just added follows. */
  const repick = (patch: Partial<Picked>) => {
    if (!picked) return;
    const next = { ...picked, ...patch };
    setPicked(next);
    editor.current?.changeRule(selectorOf(next));
  };

  // ↑ / ↓ step through the layers while selecting (not while typing).
  useEffect(() => {
    if (mode !== "select" || !picked) return;
    const onKey = (event: KeyboardEvent) => {
      const typing = (event.target as HTMLElement).closest?.(
        ".cm-editor, input, textarea",
      );
      if (typing || (event.key !== "ArrowUp" && event.key !== "ArrowDown"))
        return;
      event.preventDefault();
      const index = Math.max(
        0,
        Math.min(
          picked.layers.length - 1,
          picked.index + (event.key === "ArrowUp" ? -1 : 1),
        ),
      );
      if (index !== picked.index) repick({ index });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const layer = picked?.layers[picked.index];

  return (
    <div className={`chm-css chm-css--${theme}`}>
      <div className="chm-css__left">
        <div className={`chm-css__window chm-css__window--${theme}`}>
          <div className="chm-css__tabbar">
            <span className="chm-css__dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="chm-css__file">
              <span className="chm-css__file-icon" aria-hidden="true">
                #
              </span>
              menu.css
            </span>
            <span className="chm-css__actions">
              <button
                type="button"
                className="chm-css__ghost"
                onClick={() => editor.current?.format()}
                title="Format the code"
              >
                Format <kbd>⇧⌥F</kbd>
              </button>
              <span
                className="chm-css__theme"
                role="radiogroup"
                aria-label="Theme"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={theme === "light"}
                  title="Light"
                  onClick={() => changeTheme("light")}
                >
                  {SUN} Light
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={theme === "dark"}
                  title="Dark"
                  onClick={() => changeTheme("dark")}
                >
                  {MOON} Dark
                </button>
              </span>
            </span>
          </div>
          <CssCodeEditor
            value={draft}
            theme={theme}
            onChange={(css) => {
              setDraft(css);
              onChange(css === STARTER_CSS ? "" : css);
            }}
            onProblems={setProblems}
            handleRef={(handle) => {
              editor.current = handle;
            }}
          />
          <div className="chm-css__status">
            <span className={errors.length ? "is-error" : ""}>
              ⊗ {errors.length}
            </span>
            <span className={warnings ? "is-warning" : ""}>⚠ {warnings}</span>
            <span className="chm-css__status-fill">
              {errors[0]?.message ??
                (warnings ? "Hover the marks for details" : "No problems")}
            </span>
            <span className={draft.length > CUSTOM_CSS_MAX ? "is-error" : ""}>
              {draft.length.toLocaleString()} /{" "}
              {CUSTOM_CSS_MAX.toLocaleString()}
            </span>
            <span>CSS</span>
          </div>
        </div>

        <p className="chm-css__note">
          Only this menu is styled: your theme isn&apos;t affected. Your rules
          win over the settings made in the editor. Save keeps them in the menu,
          Publish puts them on your store.
        </p>
      </div>

      <aside className="chm-css__phone" aria-label="Live preview">
        <div className="chm-css__side">
          <div
            className="chm-css__modes"
            role="radiogroup"
            aria-label="Phone mode"
          >
            <button
              type="button"
              role="radio"
              aria-checked={mode === "preview"}
              onClick={() => setMode("preview")}
            >
              <svg
                viewBox="0 0 20 20"
                width="14"
                height="14"
                aria-hidden="true"
              >
                <path d="M6 4.5v11l9-5.5z" fill="currentColor" />
              </svg>
              Preview
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === "select"}
              onClick={() => setMode("select")}
            >
              <svg
                viewBox="0 0 20 20"
                width="14"
                height="14"
                aria-hidden="true"
              >
                <path
                  d="M4 3l11 5.5-4.6 1.4L8.9 15z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
              Select
            </button>
          </div>

          {mode === "preview" ? (
            <div className="chm-css__card chm-css__card--quiet">
              <strong>Try your menu</strong>
              <p>
                Tap tabs, open sub-menus and search, just like your shoppers.
                Switch to Select to style any part.
              </p>
            </div>
          ) : !picked || !layer || !selector ? (
            <div className="chm-css__card chm-css__card--quiet">
              <strong>Pick a part</strong>
              <p>
                Hover the menu and click anything. Its selector is added to your
                CSS, ready to style.
              </p>
            </div>
          ) : (
            <div className="chm-css__card">
              <div className="chm-css__card-head">
                <span>Layers</span>
                <kbd title="Press ↑ ↓ to move between layers">↑↓</kbd>
              </div>
              <ol className="chm-css__tree" aria-label="Layers">
                {picked.layers.map((item, index) => (
                  <li key={`${item.all}-${index}`}>
                    <button
                      type="button"
                      aria-pressed={index === picked.index}
                      title={item.all}
                      style={{
                        paddingInlineStart: 8 + Math.min(index, 6) * 10,
                      }}
                      onClick={() => repick({ index })}
                    >
                      <span className="chm-css__node" aria-hidden="true" />
                      {item.label}
                    </button>
                  </li>
                ))}
              </ol>
              <div className="chm-css__card-head">
                <span>Applies to</span>
              </div>
              <div
                className="chm-css__scope"
                role="radiogroup"
                aria-label="Which ones"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={picked.scope === "all"}
                  onClick={() => repick({ scope: "all" })}
                >
                  All alike
                  <span>{countMatches(picked.root, layer.all)}</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={picked.scope === "one"}
                  disabled={!layer.one}
                  title={
                    layer.one
                      ? "Only this one"
                      : "This part can't be told apart from the others like it"
                  }
                  onClick={() => repick({ scope: "one" })}
                >
                  Just this
                </button>
              </div>
              <div className="chm-css__selector-box">
                <code className="chm-css__selector">{selector}</code>
                <button
                  type="button"
                  className={`chm-css__copy${copied ? " is-copied" : ""}`}
                  aria-label={copied ? "Copied" : "Copy selector"}
                  title={copied ? "Copied" : "Copy selector"}
                  onClick={() => copySelector(selector)}
                >
                  {copied ? (
                    <svg
                      viewBox="0 0 20 20"
                      width="14"
                      height="14"
                      aria-hidden="true"
                    >
                      <path
                        d="M5 10.5l3.2 3.2L15 7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 20 20"
                      width="14"
                      height="14"
                      aria-hidden="true"
                    >
                      <rect
                        x="7"
                        y="7"
                        width="9"
                        height="9"
                        rx="2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                      <path
                        d="M13 7V5.5A1.5 1.5 0 0 0 11.5 4h-6A1.5 1.5 0 0 0 4 5.5v6A1.5 1.5 0 0 0 5.5 13H7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="chm-css__device">
          <MenuPreview
            design={previewDesign}
            context={context}
            screenId={design.screens[0].id}
            width={device.width + 20}
            height={device.height + 20}
            scale={scale}
            // Preview works like the store; Select picks parts instead.
            interactive
            picking={mode === "select"}
            onPick={pick}
            matchSelector={mode === "select" ? selector : null}
          />
        </div>
      </aside>
    </div>
  );
}
