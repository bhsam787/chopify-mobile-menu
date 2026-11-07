import type {
  ActionFunctionArgs,
  LinksFunction,
  LoaderFunctionArgs,
} from "react-router";
import {
  redirect,
  useLoaderData,
  useNavigation,
  useSearchParams,
  useSubmit,
} from "react-router";
import { useEffect, useRef, useState } from "react";
import type { Prisma } from "@prisma/client";
import {
  blankCanvas,
  blankSections,
  findTemplate,
  TEMPLATE_FEATURES,
  TEMPLATES,
  type TemplateFeature,
} from "@chopi/menu-core";
import { authenticate } from "../shopify.server";
import {
  cleanMenuName,
  freeMenuName,
  MENU_NAME_MAX,
} from "../models/menu-name";
import { uniqueMenuName } from "../models/menu.server";
import prisma from "../db.server";
import { MenuPreview } from "../components/MenuPreview";
import { PhoneStage } from "../components/PhoneStage";
import { TemplateDetails } from "../components/TemplateDetails";
import { FEATURE_LABELS, TEMPLATE_COPY } from "../components/templateCopy";
import galleryStyles from "../components/gallery.css?url";
import showcaseStyles from "../components/showcase.css?url";
import { ChopiStage } from "../home/HomeHero";
import { StartChoices } from "../templates/StartChoices";
import { TextField } from "../editor/controls";
import { buildPreviewContext } from "../services/preview-context.server";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: galleryStyles },
  { rel: "stylesheet", href: showcaseStyles },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  // To suggest a name that isn't taken yet ("Canvas menu 2").
  const existingNames = (
    await prisma.menu.findMany({
      where: { shop: { shop: session.shop } },
      select: { name: true },
    })
  ).map((menu) => menu.name);
  const templates = TEMPLATES.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    features: template.features,
    isNew: Boolean(template.isNew),
    design: template.build(),
  }));
  const { context } = await buildPreviewContext(
    admin,
    templates.map((template) => template.design),
  );
  return { templates, context, existingNames };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const templateId = String(form.get("templateId"));
  // "blank": an empty section menu; "canvas": an empty free-form canvas.
  const template =
    templateId === "blank" || templateId === "canvas"
      ? undefined
      : findTemplate(templateId);
  if (!template && templateId !== "blank" && templateId !== "canvas")
    throw new Response("Unknown template", { status: 400 });
  // The merchant's name, or a free default like "Canvas menu 2".
  const name =
    cleanMenuName(form.get("name")) ??
    (await uniqueMenuName(
      session.shop,
      template
        ? `${template.name} menu`
        : templateId === "canvas"
          ? "Canvas menu"
          : "My menu",
    ));

  const design = template
    ? // Remembered so a canvas made from it can be reverted to the stock template.
      { ...template.build(), template: template.id }
    : templateId === "canvas"
      ? blankCanvas()
      : blankSections();
  const menu = await prisma.menu.create({
    data: {
      name,
      schemaVersion: design.schemaVersion,
      draft: design as unknown as Prisma.InputJsonValue,
      shop: { connect: { shop: session.shop } },
    },
  });
  // A new canvas opens straight in the full-screen canvas editor.
  return redirect(
    templateId === "canvas"
      ? `/app/menus/${menu.id}?canvas=${design.screens[0].root.children[0].id}`
      : `/app/menus/${menu.id}`,
  );
};

export default function Templates() {
  const { templates, context, existingNames } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
  const pending =
    navigation.state !== "idle" ? navigation.formData?.get("templateId") : null;
  const [filter, setFilter] = useState<TemplateFeature | null>(null);
  /** The template (or "blank") being named before the menu is created. */
  const [naming, setNaming] = useState<{ id: string; label: string } | null>(
    null,
  );
  const [name, setName] = useState("");
  const nameModal = useRef<HTMLElementTagNameMap["s-modal"]>(null);
  const previewModal = useRef<HTMLElementTagNameMap["s-modal"]>(null);
  const previewId = searchParams.get("preview");
  const previewing = templates.find((template) => template.id === previewId);

  const startNaming = (id: string, base: string) => {
    setNaming({ id, label: base });
    setName(freeMenuName(base, existingNames));
    nameModal.current?.showOverlay();
  };
  const create = () => {
    if (!naming || !name.trim()) return;
    nameModal.current?.hideOverlay();
    submit({ templateId: naming.id, name: name.trim() }, { method: "post" });
  };
  // The preview lives in the URL, so Home's template tiles can open it.
  const openPreview = (id: string) =>
    setSearchParams(
      { preview: id },
      { replace: true, preventScrollReset: true },
    );
  const closePreview = () =>
    setSearchParams({}, { replace: true, preventScrollReset: true });

  useEffect(() => {
    if (previewing) previewModal.current?.showOverlay();
  }, [previewing]);

  const shown = filter
    ? templates.filter((template) => template.features.includes(filter))
    : templates;
  const usedFeatures = TEMPLATE_FEATURES.filter((feature) =>
    templates.some((template) => template.features.includes(feature)),
  );

  return (
    <s-page heading="Templates" inlineSize="large">
      <s-link slot="breadcrumb-actions" href="/app">
        Home
      </s-link>
      {/* Room between the page's sections, and above and below them. */}
      <s-stack gap="large-400" paddingBlock="large large-400">
        <section className="chm-hero" aria-labelledby="chm-gallery-title">
          <div className="chm-hero__main">
            <div className="chm-hero__copy">
              <span className="chm-hero__eyebrow">
                Template gallery · {templates.length} designs
              </span>
              <h2 id="chm-gallery-title" className="chm-hero__title">
                Find your <span className="chm-hero__brand">perfect look</span>
              </h2>
              <p className="chm-hero__lead">
                Start from a ready-made template, a blank menu or a free-form
                canvas. Every template comes filled in and works just like on
                your store, so try the tabs, sub-menus and swiping right here.
              </p>
            </div>
            <ChopiStage>
              Not sure where to start? Pick a template: you can change
              everything later!
            </ChopiStage>
          </div>
        </section>

        <StartChoices
          pending={typeof pending === "string" ? pending : null}
          onTemplates={() =>
            document
              .getElementById("templates")
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
          onBlank={() => startNaming("blank", "My menu")}
          onCanvas={() => startNaming("canvas", "Canvas menu")}
        />

        <div id="templates" className="chm-anchor">
          <s-section
            heading="Choose a template"
            subheading="Filter by what you need, try the phone, then use it as your starting point."
          >
            <s-text slot="supplemental" color="subdued">
              {shown.length} of {templates.length}
            </s-text>
            <div className="chm-looks">
              <div
                className="chm-filters"
                role="group"
                aria-label="Filter templates"
              >
                <button
                  type="button"
                  className="chm-filter"
                  aria-pressed={filter === null}
                  onClick={() => setFilter(null)}
                >
                  All
                  <span className="chm-filter__count">{templates.length}</span>
                </button>
                {usedFeatures.map((feature) => (
                  <button
                    key={feature}
                    type="button"
                    className="chm-filter"
                    aria-pressed={filter === feature}
                    onClick={() =>
                      setFilter((current) =>
                        current === feature ? null : feature,
                      )
                    }
                  >
                    {FEATURE_LABELS[feature]}
                    <span className="chm-filter__count">
                      {
                        templates.filter((template) =>
                          template.features.includes(feature),
                        ).length
                      }
                    </span>
                  </button>
                ))}
              </div>
              <div className="chm-looks__grid chm-looks__grid--gallery">
                {shown.map((template) => {
                  const copy = TEMPLATE_COPY[template.id];
                  return (
                    <div key={template.id} className="chm-look chm-look--live">
                      <div className="chm-look__stage">
                        <PhoneStage
                          design={template.design}
                          context={context}
                          scale={0.56}
                          size="large"
                          interactive
                        />
                        {(template.isNew || copy?.bestFor[0]) && (
                          <span
                            className={`chm-look__ribbon${template.isNew ? " is-new" : ""}`}
                          >
                            {template.isNew
                              ? "✦ New"
                              : `Great for ${copy?.bestFor[0]}`}
                          </span>
                        )}
                      </div>
                      <div className="chm-look__info">
                        <span className="chm-look__name">{template.name}</span>
                        <span className="chm-look__tagline">
                          {copy?.tagline ?? template.description}
                        </span>
                        {copy && (
                          <span className="chm-look__best">
                            Best for {copy.bestFor.join(" · ")}
                          </span>
                        )}
                        <span className="chm-look__chips">
                          {template.features.map((feature) => (
                            <span key={feature} className="chm-look__chip">
                              {FEATURE_LABELS[feature]}
                            </span>
                          ))}
                        </span>
                        <div className="chm-look__actions">
                          <s-button
                            variant="primary"
                            inlineSize="fill"
                            loading={pending === template.id}
                            disabled={Boolean(pending)}
                            onClick={() =>
                              startNaming(template.id, `${template.name} menu`)
                            }
                          >
                            Use template
                          </s-button>
                          <s-button
                            icon="maximize"
                            accessibilityLabel={`Preview ${template.name} larger`}
                            onClick={() => openPreview(template.id)}
                          >
                            Preview
                          </s-button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </s-section>
        </div>
      </s-stack>

      <s-modal
        id="preview-template"
        heading={previewing?.name ?? "Template"}
        size="large"
        ref={previewModal}
        onHide={closePreview}
      >
        {previewing && (
          <s-query-container>
            <s-grid
              gridTemplateColumns="@container (inline-size <= 560px) 1fr, auto 1fr"
              gap="large"
              alignItems="start"
            >
              {/* The phone stays in view while the details scroll, on a
                  stage in the template's own colors. */}
              <div className="chm-sticky">
                <div
                  className="chm-pv__stage"
                  style={
                    {
                      "--chm-stage-tint":
                        previewing.design.tokens.accent || "#8a8a8a",
                    } as React.CSSProperties
                  }
                >
                  <MenuPreview
                    design={previewing.design}
                    context={context}
                    scale={0.78}
                    interactive
                    guide
                  />
                </div>
              </div>
              <TemplateDetails
                description={previewing.description}
                copy={TEMPLATE_COPY[previewing.id]}
                featureLabels={previewing.features.map(
                  (feature) => FEATURE_LABELS[feature],
                )}
                isNew={previewing.isNew}
              />
            </s-grid>
          </s-query-container>
        )}
        <s-button
          slot="primary-action"
          variant="primary"
          disabled={!previewing || Boolean(pending)}
          onClick={() => {
            if (!previewing) return;
            previewModal.current?.hideOverlay();
            startNaming(previewing.id, `${previewing.name} menu`);
          }}
        >
          Use this template
        </s-button>
        <s-button
          slot="secondary-actions"
          commandFor="preview-template"
          command="--hide"
        >
          Close
        </s-button>
      </s-modal>

      <s-modal id="name-menu" heading="Name your menu" ref={nameModal}>
        <s-stack gap="base">
          <TextField
            label="Menu name"
            value={name}
            onChange={setName}
            details="Only you see this name, in the app. You can change it later."
          />
          {name.trim().length > MENU_NAME_MAX && (
            <s-text tone="critical">
              Use {MENU_NAME_MAX} characters or fewer.
            </s-text>
          )}
        </s-stack>
        <s-button
          slot="primary-action"
          variant="primary"
          disabled={!name.trim() || name.trim().length > MENU_NAME_MAX}
          onClick={create}
        >
          {naming?.id === "canvas" ? "Create and open canvas" : "Create menu"}
        </s-button>
        <s-button
          slot="secondary-actions"
          commandFor="name-menu"
          command="--hide"
        >
          Cancel
        </s-button>
      </s-modal>
    </s-page>
  );
}
