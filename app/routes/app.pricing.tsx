import { useEffect, useRef } from "react";
import { useLocalDate } from "../components/LocalDate";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LinksFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  currentPlan,
  liveMenuCovered,
  syncPlan,
  testChargesFor,
} from "../services/billing.server";
import { PAID_PLANS, PLAN_NAMES, TRIAL_DAYS } from "../billing/plans";
import { ChopiStage } from "../home/HomeHero";
import { CHECK } from "../components/TemplateDetails";
import showcaseStyles from "../components/showcase.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: showcaseStyles },
];

/**
 * Plans and pricing, charged through Shopify's Billing API. Choosing a plan
 * creates the subscription and sends the merchant to Shopify to approve it;
 * Shopify brings them back here (`?subscribed=`), where the plan is re-read.
 * Shopify also tells the app about every later change (webhook
 * app_subscriptions/update).
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const subscribed = new URL(request.url).searchParams.get("subscribed");
  // This page shows the plan as it is right now, not a cached one.
  const state = await currentPlan(admin, session.shop, { force: true });
  return {
    ...state,
    // Just back from approving the charge in Shopify.
    welcome: subscribed !== null && subscribed === state.plan,
    live: await liveMenuCovered(session.shop, state.livePlan),
  };
};

/** Shopify's own words from a Billing API error (they say what to fix). */
function billingErrorMessage(error: unknown): string {
  const data = (error as { errorData?: unknown } | null)?.errorData as
    unknown[] | { message?: string; graphQLErrors?: unknown[] } | undefined;
  // userErrors arrive as a list; request errors as { graphQLErrors, message }.
  const list = Array.isArray(data)
    ? data
    : [...(data?.graphQLErrors ?? []), ...(data?.message ? [data] : [])];
  const messages = list
    .map((entry) =>
      typeof entry === "object" && entry && "message" in entry
        ? String((entry as { message: unknown }).message)
        : "",
    )
    .filter(Boolean);
  return messages.length
    ? messages.join("; ")
    : error instanceof Error
      ? error.message
      : "Unknown error";
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, billing, session } = await authenticate.admin(request);
  const form = await request.formData();
  const state = await currentPlan(admin, session.shop, { force: true });
  const isTest = testChargesFor(state.devStore);

  if (form.get("intent") === "subscribe") {
    const plan = PAID_PLANS.find(
      (candidate) => candidate.key === form.get("plan"),
    );
    if (!plan) return { ok: false as const, error: "Choose a plan." };
    // Back to this page inside the admin once the charge is approved.
    const store = session.shop.replace(/\.myshopify\.com$/, "");
    const returnUrl = `https://admin.shopify.com/store/${store}/apps/${process.env.SHOPIFY_API_KEY}/app/pricing?subscribed=${plan.key}`;
    // Redirects (outside the app frame) to Shopify's approval page. Upgrades
    // and downgrades replace the current subscription; Shopify prorates.
    try {
      await billing.request({ plan: plan.name, isTest, returnUrl });
    } catch (error) {
      // The redirect itself is thrown as a Response: let it through.
      if (error instanceof Response) throw error;
      const reason = billingErrorMessage(error);
      console.error(`Billing request failed for ${session.shop}: ${reason}`);
      return {
        ok: false as const,
        error: `Shopify couldn't start the plan: ${reason}`,
      };
    }
  }

  if (form.get("intent") === "cancel") {
    try {
      const { appSubscriptions } = await billing.check({ isTest });
      for (const subscription of appSubscriptions)
        await billing.cancel({
          subscriptionId: subscription.id,
          isTest,
          prorate: true,
        });
      await syncPlan(admin, session.shop, { force: true });
      return { ok: true as const, cancelled: true };
    } catch (error) {
      console.error(`Plan cancel failed for ${session.shop}`, error);
      return {
        ok: false as const,
        error: "Couldn't cancel your plan. Please try again.",
      };
    }
  }
  return { ok: false as const, error: "Something went wrong." };
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

export default function Pricing() {
  const {
    plan,
    devStore,
    trialEndsAt,
    cancelAtEndOfCycle,
    welcome,
    live,
    checkFailed,
  } = useLoaderData<typeof loader>();
  const billingFetcher = useFetcher<typeof action>();
  const cancelModal = useRef<HTMLElementTagNameMap["s-modal"]>(null);
  const pendingPlan =
    billingFetcher.state !== "idle"
      ? billingFetcher.formData?.get("plan")
      : null;
  const cancelling =
    billingFetcher.state !== "idle" &&
    billingFetcher.formData?.get("intent") === "cancel";

  useEffect(() => {
    const result = billingFetcher.data;
    if (billingFetcher.state !== "idle" || !result) return;
    if (!result.ok) shopify.toast.show(result.error, { isError: true });
    else if ("cancelled" in result) {
      cancelModal.current?.hideOverlay();
      shopify.toast.show("You're on Free. Your live theme shows its own menu.");
    }
  }, [billingFetcher.state, billingFetcher.data]);

  useEffect(() => {
    if (welcome)
      shopify.toast.show(`You're on ${PLAN_NAMES[plan]}. Welcome aboard!`);
  }, [welcome, plan]);

  // Only a trial that hasn't ended yet is worth mentioning.
  const inTrial = Boolean(trialEndsAt && new Date(trialEndsAt) > new Date());
  const trialEnd = useLocalDate(trialEndsAt);
  // Creates the subscription; Shopify then asks the merchant to approve it.
  const choosePlan = (key: string) =>
    billingFetcher.submit(
      { intent: "subscribe", plan: key },
      { method: "post" },
    );

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
                {plan === "FREE" || devStore ? (
                  <s-button inlineSize="fill" disabled>
                    {plan === "FREE" ? "Your current plan" : "Always included"}
                  </s-button>
                ) : (
                  <s-button
                    inlineSize="fill"
                    commandFor="cancel-plan"
                    command="--show"
                    disabled={Boolean(pendingPlan) || cancelling}
                  >
                    Switch to Free
                  </s-button>
                )}
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
                      disabled={current || Boolean(pendingPlan) || cancelling}
                      loading={pendingPlan === paid.key}
                      onClick={() => choosePlan(paid.key)}
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

      <s-modal id="cancel-plan" heading="Switch to Free?" ref={cancelModal}>
        <s-paragraph>
          Your {PLAN_NAMES[plan]} plan ends now and you won&apos;t be charged
          for it again. On your live theme, your theme&apos;s own menu shows
          again; your menus stay saved and keep working on draft themes.
        </s-paragraph>
        <s-button
          slot="primary-action"
          variant="primary"
          tone="critical"
          loading={cancelling}
          onClick={() =>
            billingFetcher.submit({ intent: "cancel" }, { method: "post" })
          }
        >
          Switch to Free
        </s-button>
        <s-button
          slot="secondary-actions"
          commandFor="cancel-plan"
          command="--hide"
        >
          Keep my plan
        </s-button>
      </s-modal>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) =>
  boundary.headers(headersArgs);
