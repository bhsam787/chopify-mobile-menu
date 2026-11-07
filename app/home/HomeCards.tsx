import type { Design } from "@chopi/menu-core";
import { LocalDate } from "../components/LocalDate";
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
  /** One selling line (falls back to the description). */
  tagline: string | null;
  /** The kind of store it suits best, e.g. "Fashion". */
  bestFor: string | null;
  /** What it has, in words ("Tabs", "Image cards"…). */
  features: string[];
  isNew: boolean;
  design: Design;
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
  unlinked,
  embed,
  shop,
  draftThemesOnly = false,
}: {
  menu: HomeMenu;
  design: Design;
  context: PreviewContext;
  publishedAt: string | null;
  /** Published, but the plan doesn't cover the live theme yet. */
  draftThemesOnly?: boolean;
  /** Items that look tappable but go nowhere yet. */
  unlinked: number;
  embed: EmbedStatus;
  shop: string;
}) {
  const live = menu.published && !draftThemesOnly;
  return (
    <s-section
      heading={
        live
          ? "Live on your store"
          : menu.published
            ? "Published to your draft themes"
            : "Your latest menu"
      }
      subheading={
        menu.published
          ? "What shoppers see when they open the menu on their phone. Try it: tabs, sub-menus and swiping work here too."
          : "Not on your store yet. Publish it when you're happy with it."
      }
    >
      <s-badge
        slot="supplemental"
        tone={live ? "success" : menu.published ? "info" : "neutral"}
      >
        {live ? "Live" : menu.published ? "Draft themes" : "Draft"}
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
          <div className="chm-featured">
            <div className="chm-featured__head">
              <span className={`chm-featured__kicker${live ? " is-live" : ""}`}>
                {live
                  ? "Live now"
                  : menu.published
                    ? "On draft themes"
                    : "Draft"}
              </span>
              <h3 className="chm-featured__name">
                {menu.name}
                {menu.usesCanvas && (
                  <s-badge tone="info" icon="layout-block">
                    Canvas
                  </s-badge>
                )}
              </h3>
              <span className="chm-featured__meta">
                Last edited <LocalDate value={menu.updatedAt} withTime />
              </span>
            </div>
            <div className="chm-featured__checks">
              {publishedAt ? (
                <StatusLine icon="check-circle" tone="success">
                  Published <LocalDate value={publishedAt} withTime />
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
              {/* Easy to miss, and shoppers tap them: say it here. */}
              {unlinked > 0 && (
                <StatusLine icon="alert-circle" tone="warning">
                  {unlinked === 1
                    ? "1 item doesn't link anywhere yet"
                    : `${unlinked.toLocaleString()} items don't link anywhere yet`}
                </StatusLine>
              )}
              <StatusLine icon="link">
                Links stay up to date by themselves: renamed collections and
                products need no republish
              </StatusLine>
            </div>
            <s-stack direction="inline" gap="small-200">
              <s-button variant="primary" href={`/app/menus/${menu.id}`}>
                {menu.published ? "Edit menu" : "Edit and publish"}
              </s-button>
              <s-button href={`https://${shop}`} target="_blank" icon="view">
                View store
              </s-button>
            </s-stack>
          </div>
        </s-grid>
      </s-query-container>
    </s-section>
  );
}

/** The three steps from install to a live menu (first visit). */
const HOW_IT_WORKS: { title: string; text: string }[] = [
  {
    title: "Choose how to start",
    text: "A ready-made template, a blank menu built from sections, or a free-form canvas.",
  },
  {
    title: "Make it yours",
    text: "Change words, photos, links and colors with a real phone preview beside you. Click anything on the phone to edit it.",
  },
  {
    title: "Try it, then go live",
    text: "Publish to a draft theme for free and tap through it like a shopper. Pick a plan when it's ready for your live store.",
  },
];

/** First visit: how it works in three steps, beside three template phones. */
export function WelcomeCard({
  templates,
  context,
}: {
  templates: TemplatePreview[];
  context: PreviewContext;
}) {
  return (
    <section className="chm-how" aria-labelledby="chm-how-title">
      <div className="chm-how__copy">
        <span className="chm-hero__eyebrow">How it works</span>
        <h2 id="chm-how-title" className="chm-how__title">
          From idea to a live menu,{" "}
          <span className="chm-hero__brand">in three steps</span>
        </h2>
        <ol className="chm-how__steps">
          {HOW_IT_WORKS.map((step, index) => (
            <li key={step.title}>
              <span className="chm-how__num">{index + 1}</span>
              <span className="chm-how__step">
                <span className="chm-how__step-title">{step.title}</span>
                <span className="chm-how__step-text">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className="chm-how__stage">
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
      </div>
    </section>
  );
}

const ARROW = (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
    <path
      d="M3.5 8h9m-3.5-3.5L12.5 8 9 11.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Three templates as showcase tiles: the phone on a stage in the
 * template's colors, what it's great for, what it has. Each opens its
 * preview in the gallery.
 */
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
      <div className="chm-looks">
        <div className="chm-looks__grid">
          {templates.map((template) => (
            <s-clickable
              key={template.id}
              href={`/app/templates?preview=${template.id}`}
              accessibilityLabel={`Preview the ${template.name} template`}
              borderRadius="large"
            >
              <div className="chm-look">
                <div className="chm-look__stage">
                  <PhoneStage
                    design={template.design}
                    context={context}
                    scale={0.5}
                  />
                  {(template.isNew || template.bestFor) && (
                    <span
                      className={`chm-look__ribbon${template.isNew ? " is-new" : ""}`}
                    >
                      {template.isNew
                        ? "✦ New"
                        : `Great for ${template.bestFor}`}
                    </span>
                  )}
                  <span className="chm-look__cta" aria-hidden="true">
                    Preview {ARROW}
                  </span>
                </div>
                <div className="chm-look__info">
                  <span className="chm-look__name">
                    {template.name}
                    <span className="chm-look__arrow">{ARROW}</span>
                  </span>
                  <span className="chm-look__tagline">
                    {template.tagline ?? template.description}
                  </span>
                  <span className="chm-look__chips">
                    {template.features.map((feature) => (
                      <span key={feature} className="chm-look__chip">
                        {feature}
                      </span>
                    ))}
                  </span>
                </div>
              </div>
            </s-clickable>
          ))}
        </div>
      </div>
    </s-section>
  );
}

/** All menus; one at a time is live. */
export function MenusTable({
  menus,
  onDelete,
  draftThemesOnly = false,
}: {
  menus: HomeMenu[];
  onDelete: (menu: HomeMenu) => void;
  /** The published menu shows on draft themes only (no plan for live). */
  draftThemesOnly?: boolean;
}) {
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
                <s-badge
                  tone={
                    !menu.published
                      ? "neutral"
                      : draftThemesOnly
                        ? "info"
                        : "success"
                  }
                >
                  {!menu.published
                    ? "Draft"
                    : draftThemesOnly
                      ? "Draft themes only"
                      : "Live on store"}
                </s-badge>
              </s-table-cell>
              <s-table-cell>
                <LocalDate value={menu.updatedAt} withTime />
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
