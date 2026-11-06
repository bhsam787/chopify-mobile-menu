import { useEffect, useMemo, useRef, useState } from "react";
import type { Design, Node } from "@chopi/menu-core";
import type { RenderContext, ResolvedResource } from "@chopi/menu-renderer";
import { FragmentPreview } from "../components/FragmentPreview";
import { SearchField } from "./controls";
import {
  CATALOG_GROUPS,
  sectionCatalog,
  searchCatalog,
  type CatalogEntry,
  type CatalogGroup,
  type SectionPreset,
} from "./sectionCatalog";
import { SAMPLE_LOCALIZATION, samplesFrom, type Sample } from "./widgetSamples";

interface SectionLibraryProps {
  design: Design;
  context: Omit<RenderContext, "editor">;
  resources: Record<string, ResolvedResource>;
  onAdd: (preset: SectionPreset) => void;
}

const GROUP_HINTS: Record<CatalogGroup, string> = {
  "From templates":
    "Ready-made sections from the templates, with their sub-menus.",
  Navigation: "Cards, rows and links that take shoppers somewhere.",
  Promotion: "Banners, timers and messages that sell.",
  Store: "Store features: story circles, account, country and language.",
  Content: "Headings, text, images and reviews.",
  Layout: "Group, space and arrange sections.",
};

/**
 * "Add a section": search, filter by kind, live previews (the storefront
 * renderer with the store's own collections and the menu's colors), style
 * choices per section, and ready-made sections from the templates.
 */
export function SectionLibrary({
  design,
  context,
  resources,
  onAdd,
}: SectionLibraryProps) {
  const samples = useMemo(() => samplesFrom(resources), [resources]);
  const catalog = useMemo(() => sectionCatalog(), []);
  const previewContext = useMemo(
    () => ({ ...context, resources, localization: SAMPLE_LOCALIZATION }),
    [context, resources],
  );
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<CatalogGroup | null>(null);
  const root = useRef<HTMLDivElement>(null);
  // A new filter or search starts at the top of the results.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    root.current?.scrollIntoView({ block: "start" });
  }, [group, query]);

  const found = searchCatalog(catalog, query).filter(
    (entry) => !group || entry.group === group,
  );
  const shownGroups = CATALOG_GROUPS.filter((name) =>
    found.some((entry) => entry.group === name),
  );

  return (
    <div className="chm-lib" ref={root}>
      <div className="chm-lib__bar">
        <SearchField
          label="Search sections"
          labelAccessibilityVisibility="exclusive"
          placeholder="Search: banner, tabs, circles, reviews…"
          value={query}
          onChange={setQuery}
          focusOnMount
        />
        <div className="chm-lib__chips" role="radiogroup" aria-label="Kind">
          {[null, ...CATALOG_GROUPS].map((name) => (
            <button
              key={name ?? "all"}
              type="button"
              role="radio"
              aria-checked={group === name}
              className="chm-lib__chip"
              onClick={() => setGroup(name)}
            >
              {name === "From templates" && <span aria-hidden="true">✦ </span>}
              {name ?? "All"}
              <span className="chm-lib__count">
                {
                  searchCatalog(catalog, query).filter(
                    (entry) => !name || entry.group === name,
                  ).length
                }
              </span>
            </button>
          ))}
        </div>
      </div>

      {found.length === 0 ? (
        <div className="chm-lib__empty">
          <strong>No sections match “{query}”</strong>
          <span>Try another word, like banner, grid or links.</span>
          <s-button
            onClick={() => {
              setQuery("");
              setGroup(null);
            }}
          >
            Show all sections
          </s-button>
        </div>
      ) : (
        shownGroups.map((name) => (
          <section key={name} className="chm-lib__group">
            <header className="chm-lib__group-head">
              <h3>{name}</h3>
              <span>{GROUP_HINTS[name]}</span>
            </header>
            <div className="chm-lib__grid">
              {found
                .filter((entry) => entry.group === name)
                .map((entry) => (
                  <LibraryTile
                    key={entry.id}
                    entry={entry}
                    design={design}
                    samples={samples}
                    context={previewContext}
                    onAdd={onAdd}
                  />
                ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function LibraryTile({
  entry,
  design,
  samples,
  context,
  onAdd,
}: {
  entry: CatalogEntry;
  design: Design;
  samples: Sample[];
  context: Omit<RenderContext, "editor">;
  onAdd: (preset: SectionPreset) => void;
}) {
  const [styleId, setStyleId] = useState(entry.styles[0].id);
  const style =
    entry.styles.find((candidate) => candidate.id === styleId) ??
    entry.styles[0];
  const preview: Node = useMemo(() => style.preview(samples), [style, samples]);
  const add = () => onAdd(style.create(samples));
  const name =
    entry.styles.length > 1 ? `${entry.label} (${style.label})` : entry.label;

  return (
    <article className="chm-lib__tile">
      <button
        type="button"
        className="chm-lib__preview"
        onClick={add}
        aria-label={`Add ${name}`}
      >
        <FragmentPreview design={design} node={preview} context={context} />
        <span className="chm-lib__add-hint" aria-hidden="true">
          + Add
        </span>
      </button>
      <div className="chm-lib__body">
        <div className="chm-lib__title">
          <strong>{entry.label}</strong>
          {entry.template && (
            <span className="chm-lib__badge">{entry.template}</span>
          )}
        </div>
        <p>{entry.description}</p>
        {entry.styles.length > 1 && (
          <div
            className="chm-lib__styles"
            role="radiogroup"
            aria-label={`${entry.label} style`}
          >
            {entry.styles.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                role="radio"
                aria-checked={candidate.id === style.id}
                className="chm-lib__style"
                onClick={() => setStyleId(candidate.id)}
              >
                {candidate.label}
              </button>
            ))}
          </div>
        )}
        <div className="chm-lib__actions">
          <s-button icon="plus" onClick={add}>
            Add section
          </s-button>
        </div>
      </div>
    </article>
  );
}
