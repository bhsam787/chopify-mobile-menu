import { useEffect, useRef, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LinksFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { ChopiStage } from "../home/HomeHero";
import { embedEditorUrl } from "../home/useEmbedStatus";
import { TRIAL_DAYS } from "../billing/plans";
import { gql } from "../services/admin-graphql.server";
import {
  sendSupportMessage,
  supportConfigured,
} from "../services/support.server";
import { SUPPORT_TOPICS, type SupportTopic } from "../support/topics";
import { SelectField, TextField } from "../editor/controls";
import showcaseStyles from "../components/showcase.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: showcaseStyles },
];

const SHOP_EMAIL = `#graphql
  query ShopEmail {
    shop {
      email
      contactEmail
    }
  }
`;

/** Help: message the developer, quick links, and answers about every feature. */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  // Filled in as the reply address (the merchant can change it).
  const { shop } = await gql<{
    shop: { email: string | null; contactEmail: string | null };
  }>(admin, SHOP_EMAIL).catch(() => ({
    shop: { email: null, contactEmail: null },
  }));
  return {
    shopEmail: shop.contactEmail || shop.email || "",
    canMessage: supportConfigured(),
    embedUrl: embedEditorUrl(session.shop, process.env.SHOPIFY_API_KEY || ""),
  };
};

/** Sends the message form to the developer. */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  return sendSupportMessage(session.shop, {
    topic: form.get("topic"),
    replyTo: form.get("replyTo"),
    message: form.get("message"),
  });
};

interface Question {
  question: string;
  answer: string;
  /** A checklist shown after the answer. */
  steps?: string[];
  /** Ends with a "Send us a message" button. */
  contact?: boolean;
}

const FAQ: { topic: string; questions: Question[] }[] = [
  {
    topic: "Getting started",
    questions: [
      {
        question: "What does Chopi - Menu change on my store?",
        answer:
          "Only the menu that opens when shoppers tap the menu icon (☰) on their phone. Your desktop navigation and your theme's code stay exactly as they are, and turning the app embed off brings your theme's own mobile menu back.",
      },
      {
        question: "How do I get my menu on my store?",
        answer:
          "Two things: publish your menu from the editor, and turn on the app embed once. For the embed, open your theme editor, go to App embeds and switch on “Mobile menu”, then save. The setup guide on Home links you straight there.",
      },
      {
        question: "Template, blank or canvas: which should I pick?",
        answer:
          "A template is the quickest: a ready-made menu with sample content you swap for your own. Blank gives you the same easy editor without sample content, so you add sections one by one. The free-form canvas lets you place anything anywhere, like a design tool; it takes more time and needs Pro to go live.",
      },
      {
        question: "Does it work with my theme?",
        answer:
          "It works with Online Store 2.0 themes through the app embed and opens from your theme's own menu icon. If the icon isn't picked up on your theme, the app embed has an advanced “Menu button selector” setting where you can point it at your menu button, or send us a message and we'll help.",
      },
    ],
  },
  {
    topic: "Designing your menu",
    questions: [
      {
        question: "What's the difference between Customize and Design?",
        answer:
          "Customize changes what a section shows: its texts, photos and links. Design changes how it looks: colors, sizes, spacing, corners and borders. Both show on the phone preview right away, and Chopi points at the part you're changing.",
      },
      {
        question: "Which sections can I add?",
        answer:
          "Tabs, category cards with photos, link lists, fold-out accordions, banners, countdowns, promo pills and chips, story circles, product cards from a collection, perks, contact & help buttons, discount codes, a scrolling ticker, reviews and social proof, account & social links, and country & language selectors. Use Add section in the editor to browse them all.",
      },
      {
        question: "How do sub-menus work?",
        answer:
          "Any link row or card can open its own sub-menu instead of a page. Shoppers tap it, the next level slides in, and a back button takes them up again. You design each sub-menu like the main menu.",
      },
      {
        question: "What is the canvas, and what does “Edit as canvas” do?",
        answer:
          "The canvas is a free-form design board: drag text, images, shapes and widgets anywhere, then align, layer, group and style them. “Edit as canvas” turns an existing menu into canvas layers that look exactly the same, so you can fine-tune every detail freely.",
      },
      {
        question: "Can I add my own CSS?",
        answer:
          "Yes. Custom CSS opens a code editor with a live phone beside it. Switch to Select mode and click any part of the menu to insert its selector. Your CSS only styles this menu, never the rest of your theme.",
      },
      {
        question: "How do I see the menu on different phones?",
        answer:
          "Pick a phone size above the preview (from a small Android to the largest iPhone). Switch to Preview to tap through tabs, sub-menus and swiping rows just like a shopper.",
      },
    ],
  },
  {
    topic: "Links, products and search",
    questions: [
      {
        question: "What happens when I rename a collection or product?",
        answer:
          "Nothing to do: links point to your collections, products and pages themselves, so new names, URLs and images show up automatically without republishing. If something is deleted, its item quietly disappears from the menu.",
      },
      {
        question: "Can the menu show products?",
        answer:
          "Yes. Product cards show products from a collection you choose, with their photos and prices (including sale prices), in a swipeable row or a grid.",
      },
      {
        question: "How does live search work?",
        answer:
          "Turn on “Show results while typing” in the header. As shoppers type, they see matching links from your menu plus your store's products, collections and suggestions. Before they type, recent searches and popular searches appear; popular ones can come from your store's real top searches, mixed with terms you pick.",
      },
      {
        question: "Can I translate my menu?",
        answer:
          "Yes, into every language your store sells in. Choose a language above the editor, or open Quick translation to see every text of the menu in one place, with a “Missing only” filter and a live preview. Shoppers automatically see their own language.",
      },
    ],
  },
  {
    topic: "Publishing and plans",
    questions: [
      {
        question: "Do I need a plan to try it?",
        answer:
          "No. Everything is free, including publishing to your draft themes so you can try the menu on your store. A plan is only needed to show it on your live theme: Starter for template and blank menus, Pro for canvas menus.",
      },
      {
        question: "How does the free trial work?",
        answer: `Both plans start with a ${TRIAL_DAYS}-day free trial when you choose them on the Pricing page. You're billed through your Shopify bill after the trial, and you pay nothing if you cancel before it ends.`,
      },
      {
        question: "Can I have more than one menu?",
        answer:
          "As many as you like, for seasons, sales or experiments. Your store shows one at a time: publishing a menu replaces the live one, which stays in the app as a draft.",
      },
      {
        question: "How do I take my menu off the store?",
        answer:
          "Open the menu and choose Unpublish. Your theme's own mobile menu shows again right away, and your design stays saved in the app.",
      },
    ],
  },
  {
    topic: "Privacy and your data",
    questions: [
      {
        question: "Do you collect my shoppers' personal data?",
        answer:
          "No. The app stores your menus and settings, not information about your shoppers. Recent searches are kept only in each shopper's own browser.",
      },
      {
        question: "What happens if I uninstall the app?",
        answer:
          "The menu leaves your store right away and your theme's own mobile menu comes back; your theme itself was never changed. Your designs are kept for 48 hours in case you reinstall, then deleted for good.",
      },
    ],
  },
  {
    topic: "Troubleshooting",
    questions: [
      {
        question: "My menu doesn't show on my store. What should I check?",
        answer: "Go through these four things, in order:",
        steps: [
          "The menu is published (the editor shows “Published”).",
          "The “Mobile menu” app embed is switched on in your theme editor, and saved.",
          "You're looking at a phone-sized screen: on desktop, your theme's menu stays.",
          "For your live theme, your plan covers the menu. Draft themes always work.",
        ],
        contact: true,
      },
      {
        question: "I changed my menu, but the store still shows the old one.",
        answer:
          "Changes go to your store when you publish them: use “Publish changes” in the editor. Then reload the store page; your browser may have kept the previous version for a moment.",
      },
      {
        question: "My theme's own menu opens instead of the new one.",
        answer:
          "First check you're on a phone-sized screen: on desktop, your theme's menu is meant to stay. If your theme's menu still opens on phones, set the “Menu button selector” in the app embed settings, or send us a message and we'll find the right setting for you.",
      },
    ],
  },
];

export default function Help() {
  const { shopEmail, canMessage, embedUrl } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const modal = useRef<HTMLElementTagNameMap["s-modal"]>(null);
  const [topic, setTopic] = useState<SupportTopic>(SUPPORT_TOPICS[0]);
  const [replyTo, setReplyTo] = useState(shopEmail);
  const [message, setMessage] = useState("");
  const sending = fetcher.state !== "idle";

  const openForm = () => modal.current?.showOverlay();
  const send = () =>
    fetcher.submit({ topic, replyTo, message }, { method: "post" });

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (fetcher.data.ok) {
      modal.current?.hideOverlay();
      setMessage("");
      shopify.toast.show(
        `Message sent! We'll reply to ${fetcher.data.replyTo}.`,
      );
    } else {
      shopify.toast.show(fetcher.data.error, { isError: true });
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <s-page heading="Help" inlineSize="large">
      <s-link slot="breadcrumb-actions" href="/app">
        Home
      </s-link>
      <s-stack gap="large-400" paddingBlock="large large-400">
        <section className="chm-hero" aria-labelledby="chm-help-title">
          <div className="chm-hero__main">
            <div className="chm-hero__copy">
              <span className="chm-hero__eyebrow">Help center</span>
              <h2 id="chm-help-title" className="chm-hero__title">
                How can we <span className="chm-hero__brand">help you?</span>
              </h2>
              <p className="chm-hero__lead">
                Find quick answers about every feature below, or write to the
                developer directly. A real person reads every message.
              </p>
            </div>
            <ChopiStage>
              Stuck? The answers are below, and a real human is one email away!
            </ChopiStage>
          </div>

          <div className="chm-contact">
            <span className="chm-contact__icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <path d="m4 7 8 6 8-6" />
              </svg>
            </span>
            <div className="chm-contact__copy">
              <span className="chm-contact__title">Message the developer</span>
              <span className="chm-contact__text">
                {canMessage
                  ? "Send a message right from here: your store is added for you, and we reply by email."
                  : "Messages can't be sent right now. Please try again later."}
              </span>
            </div>
            {canMessage && (
              <div className="chm-contact__actions">
                <s-button variant="primary" icon="email" onClick={openForm}>
                  Send a message
                </s-button>
              </div>
            )}
          </div>
        </section>

        <div className="chm-quick">
          <s-clickable href={embedUrl} target="_blank" borderRadius="large">
            <span className="chm-quick__card">
              <span className="chm-quick__title">Turn on the app embed</span>
              <span className="chm-quick__text">
                Switch on “Mobile menu” in your theme editor.
              </span>
            </span>
          </s-clickable>
          <s-clickable href="/app/templates" borderRadius="large">
            <span className="chm-quick__card">
              <span className="chm-quick__title">Start a new menu</span>
              <span className="chm-quick__text">
                Pick a template, start blank, or design on the canvas.
              </span>
            </span>
          </s-clickable>
          <s-clickable href="/app/pricing" borderRadius="large">
            <span className="chm-quick__card">
              <span className="chm-quick__title">Plans and pricing</span>
              <span className="chm-quick__text">
                See what each plan covers and start a free trial.
              </span>
            </span>
          </s-clickable>
        </div>

        <s-section heading="Frequently asked questions">
          <div className="chm-faq-groups">
            {FAQ.map((group) => (
              <div key={group.topic} className="chm-faq-group">
                <h3 className="chm-faq-group__title">{group.topic}</h3>
                <div className="chm-faq">
                  {group.questions.map(
                    ({ question, answer, steps, contact }) => (
                      <details key={question} className="chm-faq__item">
                        <summary>{question}</summary>
                        <p>{answer}</p>
                        {steps && (
                          <ol className="chm-faq__steps">
                            {steps.map((step) => (
                              <li key={step}>{step}</li>
                            ))}
                          </ol>
                        )}
                        {contact && canMessage && (
                          <div className="chm-faq__contact">
                            <span>Still stuck?</span>
                            <s-button icon="email" onClick={openForm}>
                              Send us a message
                            </s-button>
                          </div>
                        )}
                      </details>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
        </s-section>
      </s-stack>

      <s-modal id="support-message" heading="Message the developer" ref={modal}>
        <s-stack gap="base">
          <s-paragraph color="subdued">
            Your store is added for you. Tell us what you were doing and what
            happened; we reply to the email below.
          </s-paragraph>
          <SelectField
            label="What's it about?"
            value={topic}
            options={SUPPORT_TOPICS.map((value) => ({ value, label: value }))}
            onChange={setTopic}
          />
          <TextField
            label="Reply to"
            value={replyTo}
            onChange={setReplyTo}
            placeholder="you@yourstore.com"
          />
          <TextField
            label="Message"
            value={message}
            onChange={setMessage}
            multiline
            rows={7}
            placeholder="What were you trying to do, and what happened instead?"
            details="The more detail, the faster we can help. You can attach screenshots when we reply."
          />
        </s-stack>
        <s-button
          slot="primary-action"
          variant="primary"
          loading={sending}
          disabled={!message.trim() || !replyTo.trim()}
          onClick={send}
        >
          Send message
        </s-button>
        <s-button
          slot="secondary-actions"
          commandFor="support-message"
          command="--hide"
        >
          Cancel
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
