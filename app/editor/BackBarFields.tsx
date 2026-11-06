import { useEffect, useRef } from "react";
import type { BackBar, Design } from "@chopi/menu-core";
import { BACK_STYLES } from "@chopi/menu-core";
import {
  MENU_CSS,
  renderBackBar,
  type RenderContext,
} from "@chopi/menu-renderer";
import { ColorField, FieldRow, SwitchField, TextField } from "./controls";

const STYLE_NAMES: Record<BackBar["style"], string> = {
  title: "Title bar",
  link: "Back link",
  pill: "Pill button",
  centered: "App bar",
  parent: "Parent name",
  large: "Large title",
  hidden: "Hidden",
};

/** A sub-menu's back bar as shoppers see it (a picture: never clickable). */
export function BackBarPreview({
  design,
  screenId,
  context,
  override,
}: {
  design: Design;
  screenId: string;
  context: Omit<RenderContext, "editor">;
  override?: BackBar;
}) {
  const host = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const shadow = element.shadowRoot ?? element.attachShadow({ mode: "open" });
    shadow.innerHTML = `<style>${MENU_CSS} :host{pointer-events:none} .chm-root,.chm-root *{pointer-events:none!important}</style>${renderBackBar(
      design,
      screenId,
      { ...context, editor: true },
      override,
    )}`;
  }, [design, screenId, context, override]);
  return <span ref={host} style={{ display: "block" }} />;
}

/**
 * How shoppers get back from a sub-menu: a style picker with a live preview
 * of each design, the "Back" text and colors, for all sub-menus or only
 * this one.
 */
export function BackBarFields({
  design,
  screenId,
  context,
  onChange,
}: {
  design: Design;
  screenId: string;
  context: Omit<RenderContext, "editor">;
  onChange: (design: Design, key?: string) => void;
}) {
  const screen = design.screens.find((candidate) => candidate.id === screenId);
  if (!screen) return null;
  const ownStyle = Boolean(screen.back);
  const bar: BackBar = screen.back ?? design.back ?? { style: "title" };

  const save = (next: BackBar, key?: string) =>
    onChange(
      ownStyle
        ? {
            ...design,
            screens: design.screens.map((candidate) =>
              candidate.id === screenId
                ? { ...candidate, back: next }
                : candidate,
            ),
          }
        : { ...design, back: next },
      key,
    );

  return (
    <s-stack gap="base">
      <s-text color="subdued">
        How shoppers go back from a sub-menu to the level above.
      </s-text>
      <div
        className="chm-back-styles"
        role="radiogroup"
        aria-label="Back style"
      >
        {BACK_STYLES.map((style) => (
          <button
            key={style}
            type="button"
            role="radio"
            aria-checked={bar.style === style}
            className="chm-back-style"
            onClick={() => save({ ...bar, style })}
          >
            <span className="chm-back-style__preview">
              {style === "hidden" ? (
                <span className="chm-back-style__none">No back bar</span>
              ) : (
                <BackBarPreview
                  design={design}
                  screenId={screenId}
                  context={context}
                  override={{ ...bar, style }}
                />
              )}
            </span>
            <span className="chm-back-style__name">{STYLE_NAMES[style]}</span>
          </button>
        ))}
      </div>
      {bar.style === "hidden" && (
        <s-banner tone="warning">
          Shoppers can only close the menu from this sub-menu. Keep a way back
          unless the sub-menu is meant as a dead end.
        </s-banner>
      )}
      {(bar.style === "link" ||
        bar.style === "pill" ||
        bar.style === "large") && (
        <TextField
          label="Text"
          value={bar.label ?? "Back"}
          onChange={(label) => save({ ...bar, label }, "back:label")}
        />
      )}
      {bar.style !== "hidden" && (
        <FieldRow>
          <ColorField
            label="Text color"
            value={bar.color}
            onChange={(color) =>
              save({ ...bar, color: color || undefined }, "back:color")
            }
          />
          <ColorField
            label="Background"
            value={bar.background}
            onChange={(background) =>
              save(
                { ...bar, background: background || undefined },
                "back:background",
              )
            }
          />
        </FieldRow>
      )}
      {design.screens.length > 2 && (
        <SwitchField
          label="Only for this sub-menu"
          checked={ownStyle}
          onChange={(own) =>
            onChange({
              ...design,
              screens: design.screens.map((candidate) =>
                candidate.id === screenId
                  ? { ...candidate, back: own ? bar : undefined }
                  : candidate,
              ),
            })
          }
        />
      )}
    </s-stack>
  );
}
