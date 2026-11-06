import type { Design } from "@chopify/menu-core";
import { MenuPreview, type PreviewContext } from "./MenuPreview";

/**
 * A menu in a phone on a soft backdrop tinted with the menu's own accent
 * color, for galleries and the home page. Static stages are pictures (not
 * focusable, not clickable); interactive ones work like the store.
 */
export function PhoneStage({
  design,
  context,
  scale = 0.6,
  height = 760,
  interactive = false,
  size = "base",
}: {
  design: Design;
  context: PreviewContext;
  scale?: number;
  height?: number;
  interactive?: boolean;
  size?: "base" | "large";
}) {
  const tint = design.tokens.accent || "#8a8a8a";
  return (
    <div
      className={`chm-stage chm-stage--${size}`}
      style={{ "--chm-stage-tint": tint } as React.CSSProperties}
    >
      <div
        className={interactive ? undefined : "chm-stage__picture"}
        // React 18 doesn't know `inert`: set it as a plain attribute.
        ref={(element) => {
          if (element && !interactive) element.setAttribute("inert", "");
        }}
      >
        <MenuPreview
          design={design}
          context={context}
          scale={scale}
          height={height}
          interactive={interactive}
        />
      </div>
    </div>
  );
}
