import type { Align } from "./arrange";

/** Glyphs for Figma's align row: a bar for the edge or center line and two boxes. */
export const ALIGN_PATHS: Record<Align | "dx" | "dy", string> = {
  left: "M3 2v12M5 4h8v3H5zM5 9h5v3H5z",
  hcenter: "M8 2v12M3 4h10v3H3zM5 9h6v3H5z",
  right: "M13 2v12M3 4h8v3H3zM6 9h5v3H6z",
  top: "M2 3h12M4 5h3v8H4zM9 5h3v5H9z",
  vmiddle: "M2 8h12M4 3h3v10H4zM9 5h3v6H9z",
  bottom: "M2 13h12M4 3h3v8H4zM9 6h3v5H9z",
  dx: "M2 3v10M14 3v10M6 5h4v6H6z",
  dy: "M3 2h10M3 14h10M5 6h6v4H5z",
};

const LABELS: Record<Align | "dx" | "dy", string> = {
  left: "Align left",
  hcenter: "Align horizontal centers",
  right: "Align right",
  top: "Align top",
  vmiddle: "Align vertical centers",
  bottom: "Align bottom",
  dx: "Distribute horizontal spacing",
  dy: "Distribute vertical spacing",
};

/**
 * Align and distribute, like Figma's toolbar. One layer aligns to its frame
 * (or the canvas); several align to each other. Distribute needs 3 or more.
 */
export function AlignBar({
  count,
  onAlign,
  onDistribute,
}: {
  count: number;
  onAlign: (align: Align) => void;
  onDistribute: (axis: "x" | "y") => void;
}) {
  const button = (
    key: Align | "dx" | "dy",
    onClick: () => void,
    disabled = false,
  ) => (
    <button
      key={key}
      type="button"
      className="cve-align__button"
      title={LABELS[key]}
      aria-label={LABELS[key]}
      disabled={disabled}
      onClick={onClick}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        aria-hidden="true"
      >
        <path d={ALIGN_PATHS[key]} />
      </svg>
    </button>
  );
  return (
    <div className="cve-align" role="toolbar" aria-label="Align">
      {(["left", "hcenter", "right", "top", "vmiddle", "bottom"] as const).map(
        (align) => button(align, () => onAlign(align)),
      )}
      <span className="cve-align__sep" />
      {button("dx", () => onDistribute("x"), count < 3)}
      {button("dy", () => onDistribute("y"), count < 3)}
    </div>
  );
}
