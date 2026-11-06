import { useEffect, useRef, useState } from "react";
import type {
  ActionFunctionArgs,
  LinksFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import type { Design } from "@chopify/menu-core";
import { findTemplate } from "@chopify/menu-core";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { unpublishMenu } from "../services/publish.server";
import { menuStats } from "../services/menu-stats.server";
import { buildPreviewContext } from "../services/preview-context.server";
import galleryStyles from "../components/gallery.css?url";
import {
  FeaturedMenu,
  FooterHelp,
  MenusTable,
  MetricsRow,
  TemplateTeaser,
  WelcomeCard,
  type HomeMenu,
  type TemplatePreview,
} from "../home/HomeCards";
import { SetupGuide } from "../home/SetupGuide";
import { embedEditorUrl, useEmbedStatus } from "../home/useEmbedStatus";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: galleryStyles },
];

/** Shown on an empty home (phone fan), then as "Try another look" tiles. */
const WELCOME_TEMPLATES = ["sliding", "studio", "accordion"];
const TEASER_TEMPLATES = ["spotlight", "sliding", "botanical"];

function templatePreviews(ids: string[]): TemplatePreview[] {
  return ids.flatMap((id) => {
    const template = findTemplate(id);
    return template
      ? [
          {
            id: template.id,
            name: template.name,
            description: template.description,
            design: template.build(),
          },
        ]
      : [];
  });
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const rows = await prisma.menu.findMany({
    where: { shop: { shop: session.shop } },
    select: {
      id: true,
      name: true,
      publishedAt: true,
      updatedAt: true,
      draft: true,
      published: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  const menus: HomeMenu[] = rows.map((menu) => ({
    id: menu.id,
    name: menu.name,
    published: Boolean(menu.publishedAt),
    usesCanvas: menuStats(menu.draft as unknown as Design).usesCanvas,
    updatedAt: menu.updatedAt.toISOString(),
  }));

  // The live menu as shoppers see it, else the latest draft.
  const liveRow = rows.find((menu) => menu.publishedAt && menu.published);
  const featuredRow = liveRow ?? rows[0];
  const featuredDesign = featuredRow
    ? ((liveRow ? liveRow.published : featuredRow.draft) as unknown as Design)
    : null;

  const welcome = rows.length ? [] : templatePreviews(WELCOME_TEMPLATES);
  const teaser = templatePreviews(
    rows.length ? TEASER_TEMPLATES : ["spotlight", "botanical", "mono"],
  );
  const { context } = await buildPreviewContext(admin, [
    ...(featuredDesign ? [featuredDesign] : []),
    ...welcome.map((template) => template.design),
    ...teaser.map((template) => template.design),
  ]);

  return {
    shop: session.shop,
    apiKey: process.env.SHOPIFY_API_KEY || "",
    menus,
    featured: featuredRow
      ? {
          id: featuredRow.id,
          design: featuredDesign!,
          publishedAt: featuredRow.publishedAt?.toISOString() ?? null,
          stats: menuStats(featuredDesign!),
        }
      : null,
    welcome,
    teaser,
    context,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const form = await request.formData();
  if (form.get("intent") !== "delete")
    return { ok: false as const, error: "Unknown action" };

  const menu = await prisma.menu.findFirst({
    where: { id: String(form.get("id")), shop: { shop: session.shop } },
    select: { id: true, publishedAt: true },
  });
  if (!menu) return { ok: true as const };
  try {
    // Live menu: take it off the storefront first, so the theme's menu shows again.
    if (menu.publishedAt) await unpublishMenu(admin);
    await prisma.menu.delete({ where: { id: menu.id } });
    return { ok: true as const };
  } catch (error) {
    console.error(`Menu delete failed for ${session.shop}`, error);
    return {
      ok: false as const,
      error: "Couldn't delete the menu. Please try again.",
    };
  }
};

export default function Home() {
  const { menus, featured, welcome, teaser, context, shop, apiKey } =
    useLoaderData<typeof loader>();
  const embed = useEmbedStatus();
  const fetcher = useFetcher<typeof action>();
  const [deleting, setDeleting] = useState<HomeMenu | null>(null);
  const deleteModal = useRef<HTMLElementTagNameMap["s-modal"]>(null);

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (fetcher.data.ok) {
      deleteModal.current?.hideOverlay();
      shopify.toast.show("Menu deleted");
    } else {
      shopify.toast.show(fetcher.data.error, { isError: true });
    }
  }, [fetcher.state, fetcher.data]);

  const hasMenu = menus.length > 0;
  const published = menus.some((menu) => menu.published);
  const featuredMenu = featured
    ? menus.find((menu) => menu.id === featured.id)
    : undefined;
  const embedUrl = embedEditorUrl(shop, apiKey);
  const guide = (
    <SetupGuide
      hasMenu={hasMenu}
      firstMenuId={menus[0]?.id}
      published={published}
      embed={embed}
      embedUrl={embedUrl}
    />
  );

  return (
    <s-page heading="Chopify Menu">
      <s-button slot="primary-action" variant="primary" href="/app/templates">
        Create menu
      </s-button>

      <s-stack gap="base">
        {embed === "inactive" && published && (
          <s-banner
            tone="warning"
            heading="Your menu is published but the app embed is off"
          >
            Shoppers still see your theme&apos;s menu. Turn on the Chopify Menu
            app embed in your theme editor to show yours.
            <s-button slot="secondary-actions" href={embedUrl} target="_blank">
              Turn on app embed
            </s-button>
          </s-banner>
        )}

        {!hasMenu && <WelcomeCard templates={welcome} context={context} />}
        {/* Until the menu is live the guide leads; afterwards it folds away at the bottom. */}
        {!published && guide}

        {featured && featuredMenu && (
          <>
            <MetricsRow
              menus={menus}
              featured={featuredMenu}
              stats={featured.stats}
              embed={embed}
              embedUrl={embedUrl}
            />
            <FeaturedMenu
              menu={featuredMenu}
              design={featured.design}
              context={context}
              publishedAt={featured.publishedAt}
              embed={embed}
              shop={shop}
            />
          </>
        )}

        {hasMenu && (
          <MenusTable
            menus={menus}
            onDelete={(menu) => {
              setDeleting(menu);
              deleteModal.current?.showOverlay();
            }}
          />
        )}

        <TemplateTeaser
          templates={teaser}
          context={context}
          hasMenu={hasMenu}
        />

        {published && guide}

        <FooterHelp />
      </s-stack>

      <s-modal
        id="delete-menu"
        heading={deleting ? `Delete “${deleting.name}”?` : "Delete menu?"}
        ref={deleteModal}
      >
        <s-stack gap="base">
          <s-paragraph>
            This deletes the menu and its version history. Your store&apos;s own
            navigation menus aren&apos;t touched.
          </s-paragraph>
          {deleting?.published && (
            <s-banner tone="warning">
              This menu is live. Your theme&apos;s own mobile menu will show
              again.
            </s-banner>
          )}
        </s-stack>
        <s-button
          slot="primary-action"
          variant="primary"
          tone="critical"
          loading={fetcher.state !== "idle"}
          onClick={() =>
            deleting &&
            fetcher.submit(
              { intent: "delete", id: deleting.id },
              { method: "post" },
            )
          }
        >
          Delete menu
        </s-button>
        <s-button
          slot="secondary-actions"
          commandFor="delete-menu"
          command="--hide"
        >
          Cancel
        </s-button>
      </s-modal>
    </s-page>
  );
}
