import { useCallback, useRef, useState } from "react";

interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

const LIMIT = 100;
/** Edits with the same key within this window merge into one undo step (typing). */
const COALESCE_MS = 600;
/** Canvas gesture keys end in the gesture's start time (`move:<id>:<ms>`). */
const GESTURE_KEY = /:\d{12,}$/;

/** Undo/redo state. `set(next, key)` merges rapid edits that share a key. */
export function useHistory<T>(initial: T) {
  const [history, setHistory] = useState<History<T>>({
    past: [],
    present: initial,
    future: [],
  });
  const last = useRef<{ key?: string; at: number }>({ at: 0 });

  const set = useCallback((next: T | ((current: T) => T), key?: string) => {
    // Decided outside the updater: React may run updaters twice (StrictMode),
    // and a second run would see the key already recorded and merge.
    const now = Date.now();
    const merge =
      key !== undefined &&
      last.current.key === key &&
      // A drag's key is unique to that gesture: merge it however long it
      // pauses. Other keys (typing) merge only while edits come quickly.
      (GESTURE_KEY.test(key) || now - last.current.at < COALESCE_MS);
    last.current = { key, at: now };
    setHistory((current) => {
      const value =
        typeof next === "function"
          ? (next as (current: T) => T)(current.present)
          : next;
      if (value === current.present) return current;
      return {
        past: merge
          ? current.past
          : [...current.past, current.present].slice(-LIMIT),
        present: value,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    last.current = { at: 0 };
    setHistory((current) =>
      current.past.length === 0
        ? current
        : {
            past: current.past.slice(0, -1),
            present: current.past[current.past.length - 1],
            future: [current.present, ...current.future],
          },
    );
  }, []);

  const redo = useCallback(() => {
    last.current = { at: 0 };
    setHistory((current) =>
      current.future.length === 0
        ? current
        : {
            past: [...current.past, current.present],
            present: current.future[0],
            future: current.future.slice(1),
          },
    );
  }, []);

  /** Replaces the state without an undo step (e.g. after loading). */
  const reset = useCallback(
    (value: T) => setHistory({ past: [], present: value, future: [] }),
    [],
  );

  return {
    value: history.present,
    set,
    undo,
    redo,
    reset,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
