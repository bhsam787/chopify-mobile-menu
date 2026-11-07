import { MENU_PARTS } from "./cssParts";

/** Classes that describe a state or the editor, not a part of the menu. */
const NOT_A_PART =
  /^(is-|has-)|^chm-(editor|try|pick|searching|has-tag|design-tag|root|fragment|fit-|img--empty)/;

/** One level of the menu, from the drawer down to what was clicked. */
export interface Layer {
  /** Plain words, e.g. "Card title". */
  label: string;
  /** Every element like it, e.g. ".chm-card__title". */
  all: string;
  /** Only this one (by the item's id), when it can be told apart. */
  one: string | null;
}

/** The part's own class: an element of a block ("__") before the block itself. */
function partClass(element: Element): string | null {
  const classes = [...element.classList].filter(
    (name) =>
      name.startsWith("chm-") && !NOT_A_PART.test(name) && !name.includes("--"),
  );
  return classes.find((name) => name.includes("__")) ?? classes[0] ?? null;
}

const LABELS = new Map([
  ...MENU_PARTS.map((part): [string, string] => [part.selector, part.label]),
  // Short names for the layers of the path.
  [".chm-panel", "Drawer"],
  [".chm-body", "Menu body"],
  [".chm-c", "Container"],
  [".chm-tabs", "Tabs"],
  [".chm-tabpanel", "Tab panel"],
  [".chm-canvas", "Canvas"],
  [".chm-canvas__item", "Canvas layer"],
  [".chm-shape", "Frame"],
  [".chm-head", "Header area"],
  [".chm-header", "Header row"],
  [".chm-header__side", "Header buttons"],
  [".chm-icon", "Icon"],
]);

/** Levels that are only scaffolding (never what a merchant means). */
const SKIPPED = new Set(["chm-screens", "chm-screen", "chm-canvas__stage"]);

function labelFor(selector: string): string {
  const known = LABELS.get(selector);
  if (known) return known;
  // ".chm-card__title" → "Card title", "img" → "Image".
  const words = selector
    .replace(/^.*\s/, "")
    .replace(/^\.chm-/, "")
    .replace(/__|-|_/g, " ")
    .trim();
  if (words === "img") return "Image";
  if (words === "svg") return "Icon";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The layers from the drawer down to `target`: every part that has a class
 * of its own, ending with `target` itself (by tag, inside its part, when it
 * has no class). Each layer carries an "all like this" selector and, inside
 * an item, an "only this one" selector.
 */
export function layersOf(clicked: Element): Layer[] {
  // Inside an icon, the icon itself is meant (not one of its lines).
  const target =
    clicked instanceof SVGElement
      ? (clicked.closest("svg") ?? clicked)
      : clicked;
  const chain: Element[] = [];
  for (
    let element: Element | null = target;
    element && !element.classList.contains("chm-root");
    element = element.parentElement
  )
    chain.unshift(element);

  const layers: Layer[] = [];
  let lastClass: string | null = null;
  chain.forEach((element, index) => {
    const own = partClass(element);
    if (own && SKIPPED.has(own)) return;
    const isTarget = index === chain.length - 1;
    let all: string | null = null;
    if (own && own !== lastClass) all = `.${own}`;
    else if (isTarget && !own && lastClass)
      all = `.${lastClass} ${element.tagName.toLowerCase()}`;
    if (!all) return;
    if (own) lastClass = own;
    // The nearest item around (or this element itself) tells this one apart.
    const item = element.closest<HTMLElement>("[data-chm-id]");
    const id = item?.dataset.chmId;
    const one = id
      ? item === element
        ? `[data-chm-id="${id}"]`
        : `[data-chm-id="${id}"] ${all}`
      : null;
    layers.push({ label: labelFor(all), all, one });
  });
  // The drawer and the scrolling area are rarely what's meant: keep them,
  // but the clicked part is chosen first.
  return layers;
}

/** How many elements of the menu a selector matches (0 if it's invalid). */
export function countMatches(root: ParentNode, selector: string): number {
  try {
    return root.querySelectorAll(selector).length;
  } catch {
    return 0;
  }
}
