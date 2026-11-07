import { INCLUDED_EVERYWHERE, type TemplateCopy } from "./templateCopy";

/** A small check mark for feature lists (template previews, plan cards). */
export const CHECK = (
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

/**
 * The sales side of a template preview: the pitch, who it's for, what
 * shoppers get, why it helps them buy, and what every template includes.
 */
export function TemplateDetails({
  description,
  copy,
  featureLabels,
  isNew,
}: {
  description: string;
  copy?: TemplateCopy;
  featureLabels: string[];
  isNew?: boolean;
}) {
  return (
    <div className="chm-pv">
      <div className="chm-pv__head">
        {isNew && <span className="chm-look__ribbon is-new">✦ New</span>}
        {copy && <h3 className="chm-pv__title">{copy.tagline}</h3>}
        <p className="chm-pv__lead">{copy?.pitch ?? description}</p>
        <span className="chm-look__chips">
          {featureLabels.map((label) => (
            <span key={label} className="chm-look__chip">
              {label}
            </span>
          ))}
        </span>
      </div>

      {copy && (
        <>
          <div className="chm-pv__best">
            <span className="chm-pv__best-label">Best for</span>
            {copy.bestFor.map((store) => (
              <span key={store} className="chm-pv__best-pill">
                {store}
              </span>
            ))}
          </div>

          <section className="chm-pv__block">
            <h4 className="chm-pv__heading">What shoppers get</h4>
            <div className="chm-pv__highlights">
              {copy.highlights.map((highlight) => (
                <div key={highlight.title} className="chm-pv__highlight">
                  <span className="chm-pv__highlight-icon">
                    <s-icon type={highlight.icon} />
                  </span>
                  <span className="chm-pv__highlight-title">
                    {highlight.title}
                  </span>
                  <span className="chm-pv__highlight-text">
                    {highlight.text}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="chm-pv__block chm-pv__sells">
            <h4 className="chm-pv__heading">Why it helps you sell</h4>
            <ul className="chm-pv__reasons">
              {copy.whyItSells.map((reason) => (
                <li key={reason}>
                  <span className="chm-pv__tick" aria-hidden="true">
                    {CHECK}
                  </span>
                  {reason}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <div className="chm-pv__tip">
        <span className="chm-pv__tip-badge">Chopi&apos;s tip</span>
        <span className="chm-pv__tip-title">Go ahead, play with it!</span>
        <span className="chm-pv__tip-text">
          Tap the tabs, open the rows and swipe the sideways ones. The phone
          works just like your store will, and links show where they lead
          instead of leaving this page.
        </span>
      </div>

      <section className="chm-pv__block">
        <h4 className="chm-pv__heading">Included with every template</h4>
        <ul className="chm-pv__included">
          {INCLUDED_EVERYWHERE.map((item) => (
            <li key={item}>
              <span className="chm-pv__tick" aria-hidden="true">
                {CHECK}
              </span>
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
