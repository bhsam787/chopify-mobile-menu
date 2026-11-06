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
} from "@chopify/menu-core";
import { authenticate } from "../shopify.server";
import { cleanMenuName, MENU_NAME_MAX } from "../models/menu-name";
import { uniqueMenuName } from "../models/menu.server";
import prisma from "../db.server";
import { MenuPreview } from "../components/MenuPreview";
import { PhoneStage } from "../components/PhoneStage";
import { TemplateDetails } from "../components/TemplateDetails";
import { TEMPLATE_COPY } from "../components/templateCopy";
import { menuStats } from "../services/menu-stats.server";
import galleryStyles from "../components/gallery.css?url";
import { TextField } from "../editor/controls";
import { buildPreviewContext } from "../services/preview-context.server";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: galleryStyles },
];

const FEATURE_LABELS: Record<TemplateFeature, string> = {
  tabs: "Tabs",
  "image-cards": "Image cards",
  "fold-outs": "Fold-out links",
  "story-circles": "Story circles",
  banners: "Promo banners",
  sliding: "Sliding sub-menus",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  // To suggest a name that isn't taken yet ("Canvas menu 2").
  const existingNames = (
    await prisma.menu.findMany({
      where: { shop: { shop: session.shop } },
      select: { name: true },
    })
  ).map((menu) => menu.name);
  const templates = TEMPLATES.map((template) => {
    const design = template.build();
    const { links, subMenus } = menuStats(design);
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      features: template.features,
      isNew: Boolean(template.isNew),
      numbers: {
        sections: design.screens[0].root.children.length,
        subMenus,
        links,
      },
      design,
    };
  });
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
        <s-section>
          <s-query-container>
            <s-grid
              gridTemplateColumns="@container (inline-size <= 520px) 1fr, auto 1fr auto"
              gap="base"
              alignItems="center"
            >
              <div className="chm-sketch" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
              <s-stack gap="small-200">
                <s-stack direction="inline" gap="small-200" alignItems="center">
                  <s-heading>Start with a blank canvas</s-heading>
                  <s-badge tone="info" icon="layout-block">
                    Canvas
                  </s-badge>
                </s-stack>
                <s-paragraph color="subdued">
                  Design your menu freely in a full-screen editor: place text,
                  images, shapes and widgets anywhere, like in Figma. It scales
                  to every phone size.
                </s-paragraph>
              </s-stack>
              <s-button
                icon="plus"
                loading={pending === "blank"}
                disabled={Boolean(pending)}
                onClick={() => startNaming("blank", "Canvas menu")}
              >
                Start from scratch
              </s-button>
            </s-grid>
          </s-query-container>
        </s-section>

        <s-section
          heading="Choose a template"
          subheading="Each one is filled in with sample content and works like on your store: try the tabs, sub-menus and swiping. Change anything afterwards."
        >
          <s-text slot="supplemental" color="subdued">
            {shown.length} of {templates.length}
          </s-text>
          <s-stack gap="base">
            <s-stack direction="inline" gap="small-200">
              <s-clickable-chip
                color={filter === null ? "strong" : "base"}
                accessibilityLabel="Show all templates"
                onClick={() => setFilter(null)}
              >
                {filter === null && <s-icon slot="graphic" type="check" />}
                All
              </s-clickable-chip>
              {usedFeatures.map((feature) => (
                <s-clickable-chip
                  key={feature}
                  color={filter === feature ? "strong" : "base"}
                  accessibilityLabel={`Show templates with ${FEATURE_LABELS[feature].toLowerCase()}`}
                  onClick={() =>
                    setFilter((current) =>
                      current === feature ? null : feature,
                    )
                  }
                >
                  {filter === feature && <s-icon slot="graphic" type="check" />}
                  {FEATURE_LABELS[feature]}
                </s-clickable-chip>
              ))}
            </s-stack>
            <s-grid
              gridTemplateColumns="repeat(auto-fill, minmax(260px, 1fr))"
              gap="base"
            >
              {shown.map((template) => (
                <div key={template.id} className="chm-tile">
                  <s-box
                    border="base"
                    borderRadius="large"
                    padding="small"
                    background="base"
                    blockSize="100%"
                  >
                    {/* A column whose buttons sit at the bottom, so tiles in a row line up. */}
                    <div className="chm-tile__body">
                      <PhoneStage
                        design={template.design}
                        context={context}
                        scale={0.56}
                        size="large"
                        interactive
                      />
                      <s-stack gap="small-300">
                        <s-stack
                          direction="inline"
                          gap="small-200"
                          alignItems="center"
                        >
                          <s-heading>{template.name}</s-heading>
                          {template.isNew && <s-badge tone="info">New</s-badge>}
                        </s-stack>
                        <s-paragraph color="subdued" lineClamp={2}>
                          {TEMPLATE_COPY[template.id]?.tagline ??
                            template.description}
                        </s-paragraph>
                        {TEMPLATE_COPY[template.id] && (
                          <s-text color="subdued">
                            Best for{" "}
                            {TEMPLATE_COPY[template.id].bestFor.join(" · ")}
                          </s-text>
                        )}
                        <s-stack direction="inline" gap="small-200">
                          {template.features.map((feature) => (
                            <s-badge key={feature} tone="neutral">
                              {FEATURE_LABELS[feature]}
                            </s-badge>
                          ))}
                        </s-stack>
                      </s-stack>
                      <div className="chm-tile__actions">
                        <s-grid gridTemplateColumns="1fr auto" gap="small-200">
                          <s-button
                            variant="primary"
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
                        </s-grid>
                      </div>
                    </div>
                  </s-box>
                </div>
              ))}
            </s-grid>
          </s-stack>
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
              {/* The phone stays in view while the details scroll. */}
              <div className="chm-sticky">
                <MenuPreview
                  design={previewing.design}
                  context={context}
                  scale={0.8}
                  interactive
                />
              </div>
              <TemplateDetails
                description={previewing.description}
                copy={TEMPLATE_COPY[previewing.id]}
                numbers={previewing.numbers}
                featureLabels={previewing.features.map(
                  (feature) => FEATURE_LABELS[feature],
                )}
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
