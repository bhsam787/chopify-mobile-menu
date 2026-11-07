import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ForwardedRef,
  type RefObject,
} from "react";

/** Outline and limbs: a deep green that goes with the bag. */
const INK = "#22401a";
const BAG = "#95BF47";
const BAG_SIDE = "#7CB04F";

/** A value in the helper's bubble, e.g. "28 px" or a color. */
export interface GuideValue {
  text: string;
  /** A color value: shown as a dot before the text. */
  color?: string;
}

/** What the helper says. */
export interface GuideLine {
  /** A new id pops a new bubble; the same id updates it in place (a slider moving). */
  id: number;
  /** Small words on top, e.g. "Changing spacing". */
  caption?: string;
  /** The main words, e.g. "Top and bottom". */
  text: string;
  /** The change, shown as "from → to" (`to` alone: just the new value). */
  from?: GuideValue;
  to?: GuideValue;
}

/** The merchant's choices about the helper (this browser only). */
export interface GuidePrefs {
  /** Shown at all. */
  shown: boolean;
  /** Dances while it has nothing to point at (else it just floats). */
  dancing: boolean;
}

const PREF_KEYS: Record<keyof GuidePrefs, string> = {
  shown: "chopi:guide-bot",
  dancing: "chopi:guide-dance",
};
/** Before the browser's choice is read (server render, hydration). */
const SERVER_PREFS: GuidePrefs = { shown: false, dancing: true };

// A browser preference, not shop data: one copy per tab, shared by every
// preview on the page so a change shows everywhere at once.
let prefs: GuidePrefs | null = null;
const prefListeners = new Set<() => void>();

function readPrefs(): GuidePrefs {
  if (!prefs) {
    try {
      prefs = {
        shown: localStorage.getItem(PREF_KEYS.shown) !== "off",
        dancing: localStorage.getItem(PREF_KEYS.dancing) !== "off",
      };
    } catch {
      prefs = { shown: true, dancing: true };
    }
  }
  return prefs;
}

function subscribePrefs(listener: () => void) {
  prefListeners.add(listener);
  return () => {
    prefListeners.delete(listener);
  };
}

/** Changes one of the helper's settings and remembers it. */
export function setGuidePref(key: keyof GuidePrefs, on: boolean) {
  prefs = { ...readPrefs(), [key]: on };
  try {
    if (on) localStorage.removeItem(PREF_KEYS[key]);
    else localStorage.setItem(PREF_KEYS[key], "off");
  } catch {
    // Storage blocked: the choice lasts until the page reloads.
  }
  prefListeners.forEach((listener) => listener());
}

/** The helper's settings, kept in sync across every preview on the page. */
export function useGuidePrefs(): GuidePrefs {
  return useSyncExternalStore(subscribePrefs, readPrefs, () => SERVER_PREFS);
}

const prefersStill = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/**
 * Keeps the helper beside `anchor` while the phone scrolls (`view` is the
 * scrolling area, `frame` the phone the helper hangs on): it points at it,
 * or up/down when it's out of sight. With no anchor it dances (or floats)
 * beside the phone's middle. Returns a cleanup.
 */
export function followTarget(
  bot: HTMLElement,
  frame: HTMLElement,
  view: HTMLElement,
  anchor: HTMLElement | null,
): () => void {
  let frameId = 0;
  let lastY: number | null = null;
  let stopMoving = 0;
  const place = () => {
    frameId = 0;
    const box = frame.getBoundingClientRect();
    const area = view.getBoundingClientRect();
    if (box.height === 0 || area.height === 0) return;
    let pose = "dance";
    let y = box.top + box.height / 2;
    const item = anchor?.isConnected ? anchor.getBoundingClientRect() : null;
    if (item && item.width > 0) {
      // Tall parts: point at their top area, where the name tag is.
      const center = item.top + Math.min(item.height, 96) / 2;
      pose = "side";
      y = Math.min(Math.max(center, area.top + 18), area.bottom - 18);
      if (item.bottom < area.top + 6) {
        pose = "up";
        y = area.top + 26;
      } else if (item.top > area.bottom - 6) {
        pose = "down";
        y = area.bottom - 26;
      }
    }
    y -= box.top;
    // Dancing ↔ pointing: glide between the two instead of jumping.
    if (bot.dataset.pose !== pose) {
      if (bot.classList.contains("is-shown") && !prefersStill())
        glideTo(bot, () => (bot.dataset.pose = pose));
      else bot.dataset.pose = pose;
    }
    bot.style.setProperty("--chm-bot-y", `${Math.round(y)}px`);
    if (!bot.classList.contains("is-shown")) {
      // Appears in place (no slide from the top), then glides from there.
      void bot.offsetHeight;
      bot.classList.add("is-shown");
    } else if (lastY !== null && Math.abs(y - lastY) > 6) {
      bot.classList.add("is-moving");
      window.clearTimeout(stopMoving);
      stopMoving = window.setTimeout(
        () => bot.classList.remove("is-moving"),
        650,
      );
    }
    lastY = y;
  };
  const schedule = () => {
    if (!frameId) frameId = requestAnimationFrame(place);
  };
  place();
  view.addEventListener("scroll", schedule, { passive: true });
  const observer = new ResizeObserver(schedule);
  observer.observe(view);
  observer.observe(frame);
  return () => {
    cancelAnimationFrame(frameId);
    window.clearTimeout(stopMoving);
    view.removeEventListener("scroll", schedule);
    observer.disconnect();
  };
}

/** How long a bubble stays after its last update. */
const SHOW_MS = { point: 1800, change: 2800 };

function Value({ value, before }: { value: GuideValue; before?: boolean }) {
  return (
    <span
      className={`chm-bot__value${before ? " chm-bot__value--before" : ""}`}
    >
      {value.color && (
        <span
          className="chm-bot__dot"
          style={{ background: value.color }}
          aria-hidden="true"
        />
      )}
      {value.text}
    </span>
  );
}

/** The speech bubble: it pops in on a new line and leaves a moment after the last update. */
function Bubble({ line }: { line: GuideLine | null }) {
  const [shown, setShown] = useState<GuideLine | null>(null);
  useEffect(() => {
    if (!line) return;
    setShown(line);
    const timer = window.setTimeout(
      () => setShown(null),
      line.to ? SHOW_MS.change : SHOW_MS.point,
    );
    return () => window.clearTimeout(timer);
  }, [line]);
  if (!shown) return null;
  return (
    <span key={shown.id} className="chm-bot__bubble" aria-hidden="true">
      {shown.caption && (
        <span className="chm-bot__caption">{shown.caption}</span>
      )}
      <span className="chm-bot__text">{shown.text}</span>
      {shown.to && (
        <span className="chm-bot__change">
          {shown.from && (
            <>
              <Value value={shown.from} before />
              <span className="chm-bot__arrow">→</span>
            </>
          )}
          <Value value={shown.to} />
        </span>
      )}
    </span>
  );
}

/**
 * Dance moves (see `.chm-bot[data-move]` in editor.css). While it has
 * nothing to point at, the helper switches to another one every few seconds.
 */
const MOVES = [
  "sway",
  "hop",
  "spin",
  "hello",
  "heart",
  "twist",
  "robot",
  "squish",
  "moonwalk",
  "peekaboo",
  "clap",
  "flip",
  "shy",
  "disco",
] as const;
/** How long each move lasts, and how long the glide into the next one takes. */
const MOVE_MS = 6000;
const BLEND_MS = 600;

/** The parts the moves animate. */
const MOVING_PARTS =
  ".chm-bot__float, .chm-bot__arm, .chm-bot__wave, .chm-bot__leg, .chm-bot__eyes, .chm-bot__heart, .chm-bot__blush";

/**
 * Applies a change to the helper (`change` sets data-move or data-pose) with
 * a glide instead of a jump: every part eases from where it is now to where
 * its new animation starts, and that animation waits for the glide.
 */
export function glideTo(bot: HTMLElement, change: () => void) {
  const parts = [...bot.querySelectorAll<SVGElement>(MOVING_PARTS)];
  const pose = (part: Element) => {
    const style = getComputedStyle(part);
    return { transform: style.transform, translate: style.translate };
  };
  const before = parts.map(pose);
  change();
  parts.forEach((part, index) => {
    const after = pose(part);
    if (
      after.transform === before[index].transform &&
      after.translate === before[index].translate
    )
      return;
    const animations = part
      .getAnimations()
      .filter(
        (animation) =>
          typeof CSSAnimation !== "undefined" &&
          animation instanceof CSSAnimation,
      );
    animations.forEach((animation) => animation.pause());
    const glide = part.animate([before[index], after], {
      duration: BLEND_MS,
      easing: "cubic-bezier(0.45, 0, 0.25, 1)",
    });
    const resume = () => animations.forEach((animation) => animation.play());
    glide.addEventListener("finish", resume);
    glide.addEventListener("cancel", resume);
  });
}

/**
 * Moves on to a new random move every few seconds while `dancing`; when
 * dancing stops, it glides into a calm float.
 */
function useDanceRoutine(
  bot: RefObject<HTMLDivElement | null>,
  dancing: boolean,
) {
  useEffect(() => {
    const element = bot.current;
    if (!element || prefersStill()) return;
    const apply = (change: () => void) => {
      if (element.classList.contains("is-shown")) glideTo(element, change);
      else change();
    };
    if (!dancing) {
      apply(() => {
        element.classList.add("is-still");
        delete element.dataset.move;
      });
      return;
    }
    let current: string = MOVES[0];
    apply(() => {
      element.classList.remove("is-still");
      element.dataset.move = current;
    });
    const timer = window.setInterval(() => {
      const others = MOVES.filter((move) => move !== current);
      current = others[Math.floor(Math.random() * others.length)];
      const next = current;
      if (element.dataset.pose === "dance")
        glideTo(element, () => (element.dataset.move = next));
      else element.dataset.move = next;
    }, MOVE_MS);
    return () => window.clearInterval(timer);
  }, [bot, dancing]);
}

/** Hands the element to both the caller's ref and our own. */
function setRefs<T>(own: { current: T | null }, outer: ForwardedRef<T>) {
  return (element: T | null) => {
    own.current = element;
    if (typeof outer === "function") outer(element);
    else if (outer) outer.current = element;
  };
}

/**
 * Chopi, the little shopping-bag robot that hangs beside a preview phone and
 * points at the part being worked on (`followTarget` moves it). Under its
 * feet: stop/start dancing, and hide.
 */
export const GuideBot = forwardRef<
  HTMLDivElement,
  {
    line?: GuideLine | null;
    /** "hero": standing on its own (the home page), always shown, never hidden from there. */
    variant?: "beside" | "hero";
  }
>(function GuideBot({ line = null, variant = "beside" }, ref) {
  const { dancing } = useGuidePrefs();
  const [leaving, setLeaving] = useState(false);
  const own = useRef<HTMLDivElement | null>(null);
  useDanceRoutine(own, dancing);
  // Each new line: a little hop, and the mouth chatters. Played as script
  // animations, so the drawing (and any glide on it) is never rebuilt.
  const lineId = line?.id;
  useEffect(() => {
    const bot = own.current;
    if (lineId === undefined || !bot || prefersStill()) return;
    bot
      .querySelector(".chm-bot__hop")
      ?.animate(
        [
          { transform: "none" },
          { transform: "translateY(-5px)", offset: 0.4 },
          { transform: "none" },
        ],
        { duration: 420, easing: "cubic-bezier(0.34, 1.5, 0.5, 1)" },
      );
    bot
      .querySelector(".chm-bot__mouth")
      ?.animate([{ transform: "none" }, { transform: "scaleY(1.35)" }], {
        duration: 160,
        iterations: 6,
        direction: "alternate",
        easing: "ease-in-out",
      });
  }, [lineId]);
  return (
    <div
      ref={setRefs(own, ref)}
      className={`chm-bot${variant === "hero" ? " chm-bot--hero is-shown" : ""}${leaving ? " is-leaving" : ""}`}
      data-pose="dance"
    >
      <Bubble line={line} />
      <span className="chm-bot__tools">
        <button
          type="button"
          className="chm-bot__tool"
          data-tip={dancing ? "Take a dance break" : "Dance again!"}
          aria-label={
            dancing ? "Stop the helper dancing" : "Let the helper dance"
          }
          onClick={() => setGuidePref("dancing", !dancing)}
        >
          {dancing ? (
            <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
              <rect
                x="3.5"
                y="3"
                width="3"
                height="10"
                rx="1"
                fill="currentColor"
              />
              <rect
                x="9.5"
                y="3"
                width="3"
                height="10"
                rx="1"
                fill="currentColor"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
              <path
                d="M5 3.2v9.6a.6.6 0 0 0 .9.5l7.4-4.8a.6.6 0 0 0 0-1L5.9 2.7a.6.6 0 0 0-.9.5Z"
                fill="currentColor"
              />
            </svg>
          )}
        </button>
        <button
          type="button"
          className="chm-bot__tool chm-bot__tool--hide"
          data-tip="Hide me for now"
          aria-label="Hide the helper"
          onClick={() => {
            if (leaving) return;
            setLeaving(true);
            // Time for the goodbye wave (see .chm-bot.is-leaving).
            window.setTimeout(() => setGuidePref("shown", false), 700);
          }}
        >
          <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
            <path
              d="m4 4 8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </span>
      <svg viewBox="0 0 96 100" aria-hidden="true" focusable="false">
        <g className="chm-bot__hop">
          <g className="chm-bot__float">
            <ellipse
              className="chm-bot__shadow"
              cx="44"
              cy="91"
              rx="18"
              ry="2.6"
              fill={INK}
              opacity="0.14"
            />
            <g className="chm-bot__leg chm-bot__leg--a">
              <path
                d="M35 72 L34.5 82"
                stroke={INK}
                strokeWidth="5"
                strokeLinecap="round"
              />
              <ellipse cx="35" cy="85" rx="6.4" ry="4.6" fill={INK} />
            </g>
            <g className="chm-bot__leg chm-bot__leg--b">
              <path
                d="M52 72 L52.5 82"
                stroke={INK}
                strokeWidth="5"
                strokeLinecap="round"
              />
              <ellipse cx="53.5" cy="85" rx="6.4" ry="4.6" fill={INK} />
            </g>
            <g className="chm-bot__wave">
              <path
                d="M22 50 Q12 53 10 62"
                fill="none"
                stroke={INK}
                strokeWidth="5"
                strokeLinecap="round"
              />
              <circle
                cx="10"
                cy="64"
                r="5"
                fill="#fff"
                stroke={INK}
                strokeWidth="2"
              />
            </g>
            {/* A round little shopping bag with a heart on its handle. */}
            <path
              d="M33 31 C33 15 55 15 55 31"
              fill="none"
              stroke={INK}
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <path
              className="chm-bot__heart"
              d="M44 19.5 C39.6 16.4 39 12.4 41.8 11.3 C43.1 10.8 44 11.8 44 12.5 C44 11.8 44.9 10.8 46.2 11.3 C49 12.4 48.4 16.4 44 19.5 Z"
              fill="#ff7aa2"
              stroke={INK}
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path
              d="M25 28 H63 Q67.6 28 68 32.6 L70.8 65 Q71.4 74 62.4 74 H25.6 Q16.6 74 17.2 65 L20 32.6 Q20.4 28 25 28 Z"
              fill={BAG}
            />
            <path
              d="M59 28 H63 Q67.6 28 68 32.6 L70.8 65 Q71.4 74 62.4 74 H61 Z"
              fill={BAG_SIDE}
              opacity="0.85"
            />
            <path
              d="M25 28 H63 Q67.6 28 68 32.6 L70.8 65 Q71.4 74 62.4 74 H25.6 Q16.6 74 17.2 65 L20 32.6 Q20.4 28 25 28 Z"
              fill="none"
              stroke={INK}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path
              d="M24.5 33 Q26 31.5 30 31.5"
              fill="none"
              stroke="#fff"
              strokeOpacity="0.7"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <circle cx="23.6" cy="37.5" r="1.2" fill="#fff" opacity="0.7" />
            {/* Big shiny eyes, low on the face: that's what makes it cute. */}
            <g className="chm-bot__eyes">
              <ellipse cx="35" cy="48" rx="4.8" ry="5.8" fill={INK} />
              <ellipse cx="52" cy="48" rx="4.8" ry="5.8" fill={INK} />
              <circle cx="36.7" cy="45.9" r="2" fill="#fff" />
              <circle cx="53.7" cy="45.9" r="2" fill="#fff" />
              <circle cx="33.6" cy="50.6" r="1" fill="#fff" />
              <circle cx="50.6" cy="50.6" r="1" fill="#fff" />
            </g>
            <ellipse
              cx="27.5"
              cy="56"
              rx="4.2"
              ry="2.6"
              className="chm-bot__blush"
              fill="#ff8fb3"
              opacity="0.85"
            />
            <ellipse
              cx="59.5"
              cy="56"
              rx="4.2"
              ry="2.6"
              className="chm-bot__blush"
              fill="#ff8fb3"
              opacity="0.85"
            />
            {/* A sweet "ω" smile with a tiny tongue peeking out. */}
            <g className="chm-bot__mouth">
              <path d="M41.6 57.4 Q43.5 61.4 45.4 57.4 Z" fill="#ff7aa2" />
              <path
                d="M38.4 55.4 Q40.9 59.4 43.5 56.6 Q46.1 59.4 48.6 55.4"
                fill="none"
                stroke={INK}
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
            <g className="chm-bot__arm">
              <g className="chm-bot__poke">
                <path
                  d="M66 50 Q75 48 81 47"
                  fill="none"
                  stroke={INK}
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <path
                  d="M86 45.6 L94 45"
                  stroke={INK}
                  strokeWidth="5.6"
                  strokeLinecap="round"
                />
                <path
                  d="M86 45.6 L94 45"
                  stroke="#fff"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
                <circle
                  cx="83.5"
                  cy="47.5"
                  r="5.4"
                  fill="#fff"
                  stroke={INK}
                  strokeWidth="2"
                />
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
});

/** "Show helper", shown only while the merchant has hidden the helper. */
export function GuideRestore() {
  const { shown } = useGuidePrefs();
  if (shown) return null;
  return (
    <button
      type="button"
      className="chm-guide-restore"
      onClick={() => setGuidePref("shown", true)}
    >
      Show helper
    </button>
  );
}
