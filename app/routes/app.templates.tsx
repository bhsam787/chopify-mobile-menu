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
  findTemplate,
  TEMPLATE_FEATURES,
  TEMPLATES,
  type TemplateFeature,
} from "@chopi/menu-core";
import { authenticate } from "../shopify.server";
import { cleanMenuName, MENU_NAME_MAX } from "../models/menu-name";
import { uniqueMenuName } from "../models/menu.server";
import prisma from "../db.server";
import { MenuPreview } from "../components/MenuPreview";
import { PhoneStage } from "../components/PhoneStage";
import { TemplateDetails } from "../components/TemplateDetails";
import { FEATURE_LABELS, TEMPLATE_COPY } from "../components/templateCopy";
import galleryStyles from "../components/gallery.css?url";
import showcaseStyles from "../components/showcase.css?url";
import { ChopiStage } from "../home/HomeHero";
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
  const template =
    templateId === "blank" ? undefined : findTemplate(templateId);
  if (templateId !== "blank" && !template)
    throw new Response("Unknown template", { status: 400 });
  // The merchant's name, or a free default like "Canvas menu 2".
  const name =
    cleanMenuName(form.get("name")) ??
    (await uniqueMenuName(
      session.shop,
      template ? `${template.name} menu` : "Canvas menu",
    ));

  if (!template) {
    const design = blankCanvas();
    const canvasId = design.screens[0].root.children[0].id;
    const menu = await prisma.menu.create({
      data: {
        name,
        schemaVersion: design.schemaVersion,
        draft: design as unknown as Prisma.InputJsonValue,
        shop: { connect: { shop: session.shop } },
      },
    });
    // The editor opens the full-screen canvas editor right away.
    return redirect(`/app/menus/${menu.id}?canvas=${canvasId}`);
  }

  // Remembered so a canvas made from it can be reverted to the stock template.
  const design = { ...template.build(), template: template.id };
  const menu = await prisma.menu.create({
    data: {
      name,
      schemaVersion: design.schemaVersion,
      draft: design as unknown as Prisma.InputJsonValue,
      shop: { connect: { shop: session.shop } },
    },
  });
  return redirect(`/app/menus/${menu.id}`);
};

/** `base`, or "base 2", "base 3"… when a menu already has that name. */
function freeName(base: string, taken: string[]): string {
  if (!taken.includes(base)) return base;
  let number = 2;
  while (taken.includes(`${base} ${number}`)) number++;
  return `${base} ${number}`;
}

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
    setName(freeName(base, existingNames));
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
  // "Start from scratch" on Home links here with #blank.
  useEffect(() => {
    if (window.location.hash === "#blank") startNaming("blank", "Canvas menu");
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <s-stack gap="base">
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
                Every template comes filled in with sample content and works
                just like on your store. Try the tabs, sub-menus and swiping
                right here, then make it yours: every text, photo, link and
                color can change.
              </p>
            </div>
            <ChopiStage>
              Every phone below works. Tap around, then pick your favorite!
            </ChopiStage>
          </div>
          {/* A blank page, for merchants who'd rather design their own. */}
          <div className="chm-hero__blank">
            <div className="chm-sketch" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="chm-hero__blank-copy">
              <span className="chm-hero__blank-title">
                Prefer a blank page?
                <s-badge tone="info" icon="layout-block">
                  Canvas
                </s-badge>
              </span>
              <span className="chm-hero__blank-text">
                Design freely in a full-screen editor: place text, images,
                shapes and widgets anywhere. It scales to every phone size.
              </span>
            </div>
            <s-button
              icon="plus"
              loading={pending === "blank"}
              disabled={Boolean(pending)}
              onClick={() => startNaming("blank", "Canvas menu")}
            >
              Start from scratch
            </s-button>
          </div>
        </section>

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
            details="Only you see this name, in the app and in your store's navigation menus. You can change it later."
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
          {naming?.id === "blank" ? "Create and open canvas" : "Create menu"}
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
