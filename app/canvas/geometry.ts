import type { Frame } from "@chopify/menu-core";

export type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
export const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

export interface Guide {
  axis: "x" | "y";
  /** Position of the line in canvas units. */
  at: number;
}

const MIN_SIZE = 8;

/** Size of the area a layer is placed in: the canvas, or the frame holding it. */
export interface Bounds {
  w: number;
  h: number;
}

/** Snap lines: the parent's edges and center, plus edges and centers of the sibling layers. */
function lines(others: Frame[], bounds: Bounds) {
  const xs = [
    0,
    bounds.w / 2,
    bounds.w,
    ...others.flatMap((frame) => [
      frame.x,
      frame.x + frame.w / 2,
      frame.x + frame.w,
    ]),
  ];
  const ys = [
    0,
    bounds.h / 2,
    bounds.h,
    ...others.flatMap((frame) => [
      frame.y,
      frame.y + frame.h / 2,
      frame.y + frame.h,
    ]),
  ];
  return { xs, ys };
}

/** Best snap of any of `points` to any line, within `threshold`. */
function closest(
  points: number[],
  targets: number[],
  threshold: number,
): { delta: number; at: number } | null {
  let best: { delta: number; at: number } | null = null;
  for (const point of points) {
    for (const target of targets) {
      const delta = target - point;
      if (
        Math.abs(delta) <= threshold &&
        (!best || Math.abs(delta) < Math.abs(best.delta))
      )
        best = { delta, at: target };
    }
  }
  return best;
}

/** Moves a frame, snapping its edges/center to guides (Figma-like smart guides). */
export function snapMove(
  frame: Frame,
  others: Frame[],
  bounds: Bounds,
  threshold: number,
  enabled: boolean,
): { frame: Frame; guides: Guide[] } {
  const rounded = { ...frame, x: Math.round(frame.x), y: Math.round(frame.y) };
  if (!enabled) return { frame: rounded, guides: [] };
  const { xs, ys } = lines(others, bounds);
  const snapX = closest(
    [frame.x, frame.x + frame.w / 2, frame.x + frame.w],
    xs,
    threshold,
  );
  const snapY = closest(
    [frame.y, frame.y + frame.h / 2, frame.y + frame.h],
    ys,
    threshold,
  );
  const guides: Guide[] = [];
  const result = { ...rounded };
  if (snapX) {
    result.x = Math.round(frame.x + snapX.delta);
    guides.push({ axis: "x", at: snapX.at });
  }
  if (snapY) {
    result.y = Math.round(frame.y + snapY.delta);
    guides.push({ axis: "y", at: snapY.at });
  }
  return { frame: result, guides };
}

/**
 * Resizes a frame by dragging `handle` by (dx, dy). Moving edges snap to
 * guides; `keepRatio` (Shift) keeps the aspect ratio.
 */
export function resize(
  start: Frame,
  handle: Handle,
  dx: number,
  dy: number,
  others: Frame[],
  bounds: Bounds,
  threshold: number,
  options: { snap: boolean; keepRatio: boolean },
): { frame: Frame; guides: Guide[] } {
  let { x, y, w, h } = start;
  const right = start.x + start.w;
  const bottom = start.y + start.h;
  if (handle.includes("e")) w = Math.max(MIN_SIZE, start.w + dx);
  if (handle.includes("s")) h = Math.max(MIN_SIZE, start.h + dy);
  if (handle.includes("w")) {
    w = Math.max(MIN_SIZE, start.w - dx);
    x = right - w;
  }
  if (handle.includes("n")) {
    h = Math.max(MIN_SIZE, start.h - dy);
    y = bottom - h;
  }

  const guides: Guide[] = [];
  if (options.snap) {
    const { xs, ys } = lines(others, bounds);
    if (handle.includes("e")) {
      const snap = closest([x + w], xs, threshold);
      if (snap) ((w += snap.delta), guides.push({ axis: "x", at: snap.at }));
    }
    if (handle.includes("w")) {
      const snap = closest([x], xs, threshold);
      if (snap)
        ((x += snap.delta),
          (w -= snap.delta),
          guides.push({ axis: "x", at: snap.at }));
    }
    if (handle.includes("s")) {
      const snap = closest([y + h], ys, threshold);
      if (snap) ((h += snap.delta), guides.push({ axis: "y", at: snap.at }));
    }
    if (handle.includes("n")) {
      const snap = closest([y], ys, threshold);
      if (snap)
        ((y += snap.delta),
          (h -= snap.delta),
          guides.push({ axis: "y", at: snap.at }));
    }
  }

  if (options.keepRatio && start.w > 0 && start.h > 0) {
    const ratio = start.w / start.h;
    if (handle === "n" || handle === "s") w = h * ratio;
    else h = w / ratio;
    if (handle.includes("w")) x = right - w;
    if (handle.includes("n")) y = bottom - h;
  }

  return {
    frame: {
      x: Math.round(x),
      y: Math.round(y),
      w: Math.round(Math.max(MIN_SIZE, w)),
      h: Math.round(Math.max(MIN_SIZE, h)),
    },
    guides,
  };
}
