import type { Design } from "@chopify/menu-core";
import type { PreviewContext } from "../components/MenuPreview";
import { MenuPreview } from "../components/MenuPreview";
import { PhoneStage } from "../components/PhoneStage";
import type { EmbedStatus } from "./useEmbedStatus";

export interface HomeMenu {
  id: string;
  name: string;
  published: boolean;
  usesCanvas: boolean;
  updatedAt: string;
}

export interface TemplatePreview {
  id: string;
  name: string;
  description: string;
  design: Design;
}

const EMBED_LABEL: Record<
  EmbedStatus,
  [string, "success" | "warning" | "neutral"]
> = {
  loading: ["Checking…", "neutral"],
  active: ["On", "success"],
  inactive: ["Off", "warning"],
  unknown: ["Check in theme", "neutral"],
};

function Metric({
  label,
  href,
  target,
  children,
}: {
  label: string;
  href: string;
  target?: "_blank";
  children: React.ReactNode;
}) {
  return (
    <s-clickable
      href={href}
      target={target}
      paddingBlock="small-400"
      paddingInline="small-100"
      borderRadius="base"
    >
      <s-grid gap="small-300">
        <s-heading>{label}</s-heading>
        <s-stack direction="inline" gap="small-200" alignItems="center">
          {children}
        </s-stack>
      </s-grid>
    </s-clickable>
  );
}

/** Numbers at a glance (Shopify's metrics card): only what the app knows for sure. */
export function MetricsRow({
  menus,
  featured,
  stats,
  embed,
  embedUrl,
}: {
  menus: HomeMenu[];
  featured: HomeMenu;
  stats: { links: number; subMenus: number };
  embed: EmbedStatus;
  embedUrl: string;
}) {
  const live = menus.find((menu) => menu.published);
  const [embedLabel, embedTone] = EMBED_LABEL[embed];
  const editUrl = `/app/menus/${featured.id}`;
  return (
    <s-section accessibilityLabel="Menu at a glance">
      <s-query-container>
        <s-grid
          gridTemplateColumns="@container (inline-size <= 480px) 1fr, 1fr auto 1fr auto 1fr auto 1fr"
          gap="small"
        >
          <Metric
            label="Live menu"
            href={live ? `/app/menus/${live.id}` : editUrl}
          >
            {live ? (
              <s-text>{live.name}</s-text>
            ) : (
              <s-badge tone="neutral">Not published</s-badge>
            )}
          </Metric>
          <s-divider direction="block" />
          <Metric label="Links" href={editUrl}>
            <s-text>{stats.links.toLocaleString()}</s-text>
          </Metric>
          <s-divider direction="block" />
          <Metric label="Sub-menus" href={editUrl}>
            <s-text>{stats.subMenus.toLocaleString()}</s-text>
          </Metric>
          <s-divider direction="block" />
          <Metric label="App embed" href={embedUrl} target="_blank">
            <s-badge tone={embedTone}>{embedLabel}</s-badge>
          </Metric>
        </s-grid>
      </s-query-container>
    </s-section>
  );
}

function StatusLine({
  icon,
  tone,
  children,
}: {
  icon: "check-circle" | "alert-circle" | "link" | "clock";
  tone?: "success" | "warning";
  children: React.ReactNode;
}) {
  return (
    <s-grid gridTemplateColumns="auto minmax(0, 1fr)" gap="small-200">
      <s-icon type={icon} tone={tone} color={tone ? undefined : "subdued"} />
      <s-text>{children}</s-text>
    </s-grid>
  );
}

/**
 * The live menu (or the latest draft) running in a phone, next to its
 * status and the main actions: the merchant sees and tries what shoppers get.
 */
export function FeaturedMenu({
  menu,
  design,
  context,
  publishedAt,
  embed,
  shop,
}: {
  menu: HomeMenu;
  design: Design;
  context: PreviewContext;
  publishedAt: string | null;
  embed: EmbedStatus;
  shop: string;
}) {
  const dateFormat = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return (
    <s-section
      heading={menu.published ? "Live on your store" : "Your latest menu"}
      subheading={
        menu.published
          ? "What shoppers see when they open the menu on their phone. Try it: tabs, sub-menus and swiping work here too."
          : "Not on your store yet. Publish it when you're happy with it."
      }
    >
      <s-badge
        slot="supplemental"
        tone={menu.published ? "success" : "neutral"}
      >
        {menu.published ? "Live" : "Draft"}
      </s-badge>
      <s-query-container>
        <s-grid
          gridTemplateColumns="@container (inline-size <= 560px) 1fr, 340px 1fr"
          gap="large"
          alignItems="center"
        >
          <PhoneStage
            design={design}
            context={context}
            scale={0.56}
            size="large"
            interactive
          />
          <s-stack gap="base">
            <s-stack gap="small-200">
              <s-stack direction="inline" gap="small-200" alignItems="center">
                <s-heading>{menu.name}</s-heading>
                {menu.usesCanvas && (
                  <s-badge tone="info" icon="layout-block">
                    Canvas
                  </s-badge>
                )}
              </s-stack>
              <s-text color="subdued">
                Last edited {dateFormat.format(new Date(menu.updatedAt))}
              </s-text>
            </s-stack>
            <s-stack gap="small-200">
              {publishedAt ? (
                <StatusLine icon="check-circle" tone="success">
                  Published {dateFormat.format(new Date(publishedAt))}
                </StatusLine>
              ) : (
                <StatusLine icon="clock">Not published yet</StatusLine>
              )}
              {embed === "active" ? (
                <StatusLine icon="check-circle" tone="success">
                  App embed is on in your theme
                </StatusLine>
              ) : embed === "inactive" ? (
                <StatusLine icon="alert-circle" tone="warning">
                  App embed is off: shoppers still see your theme&apos;s menu
                </StatusLine>
              ) : null}
              <StatusLine icon="link">
                Links stay up to date by themselves: renamed collections and
                products need no republish
              </StatusLine>
            </s-stack>
            <s-stack direction="inline" gap="small-200">
              <s-button variant="primary" href={`/app/menus/${menu.id}`}>
                {menu.published ? "Edit menu" : "Edit and publish"}
              </s-button>
              <s-button href={`https://${shop}`} target="_blank" icon="view">
                View store
              </s-button>
            </s-stack>
          </s-stack>
        </s-grid>
      </s-query-container>
    </s-section>
  );
}

/** First visit: what the app does, shown with three template phones. */
export function WelcomeCard({
  templates,
  context,
}: {
  templates: TemplatePreview[];
  context: PreviewContext;
}) {
  return (
    <s-section>
      <s-query-container>
        <s-grid
          gridTemplateColumns="@container (inline-size <= 640px) 1fr, 1fr 1fr"
          gap="large"
          alignItems="center"
        >
          <s-stack gap="base">
            <s-stack gap="small-200">
              <s-heading>Give shoppers an app-like mobile menu</s-heading>
              <s-paragraph color="subdued">
                Most shoppers browse on their phone. Replace your theme&apos;s
                plain mobile menu with tabs, image cards, sub-menus and
                promotions, without touching your theme code.
              </s-paragraph>
            </s-stack>
            <s-unordered-list>
              <s-list-item>
                Ready-made templates, filled in and ready to publish
              </s-list-item>
              <s-list-item>A live editor with a real phone preview</s-list-item>
              <s-list-item>
                A Figma-like canvas to design your own from scratch
              </s-list-item>
            </s-unordered-list>
            <s-stack direction="inline" gap="small-200">
              <s-button variant="primary" href="/app/templates">
                Choose a template
              </s-button>
              <s-button href="/app/templates#blank">
                Start from scratch
              </s-button>
            </s-stack>
          </s-stack>
          <div className="chm-fan" aria-hidden="true">
            {templates.slice(0, 3).map((template) => (
              <div
                key={template.id}
                className="chm-fan__phone"
                ref={(element) => element?.setAttribute("inert", "")}
              >
                <MenuPreview
                  design={template.design}
                  context={context}
                  scale={0.42}
                />
              </div>
            ))}
          </div>
        </s-grid>
      </s-query-container>
    </s-section>
  );
}

/** Three templates as tiles; each opens its preview in the gallery. */
export function TemplateTeaser({
  templates,
  context,
  hasMenu,
}: {
  templates: TemplatePreview[];
  context: PreviewContext;
  hasMenu: boolean;
}) {
  return (
    <s-section
      heading={hasMenu ? "Try another look" : "Popular templates"}
      subheading="Every template comes filled in with sample content. Change anything afterwards."
    >
      <s-button slot="secondary-actions" href="/app/templates">
        See all templates
      </s-button>
      <s-query-container>
        <s-grid
          gridTemplateColumns="@container (inline-size <= 640px) 1fr, 1fr 1fr 1fr"
          gap="base"
        >
          {templates.map((template) => (
            <s-clickable
              key={template.id}
              href={`/app/templates?preview=${template.id}`}
              accessibilityLabel={`Preview the ${template.name} template`}
              borderRadius="large"
            >
              <div className="chm-tile">
                <s-box border="base" borderRadius="large" padding="small">
                  <s-stack gap="small">
                    <PhoneStage
                      design={template.design}
                      context={context}
                      scale={0.5}
                    />
                    <s-stack gap="small-500">
                      <s-text type="strong">{template.name}</s-text>
                      <s-paragraph color="subdued" lineClamp={2}>
                        {template.description}
                      </s-paragraph>
                    </s-stack>
                  </s-stack>
                </s-box>
              </div>
            </s-clickable>
          ))}
        </s-grid>
      </s-query-container>
    </s-section>
  );
}

/** All menus; one at a time is live. */
export function MenusTable({
  menus,
  onDelete,
}: {
  menus: HomeMenu[];
  onDelete: (menu: HomeMenu) => void;
}) {
  const dateFormat = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return (
    <s-section
      heading="Your menus"
      subheading="Make as many as you like. Your store shows one at a time: publishing a menu replaces the live one."
      padding="none"
    >
      <s-button slot="secondary-actions" href="/app/templates" icon="plus">
        Create menu
      </s-button>
      <s-table>
        <s-table-header-row>
          <s-table-header listSlot="primary">Name</s-table-header>
          <s-table-header listSlot="inline">Status</s-table-header>
          <s-table-header listSlot="labeled">Last edited</s-table-header>
          <s-table-header>
            <s-text accessibilityVisibility="exclusive">Actions</s-text>
          </s-table-header>
        </s-table-header-row>
        <s-table-body>
          {menus.map((menu) => (
            <s-table-row key={menu.id}>
              <s-table-cell>
                <s-stack direction="inline" gap="small-200" alignItems="center">
                  <s-link href={`/app/menus/${menu.id}`}>{menu.name}</s-link>
                  {menu.usesCanvas && (
                    <s-badge tone="info" icon="layout-block">
                      Canvas
                    </s-badge>
                  )}
                </s-stack>
              </s-table-cell>
              <s-table-cell>
                <s-badge tone={menu.published ? "success" : "neutral"}>
                  {menu.published ? "Live on store" : "Draft"}
                </s-badge>
              </s-table-cell>
              <s-table-cell>
                {dateFormat.format(new Date(menu.updatedAt))}
              </s-table-cell>
              <s-table-cell>
                <s-stack
                  direction="inline"
                  gap="small-200"
                  justifyContent="end"
                >
                  <s-button href={`/app/menus/${menu.id}`}>Edit</s-button>
                  <s-button
                    variant="tertiary"
                    tone="critical"
                    icon="delete"
                    accessibilityLabel={`Delete ${menu.name}`}
                    onClick={() => onDelete(menu)}
                  />
                </s-stack>
              </s-table-cell>
            </s-table-row>
          ))}
        </s-table-body>
      </s-table>
    </s-section>
  );
}

/** Footer help (Shopify's pattern): where to learn more. */
export function FooterHelp() {
  return (
    <s-stack alignItems="center" paddingBlock="large">
      <s-text color="subdued">
        Learn more about{" "}
        <s-link
          href="https://help.shopify.com/en/manual/online-store/themes/theme-structure/extend/apps"
          target="_blank"
        >
          app embeds in your theme
        </s-link>
      </s-text>
    </s-stack>
  );
}
