/**
 * Translations: every text of a menu, built-in words with ready-made
 * translations, language fallback and right-to-left detection.
 *
 * Translations are stored as `design.translations[locale]["<id>.<field>"]`.
 * Empty or missing entries fall back to the default-language text.
 */
import { childNodes, walkDesign } from "./tree";
import type { Design, Node, Screen } from "./types";

/** Words the menu itself shows (not typed by the merchant), by key. */
export const UI_TEXT_DEFAULTS = {
  close: "Close menu",
  menu: "Menu",
  back: "Back",
  country: "Country",
  language: "Language",
  search: "Search",
  account: "Account",
  cart: "Cart",
  copy: "Copy",
  copied: "Copied",
  apply: "Apply",
  cancel: "Cancel",
  recent: "Recent searches",
  clear: "Clear",
  popular: "Popular searches",
  inMenu: "In this menu",
  suggestions: "Suggestions",
  collections: "Collections",
  products: "Products",
  seeAll: "See all results",
  noResults: "No results for",
  soldOut: "Sold out",
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
    search: "Suchen",
    account: "Konto",
    cart: "Warenkorb",
    copy: "Kopieren",
    copied: "Kopiert",
    apply: "Einlösen",
    cancel: "Abbrechen",
    recent: "Letzte Suchen",
    clear: "Löschen",
    popular: "Beliebte Suchen",
    inMenu: "In diesem Menü",
    suggestions: "Vorschläge",
    collections: "Kollektionen",
    products: "Produkte",
    seeAll: "Alle Ergebnisse ansehen",
    noResults: "Keine Ergebnisse für",
    soldOut: "Ausverkauft",
  },
  fr: {
    close: "Fermer le menu",
    menu: "Menu",
    back: "Retour",
    country: "Pays",
    language: "Langue",
    search: "Rechercher",
    account: "Compte",
    cart: "Panier",
    copy: "Copier",
    copied: "Copié",
    apply: "Appliquer",
    cancel: "Annuler",
    recent: "Recherches récentes",
    clear: "Effacer",
    popular: "Recherches populaires",
    inMenu: "Dans ce menu",
    suggestions: "Suggestions",
    collections: "Collections",
    products: "Produits",
    seeAll: "Voir tous les résultats",
    noResults: "Aucun résultat pour",
    soldOut: "Épuisé",
  },
  es: {
    close: "Cerrar menú",
    menu: "Menú",
    back: "Atrás",
    country: "País",
    language: "Idioma",
    search: "Buscar",
    account: "Cuenta",
    cart: "Carrito",
    copy: "Copiar",
    copied: "Copiado",
    apply: "Aplicar",
    cancel: "Cancelar",
    recent: "Búsquedas recientes",
    clear: "Borrar",
    popular: "Búsquedas populares",
    inMenu: "En este menú",
    suggestions: "Sugerencias",
    collections: "Colecciones",
    products: "Productos",
    seeAll: "Ver todos los resultados",
    noResults: "No hay resultados para",
    soldOut: "Agotado",
  },
  it: {
    close: "Chiudi menu",
    menu: "Menu",
    back: "Indietro",
    country: "Paese",
    language: "Lingua",
    search: "Cerca",
    account: "Account",
    cart: "Carrello",
    copy: "Copia",
    copied: "Copiato",
    apply: "Applica",
    cancel: "Annulla",
    recent: "Ricerche recenti",
    clear: "Cancella",
    popular: "Ricerche popolari",
    inMenu: "In questo menu",
    suggestions: "Suggerimenti",
    collections: "Collezioni",
    products: "Prodotti",
    seeAll: "Vedi tutti i risultati",
    noResults: "Nessun risultato per",
    soldOut: "Esaurito",
  },
  nl: {
    close: "Menu sluiten",
    menu: "Menu",
    back: "Terug",
    country: "Land",
    language: "Taal",
    search: "Zoeken",
    account: "Account",
    cart: "Winkelwagen",
    copy: "Kopiëren",
    copied: "Gekopieerd",
    apply: "Toepassen",
    cancel: "Annuleren",
    recent: "Recente zoekopdrachten",
    clear: "Wissen",
    popular: "Populaire zoekopdrachten",
    inMenu: "In dit menu",
    suggestions: "Suggesties",
    collections: "Collecties",
    products: "Producten",
    seeAll: "Alle resultaten bekijken",
    noResults: "Geen resultaten voor",
    soldOut: "Uitverkocht",
  },
  pt: {
    close: "Fechar menu",
    menu: "Menu",
    back: "Voltar",
    country: "País",
    language: "Idioma",
    search: "Pesquisar",
    account: "Conta",
    cart: "Carrinho",
    copy: "Copiar",
    copied: "Copiado",
    apply: "Aplicar",
    cancel: "Cancelar",
    recent: "Pesquisas recentes",
    clear: "Limpar",
    popular: "Pesquisas populares",
    inMenu: "Neste menu",
    suggestions: "Sugestões",
    collections: "Coleções",
    products: "Produtos",
    seeAll: "Ver todos os resultados",
    noResults: "Nenhum resultado para",
    soldOut: "Esgotado",
  },
  sv: {
    close: "Stäng menyn",
    menu: "Meny",
    back: "Tillbaka",
    country: "Land",
    language: "Språk",
    search: "Sök",
    account: "Konto",
    cart: "Varukorg",
    copy: "Kopiera",
    copied: "Kopierad",
    apply: "Använd",
    cancel: "Avbryt",
    recent: "Senaste sökningar",
    clear: "Rensa",
    popular: "Populära sökningar",
    inMenu: "I den här menyn",
    suggestions: "Förslag",
    collections: "Kollektioner",
    products: "Produkter",
    seeAll: "Visa alla resultat",
    noResults: "Inga resultat för",
    soldOut: "Slutsåld",
  },
  da: {
    close: "Luk menu",
    menu: "Menu",
    back: "Tilbage",
    country: "Land",
    language: "Sprog",
    search: "Søg",
    account: "Konto",
    cart: "Kurv",
    copy: "Kopiér",
    copied: "Kopieret",
    apply: "Anvend",
    cancel: "Annuller",
    recent: "Seneste søgninger",
    clear: "Ryd",
    popular: "Populære søgninger",
    inMenu: "I denne menu",
    suggestions: "Forslag",
    collections: "Kollektioner",
    products: "Produkter",
    seeAll: "Se alle resultater",
    noResults: "Ingen resultater for",
    soldOut: "Udsolgt",
  },
  nb: {
    close: "Lukk meny",
    menu: "Meny",
    back: "Tilbake",
    country: "Land",
    language: "Språk",
    search: "Søk",
    account: "Konto",
    cart: "Handlekurv",
    copy: "Kopier",
    copied: "Kopiert",
    apply: "Bruk",
    cancel: "Avbryt",
    recent: "Nylige søk",
    clear: "Tøm",
    popular: "Populære søk",
    inMenu: "I denne menyen",
    suggestions: "Forslag",
    collections: "Kolleksjoner",
    products: "Produkter",
    seeAll: "Se alle resultater",
    noResults: "Ingen resultater for",
    soldOut: "Utsolgt",
  },
  fi: {
    close: "Sulje valikko",
    menu: "Valikko",
    back: "Takaisin",
    country: "Maa",
    language: "Kieli",
    search: "Hae",
    account: "Tili",
    cart: "Ostoskori",
    copy: "Kopioi",
    copied: "Kopioitu",
    apply: "Käytä",
    cancel: "Peruuta",
    recent: "Viimeisimmät haut",
    clear: "Tyhjennä",
    popular: "Suositut haut",
    inMenu: "Tässä valikossa",
    suggestions: "Ehdotukset",
    collections: "Kokoelmat",
    products: "Tuotteet",
    seeAll: "Näytä kaikki tulokset",
    noResults: "Ei tuloksia haulle",
    soldOut: "Loppuunmyyty",
  },
  pl: {
    close: "Zamknij menu",
    menu: "Menu",
    back: "Wstecz",
    country: "Kraj",
    language: "Język",
    search: "Szukaj",
    account: "Konto",
    cart: "Koszyk",
    copy: "Kopiuj",
    copied: "Skopiowano",
    apply: "Zastosuj",
    cancel: "Anuluj",
    recent: "Ostatnie wyszukiwania",
    clear: "Wyczyść",
    popular: "Popularne wyszukiwania",
    inMenu: "W tym menu",
    suggestions: "Sugestie",
    collections: "Kolekcje",
    products: "Produkty",
    seeAll: "Zobacz wszystkie wyniki",
    noResults: "Brak wyników dla",
    soldOut: "Wyprzedane",
  },
  cs: {
    close: "Zavřít menu",
    menu: "Menu",
    back: "Zpět",
    country: "Země",
    language: "Jazyk",
    search: "Hledat",
    account: "Účet",
    cart: "Košík",
    copy: "Kopírovat",
    copied: "Zkopírováno",
    apply: "Použít",
    cancel: "Zrušit",
    recent: "Nedávná hledání",
    clear: "Vymazat",
    popular: "Oblíbená hledání",
    inMenu: "V této nabídce",
    suggestions: "Návrhy",
    collections: "Kolekce",
    products: "Produkty",
    seeAll: "Zobrazit všechny výsledky",
    noResults: "Žádné výsledky pro",
    soldOut: "Vyprodáno",
  },
  tr: {
    close: "Menüyü kapat",
    menu: "Menü",
    back: "Geri",
    country: "Ülke",
    language: "Dil",
    search: "Ara",
    account: "Hesap",
    cart: "Sepet",
    copy: "Kopyala",
    copied: "Kopyalandı",
    apply: "Uygula",
    cancel: "İptal",
    recent: "Son aramalar",
    clear: "Temizle",
    popular: "Popüler aramalar",
    inMenu: "Bu menüde",
    suggestions: "Öneriler",
    collections: "Koleksiyonlar",
    products: "Ürünler",
    seeAll: "Tüm sonuçları gör",
    noResults: "Sonuç bulunamadı:",
    soldOut: "Tükendi",
  },
  ja: {
    close: "メニューを閉じる",
    menu: "メニュー",
    back: "戻る",
    country: "国",
    language: "言語",
    search: "検索",
    account: "アカウント",
    cart: "カート",
    copy: "コピー",
    copied: "コピーしました",
    apply: "適用",
    cancel: "キャンセル",
    recent: "最近の検索",
    clear: "クリア",
    popular: "人気の検索",
    inMenu: "このメニュー内",
    suggestions: "候補",
    collections: "コレクション",
    products: "商品",
    seeAll: "すべての結果を見る",
    noResults: "検索結果がありません:",
    soldOut: "売り切れ",
  },
  ko: {
    close: "메뉴 닫기",
    menu: "메뉴",
    back: "뒤로",
    country: "국가",
    language: "언어",
    search: "검색",
    account: "계정",
    cart: "장바구니",
    copy: "복사",
    copied: "복사됨",
    apply: "적용",
    cancel: "취소",
    recent: "최근 검색어",
    clear: "지우기",
    popular: "인기 검색어",
    inMenu: "이 메뉴에서",
    suggestions: "추천 검색어",
    collections: "컬렉션",
    products: "상품",
    seeAll: "모든 결과 보기",
    noResults: "검색 결과 없음:",
    soldOut: "품절",
  },
  "zh-CN": {
    close: "关闭菜单",
    menu: "菜单",
    back: "返回",
    country: "国家/地区",
    language: "语言",
    search: "搜索",
    account: "账户",
    cart: "购物车",
    copy: "复制",
    copied: "已复制",
    apply: "使用",
    cancel: "取消",
    recent: "最近搜索",
    clear: "清除",
    popular: "热门搜索",
    inMenu: "在此菜单中",
    suggestions: "搜索建议",
    collections: "系列",
    products: "商品",
    seeAll: "查看全部结果",
    noResults: "没有找到结果：",
    soldOut: "售罄",
  },
  "zh-TW": {
    close: "關閉選單",
    menu: "選單",
    back: "返回",
    country: "國家/地區",
    language: "語言",
    search: "搜尋",
    account: "帳戶",
    cart: "購物車",
    copy: "複製",
    copied: "已複製",
    apply: "套用",
    cancel: "取消",
    recent: "最近搜尋",
    clear: "清除",
    popular: "熱門搜尋",
    inMenu: "在此選單中",
    suggestions: "搜尋建議",
    collections: "系列",
    products: "商品",
    seeAll: "查看所有結果",
    noResults: "找不到結果：",
    soldOut: "售罄",
  },
  ar: {
    close: "إغلاق القائمة",
    menu: "القائمة",
    back: "رجوع",
    country: "الدولة",
    language: "اللغة",
    search: "بحث",
    account: "الحساب",
    cart: "السلة",
    copy: "نسخ",
    copied: "تم النسخ",
    apply: "تطبيق",
    cancel: "إلغاء",
    recent: "عمليات البحث الأخيرة",
    clear: "مسح",
    popular: "عمليات البحث الشائعة",
    inMenu: "في هذه القائمة",
    suggestions: "اقتراحات",
    collections: "المجموعات",
    products: "المنتجات",
    seeAll: "عرض كل النتائج",
    noResults: "لا توجد نتائج لـ",
    soldOut: "نفدت الكمية",
  },
  he: {
    close: "סגירת התפריט",
    menu: "תפריט",
    back: "חזרה",
    country: "מדינה",
    language: "שפה",
    search: "חיפוש",
    account: "חשבון",
    cart: "עגלה",
    copy: "העתקה",
    copied: "הועתק",
    apply: "החלה",
    cancel: "ביטול",
    recent: "חיפושים אחרונים",
    clear: "ניקוי",
    popular: "חיפושים פופולריים",
    inMenu: "בתפריט הזה",
    suggestions: "הצעות",
    collections: "קולקציות",
    products: "מוצרים",
    seeAll: "הצגת כל התוצאות",
    noResults: "אין תוצאות עבור",
    soldOut: "אזל מהמלאי",
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
  announcement: "Announcement",
  searchPlaceholder: "Search field text",
};

/** Translatable fields of a node: [field, value, rich]. */
function nodeTexts(node: Node): [string, string | undefined, boolean][] {
  switch (node.type) {
    case "contact":
      return [["title", node.title, false]];
    case "discount":
      return [
        ["title", node.title, false],
        ["text", node.text, false],
      ];
    case "header":
      return [
        ...(node.announcementMode === "ticker"
          ? (node.announcementItems ?? []).map(
              (item): [string, string | undefined, boolean] => [
                `announce:${item.id}`,
                item.text,
                false,
              ],
            )
          : []),
        ...(node.liveSearch?.enabled
          ? (node.liveSearch.popular ?? []).map(
              (term): [string, string | undefined, boolean] => [
                `popular:${term.id}`,
                term.text,
                false,
              ],
            )
          : []),
        ["announcement", node.announcement, false],
        [
          "searchPlaceholder",
          node.searchBar ? node.searchPlaceholder : "",
          false,
        ],
      ];
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

/** Built-in words only live search shows. */
const SEARCH_WORDS: UiTextKey[] = [
  "cancel",
  "recent",
  "clear",
  "popular",
  "inMenu",
  "suggestions",
  "collections",
  "products",
  "seeAll",
  "noResults",
  "soldOut",
];

/** What each built-in word is, in the translation list. */
const UI_TEXT_FIELDS: Record<UiTextKey, string> = {
  close: "Close button (screen readers)",
  menu: "“Menu” (back to the main menu)",
  back: "Back button text",
  country: "Country picker",
  language: "Language picker",
  search: "Search (button and field)",
  account: "Account button (screen readers)",
  cart: "Cart button (screen readers)",
  copy: "Copy button (discount code)",
  copied: "After copying (discount code)",
  apply: "Apply button (discount code)",
  cancel: "Search: Cancel button",
  recent: "Search: recent searches heading",
  clear: "Search: clear recent searches",
  popular: "Search: popular searches heading",
  inMenu: "Search: links of this menu heading",
  suggestions: "Search: suggestions heading",
  collections: "Search: collections heading",
  products: "Search: products heading",
  seeAll: "Search: see all results",
  noResults: "Search: nothing found",
  soldOut: "Search: sold out label",
};

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
          // Popular search terms are translated by their own id.
          // List items (popular searches, announcement messages) are
          // translated by their own id.
          key: /^(popular|announce):/.test(field)
            ? `${field.slice(field.indexOf(":") + 1)}.text`
            : `${node.id}.${field}`,
          original: value,
          field: field.startsWith("popular:")
            ? "Popular search"
            : field.startsWith("announce:")
              ? "Announcement message"
              : (FIELD_NAMES[field] ?? field),
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
    // Lists of short texts: each item is translated on its own.
    const itemTexts: [string, string][] =
      node.type === "perks" || node.type === "ticker"
        ? node.items.map((item) => [item.id, item.text])
        : node.type === "contact"
          ? node.items.map((item) => [item.id, item.label])
          : [];
    for (const [id, original] of itemTexts)
      add({
        key: `${id}.${node.type === "contact" ? "label" : "text"}`,
        original,
        field:
          node.type === "perks"
            ? "Perk"
            : node.type === "ticker"
              ? "Ticker message"
              : "Contact button",
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
  let usesDiscount = false;
  let usesApply = false;
  walkDesign(design, (node) => {
    if (node.type !== "discount") return;
    usesDiscount = true;
    usesApply ||= Boolean(node.applyLink);
  });
  // Built-in words are listed only when the menu shows them.
  const { icons = [], searchBar } = design.header;
  const unused: Partial<Record<UiTextKey, boolean>> = {
    back: Boolean(backLabel),
    search: !icons.includes("search") && !searchBar,
    account: !icons.includes("account"),
    cart: !icons.includes("cart"),
    ...Object.fromEntries(
      SEARCH_WORDS.map((key) => [key, !design.header.liveSearch?.enabled]),
    ),
    copy: !usesDiscount,
    copied: !usesDiscount,
    apply: !usesApply,
  };
  for (const [key, original] of Object.entries(UI_TEXT_DEFAULTS)) {
    if (unused[key as UiTextKey]) continue;
    add({
      key: `ui.${key}`,
      original,
      field: UI_TEXT_FIELDS[key as UiTextKey],
      rich: false,
      group: "Built-in words",
    });
  }
  return entries;
}
