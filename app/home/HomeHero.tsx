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
    title: "Sell right from the menu",
    text: "Feature best-sellers, deals and discount codes where every shopper looks first.",
    icon: (
      <>
        <path d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1a1 1 0 0 1 .7.3l7.2 7.2a1 1 0 0 1 0 1.4l-8.1 8.1a1 1 0 0 1-1.4 0l-7.2-7.2a1 1 0 0 1-.3-.7Z" />
        <circle cx="8.2" cy="8.2" r="1.4" />
      </>
    ),
  },
  {
    title: "Help shoppers find it fast",
    text: "Photo cards, tabs and live search get them to the right product in a tap or two.",
    icon: (
      <>
        <circle cx="10.5" cy="10.5" r="5.5" />
        <path d="m15 15 4.5 4.5" />
      </>
    ),
  },
  {
    title: "On-brand, without code",
    text: "Your colors, fonts and photos. No developer, no theme edits, nothing to break.",
    icon: (
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.9 1.3-1.9-.5-1.1.2-2.3 1.4-2.3h1.9a3.9 3.9 0 0 0 3.9-3.9c0-4.9-3.8-8.9-8.5-8.9ZM7.8 11.2h0M10.6 7.8h0M14.8 8.6h0" />
    ),
  },
  {
    title: "Stays up to date by itself",
    text: "Rename a product or collection and the menu keeps up. Nothing to republish.",
    icon: (
      <>
        <path d="M19.5 12a7.5 7.5 0 0 1-13.2 4.9M4.5 12a7.5 7.5 0 0 1 13.2-4.9" />
        <path d="M18 3.5v3.8h-3.8M6 20.5v-3.8h3.8" />
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
}: {
  shopName: string;
  menus: HomeMenu[];
}) {
  const greeting = useGreeting();
  const live = menus.find((menu) => menu.published);
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
                Turn your mobile menu into{" "}
                <span className="chm-hero__brand">a place to shop</span>
              </>
            )}
          </h2>
          <p className="chm-hero__lead">
            {live
              ? "Shoppers on their phone now get a menu that feels like an app: big photos, quick tabs and instant search. Keep it fresh with new collections, deals and seasonal looks."
              : hasMenu
                ? "One step left: publish it, and every shopper who opens the menu on their phone sees your new design."
                : "Most shoppers browse on their phone. Swap your theme's plain list of links for photos, tabs, promotions and live search, ready in minutes, no code needed."}
          </p>
          {!hasMenu && (
            <div className="chm-hero__actions">
              <s-button variant="primary" href="/app/templates">
                Choose a template
              </s-button>
            </div>
          )}
        </div>

        <ChopiStage>
          {hasMenu
            ? "Your menu looks great! Open a section and I'll point the way."
            : "Pick a template you like and I'll guide you, step by step."}
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
