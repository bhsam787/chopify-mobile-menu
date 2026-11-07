/**
 * Menu icon picker, bundled as extensions/chopi-menu/assets/chopi-picker.js.
 * Loaded only in a store window the app opened for "Menu button" (its
 * `window.name` carries the pick session), never for shoppers. The merchant
 * hovers and taps their theme's menu icon; we work out a CSS selector for it,
 * ask them to confirm, and send it to the app with the signed pick token.
 */

const SESSION_PREFIX = "chopi-pick:";
/** Set on <html> while picking: the menu loader then leaves clicks alone. */
const PICKING_ATTR = "data-chopi-picking";

interface PickSession {
  /** Signed pick token from the app. */
  t: string;
  /** Where to send the pick (the app's /api/menu-button). */
  api: string;
  /** Numeric theme id the window was opened for. */
  theme: string;
  name: string;
}

function readSession(): PickSession | null {
  if (!window.name.startsWith(SESSION_PREFIX)) return null;
  try {
    const session = JSON.parse(window.name.slice(SESSION_PREFIX.length));
    return session?.t && session?.api && session?.theme ? session : null;
  } catch {
    return null;
  }
}

/** What a tap on `target` really hits: the button around an icon or label. */
const TAPPABLE =
  "button, a, summary, label, [role='button'], [aria-controls], [aria-expanded], [onclick], [tabindex]";

function tappableOf(target: Element): HTMLElement | null {
  const element = target.closest<HTMLElement>(TAPPABLE) ?? target;
  return element instanceof HTMLElement &&
    element !== document.body &&
    element !== document.documentElement
    ? element
    : null;
}

/** Classes that describe a state, not the element: never part of a selector. */
const STATE_CLASS =
  /^(is-|has-|active|open|opened|closed|show|hide|hidden|visible|focus|hover|selected|current|animate|transition|loaded|sticky)/i;
/** Values that look generated (long digit runs, hashes): unstable. */
const GENERATED = /\d{4,}|[a-f0-9]{8,}|__[a-z0-9]{5,}$/i;
const ATTRIBUTES = [
  "aria-controls",
  "data-action",
  "data-target",
  "data-toggle",
  "data-drawer",
  "data-modal",
  "aria-label",
  "name",
  "for",
];

/** A selector that matches `element` (and, ideally, nothing else visible). */
export function selectorFor(element: HTMLElement): string {
  const tag = element.tagName.toLowerCase();
  const matchesWell = (selector: string) => {
    try {
      const found = document.querySelectorAll(selector);
      // Themes often render the header twice (sticky copy): up to 3 is fine.
      return found.length <= 3 && [...found].includes(element);
    } catch {
      return false;
    }
  };
  const attr = (name: string, value: string) =>
    `[${name}="${value.replace(/"/g, '\\"')}"]`;

  const candidates: string[] = [];
  if (element.id && !GENERATED.test(element.id))
    candidates.push(`#${CSS.escape(element.id)}`);
  for (const name of ATTRIBUTES) {
    const value = element.getAttribute(name);
    if (value && value.length <= 60 && !GENERATED.test(value))
      candidates.push(`${tag}${attr(name, value)}`);
  }
  const classes = [...element.classList].filter(
    (name) => !STATE_CLASS.test(name) && !GENERATED.test(name),
  );
  for (const name of classes) candidates.push(`${tag}.${CSS.escape(name)}`);
  for (let a = 0; a < classes.length; a++)
    for (let b = a + 1; b < classes.length; b++)
      candidates.push(
        `${tag}.${CSS.escape(classes[a])}.${CSS.escape(classes[b])}`,
      );
  const found = candidates.find(matchesWell);
  if (found) return found;

  // Nothing unique on the element itself: anchor on a named ancestor.
  let path = `${tag}${classes[0] ? `.${CSS.escape(classes[0])}` : ""}`;
  let parent = element.parentElement;
  for (let depth = 0; parent && depth < 4; depth++) {
    const parentTag = parent.tagName.toLowerCase();
    const named =
      parent.id && !GENERATED.test(parent.id)
        ? `#${CSS.escape(parent.id)}`
        : [...parent.classList].find(
              (name) => !STATE_CLASS.test(name) && !GENERATED.test(name),
            )
          ? `${parentTag}.${CSS.escape([...parent.classList].find((name) => !STATE_CLASS.test(name) && !GENERATED.test(name))!)}`
          : parentTag;
    path = `${named} > ${path}`;
    if (matchesWell(path)) return path;
    parent = parent.parentElement;
  }
  return path;
}

/** Chopi, the app's helper, pointing up at the header (where menu icons live). */
const CHOPI = `<svg viewBox="0 0 96 100" aria-hidden="true">
  <ellipse cx="44" cy="92" rx="18" ry="2.6" fill="#22401a" opacity=".14"/>
  <path d="M35 72 L34.5 82" stroke="#22401a" stroke-width="5" stroke-linecap="round"/><ellipse cx="35" cy="85" rx="6.4" ry="4.6" fill="#22401a"/>
  <path d="M52 72 L52.5 82" stroke="#22401a" stroke-width="5" stroke-linecap="round"/><ellipse cx="53.5" cy="85" rx="6.4" ry="4.6" fill="#22401a"/>
  <path d="M22 50 Q12 53 10 62" fill="none" stroke="#22401a" stroke-width="5" stroke-linecap="round"/><circle cx="10" cy="64" r="5" fill="#fff" stroke="#22401a" stroke-width="2"/>
  <path d="M33 31 C33 15 55 15 55 31" fill="none" stroke="#22401a" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M44 19.5 C39.6 16.4 39 12.4 41.8 11.3 C43.1 10.8 44 11.8 44 12.5 C44 11.8 44.9 10.8 46.2 11.3 C49 12.4 48.4 16.4 44 19.5 Z" fill="#ff7aa2" stroke="#22401a" stroke-width="1.4" stroke-linejoin="round"/>
  <path d="M25 28 H63 Q67.6 28 68 32.6 L70.8 65 Q71.4 74 62.4 74 H25.6 Q16.6 74 17.2 65 L20 32.6 Q20.4 28 25 28 Z" fill="#95BF47"/>
  <path d="M59 28 H63 Q67.6 28 68 32.6 L70.8 65 Q71.4 74 62.4 74 H61 Z" fill="#7CB04F" opacity=".85"/>
  <path d="M25 28 H63 Q67.6 28 68 32.6 L70.8 65 Q71.4 74 62.4 74 H25.6 Q16.6 74 17.2 65 L20 32.6 Q20.4 28 25 28 Z" fill="none" stroke="#22401a" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M24.5 33 Q26 31.5 30 31.5" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2.4" stroke-linecap="round"/>
  <g class="eyes"><ellipse cx="35" cy="48" rx="4.8" ry="5.8" fill="#22401a"/><ellipse cx="52" cy="48" rx="4.8" ry="5.8" fill="#22401a"/><circle cx="36.7" cy="45.9" r="2" fill="#fff"/><circle cx="53.7" cy="45.9" r="2" fill="#fff"/></g>
  <ellipse cx="27.5" cy="56" rx="4.2" ry="2.6" fill="#ff8fb3" opacity=".85"/><ellipse cx="59.5" cy="56" rx="4.2" ry="2.6" fill="#ff8fb3" opacity=".85"/>
  <path d="M41.6 57.4 Q43.5 61.4 45.4 57.4 Z" fill="#ff7aa2"/><path d="M38.4 55.4 Q40.9 59.4 43.5 56.6 Q46.1 59.4 48.6 55.4" fill="none" stroke="#22401a" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
  <g class="arm"><path d="M67 48 Q76 40 80 30" fill="none" stroke="#22401a" stroke-width="5" stroke-linecap="round"/><path d="M82 24.5 L84 16.5" stroke="#22401a" stroke-width="5.6" stroke-linecap="round"/><path d="M82 24.5 L84 16.5" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="81" cy="27.5" r="5.4" fill="#fff" stroke="#22401a" stroke-width="2"/></g>
</svg>`;

const STYLE = `
:host { all: initial; }
* { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.box { position: fixed; z-index: 2147483646; pointer-events: none; border: 2px solid #5b9a35; border-radius: 12px; background: rgba(141, 196, 92, 0.16); box-shadow: 0 0 0 5px rgba(141, 196, 92, 0.22); transition: all 140ms ease; opacity: 0; }
.box.is-on { opacity: 1; }
.box.is-locked { border-color: #1a1a1a; background: rgba(26, 26, 26, 0.06); animation: pulse 1.4s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { box-shadow: 0 0 0 4px rgba(26, 26, 26, 0.16); } 50% { box-shadow: 0 0 0 10px rgba(26, 26, 26, 0.05); } }
.tag { position: fixed; z-index: 2147483646; pointer-events: none; padding: 4px 9px; border-radius: 999px; background: #1a1a1a; color: #fff; font-size: 11.5px; font-weight: 650; white-space: nowrap; opacity: 0; transform: translateY(4px); transition: opacity 140ms ease, transform 140ms ease; }
.tag.is-on { opacity: 1; transform: none; }
.card { position: fixed; z-index: 2147483647; left: 12px; right: 12px; bottom: calc(12px + var(--chopi-inset, 0px)); padding: 16px 16px 16px 92px; min-height: 96px; border-radius: 22px; background: #fff; color: #1a1a1a; box-shadow: 0 18px 50px rgba(0, 0, 0, 0.24), 0 0 0 1px rgba(0, 0, 0, 0.04); animation: rise 260ms cubic-bezier(.2,.8,.3,1) both; }
@keyframes rise { from { opacity: 0; transform: translateY(18px); } }
.chopi { position: absolute; left: 6px; top: 8px; width: 84px; height: 88px; animation: float 2.6s ease-in-out infinite; }
.chopi svg { width: 100%; height: 100%; overflow: visible; }
.chopi .arm { transform-origin: 67px 48px; animation: point 1.3s ease-in-out infinite; }
.chopi .eyes { transform-origin: 44px 48px; animation: blink 4s infinite; }
@keyframes float { 50% { transform: translateY(-4px); } }
@keyframes point { 50% { transform: rotate(-8deg) translate(1px, -2px); } }
@keyframes blink { 0%, 46%, 50%, 100% { transform: scaleY(1); } 48% { transform: scaleY(0.1); } }
.card.is-happy .chopi { animation: hop 0.7s cubic-bezier(.3,.7,.4,1.4) 2; }
.card.is-happy .arm { animation: wave 0.5s ease-in-out infinite; }
@keyframes hop { 40% { transform: translateY(-14px) rotate(-4deg); } }
@keyframes wave { 50% { transform: rotate(18deg); } }
.card.is-thinking .arm { animation: none; transform: rotate(40deg); }
.eyebrow { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 4px; color: #5b9a35; font-size: 11.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
.eyebrow::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: #8dc45c; box-shadow: 0 0 0 3px rgba(141,196,92,.25); }
h2 { margin: 0 0 3px; font-size: 16.5px; line-height: 1.3; letter-spacing: -0.01em; }
p { margin: 0; font-size: 13.5px; line-height: 1.45; color: #555; }
kbd { display: inline-grid; place-items: center; min-width: 22px; height: 22px; padding: 0 5px; border-radius: 6px; background: #f1f1f1; border: 1px solid #e3e3e3; font: 600 12px/1 inherit; color: #1a1a1a; vertical-align: -1px; }
.actions { display: flex; gap: 8px; margin: 14px 0 0 -80px; }
.actions button { flex: 1; border: 0; border-radius: 12px; padding: 12px; font-size: 14px; font-weight: 650; cursor: pointer; transition: transform 120ms ease, background 120ms ease; }
.actions button:active { transform: scale(0.97); }
.primary { background: #1a1a1a; color: #fff; }
.primary:hover { background: #303030; }
.secondary { background: #f1f1f1; color: #1a1a1a; }
.secondary:hover { background: #e7e7e7; }
.primary[disabled] { opacity: .6; cursor: progress; }
.words { min-height: 84px; }
.close { position: absolute; top: 10px; right: 10px; display: grid; place-items: center; width: 28px; height: 28px; border: 0; border-radius: 50%; background: #f4f4f4; color: #616161; cursor: pointer; }
.close:hover { background: #e9e9e9; }
.card:has(.close) { padding-right: 44px; }
.error { margin-top: 10px; color: #b42318; }
@media (prefers-reduced-motion: reduce) { .chopi, .chopi .arm, .chopi .eyes, .box.is-locked, .card { animation: none !important; } }
`;

const CLOSE_ICON = `<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}

/**
 * Tells the app page that opened this window how it's going: a heartbeat
 * while open (so it notices when the window is closed, which a window
 * handle can't always report inside the admin) and "saved" right away.
 */
function notifyApp(session: PickSession, type: "alive" | "saved") {
  try {
    window.opener?.postMessage(
      { type: `chopi:pick-${type}`, theme: session.theme },
      new URL(session.api).origin,
    );
  } catch {
    // No opener (or another origin): the app falls back to its own checks.
  }
}

function start(session: PickSession) {
  notifyApp(session, "alive");
  window.setInterval(() => notifyApp(session, "alive"), 1500);
  const host = document.createElement("chopi-picker");
  host.style.setProperty("display", "block", "important");
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `<style>${STYLE}</style>
    <div class="box"></div>
    <div class="tag">Tap to choose</div>
    <div class="card" role="dialog" aria-live="polite" aria-label="Chopi - Menu"></div>`;
  document.body.appendChild(host);
  document.documentElement.setAttribute(PICKING_ATTR, "");

  const box = shadow.querySelector<HTMLElement>(".box")!;
  const tag = shadow.querySelector<HTMLElement>(".tag")!;
  const card = shadow.querySelector<HTMLElement>(".card")!;
  const themeName = escapeHtml(session.name);

  /** Chopi's card: a mood for the bot, words, and optional buttons (HTML). */
  const show = (
    mood: "pointing" | "thinking" | "happy",
    html: string,
    actions = "",
  ) => {
    card.className = `card is-${mood}`;
    card.innerHTML = `<span class="chopi">${CHOPI}</span>
      <button type="button" class="close" data-close aria-label="Close this window">${CLOSE_ICON}</button>
      <div class="words">${html}</div>${actions ? `<div class="actions">${actions}</div>` : ""}`;
    card
      .querySelector("[data-close]")!
      .addEventListener("click", () => window.close());
  };

  // Shopify's preview bar (draft themes) is pinned to the bottom and loads
  // late: keep the card above whatever covers the bottom edge.
  const fitAboveBottomBar = () => {
    let inset = 0;
    for (const element of document.elementsFromPoint(
      window.innerWidth / 2,
      window.innerHeight - 4,
    )) {
      if (host.contains(element) || element === host) continue;
      let fixed: Element | null = element;
      while (fixed && getComputedStyle(fixed).position !== "fixed")
        fixed = fixed.parentElement;
      if (!fixed) continue;
      const top = fixed.getBoundingClientRect().top;
      // Only bars along the bottom, not full-screen overlays.
      if (top > window.innerHeight / 2)
        inset = Math.max(inset, window.innerHeight - top);
    }
    host.style.setProperty("--chopi-inset", `${Math.round(inset)}px`);
  };
  fitAboveBottomBar();
  let checks = 0;
  const watch = window.setInterval(() => {
    fitAboveBottomBar();
    if (++checks >= 30) window.clearInterval(watch);
  }, 1000);
  window.addEventListener("resize", fitAboveBottomBar);
  const themeId = String(window.Shopify?.theme?.id ?? "");
  if (themeId && themeId !== session.theme) {
    // Shopify keeps showing the last previewed theme: switch this window to
    // the right one, once (Shopify strips the parameter for the live theme,
    // so the attempt is remembered for this tab, not read from the URL).
    const key = `chopi-pick-switch:${session.theme}`;
    let tried = false;
    try {
      tried = sessionStorage.getItem(key) === "1";
      sessionStorage.setItem(key, "1");
    } catch {
      tried = true; // No storage: don't risk a redirect loop.
    }
    if (!tried) {
      const url = new URL(window.location.href);
      url.searchParams.set("preview_theme_id", session.theme);
      window.location.replace(url.toString());
      return;
    }
    show(
      "thinking",
      `<span class="eyebrow">Wrong theme</span><h2>Oops, this isn't “${themeName}”</h2>
      <p>Shopify is showing another theme here. Close this window and click “Point to the menu icon” again in the app.</p>`,
    );
    return;
  }
  try {
    sessionStorage.removeItem(`chopi-pick-switch:${session.theme}`);
  } catch {
    // Nothing to clear.
  }
  const breakpoint = 990;
  const intro = () =>
    window.innerWidth >= breakpoint
      ? show(
          "thinking",
          `<span class="eyebrow">One sec</span><h2>Make this window narrower</h2>
          <p>Your theme shows its menu icon on phone-sized screens. Drag the window's edge in a bit.</p>`,
        )
      : show(
          "pointing",
          `<span class="eyebrow">Step 2 of 3</span><h2>Tap your menu icon <kbd>☰</kbd></h2>
          <p>It's usually in a top corner of “${themeName}”. I'll highlight things as you point.</p>`,
        );
  intro();
  let wide = window.innerWidth >= breakpoint;
  window.addEventListener("resize", () => {
    // Only when crossing the breakpoint: re-rendering restarts the animation.
    if (locked || wide === window.innerWidth >= breakpoint) return;
    wide = !wide;
    intro();
  });
  // Keep the outline on the element while the page scrolls.
  window.addEventListener("scroll", () => outline(locked ?? hovered), {
    capture: true,
    passive: true,
  });

  let hovered: HTMLElement | null = null;
  let locked: HTMLElement | null = null;
  const ours = (event: Event) => event.composedPath().includes(host);

  const outline = (element: HTMLElement | null) => {
    if (!element) {
      box.classList.remove("is-on");
      tag.classList.remove("is-on");
      return;
    }
    const rect = element.getBoundingClientRect();
    Object.assign(box.style, {
      left: `${Math.max(2, rect.left - 4)}px`,
      top: `${Math.max(2, rect.top - 4)}px`,
      width: `${rect.width + 8}px`,
      height: `${rect.height + 8}px`,
    });
    box.classList.add("is-on");
    // The "Tap to choose" pill sits under the outline, kept inside the window.
    Object.assign(tag.style, {
      left: `${Math.min(Math.max(4, rect.left), window.innerWidth - 110)}px`,
      top: `${rect.bottom + 10}px`,
    });
    tag.classList.toggle("is-on", !locked);
  };

  const onMove = (event: PointerEvent) => {
    if (locked || ours(event)) return;
    const target = document.elementFromPoint(event.clientX, event.clientY);
    hovered = target ? tappableOf(target) : null;
    outline(hovered);
  };

  // The theme must not react while picking (its own drawer stays shut).
  const swallow = (event: Event) => {
    if (ours(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  const onPick = (event: MouseEvent) => {
    if (ours(event)) return;
    swallow(event);
    if (locked) return;
    const target = event.target instanceof Element ? event.target : null;
    const element = target ? tappableOf(target) : null;
    if (!element) return;
    locked = element;
    outline(element);
    box.classList.add("is-locked");
    confirm(element, selectorFor(element));
  };

  const release = () => {
    locked = null;
    box.classList.remove("is-locked");
    intro();
  };

  const confirm = (element: HTMLElement, selector: string) => {
    show(
      "thinking",
      `<span class="eyebrow">Check this</span><h2>Is this your menu icon?</h2>
      <p>When shoppers tap it on their phone, your Chopi menu opens instead of your theme's.</p>
      <p class="error" hidden></p>`,
      `<button type="button" class="secondary" data-again>Choose again</button>
      <button type="button" class="primary" data-use>Yes, that's it</button>`,
    );
    card
      .querySelector("[data-again]")!
      .addEventListener("click", release, { once: true });
    const use = card.querySelector<HTMLButtonElement>("[data-use]")!;
    use.addEventListener("click", () => {
      use.disabled = true;
      use.textContent = "Saving…";
      save(selector)
        .then(() => done(element, selector))
        .catch((error: Error) => {
          use.disabled = false;
          use.textContent = "Try again";
          const message = card.querySelector<HTMLElement>(".error")!;
          message.hidden = false;
          message.textContent = error.message;
        });
    });
  };

  const save = async (selector: string) => {
    const response = await fetch(session.api, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ token: session.t, selector, theme: themeId }),
    }).catch(() => null);
    const result = (await response?.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;
    if (!result?.ok)
      throw new Error(
        result?.error ?? "Couldn't reach the app. Check your connection.",
      );
  };

  const done = (element: HTMLElement, selector: string) => {
    window.removeEventListener("pointermove", onMove, true);
    window.removeEventListener("click", onPick, true);
    for (const type of ["pointerdown", "mousedown", "touchstart"])
      window.removeEventListener(type, swallow, true);
    document.documentElement.removeAttribute(PICKING_ATTR);
    // Let the menu loader on this page use the new icon right away.
    window.dispatchEvent(
      new CustomEvent("chopi:menu-button", { detail: selector }),
    );
    window.name = "";
    notifyApp(session, "saved");
    box.classList.remove("is-locked");
    locked = element;
    outline(element);
    const published = Boolean(document.getElementById("chopi-menu-data"));
    show(
      "happy",
      `<span class="eyebrow">Saved</span><h2>Yay, all set!</h2>
      <p>${
        published
          ? "Tap the menu icon to try it: your Chopi menu opens. You can close this window anytime."
          : "Publish your menu in the app, then this icon opens it for shoppers."
      }</p>`,
      `<button type="button" class="primary" data-finish>Done</button>`,
    );
    card
      .querySelector("[data-finish]")!
      .addEventListener("click", () => window.close());
  };

  window.addEventListener("pointermove", onMove, true);
  window.addEventListener("click", onPick, true);
  for (const type of ["pointerdown", "mousedown", "touchstart"])
    window.addEventListener(type, swallow, true);
}

const session = readSession();
if (session) {
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () => start(session), {
      once: true,
    });
  else start(session);
}
