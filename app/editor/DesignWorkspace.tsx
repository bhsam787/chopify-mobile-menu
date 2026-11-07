import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Design } from "@chopi/menu-core";
import { MenuPreview, type PreviewContext } from "../components/MenuPreview";
import {
  DesignFocusContext,
  type DesignChange,
  type DesignFocus,
} from "./designControls";
import {
  setGuidePref,
  useGuidePrefs,
  type GuideLine,
} from "../components/GuideBot";
import { SEARCH_RESULTS_TARGET } from "./LiveSearchFields";
import { useSearchSample } from "./searchPreview";

/**
 * A design dialog's body: the settings on the left and the real menu on the
 * right, in a phone that stays in view. The part being designed is outlined
 * and labeled, and every change shows on the phone right away.
 */
export function DesignWorkspace({
  design,
  context,
  screenId,
  selectedId,
  alsoSelectedIds,
  label,
  hint,
  device,
  children,
}: {
  design: Design;
  context: PreviewContext;
  screenId: string;
  /** The item being designed (none: nothing is outlined). */
  selectedId?: string;
  /** More items designed together with it (outlined too). */
  alsoSelectedIds?: string[];
  /** Name shown on the highlighted part, e.g. "Banner". */
  label: string;
  /** The line above the phone when nothing is focused (default: "… is highlighted"). */
  hint?: string;
  device: { width: number; height: number };
  children: ReactNode;
}) {
  // Fits a phone of any size into the column without scrolling the dialog.
  const scale = Math.min(0.78, 640 / (device.height + 20));
  /** The part being pointed at, and the part last worked on (it stays). */
  const [hovered, setHovered] = useState<DesignFocus | null>(null);
  const [touched, setTouched] = useState<DesignFocus | null>(null);
  const focus = hovered ?? touched;

  // The helper's words: where it points, and what each change did.
  const [line, setLine] = useState<GuideLine | null>(null);
  const [announced, setAnnounced] = useState("");
  const lineId = useRef(0);
  const lastChangeAt = useRef(0);
  /** Changes to one setting in a row (a slider moving) share one bubble that keeps the first "from". */
  const burst = useRef<{
    key: string;
    id: number;
    from: DesignChange["from"];
    at: number;
  } | null>(null);
  const say = useCallback((change: DesignChange) => {
    const key = `${change.group}|${change.field}`;
    const now = Date.now();
    let current = burst.current;
    if (!current || current.key !== key || now - current.at > 1500)
      current = { key, id: ++lineId.current, from: change.from, at: now };
    current.at = now;
    burst.current = current;
    lastChangeAt.current = now;
    const backToStart =
      current.from.text === change.to.text &&
      current.from.color === change.to.color;
    const field = lowerFirst(change.field);
    setLine({
      id: current.id,
      caption: change.group,
      text: backToStart ? `You put ${field} back` : `You changed ${field}`,
      from: backToStart ? undefined : current.from,
      to: change.to,
    });
    setAnnounced(
      `${change.group ? `${change.group}, ` : ""}${change.field}: ${change.to.text}`,
    );
  }, []);
  const [api] = useState(() => ({ hover: setHovered, touch: setTouched }));
  const focusApi = useMemo(() => ({ ...api, say }), [api, say]);
  const settledAnnouncement = useSettled(announced);

  // A new part to point at: say which.
  const focusTarget = focus?.target;
  const focusName = focus?.label;
  useEffect(() => {
    burst.current = null;
    // A change just made keeps the floor (moving the mouse to the next card
    // must not talk over it).
    if (Date.now() - lastChangeAt.current < 1500) return;
    setLine({
      id: ++lineId.current,
      caption: focusName ? label : undefined,
      text: focusName
        ? `You're styling the ${lowerFirst(focusName)}`
        : `You're designing the ${lowerFirst(label)}`,
    });
    // Only when it points somewhere else (not when names re-render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, focusTarget]);
  const guide = useGuidePrefs().shown;
  const previewContext = useSearchSample(
    context,
    focus?.target === SEARCH_RESULTS_TARGET,
  );
  return (
    <DesignFocusContext.Provider value={focusApi}>
      {/* The outer box is the size container the layout responds to. */}
      <div className="chm-designws-wrap">
        <div className="chm-designws">
          <div className="chm-designws__settings">{children}</div>
          {/* Screen readers hear each change once a slider settles. */}
          <span className="chm-designws__live" aria-live="polite">
            {settledAnnouncement}
          </span>
          <aside className="chm-designws__phone" aria-label="Live preview">
            <div className="chm-designws__phone-inner">
              <span className="chm-designws__hint">
                <span className="chm-designws__dot" aria-hidden="true" />
                {focus
                  ? `Live preview · ${label} › ${focus.label}`
                  : (hint ?? `Live preview · ${label} is highlighted`)}
                {!guide && (
                  <button
                    type="button"
                    className="chm-designws__guide-on"
                    onClick={() => setGuidePref("shown", true)}
                  >
                    Show helper
                  </button>
                )}
              </span>
              <MenuPreview
                design={design}
                context={previewContext}
                screenId={screenId}
                width={device.width + 20}
                height={device.height + 20}
                scale={scale}
                selectedId={selectedId}
                alsoSelectedIds={alsoSelectedIds}
                highlightLabel={label}
                focusSelector={focus?.target ?? null}
                focusLabel={focus ? `${label} · ${focus.label}` : undefined}
                guide
                guideLine={line}
              />
            </div>
          </aside>
        </div>
      </div>
    </DesignFocusContext.Provider>
  );
}

/** `value` once it has stayed the same for a moment. */
function useSettled(value: string, delay = 700): string {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

/** "Top and bottom" → "top and bottom", for use inside a sentence. */
export function lowerFirst(words: string): string {
  return words.charAt(0).toLowerCase() + words.slice(1);
}
