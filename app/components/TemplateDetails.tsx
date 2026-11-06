import { Fragment } from "react";
import { INCLUDED_EVERYWHERE, type TemplateCopy } from "./templateCopy";

export interface TemplateNumbers {
  sections: number;
  subMenus: number;
  links: number;
}

/**
 * The sales side of a template preview: the pitch, who it's for, what
 * shoppers get, why it helps them buy, and what every template includes.
 */
export function TemplateDetails({
  description,
  copy,
  numbers,
  featureLabels,
}: {
  description: string;
  copy?: TemplateCopy;
  numbers: TemplateNumbers;
  featureLabels: string[];
}) {
  const facts = (
    [
      [numbers.sections, "sections"],
      [numbers.subMenus, "sub-menus"],
      [numbers.links, "ready-made links"],
    ] as const
  ).filter(([value]) => value > 0);
  return (
    <s-stack gap="large">
      <s-stack gap="small-200">
        {copy && <s-heading>{copy.tagline}</s-heading>}
        <s-paragraph color="subdued">{description}</s-paragraph>
        <s-stack direction="inline" gap="small-200">
          {featureLabels.map((label) => (
            <s-badge key={label} tone="neutral">
              {label}
            </s-badge>
          ))}
        </s-stack>
      </s-stack>

      {/* Ready-made, measured from the template itself (zeros left out). */}
      <s-grid
        gridTemplateColumns={facts.map(() => "1fr").join(" auto ")}
        gap="small"
      >
        {facts.map(([value, label], index) => (
          <Fragment key={label}>
            {index > 0 && <s-divider direction="block" />}
            <s-stack gap="small-500">
              <s-text type="strong">{value}</s-text>
              <s-text color="subdued">{label}</s-text>
            </s-stack>
          </Fragment>
        ))}
      </s-grid>

      {copy && (
        <>
          <s-stack direction="inline" gap="small-200" alignItems="center">
            <s-text color="subdued">Best for</s-text>
            {copy.bestFor.map((store) => (
              <s-badge key={store} tone="info">
                {store}
              </s-badge>
            ))}
          </s-stack>

          <s-divider />

          <s-stack gap="base">
            <s-heading>What shoppers get</s-heading>
            {copy.highlights.map((highlight) => (
              <s-grid
                key={highlight.title}
                gridTemplateColumns="auto 1fr"
                gap="base"
                alignItems="start"
              >
                <s-box
                  padding="small-200"
                  background="subdued"
                  borderRadius="base"
                >
                  <s-icon type={highlight.icon} />
                </s-box>
                <s-stack gap="small-500">
                  <s-text type="strong">{highlight.title}</s-text>
                  <s-text color="subdued">{highlight.text}</s-text>
                </s-stack>
              </s-grid>
            ))}
          </s-stack>

          <s-divider />

          <s-stack gap="small">
            <s-heading>Why it helps you sell</s-heading>
            {copy.whyItSells.map((reason) => (
              <s-grid
                key={reason}
                gridTemplateColumns="auto 1fr"
                gap="small-200"
                alignItems="start"
              >
                <s-icon type="check-circle" tone="success" />
                <s-text>{reason}</s-text>
              </s-grid>
            ))}
          </s-stack>
        </>
      )}

      <s-box padding="base" background="subdued" borderRadius="large">
        <s-stack gap="small-200">
          <s-stack direction="inline" gap="small-200" alignItems="center">
            <s-icon type="cursor" />
            <s-text type="strong">Try it like a shopper</s-text>
          </s-stack>
          <s-text color="subdued">
            Tap the tabs, arrows and rows, and swipe the sideways rows. Links
            show where they go instead of leaving this page.
          </s-text>
        </s-stack>
      </s-box>

      <s-stack gap="small-200">
        <s-text type="strong">Included with every template</s-text>
        <s-unordered-list>
          {INCLUDED_EVERYWHERE.map((item) => (
            <s-list-item key={item}>{item}</s-list-item>
          ))}
        </s-unordered-list>
      </s-stack>
    </s-stack>
  );
}
