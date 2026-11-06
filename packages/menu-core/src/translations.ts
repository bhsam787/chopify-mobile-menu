/**
 * Translations: every text of a menu, built-in words with ready-made
 * translations, language fallback and right-to-left detection.
 *
 * Translations are stored as `design.translations[locale]["<id>.<field>"]`.
 * Empty or missing entries fall back to the default-language text.
 */
import { childNodes } from "./tree";
import type { Design, Node, Screen } from "./types";

/** Words the menu itself shows (not typed by the merchant), by key. */
export const UI_TEXT_DEFAULTS = {
  close: "Close menu",
  menu: "Menu",
  back: "Back",
  country: "Country",
  language: "Language",
} as const;
export type UiTextKey = keyof typeof UI_TEXT_DEFAULTS;

/**
 * Ready-made translations of the built-in words, so a shop selling in these
 * languages is translated out of the box (the merchant can override them).
 */
const UI_TEXT_PACKS: Record<string, Record<UiTextKey, string>> = {
  de: {
    close: "Menü schließen",
    menu: "Menü",
    back: "Zurück",
    country: "Land",
    language: "Sprache",
  },
  fr: {
    close: "Fermer le menu",
    menu: "Menu",
    back: "Retour",
    country: "Pays",
    language: "Langue",
  },
  es: {
    close: "Cerrar menú",
    menu: "Menú",
    back: "Atrás",
    country: "País",
    language: "Idioma",
  },
  it: {
    close: "Chiudi menu",
    menu: "Menu",
    back: "Indietro",
    country: "Paese",
    language: "Lingua",
  },
  nl: {
    close: "Menu sluiten",
    menu: "Menu",
    back: "Terug",
    country: "Land",
    language: "Taal",
  },
  pt: {
    close: "Fechar menu",
    menu: "Menu",
    back: "Voltar",
    country: "País",
    language: "Idioma",
  },
  sv: {
    close: "Stäng menyn",
    menu: "Meny",
    back: "Tillbaka",
    country: "Land",
    language: "Språk",
  },
  da: {
    close: "Luk menu",
    menu: "Menu",
    back: "Tilbage",
    country: "Land",
    language: "Sprog",
  },
  nb: {
    close: "Lukk meny",
    menu: "Meny",
    back: "Tilbake",
    country: "Land",
    language: "Språk",
  },
  fi: {
    close: "Sulje valikko",
    menu: "Valikko",
    back: "Takaisin",
    country: "Maa",
    language: "Kieli",
  },
  pl: {
    close: "Zamknij menu",
    menu: "Menu",
    back: "Wstecz",
    country: "Kraj",
    language: "Język",
  },
  cs: {
    close: "Zavřít menu",
    menu: "Menu",
    back: "Zpět",
    country: "Země",
    language: "Jazyk",
  },
  tr: {
    close: "Menüyü kapat",
    menu: "Menü",
    back: "Geri",
    country: "Ülke",
    language: "Dil",
  },
  ja: {
    close: "メニューを閉じる",
    menu: "メニュー",
    back: "戻る",
    country: "国",
    language: "言語",
  },
  ko: {
    close: "메뉴 닫기",
    menu: "메뉴",
    back: "뒤로",
    country: "국가",
    language: "언어",
  },
  "zh-CN": {
    close: "关闭菜单",
    menu: "菜单",
    back: "返回",
    country: "国家/地区",
    language: "语言",
  },
  "zh-TW": {
    close: "關閉選單",
    menu: "選單",
    back: "返回",
    country: "國家/地區",
    language: "語言",
  },
  ar: {
    close: "إغلاق القائمة",
    menu: "القائمة",
    back: "رجوع",
    country: "الدولة",
    language: "اللغة",
  },
  he: {
    close: "סגירת התפריט",
    menu: "תפריט",
    back: "חזרה",
    country: "מדינה",
    language: "שפה",
  },
};

/** Base language of a locale code ("pt-BR" → "pt"). */
const baseLanguage = (locale: string) => locale.split("-")[0].toLowerCase();

/** Languages written right to left. */
const RTL_LANGUAGES = new Set(["ar", "he", "fa", "ur", "yi", "ps", "sd", "ug"]);

export function isRtlLocale(locale: string): boolean {
  return RTL_LANGUAGES.has(baseLanguage(locale));
}

/**
 * The merchant's texts for `locale`: the exact locale first, then its base
 * language ("pt-BR" uses "pt"), then any regional variant of it ("pt" uses
 * "pt-BR"). Built-in words get the ready-made pack underneath.
 */
export function resolveTexts(
  translations: Design["translations"],
  locale: string,
): Record<string, string> {
  const base = baseLanguage(locale);
  const keys = Object.keys(translations);
  const exact = keys.find((key) => key.toLowerCase() === locale.toLowerCase());
  const sameBase = keys.find((key) => key.toLowerCase() === base);
  const regional = keys.find((key) => baseLanguage(key) === base);
  const pack =
    UI_TEXT_PACKS[locale] ??
    UI_TEXT_PACKS[
      Object.keys(UI_TEXT_PACKS).find((key) => baseLanguage(key) === base) ?? ""
    ];
  const builtIn = pack
    ? Object.fromEntries(
        Object.entries(pack).map(([key, value]) => [`ui.${key}`, value]),
      )
    : {};
  // Most specific last, so it wins.
  return {
    ...builtIn,
    ...(regional ? translations[regional] : {}),
    ...(sameBase ? translations[sameBase] : {}),
    ...(exact ? translations[exact] : {}),
  };
}

/** The ready-made translation of a built-in word, if there is one. */
export function builtInText(
  locale: string,
  key: UiTextKey,
): string | undefined {
  return resolveTexts({}, locale)[`ui.${key}`];
}

export interface TextEntry {
  /** Translation key, "<id>.<field>". */
  key: string;
  /** The default-language text. */
  original: string;
  /** What the text is, e.g. "Title", "Button text". */
  field: string;
  /** Rich text (bold, italic, links) rather than plain text. */
  rich: boolean;
  /** The item it belongs to (highlighted in the preview); none for built-in words. */
  nodeId?: string;
  /** Where it is: the main menu, a sub-menu, or "Built-in words". */
  group: string;
  /** The screen it's on, for the preview. */
  screenId?: string;
}

const FIELD_NAMES: Record<string, string> = {
  title: "Title",
  subtitle: "Subtitle",
  text: "Text",
  label: "Label",
  badge: "Badge",
  eyebrow: "Small heading",
  cta: "Button text",
  quote: "Quote",
  author: "Author",
  loginLabel: "Log-in text",
  accountLabel: "Account text",
};

/** Translatable fields of a node: [field, value, rich]. */
function nodeTexts(node: Node): [string, string | undefined, boolean][] {
  switch (node.type) {
    case "heading":
      return [["text", node.text, false]];
    case "text":
      return [["text", node.text, true]];
    case "social-proof":
      return [["text", node.text, true]];
    case "card":
    case "row":
      return [
        ["title", node.title, false],
        ["subtitle", node.subtitle, false],
        ["badge", node.badge?.text, false],
      ];
    case "accordion":
      return [
        ["title", node.title, false],
        ["subtitle", node.subtitle, false],
      ];
    case "banner":
      return [
        ["eyebrow", node.eyebrow, false],
        ["title", node.title, false],
        ["text", node.text, false],
        ["cta", node.cta, false],
        ["badge", node.badge?.text, false],
      ];
    case "countdown":
      return [
        ["title", node.title, false],
        ["text", node.text, false],
      ];
    case "pill":
      return [["text", node.text, false]];
    case "chip":
    case "button":
      return [["label", node.label, false]];
    case "review":
      return [
        ["quote", node.quote, false],
        ["author", node.author, false],
      ];
    case "account-bar":
      return [
        ["loginLabel", node.loginLabel, false],
        ["accountLabel", node.accountLabel, false],
      ];
    default:
      return [];
  }
}

/**
 * Every text of the menu in storefront order: the main menu (with its
 * header and footer), each sub-menu (title, back text, contents, canvas
 * layers included), then the built-in words.
 */
export function collectTexts(design: Design): TextEntry[] {
  const entries: TextEntry[] = [];
  const add = (entry: TextEntry) => {
    if (entry.original.trim()) entries.push(entry);
  };
  const walk = (node: Node, group: string, screenId: string) => {
    for (const [field, value, rich] of nodeTexts(node))
      if (value)
        add({
          key: `${node.id}.${field}`,
          original: value,
          field: FIELD_NAMES[field] ?? field,
          rich,
          nodeId: node.id,
          group,
          screenId,
        });
    if (node.type === "stories" && node.source === "manual")
      for (const item of node.items)
        add({
          key: `${item.id}.title`,
          original: item.title,
          field: "Circle name",
          rich: false,
          nodeId: node.id,
          group,
          screenId,
        });
    if (node.type === "tabs")
      for (const tab of node.tabs)
        add({
          key: `${tab.id}.label`,
          original: tab.label,
          field: "Tab name",
          rich: false,
          nodeId: node.id,
          group,
          screenId,
        });
    childNodes(node).forEach((child) => walk(child, group, screenId));
  };

  const [main, ...subMenus] = design.screens;
  const mainGroup = "Main menu";
  walk(design.header, mainGroup, main.id);
  walk(main.root, mainGroup, main.id);
  if (design.footer) walk(design.footer, mainGroup, main.id);

  subMenus.forEach((screen: Screen) => {
    const group = `Sub-menu: ${screen.title || "Untitled"}`;
    add({
      key: `${screen.id}.title`,
      original: screen.title,
      field: "Sub-menu title",
      rich: false,
      group,
      screenId: screen.id,
    });
    walk(screen.root, group, screen.id);
  });

  const backLabel = design.back?.label;
  if (backLabel)
    add({
      key: "back.label",
      original: backLabel,
      field: "Back button text",
      rich: false,
      group: "Built-in words",
    });
  for (const [key, original] of Object.entries(UI_TEXT_DEFAULTS)) {
    if (key === "back" && backLabel) continue;
    add({
      key: `ui.${key}`,
      original,
      field:
        key === "close"
          ? "Close button (screen readers)"
          : key === "menu"
            ? "“Menu” (back to the main menu)"
            : key === "back"
              ? "Back button text"
              : key === "country"
                ? "Country picker"
                : "Language picker",
      rich: false,
      group: "Built-in words",
    });
  }
  return entries;
}
