import { useEffect } from "react";
import { useLocalDate } from "../components/LocalDate";
import type {
  HeadersFunction,
  LinksFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { currentPlan, liveMenuCovered } from "../services/billing.server";
import { planSelectionUrl } from "../services/partner-api.server";
import {
  PAID_PLANS,
  PLAN_NAMES,
  TRIAL_DAYS,
  planForHandle,
} from "../billing/plans";
import { ChopiStage } from "../home/HomeHero";
import showcaseStyles from "../components/showcase.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: showcaseStyles },
];

/**
 * Plans and pricing. Plans live in Shopify App Pricing: choosing one opens
 * Shopify's hosted plan page, which sends the merchant back here (the plan's
 * welcome link) with `plan_handle`, so the plan is re-read right away.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const chosen = planForHandle(
    new URL(request.url).searchParams.get("plan_handle"),
  );
  // This page shows the plan as it is right now, not a cached one.
  const state = await currentPlan(admin, session.shop, { force: true });
  return {
    ...state,
    // Just back from Shopify's plan page with a new plan.
    welcome: chosen !== null && chosen === state.plan,
    live: await liveMenuCovered(session.shop, state.livePlan),
    selectUrl: planSelectionUrl(session.shop),
  };
};

const FREE_FEATURES = [
  "Every template and the free-form canvas",
  "All design settings, live search and translations",
  "Publish to your draft themes and try it like a shopper",
];

const QUESTIONS: { question: string; answer: string }[] = [
  {
    question: "Do I need a plan to try the app?",
    answer:
      "No. Pick any template, design with the editor or the canvas, and publish it to your store's draft themes to try it like a shopper, all for free. You only need a plan to show your menu on your live theme.",
  },
  {
    question: "How do I try my menu on a draft theme?",
    answer:
      "Publish it from the editor, then go to Online Store → Themes in your Shopify admin and preview any theme that isn't live (or open it in the theme editor). Your menu runs there exactly as shoppers will see it, canvas menus included.",
  },
  {
    question: "Which plan does my menu need?",
    answer:
      "On your live theme, menus made from templates and sections need Starter, and menus that use the free-form canvas need Pro. After you publish, the app tells you which plan your menu needs.",
  },
  {
    question: "When does the free trial start, and when am I charged?",
    answer: `The ${TRIAL_DAYS}-day trial starts when you choose a plan. Your menu shows on your live theme right away, and you're only billed once the trial ends. Cancel before then and you pay nothing.`,
  },
  {
    question: "Does one plan cover all my menus?",
    answer:
      "Yes. Create as many menus as you like, for seasons, sales or tests. Your store shows one at a time, and switching which one is live costs nothing extra.",
  },
  {
    question: "Do features like live search or translations cost extra?",
    answer:
      "No. Live search, translations, custom CSS and every template are included in both plans. The only difference is that Pro also publishes canvas menus.",
  },
  {
    question: "Can I switch between Starter and Pro?",
    answer:
      "Any time, right from this page. Shopify adjusts the charge for you, so you only pay for what you use.",
  },
  {
    question: "What happens if I cancel or remove the app?",
    answer:
      "On your live theme, your theme's own menu shows again, and your theme itself is never changed. If you cancel but keep the app, your designs stay saved and keep working on draft themes, ready to go live again whenever you pick a plan.",
  },
];

const CHECK = (
  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
    <path
      d="m3.5 8.5 3 3 6-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function Pricing() {
  const {
    plan,
    devStore,
    trialEndsAt,
    cancelAtEndOfCycle,
    welcome,
    live,
    selectUrl,
    checkFailed,
  } = useLoaderData<typeof loader>();

  useEffect(() => {
    if (welcome)
      shopify.toast.show(`You're on ${PLAN_NAMES[plan]}. Welcome aboard!`);
  }, [welcome, plan]);

  // Only a trial that hasn't ended yet is worth mentioning.
  const inTrial = Boolean(trialEndsAt && new Date(trialEndsAt) > new Date());
  const trialEnd = useLocalDate(trialEndsAt);
  // Shopify's plan page lives in the admin, outside the app's frame.
  const choosePlan = () => {
    if (selectUrl) window.open(selectUrl, "_top");
  };

  const status = devStore
    ? "This is a development store, so everything is unlocked, including your live theme. Test freely: plans only apply once a store belongs to a merchant."
    : plan === "FREE"
      ? "No plan yet. Design and publish for free to try your menu on draft themes; choose a plan to show it on your live theme."
      : [
          `You're on ${PLAN_NAMES[plan]}.`,
          inTrial
            ? `Your free trial runs until ${trialEnd}.`
            : cancelAtEndOfCycle
              ? "It ends with the current billing cycle."
              : "It renews every month.",
        ].join(" ");

  return (
    <s-page heading="Pricing" inlineSize="large">
      <s-link slot="breadcrumb-actions" href="/app">
        Home
      </s-link>
      {/* Room between the page's sections, and above and below them. */}
      <s-stack gap="large-400" paddingBlock="large large-400">
        {live && !live.covered && (
          <s-banner tone="info" heading="Your menu works on draft themes only">
            {live.required === "PRO"
              ? "Your published menu uses the free-form canvas, so your live theme needs Pro to show it. It already works on your draft themes; until then, shoppers see your theme's own menu."
              : "Your published menu works on your draft themes. Choose a plan to show it on your live theme; until then, shoppers see your theme's own menu."}
          </s-banner>
        )}
        {checkFailed && (
          <s-banner tone="info">
            We couldn&apos;t reach Shopify to check your plan just now. What you
            see here may be a few minutes old.
          </s-banner>
        )}

        <section className="chm-hero" aria-labelledby="chm-pricing-title">
          <div className="chm-hero__main">
            <div className="chm-hero__copy">
              <span className="chm-hero__eyebrow">Plans & pricing</span>
              <h2 id="chm-pricing-title" className="chm-hero__title">
                Build for free. Go live{" "}
                <span className="chm-hero__brand">when you&apos;re ready</span>
              </h2>
              <p className="chm-hero__lead">
                Design every menu and try it on your store&apos;s draft themes,
                canvas included, without paying a cent. Pick a plan when you
                want it on your live theme, and start with a {TRIAL_DAYS}-day
                free trial.
              </p>
            </div>
            <ChopiStage>
              {welcome
                ? live && !live.covered
                  ? "Welcome aboard! Your published menu uses the canvas, so it needs Pro to go live."
                  : "Yay, welcome aboard! Your menu can go live now."
                : "Try it all on a draft theme first. You only need a plan for your live theme!"}
            </ChopiStage>
          </div>
          <div className="chm-plan-status">
            <span
              className={`chm-plan-status__pill${plan === "FREE" && !devStore ? "" : " is-paid"}`}
            >
              {devStore ? "Development store" : PLAN_NAMES[plan]}
            </span>
            <span className="chm-plan-status__text">{status}</span>
          </div>
        </section>

        <s-stack gap="small-300">
          <div className="chm-plans">
            <div className="chm-plan">
              <div className="chm-plan__head">
                <span className="chm-plan__name">Free</span>
                <span className="chm-plan__tagline">
                  Design and try everything, at your own pace
                </span>
              </div>
              <div className="chm-plan__price">
                <span className="chm-plan__amount">$0</span>
                <span className="chm-plan__per">forever</span>
              </div>
              <ul className="chm-plan__features">
                {FREE_FEATURES.map((feature) => (
                  <li key={feature}>
                    <span className="chm-pv__tick" aria-hidden="true">
                      {CHECK}
                    </span>
                    {feature}
                  </li>
                ))}
                <li className="is-muted">Your live theme needs a plan</li>
              </ul>
              <div className="chm-plan__action">
                <s-button inlineSize="fill" disabled>
                  {plan === "FREE" ? "Your current plan" : "Always included"}
                </s-button>
              </div>
            </div>

            {PAID_PLANS.map((paid) => {
              const current = plan === paid.key;
              const label = current
                ? "Your current plan"
                : plan === "FREE"
                  ? `Start ${TRIAL_DAYS}-day free trial`
                  : `Switch to ${paid.name}`;
              return (
                <div
                  key={paid.key}
                  className={`chm-plan${paid.key === "PRO" ? " chm-plan--pro" : ""}${current ? " is-current" : ""}`}
                >
                  {paid.key === "PRO" && (
                    <span className="chm-plan__badge">Includes the canvas</span>
                  )}
                  <div className="chm-plan__head">
                    <span className="chm-plan__name">{paid.name}</span>
                    <span className="chm-plan__tagline">{paid.tagline}</span>
                  </div>
                  <div className="chm-plan__price">
                    <span className="chm-plan__amount">{paid.price}</span>
                    <span className="chm-plan__per">per month</span>
                  </div>
                  <span className="chm-plan__trial">
                    {TRIAL_DAYS}-day free trial
                  </span>
                  <ul className="chm-plan__features">
                    {paid.features.map((feature) => (
                      <li key={feature}>
                        <span className="chm-pv__tick" aria-hidden="true">
                          {CHECK}
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="chm-plan__action">
                    <s-button
                      inlineSize="fill"
                      // Upgrades and first plans stand out; a downgrade stays quiet.
                      variant={
                        current || (plan === "PRO" && paid.key === "STARTER")
                          ? "secondary"
                          : "primary"
                      }
                      disabled={current || !selectUrl}
                      onClick={choosePlan}
                    >
                      {label}
                    </s-button>
                  </div>
                </div>
              );
            })}
          </div>
          <s-text color="subdued">
            Prices in USD. Charges appear on your Shopify bill; stores billed in
            another currency see an estimate in theirs.
          </s-text>
        </s-stack>

        <s-section heading="Questions, answered">
          <div className="chm-faq">
            {QUESTIONS.map(({ question, answer }) => (
              <details key={question} className="chm-faq__item">
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </s-section>
      </s-stack>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) =>
  boundary.headers(headersArgs);
