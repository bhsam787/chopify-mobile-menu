import type { ReactNode } from "react";

/** A tiny phone picture for each way to start. */
const PICTURES: Record<"template" | "blank" | "canvas", ReactNode> = {
  // Filled in: a tab bar, photo tiles and rows.
  template: (
    <svg viewBox="0 0 96 120" aria-hidden="true">
      <rect
        x="18"
        y="6"
        width="60"
        height="108"
        rx="12"
        fill="#fff"
        stroke="#1d2a14"
        strokeWidth="2.5"
      />
      <rect x="26" y="18" width="20" height="7" rx="3.5" fill="#5b9a35" />
      <rect x="49" y="18" width="20" height="7" rx="3.5" fill="#e6efdc" />
      <rect x="26" y="31" width="20" height="22" rx="4" fill="#f9e2bf" />
      <rect x="49" y="31" width="20" height="22" rx="4" fill="#d3e3f9" />
      <rect x="26" y="57" width="20" height="22" rx="4" fill="#f9d6e2" />
      <rect x="49" y="57" width="20" height="22" rx="4" fill="#d9eec2" />
      <rect x="26" y="86" width="43" height="5" rx="2.5" fill="#e3e3e3" />
      <rect x="26" y="96" width="34" height="5" rx="2.5" fill="#e3e3e3" />
    </svg>
  ),
  // Empty slots and a plus: sections are added one by one.
  blank: (
    <svg viewBox="0 0 96 120" aria-hidden="true">
      <rect
        x="18"
        y="6"
        width="60"
        height="108"
        rx="12"
        fill="#fff"
        stroke="#1d2a14"
        strokeWidth="2.5"
      />
      <rect
        x="26"
        y="18"
        width="43"
        height="16"
        rx="4"
        fill="#f4f6f1"
        stroke="#b9c7ad"
        strokeDasharray="3 3"
      />
      <rect
        x="26"
        y="40"
        width="43"
        height="16"
        rx="4"
        fill="#f4f6f1"
        stroke="#b9c7ad"
        strokeDasharray="3 3"
      />
      <rect
        x="26"
        y="62"
        width="43"
        height="16"
        rx="4"
        fill="#f4f6f1"
        stroke="#b9c7ad"
        strokeDasharray="3 3"
      />
      <circle cx="47.5" cy="95" r="9" fill="#5b9a35" />
      <path
        d="M47.5 90.5v9M43 95h9"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  ),
  // Free placement: shapes anywhere, one of them selected.
  canvas: (
    <svg viewBox="0 0 96 120" aria-hidden="true">
      <rect
        x="18"
        y="6"
        width="60"
        height="108"
        rx="12"
        fill="#fff"
        stroke="#1d2a14"
        strokeWidth="2.5"
      />
      <circle cx="35" cy="30" r="9" fill="#f9d6e2" />
      <rect
        x="44"
        y="44"
        width="24"
        height="18"
        rx="4"
        fill="#d3e3f9"
        transform="rotate(-8 56 53)"
      />
      <rect x="25" y="70" width="30" height="5" rx="2.5" fill="#1d2a14" />
      <rect x="25" y="79" width="22" height="4" rx="2" fill="#c9c9c9" />
      <rect
        x="49"
        y="86"
        width="20"
        height="16"
        rx="3"
        fill="none"
        stroke="#3062d4"
        strokeWidth="1.5"
      />
      <rect
        x="47"
        y="84"
        width="4"
        height="4"
        rx="1"
        fill="#fff"
        stroke="#3062d4"
        strokeWidth="1.2"
      />
      <rect
        x="67"
        y="84"
        width="4"
        height="4"
        rx="1"
        fill="#fff"
        stroke="#3062d4"
        strokeWidth="1.2"
      />
      <rect
        x="47"
        y="100"
        width="4"
        height="4"
        rx="1"
        fill="#fff"
        stroke="#3062d4"
        strokeWidth="1.2"
      />
      <rect
        x="67"
        y="100"
        width="4"
        height="4"
        rx="1"
        fill="#fff"
        stroke="#3062d4"
        strokeWidth="1.2"
      />
      <path d="M62 16l9 3-4 1.5-1.5 4z" fill="#1d2a14" />
    </svg>
  ),
};

interface Choice {
  key: "template" | "blank" | "canvas";
  title: string;
  level: string;
  description: string;
  points: string[];
  plan: string;
  action: string;
}

const CHOICES: Choice[] = [
  {
    key: "template",
    title: "Start from a template",
    level: "Easiest · Recommended",
    description:
      "A ready-made menu, filled in with sample content. Swap in your own words, photos and links, section by section.",
    points: [
      "Looks great from the first minute",
      "Edit simple forms, no design skills needed",
      "Turn it into a canvas later if you like",
    ],
    plan: "Goes live with Starter",
    action: "Browse templates",
  },
  {
    key: "blank",
    title: "Start blank",
    level: "Flexible",
    description:
      "The same easy editor, without sample content. Add the sections you want, one by one: tabs, link lists, photo cards, banners and more.",
    points: [
      "Build exactly the menu you have in mind",
      "Sections line up and fit every phone by themselves",
      "Great when you know what you want",
    ],
    plan: "Goes live with Starter",
    action: "Start blank",
  },
  {
    key: "canvas",
    title: "Design on a free-form canvas",
    level: "Advanced",
    description:
      "An empty design board, like a page in a design tool. Place text, images, shapes and widgets anywhere, layer and align them freely.",
    points: [
      "Total creative freedom, pixel by pixel",
      "Takes more time and a bit of design care",
      "Best for designers and very unique brands",
    ],
    plan: "Goes live with Pro",
    action: "Open the canvas",
  },
];

/**
 * The three ways to start a menu, explained side by side so merchants pick
 * the one that suits them (and know what the canvas is before opening it).
 */
export function StartChoices({
  pending,
  onTemplates,
  onBlank,
  onCanvas,
}: {
  /** What's being created right now ("blank", "canvas" or a template id). */
  pending: string | null;
  onTemplates: () => void;
  onBlank: () => void;
  onCanvas: () => void;
}) {
  const actions = { template: onTemplates, blank: onBlank, canvas: onCanvas };
  return (
    <s-section
      heading="How do you want to start?"
      subheading="Three ways to make your menu. Not sure? Start from a template: it's the quickest way to a great menu, and you can change everything."
    >
      <div className="chm-starts">
        {CHOICES.map((choice) => (
          <div
            key={choice.key}
            className={`chm-start${choice.key === "template" ? " chm-start--recommended" : ""}`}
          >
            <div className="chm-start__picture">{PICTURES[choice.key]}</div>
            <span
              className={`chm-start__level chm-start__level--${choice.key}`}
            >
              {choice.level}
            </span>
            <span className="chm-start__title">{choice.title}</span>
            <p className="chm-start__text">{choice.description}</p>
            <ul className="chm-start__points">
              {choice.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <span className="chm-start__plan">{choice.plan}</span>
            <div className="chm-start__action">
              <s-button
                inlineSize="fill"
                variant={choice.key === "template" ? "primary" : "secondary"}
                loading={pending === choice.key}
                disabled={Boolean(pending)}
                onClick={actions[choice.key]}
              >
                {choice.action}
              </s-button>
            </div>
          </div>
        ))}
      </div>
      <p className="chm-starts__tip">
        <strong>Good to know:</strong> every menu works on your draft themes for
        free, and any template or blank menu can become a canvas later with{" "}
        <em>Edit as canvas</em> in the editor.
      </p>
    </s-section>
  );
}
