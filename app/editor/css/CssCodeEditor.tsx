import { useEffect, useRef } from "react";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { css, cssLanguage } from "@codemirror/lang-css";
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  HighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { lintGutter, linter, lintKeymap } from "@codemirror/lint";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { Compartment, EditorState } from "@codemirror/state";
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { MENU_CLASSES, MENU_PARTS, MENU_VARIABLES } from "./cssParts";
import { formatCss, lintCss, type CssProblem } from "./cssTools";

/** VS Code's Light+ and Dark+ colors. */
const PALETTES = {
  light: {
    background: "#ffffff",
    text: "#1f1f1f",
    gutter: "#f8f8f8",
    gutterText: "#6e7681",
    activeLine: "#f3f6fb",
    selection: "#add6ff",
    cursor: "#000000",
    selector: "#800000",
    property: "#e50000",
    value: "#0451a5",
    number: "#098658",
    string: "#a31515",
    comment: "#008000",
    keyword: "#af00db",
    variable: "#001080",
  },
  dark: {
    background: "#1e1e1e",
    text: "#d4d4d4",
    gutter: "#1e1e1e",
    gutterText: "#858585",
    activeLine: "#2a2d2e",
    selection: "#264f78",
    cursor: "#aeafad",
    selector: "#d7ba7d",
    property: "#9cdcfe",
    value: "#ce9178",
    number: "#b5cea8",
    string: "#ce9178",
    comment: "#6a9955",
    keyword: "#c586c0",
    variable: "#9cdcfe",
  },
};

export type EditorTheme = keyof typeof PALETTES;

function vscodeTheme(name: EditorTheme) {
  const c = PALETTES[name];
  return [
    EditorView.theme(
      {
        "&": {
          height: "100%",
          color: c.text,
          backgroundColor: c.background,
          fontSize: "13px",
        },
        ".cm-scroller": {
          fontFamily:
            'Menlo, Monaco, "SF Mono", Consolas, "Courier New", monospace',
          lineHeight: "1.6",
        },
        ".cm-content": { caretColor: c.cursor, padding: "10px 0" },
        ".cm-cursor": { borderLeftColor: c.cursor, borderLeftWidth: "2px" },
        "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection":
          { backgroundColor: c.selection },
        ".cm-activeLine": { backgroundColor: c.activeLine },
        ".cm-gutters": {
          backgroundColor: c.gutter,
          color: c.gutterText,
          border: "none",
        },
        ".cm-activeLineGutter": {
          backgroundColor: c.activeLine,
          color: c.text,
        },
        ".cm-tooltip": {
          border: "1px solid rgba(127,127,127,.3)",
          borderRadius: "6px",
          backgroundColor: c.background,
          color: c.text,
          boxShadow: "0 6px 20px rgba(0,0,0,.18)",
        },
        ".cm-tooltip-autocomplete ul li[aria-selected]": {
          backgroundColor: name === "dark" ? "#04395e" : "#d6ebff",
          color: c.text,
        },
        ".cm-completionDetail": { opacity: 0.6, fontStyle: "normal" },
      },
      { dark: name === "dark" },
    ),
    syntaxHighlighting(
      HighlightStyle.define([
        {
          tag: [tags.className, tags.tagName, tags.labelName],
          color: c.selector,
        },
        { tag: tags.propertyName, color: c.property },
        {
          tag: [tags.keyword, tags.definitionKeyword, tags.modifier],
          color: c.keyword,
        },
        { tag: [tags.number, tags.unit, tags.color], color: c.number },
        { tag: [tags.string, tags.special(tags.string)], color: c.string },
        { tag: tags.comment, color: c.comment, fontStyle: "italic" },
        {
          tag: [tags.variableName, tags.special(tags.variableName)],
          color: c.variable,
        },
        { tag: [tags.atom, tags.literal], color: c.value },
        { tag: tags.punctuation, color: c.text },
      ]),
    ),
  ];
}

/** The menu's own classes after "." and its variables inside var(…). */
function menuCompletions(context: CompletionContext): CompletionResult | null {
  const variable = context.matchBefore(/var\(\s*--[\w-]*/);
  if (variable) {
    const start = variable.from + variable.text.indexOf("--");
    return {
      from: start,
      options: MENU_VARIABLES.map((item) => ({
        label: item.name,
        type: "variable",
        detail: item.info,
      })),
    };
  }
  const word = context.matchBefore(/\.[\w-]*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  const parts = new Set(MENU_PARTS.map((part) => part.selector));
  return {
    from: word.from,
    options: [
      ...MENU_PARTS.filter((part) => part.selector.startsWith(".")).map(
        (part) => ({
          label: part.selector,
          type: "class",
          detail: part.label,
          boost: 2,
        }),
      ),
      ...MENU_CLASSES.filter((name) => !parts.has(name)).map((name) => ({
        label: name,
        type: "class",
      })),
    ],
    validFor: /^\.[\w-]*$/,
  };
}

export interface CssEditorHandle {
  format: () => void;
  /** Adds an empty rule for `selector` at the end, cursor inside it. */
  addRule: (selector: string) => void;
  /**
   * Swaps the selector of the rule just added, as long as it's untouched;
   * otherwise adds a new rule.
   */
  changeRule: (selector: string) => void;
}

const ruleText = (selector: string) => `\n${selector} {\n  \n}\n`;

/**
 * A VS Code-like CSS editor: highlighting, line numbers, folding,
 * autocomplete (CSS plus the menu's classes and variables), live checks,
 * search (⌘F), multiple cursors (⌥-drag), and Shift+Alt+F to format.
 */
export function CssCodeEditor({
  value,
  theme,
  onChange,
  onProblems,
  handleRef,
}: {
  value: string;
  theme: EditorTheme;
  onChange: (value: string) => void;
  onProblems: (problems: CssProblem[]) => void;
  handleRef?: (handle: CssEditorHandle | null) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const themeSlot = useRef(new Compartment());
  const callbacks = useRef({ onChange, onProblems });
  callbacks.current = { onChange, onProblems };

  useEffect(() => {
    if (!host.current) return;
    const format = (target: EditorView) => {
      const text = target.state.doc.toString();
      const formatted = formatCss(text);
      if (formatted !== text)
        target.dispatch({
          changes: { from: 0, to: text.length, insert: formatted },
        });
      return true;
    };
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightSpecialChars(),
          history(),
          foldGutter(),
          drawSelection(),
          dropCursor(),
          EditorState.allowMultipleSelections.of(true),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          autocompletion({ activateOnTyping: true }),
          rectangularSelection(),
          crosshairCursor(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          css(),
          cssLanguage.data.of({ autocomplete: menuCompletions }),
          linter(
            (target) => {
              const problems = lintCss(target.state.doc.toString());
              callbacks.current.onProblems(problems);
              return problems;
            },
            { delay: 300 },
          ),
          lintGutter(),
          keymap.of([
            { key: "Shift-Alt-f", run: format },
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...foldKeymap,
            ...completionKeymap,
            ...lintKeymap,
            indentWithTab,
          ]),
          themeSlot.current.of(vscodeTheme(theme)),
          EditorView.updateListener.of((update) => {
            if (update.docChanged)
              callbacks.current.onChange(update.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = editor;
    /** The rule added last (position and text), to swap its selector. */
    let added: { from: number; text: string } | null = null;
    const addRule = (selector: string) => {
      const end = editor.state.doc.length;
      const text = ruleText(selector);
      editor.dispatch({
        changes: { from: end, insert: text },
        selection: { anchor: end + text.indexOf("\n  ") + 3 },
        scrollIntoView: true,
      });
      added = { from: end, text };
      editor.focus();
    };
    handleRef?.({
      addRule,
      changeRule: (selector) => {
        const doc = editor.state.doc;
        if (
          added &&
          doc.sliceString(added.from, added.from + added.text.length) ===
            added.text
        ) {
          const text = ruleText(selector);
          editor.dispatch({
            changes: {
              from: added.from,
              to: added.from + added.text.length,
              insert: text,
            },
            selection: { anchor: added.from + text.indexOf("\n  ") + 3 },
            scrollIntoView: true,
          });
          added = { from: added.from, text };
          editor.focus();
        } else addRule(selector);
      },
      format: () => format(editor),
    });
    return () => {
      handleRef?.(null);
      editor.destroy();
      view.current = null;
    };
    // The editor owns its text after mounting; `value` only seeds it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    view.current?.dispatch({
      effects: themeSlot.current.reconfigure(vscodeTheme(theme)),
    });
  }, [theme]);

  return <div ref={host} className="chm-css__code" />;
}
