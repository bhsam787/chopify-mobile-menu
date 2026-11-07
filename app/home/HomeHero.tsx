import { useEffect, useState, type ReactNode } from "react";
import { GuideBot } from "../components/GuideBot";
import type { HomeMenu } from "./HomeCards";

/** "Good morning" etc. in the merchant's own time (so only on the client). */
function useGreeting(): string {
  const [greeting, setGreeting] = useState("Hello");
  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(
      hour < 5
        ? "Good evening"
        : hour < 12
          ? "Good morning"
          : hour < 18
            ? "Good afternoon"
            : "Good evening",
    );
  }, []);
  return greeting;
}

/** Why a menu like this helps, in four short points. */
const BENEFITS: { title: string; text: string; icon: ReactNode }[] = [
  {
    title: "Found in a tap or two",
    text: "Photo cards, tabs and live search take shoppers straight to the right products.",
    icon: (
      <>
        <circle cx="10.5" cy="10.5" r="5.5" />
        <path d="m15 15 4.5 4.5" />
      </>
    ),
  },
  {
    title: "Sell from the menu",
    text: "Feature best-sellers, deals and discount codes right where every shopper looks.",
    icon: (
      <>
        <path d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1a1 1 0 0 1 .7.3l7.2 7.2a1 1 0 0 1 0 1.4l-8.1 8.1a1 1 0 0 1-1.4 0l-7.2-7.2a1 1 0 0 1-.3-.7Z" />
        <circle cx="8.2" cy="8.2" r="1.4" />
      </>
    ),
  },
  {
    title: "Your brand, no code",
    text: "Your colors, fonts and photos, from a template or your own design. No theme edits.",
    icon: (
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.9 1.3-1.9-.5-1.1.2-2.3 1.4-2.3h1.9a3.9 3.9 0 0 0 3.9-3.9c0-4.9-3.8-8.9-8.5-8.9ZM7.8 11.2h0M10.6 7.8h0M14.8 8.6h0" />
    ),
  },
  {
    title: "Try it free, go live later",
    text: "Publish to a draft theme and tap through it like a shopper before anyone else sees it.",
    icon: (
      <>
        <path d="M2.8 12s3.4-6.5 9.2-6.5 9.2 6.5 9.2 6.5-3.4 6.5-9.2 6.5S2.8 12 2.8 12Z" />
        <circle cx="12" cy="12" r="2.8" />
      </>
    ),
  },
];

/** Little four-point stars twinkling around Chopi. */
function Sparkle({ className }: { className: string }) {
  return (
    <svg
      className={`chm-hero__sparkle ${className}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M12 1.5c.6 4.9 2.7 7.1 7.5 7.6v.1c-4.8.5-6.9 2.7-7.5 7.6h-.1c-.5-4.9-2.7-7.1-7.5-7.6v-.1C9.3 8.6 11.4 6.4 12 1.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Chopi dancing on its glowing stage, saying hello (hero cards). */
export function ChopiStage({ children }: { children: ReactNode }) {
  return (
    <div className="chm-hero__stage">
      <p className="chm-hero__say">
        <strong>Hi, I&apos;m Chopi!</strong> {children}
      </p>
      <div className="chm-hero__spot">
        <Sparkle className="chm-hero__sparkle--a" />
        <Sparkle className="chm-hero__sparkle--b" />
        <Sparkle className="chm-hero__sparkle--c" />
        <GuideBot variant="hero" />
      </div>
    </div>
  );
}

/**
 * The top of the home page: a greeting, Chopi dancing on its stage, and why
 * a menu made for phones helps shoppers (the actions live in the cards
 * below and in the page header).
 */
export function HomeHero({
  shopName,
  menus,
  draftThemesOnly = false,
}: {
  shopName: string;
  menus: HomeMenu[];
  /** Published, but the plan doesn't cover the live theme yet. */
  draftThemesOnly?: boolean;
}) {
  const greeting = useGreeting();
  const published = menus.some((menu) => menu.published);
  const live = published && !draftThemesOnly;
  const hasMenu = menus.length > 0;

  return (
    <section className="chm-hero" aria-labelledby="chm-hero-title">
      <div className="chm-hero__main">
        <div className="chm-hero__copy">
          <span className="chm-hero__eyebrow">
            {greeting}
            {shopName ? `, ${shopName}` : ""}
          </span>
          <h2 id="chm-hero-title" className="chm-hero__title">
            {hasMenu ? (
              <>
                Welcome back to{" "}
                <span className="chm-hero__brand">Chopi - Menu</span>
              </>
            ) : (
              <>
                Welcome to <span className="chm-hero__brand">Chopi - Menu</span>
              </>
            )}
          </h2>
          <p className="chm-hero__lead">
            {live
              ? "Your new mobile menu is live: shoppers who tap the menu icon on their phone get big photos, quick tabs and instant search. Keep it fresh with new collections, deals and seasonal looks."
              : published
                ? "Your menu is published to your draft themes: preview it there like a shopper would. Choose a plan when you're ready to show it on your live theme."
                : hasMenu
                  ? "One step left: publish it, and the menu that opens from the menu icon on your shoppers' phones gets your new design."
                  : "Chopi - Menu replaces the menu that opens when shoppers tap the menu icon on their phone. Give them an app-like one with photos, tabs, promotions and live search, and try it on your store for free."}
          </p>
          {/* What the app changes, and what it never touches. */}
          <span className="chm-hero__scope">
            <svg
              viewBox="0 0 20 20"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <rect x="5" y="1.8" width="10" height="16.4" rx="2.4" />
              <path d="M8 7h4M8 10h4M8 13h4" />
            </svg>
            <span>
              <strong>For your mobile ☰ menu</strong> · your desktop navigation
              stays exactly as it is
            </span>
          </span>
        </div>

        <ChopiStage>
          {hasMenu
            ? "Your menu looks great! Open a section and I'll point the way."
            : "Start with a template, a blank menu or the canvas, and I'll guide you, step by step."}
        </ChopiStage>
      </div>

      <ul
        className="chm-hero__benefits"
        aria-label="What your menu does for you"
      >
        {BENEFITS.map((benefit) => (
          <li key={benefit.title} className="chm-hero__benefit">
            <span className="chm-hero__benefit-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {benefit.icon}
              </svg>
            </span>
            <span className="chm-hero__benefit-title">{benefit.title}</span>
            <span className="chm-hero__benefit-text">{benefit.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
