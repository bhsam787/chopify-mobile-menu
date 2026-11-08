const INK = "#22401a";

/** Chopi with a bright idea: a glowing bulb over her head, hand raised. */
function IdeaChopi() {
  return (
    <svg
      className="chm-mbb__chopi"
      viewBox="4 0 104 100"
      aria-hidden="true"
      focusable="false"
    >
      {/* The idea: a bulb that lights up, with little rays. */}
      <g className="chm-frb__bulb">
        <g
          className="chm-frb__rays"
          stroke="#f2b705"
          strokeWidth="2.4"
          strokeLinecap="round"
        >
          <path d="M88 2.5 V6.5" />
          <path d="M100.5 8 L97.6 10.8" />
          <path d="M75.5 8 L78.4 10.8" />
          <path d="M104.5 19 H100.5" />
          <path d="M71.5 19 H75.5" />
        </g>
        <circle
          className="chm-frb__glow"
          cx="88"
          cy="19"
          r="9"
          fill="#ffd84d"
          stroke={INK}
          strokeWidth="2"
        />
        <path
          d="M85 19.5 Q88 15.5 91 19.5"
          fill="none"
          stroke="#c98a00"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <rect
          x="84.4"
          y="27"
          width="7.2"
          height="5"
          rx="1.6"
          fill="#d9dee4"
          stroke={INK}
          strokeWidth="1.8"
        />
      </g>
      <ellipse cx="44" cy="96" rx="18" ry="2.6" fill={INK} opacity="0.14" />
      <g className="chm-frb__body">
        <path
          d="M35 74 L34.5 84"
          stroke={INK}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <ellipse cx="35" cy="87" rx="6.4" ry="4.6" fill={INK} />
        <path
          d="M52 74 L52.5 84"
          stroke={INK}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <ellipse cx="53.5" cy="87" rx="6.4" ry="4.6" fill={INK} />
        <path
          d="M21 54 Q12 60 17 66"
          fill="none"
          stroke={INK}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle
          cx="19"
          cy="67"
          r="5"
          fill="#fff"
          stroke={INK}
          strokeWidth="2"
        />
        <path
          d="M33 33 C33 17 55 17 55 33"
          fill="none"
          stroke={INK}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path
          d="M44 21.5 C39.6 18.4 39 14.4 41.8 13.3 C43.1 12.8 44 13.8 44 14.5 C44 13.8 44.9 12.8 46.2 13.3 C49 14.4 48.4 18.4 44 21.5 Z"
          fill="#ff7aa2"
          stroke={INK}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M25 30 H63 Q67.6 30 68 34.6 L70.8 67 Q71.4 76 62.4 76 H25.6 Q16.6 76 17.2 67 L20 34.6 Q20.4 30 25 30 Z"
          fill="#95BF47"
        />
        <path
          d="M59 30 H63 Q67.6 30 68 34.6 L70.8 67 Q71.4 76 62.4 76 H61 Z"
          fill="#7CB04F"
          opacity="0.85"
        />
        <path
          d="M25 30 H63 Q67.6 30 68 34.6 L70.8 67 Q71.4 76 62.4 76 H25.6 Q16.6 76 17.2 67 L20 34.6 Q20.4 30 25 30 Z"
          fill="none"
          stroke={INK}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Happy, squinty "aha!" eyes and a big smile. */}
        <path
          d="M30.5 50 Q35 45 39.5 50"
          fill="none"
          stroke={INK}
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path
          d="M47.5 50 Q52 45 56.5 50"
          fill="none"
          stroke={INK}
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <ellipse
          cx="27.5"
          cy="57"
          rx="4.2"
          ry="2.6"
          fill="#ff8fb3"
          opacity="0.85"
        />
        <ellipse
          cx="59.5"
          cy="57"
          rx="4.2"
          ry="2.6"
          fill="#ff8fb3"
          opacity="0.85"
        />
        <path d="M38.5 56 Q43.5 63.5 48.5 56 Z" fill={INK} />
        <path d="M41 59.4 Q43.5 61.6 46 59.4 Z" fill="#ff7aa2" />
        {/* The raised hand, pointing up at the idea. */}
        <g className="chm-frb__arm">
          <path
            d="M67 50 Q76 44 77 34"
            fill="none"
            stroke={INK}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle
            cx="77.5"
            cy="31"
            r="5.4"
            fill="#fff"
            stroke={INK}
            strokeWidth="2"
          />
        </g>
      </g>
    </svg>
  );
}

/**
 * Invites merchants to ask for what they're missing. It opens the Help
 * page's message form with "An idea or feature request" chosen; on Help
 * itself, `onRequest` opens that form directly.
 */
export function FeatureRequestBanner({
  onRequest,
}: {
  onRequest?: () => void;
}) {
  return (
    <section className="chm-mbb chm-mbb--idea" aria-labelledby="chm-frb-title">
      <div className="chm-mbb__stage">
        <IdeaChopi />
      </div>
      <div className="chm-mbb__copy">
        <span className="chm-mbb__eyebrow">Shape what&apos;s next</span>
        <h2 id="chm-frb-title" className="chm-mbb__title">
          Missing something? Tell us what to build
        </h2>
        <p className="chm-mbb__text">
          A new section, a style, a setting your store needs? Chopi - Menu grows
          from merchants&apos; ideas, and the developer reads every request.
        </p>
      </div>
      <div className="chm-mbb__action">
        {onRequest ? (
          <s-button variant="primary" icon="lightbulb" onClick={onRequest}>
            Request a feature
          </s-button>
        ) : (
          <s-button
            variant="primary"
            icon="lightbulb"
            href="/app/help?message=feature"
          >
            Request a feature
          </s-button>
        )}
      </div>
    </section>
  );
}
