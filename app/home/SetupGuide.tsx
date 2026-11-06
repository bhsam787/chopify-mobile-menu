import { useState, type ReactNode } from "react";
import type { EmbedStatus } from "./useEmbedStatus";

interface Step {
  id: string;
  label: string;
  description: string;
  done: boolean;
  /** Still being checked (the theme embed status loads after the page). */
  checking?: boolean;
  action: ReactNode;
}

/**
 * The setup guide (Shopify's Homepage pattern): progress in the header,
 * steps straight in the card with dividers, the next step opened. Steps are
 * detected, not ticked by hand. Once the merchant has a live menu the steps
 * start folded away, so the async embed check never makes the page jump.
 */
export function SetupGuide({
  hasMenu,
  firstMenuId,
  published,
  embed,
  embedUrl,
}: {
  hasMenu: boolean;
  firstMenuId?: string;
  published: boolean;
  embed: EmbedStatus;
  embedUrl: string;
}) {
  const steps: Step[] = [
    {
      id: "create",
      label: "Create your menu",
      description:
        "Pick a template that's already filled in, or design your own from scratch on the canvas. You can change every text, image, link and color.",
      done: hasMenu,
      action: (
        <s-button variant="primary" href="/app/templates">
          Browse templates
        </s-button>
      ),
    },
    {
      id: "publish",
      label: "Publish your menu",
      description:
        "Publishing sends your menu to your store. You can keep editing and publish again any time.",
      done: published,
      action: (
        <s-button
          variant="primary"
          href={firstMenuId ? `/app/menus/${firstMenuId}` : "/app/templates"}
          disabled={!hasMenu}
        >
          Open editor
        </s-button>
      ),
    },
    {
      id: "embed",
      label: "Turn on the app embed",
      description:
        embed === "unknown"
          ? "In your theme editor, open App embeds and turn on Chopify Menu. It replaces your theme's mobile menu with yours."
          : "One switch in your theme editor replaces your theme's mobile menu with yours. Your theme files aren't changed.",
      done: embed === "active",
      checking: embed === "loading",
      action: (
        <s-button variant="primary" href={embedUrl} target="_blank">
          Turn on in theme editor
        </s-button>
      ),
    },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  const nextStep = steps.find((step) => !step.done && !step.checking);
  const [expanded, setExpanded] = useState<string | null>(
    published ? null : (steps.find((step) => !step.done)?.id ?? null),
  );
  const [showSteps, setShowSteps] = useState(!published);

  return (
    <s-section
      heading="Setup guide"
      subheading="Three steps to an app-like mobile menu on your store."
    >
      <s-text slot="supplemental" color="subdued">
        {doneCount === steps.length
          ? "All set"
          : `${doneCount} of ${steps.length} steps completed`}
      </s-text>
      <s-button
        slot="secondary-actions"
        variant="tertiary"
        icon={showSteps ? "chevron-up" : "chevron-down"}
        accessibilityLabel={showSteps ? "Hide steps" : "Show steps"}
        onClick={() => setShowSteps((current) => !current)}
      />
      {!showSteps && (
        <s-paragraph color="subdued">
          {nextStep
            ? `Next: ${nextStep.label.toLowerCase()}.`
            : doneCount === steps.length
              ? "Your menu is live and the app embed is on. Open the steps any time to check them again."
              : "Your menu is live."}
        </s-paragraph>
      )}
      {showSteps && (
        <s-stack gap="small">
          {steps.map((step, index) => {
            const open = expanded === step.id;
            return (
              <s-stack key={step.id} gap="small">
                {index > 0 && <s-divider />}
                <s-clickable
                  borderRadius="base"
                  paddingBlock="small-300"
                  paddingInline="small-200"
                  accessibilityLabel={`${step.label}: ${step.done ? "done" : "to do"}. ${open ? "Hide" : "Show"} details`}
                  onClick={() => setExpanded(open ? null : step.id)}
                >
                  <s-grid
                    gridTemplateColumns="auto minmax(0, 1fr) auto"
                    gap="base"
                    alignItems="center"
                  >
                    {step.checking ? (
                      <s-spinner size="base" accessibilityLabel="Checking" />
                    ) : (
                      <s-icon
                        type={
                          step.done ? "check-circle-filled" : "circle-dashed"
                        }
                        tone={step.done ? "success" : "neutral"}
                      />
                    )}
                    <s-text type={step === nextStep ? "strong" : "generic"}>
                      {step.label}
                    </s-text>
                    <s-icon
                      type={open ? "chevron-up" : "chevron-down"}
                      color="subdued"
                    />
                  </s-grid>
                </s-clickable>
                {open && (
                  <s-box paddingInlineStart="large-200">
                    <s-stack gap="small-200">
                      <s-paragraph color="subdued">
                        {step.description}
                      </s-paragraph>
                      {!step.done && (
                        <s-stack direction="inline">{step.action}</s-stack>
                      )}
                    </s-stack>
                  </s-box>
                )}
              </s-stack>
            );
          })}
        </s-stack>
      )}
    </s-section>
  );
}
