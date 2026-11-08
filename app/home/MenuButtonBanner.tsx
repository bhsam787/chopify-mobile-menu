const INK = "#22401a";

/** Chopi, puzzled: scratching her head while question marks float up. */
function ConfusedChopi() {
  return (
    <svg
      className="chm-mbb__chopi"
      viewBox="6 4 100 96"
      aria-hidden="true"
      focusable="false"
    >
      <text className="chm-mbb__q chm-mbb__q--a" x="78" y="26">
        ?
      </text>
      <text className="chm-mbb__q chm-mbb__q--b" x="92" y="40">
        ?
      </text>
      <ellipse cx="44" cy="96" rx="18" ry="2.6" fill={INK} opacity="0.14" />
      <g className="chm-mbb__body">
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
        {/* The other hand on the hip: "hmm…". */}
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
        {/* Eyes looking up and to the side, one brow raised. */}
        <ellipse cx="35" cy="50" rx="4.8" ry="5.8" fill={INK} />
        <ellipse cx="52" cy="50" rx="4.8" ry="5.8" fill={INK} />
        <circle cx="36.6" cy="47" r="2" fill="#fff" />
        <circle cx="53.6" cy="47" r="2" fill="#fff" />
        <path
          d="M30 41 Q35 38.5 39.5 41"
          fill="none"
          stroke={INK}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M47.5 39.5 Q52 37.5 56.5 40.5"
          fill="none"
          stroke={INK}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <ellipse
          cx="27.5"
          cy="58"
          rx="4.2"
          ry="2.6"
          fill="#ff8fb3"
          opacity="0.85"
        />
        <ellipse
          cx="59.5"
          cy="58"
          rx="4.2"
          ry="2.6"
          fill="#ff8fb3"
          opacity="0.85"
        />
        {/* A wobbly "hmm" mouth. */}
        <path
          d="M38.5 60.5 Q41 58.5 43.5 60.5 Q46 62.5 48.5 60.5"
          fill="none"
          stroke={INK}
          strokeWidth="1.9"
          strokeLinecap="round"
        />
        {/* The scratching hand, up at the top of the head. */}
        <g className="chm-mbb__scratch">
          <path
            d="M67 50 Q78 40 70 26"
            fill="none"
            stroke={INK}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle
            cx="67"
            cy="24"
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
 * Home, once a menu is published: a friendly way into Menu button for themes
 * whose menu icon isn't found by itself.
 */
export function MenuButtonBanner() {
  return (
    <section className="chm-mbb" aria-labelledby="chm-mbb-title">
      <div className="chm-mbb__stage">
        <ConfusedChopi />
      </div>
      <div className="chm-mbb__copy">
        <span className="chm-mbb__eyebrow">Only if you need it</span>
        <h2 id="chm-mbb-title" className="chm-mbb__title">
          Your menu isn&apos;t opening on your phone?
        </h2>
        <p className="chm-mbb__text">
          Chopi finds your theme&apos;s ☰ menu icon by herself on almost every
          theme. Only if tapping it still opens your theme&apos;s old menu, show
          her which icon it is: it takes a few seconds, no code needed.
        </p>
        <p className="chm-mbb__note">
          Your menu opens fine? Then there&apos;s nothing to do here.
        </p>
      </div>
      <div className="chm-mbb__action">
        <s-button variant="primary" href="/app/menu-button">
          Fix my menu icon
        </s-button>
      </div>
    </section>
  );
}

/** Chopi at her laptop, tapping away at a message (dots in a bubble). */
function TypingChopi() {
  return (
    <svg
      className="chm-mbb__chopi"
      viewBox="4 2 112 98"
      aria-hidden="true"
      focusable="false"
    >
      <g className="chm-mbb__bubble">
        <rect
          x="84"
          y="6"
          width="30"
          height="18"
          rx="9"
          fill="#fff"
          stroke={INK}
          strokeWidth="1.8"
        />
        <path
          d="M90 23 L87 29 L95 23.5"
          fill="#fff"
          stroke={INK}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <circle className="chm-mbb__dot" cx="92" cy="15" r="2.2" fill={INK} />
        <circle className="chm-mbb__dot" cx="99" cy="15" r="2.2" fill={INK} />
        <circle className="chm-mbb__dot" cx="106" cy="15" r="2.2" fill={INK} />
      </g>
      <ellipse cx="60" cy="95" rx="34" ry="2.8" fill={INK} opacity="0.12" />
      {/* Chopi behind the screen: handle, heart, bag and a focused face. */}
      <path
        d="M49 28 C49 12 71 12 71 28"
        fill="none"
        stroke={INK}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M60 16.5 C55.6 13.4 55 9.4 57.8 8.3 C59.1 7.8 60 8.8 60 9.5 C60 8.8 60.9 7.8 62.2 8.3 C65 9.4 64.4 13.4 60 16.5 Z"
        fill="#ff7aa2"
        stroke={INK}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M41 25 H79 Q83.6 25 84 29.6 L86 62 H34 L36 29.6 Q36.4 25 41 25 Z"
        fill="#95BF47"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M75 25 H79 Q83.6 25 84 29.6 L86 62 H77 Z"
        fill="#7CB04F"
        opacity="0.85"
      />
      {/* Eyes down on the screen, with the screen's glow on her cheeks. */}
      <g className="chm-mbb__eyes">
        <ellipse cx="51" cy="44" rx="4.4" ry="4.8" fill={INK} />
        <ellipse cx="68" cy="44" rx="4.4" ry="4.8" fill={INK} />
        <circle cx="52" cy="45.8" r="1.6" fill="#fff" />
        <circle cx="69" cy="45.8" r="1.6" fill="#fff" />
      </g>
      <ellipse
        cx="43.5"
        cy="51"
        rx="4"
        ry="2.4"
        fill="#ff8fb3"
        opacity="0.85"
      />
      <ellipse
        cx="75.5"
        cy="51"
        rx="4"
        ry="2.4"
        fill="#ff8fb3"
        opacity="0.85"
      />
      <path
        d="M56.5 51.5 Q59.5 54.5 62.5 51.5"
        fill="none"
        stroke={INK}
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      {/* The laptop, seen from behind its screen, on a little desk line. */}
      <path
        d="M28 58 H92 Q95 58 94.6 61 L91.6 84 H28.4 L25.4 61 Q25 58 28 58 Z"
        fill="#e7ebef"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M60 66.5 C56.6 64 56.2 61 58.3 60.2 C59.3 59.8 60 60.6 60 61.1 C60 60.6 60.7 59.8 61.7 60.2 C63.8 61 63.4 64 60 66.5 Z"
        transform="translate(0 4)"
        fill="#8dc45c"
      />
      <path
        d="M18 86 H102"
        stroke={INK}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Hands tapping the keys, one after the other. */}
      <circle
        className="chm-mbb__key chm-mbb__key--a"
        cx="33"
        cy="82"
        r="5"
        fill="#fff"
        stroke={INK}
        strokeWidth="2"
      />
      <circle
        className="chm-mbb__key chm-mbb__key--b"
        cx="87"
        cy="82"
        r="5"
        fill="#fff"
        stroke={INK}
        strokeWidth="2"
      />
    </svg>
  );
}

/**
 * Menu button page, last resort: some themes open their menu in unusual
 * ways, so the developer sets it up by hand.
 */
export function StillNotWorkingBanner() {
  return (
    <section
      className="chm-mbb chm-mbb--support"
      aria-labelledby="chm-mbb-support-title"
    >
      <div className="chm-mbb__stage">
        <TypingChopi />
      </div>
      <div className="chm-mbb__copy">
        <span className="chm-mbb__eyebrow">We&apos;re here to help</span>
        <h2 id="chm-mbb-support-title" className="chm-mbb__title">
          Still not working?
        </h2>
        <p className="chm-mbb__text">
          Some themes open their menu in an unusual way. Send us a message with
          your theme&apos;s name and we&apos;ll set it up for you.
        </p>
      </div>
      <div className="chm-mbb__action">
        <s-button
          variant="primary"
          icon="email"
          href="/app/help?message=menu-button"
        >
          Message the developer
        </s-button>
      </div>
    </section>
  );
}
