import { useState, type ReactNode } from "react";
import type { Design } from "@chopify/menu-core";
import { MenuPreview, type PreviewContext } from "../components/MenuPreview";
import { DesignFocusContext, type DesignFocus } from "./designControls";

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
  const [api] = useState(() => ({ hover: setHovered, touch: setTouched }));
  const focus = hovered ?? touched;
  return (
    <DesignFocusContext.Provider value={api}>
      {/* The outer box is the size container the layout responds to. */}
      <div className="chm-designws-wrap">
        <div className="chm-designws">
          <div className="chm-designws__settings">{children}</div>
          <aside className="chm-designws__phone" aria-label="Live preview">
            <div className="chm-designws__phone-inner">
              <span className="chm-designws__hint">
                <span className="chm-designws__dot" aria-hidden="true" />
                {focus
                  ? `Live preview · ${label} › ${focus.label}`
                  : (hint ?? `Live preview · ${label} is highlighted`)}
              </span>
              <MenuPreview
                design={design}
                context={context}
                screenId={screenId}
                width={device.width + 20}
                height={device.height + 20}
                scale={scale}
                selectedId={selectedId}
                alsoSelectedIds={alsoSelectedIds}
                highlightLabel={label}
                focusSelector={focus?.target ?? null}
                focusLabel={focus ? `${label} · ${focus.label}` : undefined}
              />
            </div>
          </aside>
        </div>
      </div>
    </DesignFocusContext.Provider>
  );
}
