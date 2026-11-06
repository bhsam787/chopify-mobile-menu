export type PreviewMode = "edit" | "preview";

const OPTIONS = [
  {
    mode: "edit",
    label: "Edit",
    // Pointer: click to select and change.
    path: "M4 2.5l8.5 5-3.8 1 2.3 4-1.6.9-2.3-4-3.1 2.6z",
  },
  {
    mode: "preview",
    label: "Preview",
    // Play: works like the store.
    path: "M5 3.2v9.6l7.6-4.8z",
  },
] as const;

/**
 * Edit / Preview switch for menu previews. Polaris has no segmented control,
 * so this is a small one in the admin's style (styles in editor.css).
 */
export function ModeSwitch({
  value,
  onChange,
}: {
  value: PreviewMode;
  onChange: (mode: PreviewMode) => void;
}) {
  return (
    <div className="chm-segmented" role="radiogroup" aria-label="Preview mode">
      {OPTIONS.map((option) => (
        <button
          key={option.mode}
          type="button"
          role="radio"
          aria-checked={value === option.mode}
          className="chm-segmented__option"
          title={
            option.mode === "edit"
              ? "Click things to select and change them"
              : "Try the menu like a shopper: tabs, accordions, sub-menus, swiping"
          }
          onClick={() => onChange(option.mode)}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
            <path d={option.path} fill="currentColor" />
          </svg>
          {option.label}
        </button>
      ))}
    </div>
  );
}
