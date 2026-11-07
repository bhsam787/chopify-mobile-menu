import { useEffect, useRef, type RefObject } from "react";

/**
 * Listens to a Polaris web component event ("hide", "afterhide"…). React 18
 * drops function props on custom elements (`onHide={…}` never fires), so the
 * listener is attached to the element directly.
 */
export function useElementEvent(
  ref: RefObject<HTMLElement | null>,
  type: string,
  handler: (() => void) | undefined,
) {
  // The latest handler, without re-subscribing on every render.
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const listener = () => latest.current?.();
    element.addEventListener(type, listener);
    return () => element.removeEventListener(type, listener);
  }, [ref, type]);
}
