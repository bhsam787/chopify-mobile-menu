import { useMemo, useState } from "react";
import type { Design, TextEntry, UiTextKey } from "@chopify/menu-core";
import { builtInText, collectTexts, richToPlain } from "@chopify/menu-core";
import type { PreviewContext } from "../components/MenuPreview";
import { SearchField, TextField } from "./controls";
import { DesignWorkspace } from "./DesignWorkspace";
import { RichTextField } from "./RichTextField";

export interface ShopLanguage {
  locale: string;
  name: string;
  primary: boolean;
}

/**
 * Every text of the menu (main menu, sub-menus, canvas layers, built-in
 * words) with its translation per language: progress, "Missing only",
 * search, and the real phone preview in that language with the text's item
 * highlighted.
 */
export function TranslationsPanel({
  design,
  context,
  languages,
  device,
  onTranslate,
}: {
  design: Design;
  context: PreviewContext;
  languages: ShopLanguage[];
  device: { width: number; height: number };
  onTranslate: (locale: string, key: string, value: string) => void;
}) {
  const others = languages.filter((language) => !language.primary);
  const primary = languages.find((language) => language.primary);
  const [locale, setLocale] = useState(others[0]?.locale ?? "");
  const [missingOnly, setMissingOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState<TextEntry | null>(null);

  const entries = useMemo(() => collectTexts(design), [design]);
  const texts = design.translations[locale] ?? {};
  /** A built-in word is translated when it has a ready-made translation. */
  const valueOf = (entry: TextEntry) => texts[entry.key] ?? "";
  const builtIn = (entry: TextEntry) =>
    entry.key.startsWith("ui.")
      ? builtInText(locale, entry.key.slice(3) as UiTextKey)
      : undefined;
  const isDone = (entry: TextEntry) =>
    Boolean(valueOf(entry).trim() || builtIn(entry));
  const done = entries.filter(isDone).length;

  if (!others.length)
    return (
      <s-stack gap="base" alignItems="center">
        <s-box padding="large">
          <s-stack gap="small-200" alignItems="center">
            <s-heading>Your store sells in one language</s-heading>
            <s-paragraph color="subdued">
              Add languages in Shopify ({primary?.name ?? "your default"} is
              your default). They show up here to translate your menu.
            </s-paragraph>
            <s-button href="shopify://admin/settings/languages" target="_top">
              Add languages in Settings
            </s-button>
          </s-stack>
        </s-box>
      </s-stack>
    );

  const words = query.trim().toLowerCase();
  const shown = entries.filter(
    (entry) =>
      (!missingOnly || !isDone(entry)) &&
      (!words ||
        `${richToPlain(entry.original)} ${valueOf(entry)} ${entry.field}`
          .toLowerCase()
          .includes(words)),
  );
  const groups = [...new Set(shown.map((entry) => entry.group))];
  const language = others.find((candidate) => candidate.locale === locale);
  // Only the text being worked on is outlined (built-in words have no item).

  return (
    <DesignWorkspace
      design={design}
      context={{ ...context, locale }}
      screenId={focused?.screenId ?? design.screens[0].id}
      selectedId={focused?.nodeId}
      label={focused ? focused.field : (language?.name ?? locale)}
      hint={
        focused?.nodeId
          ? undefined
          : `Live preview in ${language?.name ?? locale}`
      }
      device={device}
    >
      <s-stack gap="base">
        <div className="chm-tr__bar">
          <div
            className="chm-lib__chips"
            role="radiogroup"
            aria-label="Language"
          >
            {others.map((candidate) => {
              const translated = entries.filter(
                (entry) =>
                  (
                    design.translations[candidate.locale]?.[entry.key] ?? ""
                  ).trim() ||
                  (entry.key.startsWith("ui.") &&
                    builtInText(
                      candidate.locale,
                      entry.key.slice(3) as UiTextKey,
                    )),
              ).length;
              return (
                <button
                  key={candidate.locale}
                  type="button"
                  role="radio"
                  aria-checked={candidate.locale === locale}
                  className="chm-lib__chip"
                  onClick={() => setLocale(candidate.locale)}
                >
                  {candidate.name}
                  <span className="chm-lib__count">
                    {Math.round((translated / (entries.length || 1)) * 100)}%
                  </span>
                </button>
              );
            })}
          </div>
          <div className="chm-tr__progress">
            <div className="chm-tr__progress-text">
              <strong>
                {done} of {entries.length} texts translated
              </strong>
              <span>
                Empty texts show in {primary?.name ?? "the default language"}.
              </span>
            </div>
            <div
              className="chm-tr__meter"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={entries.length}
              aria-valuenow={done}
            >
              <span
                style={{ width: `${(done / (entries.length || 1)) * 100}%` }}
              />
            </div>
          </div>
          <s-grid
            gridTemplateColumns="minmax(0, 1fr) auto"
            gap="small-200"
            alignItems="center"
          >
            <SearchField
              label="Search texts"
              labelAccessibilityVisibility="exclusive"
              placeholder="Search texts"
              value={query}
              onChange={setQuery}
            />
            <div className="chm-lib__chips">
              <button
                type="button"
                className="chm-lib__chip"
                aria-checked={missingOnly}
                role="switch"
                onClick={() => setMissingOnly((current) => !current)}
              >
                Missing only
                <span className="chm-lib__count">{entries.length - done}</span>
              </button>
            </div>
          </s-grid>
        </div>

        {groups.length === 0 ? (
          <div className="chm-lib__empty">
            <strong>
              {missingOnly && !words
                ? `Everything is translated into ${language?.name ?? locale}`
                : "No texts match"}
            </strong>
            {(missingOnly || words) && (
              <s-button
                onClick={() => {
                  setMissingOnly(false);
                  setQuery("");
                }}
              >
                Show all texts
              </s-button>
            )}
          </div>
        ) : (
          groups.map((group) => {
            const rows = shown.filter((entry) => entry.group === group);
            const missing = rows.filter((entry) => !isDone(entry)).length;
            return (
              <section key={group} className="chm-tr__group">
                <header className="chm-tr__group-head">
                  <h3>{group}</h3>
                  {missing > 0 ? (
                    <s-badge tone="warning">{missing} missing</s-badge>
                  ) : (
                    <s-badge tone="success" icon="check">
                      Done
                    </s-badge>
                  )}
                </header>
                {rows.map((entry) => {
                  const ready = builtIn(entry);
                  return (
                    <div
                      key={entry.key}
                      className={`chm-tr__row${focused?.key === entry.key ? " is-focused" : ""}${isDone(entry) ? "" : " is-missing"}`}
                      onFocus={() => setFocused(entry)}
                      onPointerDown={() => setFocused(entry)}
                    >
                      <div className="chm-tr__original">
                        <span className="chm-tr__field">{entry.field}</span>
                        <span className="chm-tr__text">
                          {richToPlain(entry.original)}
                        </span>
                      </div>
                      <div className="chm-tr__input">
                        {entry.rich ? (
                          <RichTextField
                            label={`${entry.field} in ${language?.name ?? locale}`}
                            value={valueOf(entry)}
                            placeholder={richToPlain(entry.original)}
                            onChange={(value) =>
                              onTranslate(locale, entry.key, value)
                            }
                          />
                        ) : (
                          <TextField
                            label={`${entry.field} in ${language?.name ?? locale}`}
                            labelAccessibilityVisibility="exclusive"
                            value={valueOf(entry)}
                            placeholder={
                              ready ? `${ready} (built in)` : entry.original
                            }
                            onChange={(value) =>
                              onTranslate(locale, entry.key, value)
                            }
                          />
                        )}
                        {!valueOf(entry) && !ready && (
                          <button
                            type="button"
                            className="chm-tr__copy"
                            onClick={() =>
                              onTranslate(locale, entry.key, entry.original)
                            }
                          >
                            Copy original
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>
            );
          })
        )}
      </s-stack>
    </DesignWorkspace>
  );
}
