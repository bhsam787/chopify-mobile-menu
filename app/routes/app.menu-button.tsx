import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LinksFunction,
  LoaderFunctionArgs,
} from "react-router";
import {
  useFetcher,
  useLoaderData,
  useRevalidator,
  useRouteError,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import {
  embedStatuses,
  listThemes,
  readMenuButtons,
  removeMenuButton,
  signPick,
  type EmbedStatuses,
  type MenuButtons,
  type StoreTheme,
} from "../services/menu-button.server";
import { ChopiStage } from "../home/HomeHero";
import { StillNotWorkingBanner } from "../home/MenuButtonBanner";
import { TextField } from "../editor/controls";
import showcaseStyles from "../components/showcase.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: showcaseStyles },
];

/**
 * Menu button: for the few themes whose menu icon isn't found by itself.
 * The merchant picks a theme, points at its menu icon in a phone-sized store
 * window, and the icon is saved for that theme. No code, no theme edits.
 */
/** No heartbeat from the store window for this long: it was closed. */
const HEARTBEAT_LOST_MS = 6000;
/** Stop waiting after this, whatever happens. */
const WAIT_LIMIT_MS = 10 * 60 * 1000;

/** Draft themes shown at first (and added by each "Show more"). */
const DRAFTS_PAGE = 8;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const [themes, buttons, published] = await Promise.all([
    listThemes(admin),
    readMenuButtons(admin),
    prisma.menu.count({
      where: { shop: { shop: session.shop }, publishedAt: { not: null } },
    }),
  ]);
  // App embed status for what's on screen first (the live theme and the most
  // recently edited drafts); the page asks for more as merchants show more.
  const statuses = await embedStatuses(
    admin,
    themes.slice(0, DRAFTS_PAGE + 1).map((theme) => theme.id),
  ).catch(() => ({}) as EmbedStatuses);
  const appUrl = (process.env.SHOPIFY_APP_URL || "").replace(/\/$/, "");
  return {
    shop: session.shop,
    apiKey: process.env.SHOPIFY_API_KEY || "",
    published: published > 0,
    themes,
    statuses,
    buttons,
    // One pick session per theme, signed now: the store window has to open
    // synchronously on click (pop-up blockers), so it can't wait for a request.
    sessions: Object.fromEntries(
      themes.map((theme) => [
        theme.id,
        { t: signPick(session.shop, theme), api: `${appUrl}/api/menu-button` },
      ]),
    ),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = form.get("intent");
  if (intent === "statuses") {
    const ids = String(form.get("ids") ?? "").split(",");
    try {
      return {
        ok: true as const,
        statuses: await embedStatuses(admin, ids),
      };
    } catch {
      return { ok: true as const, statuses: {} as EmbedStatuses };
    }
  }
  const themeId = String(form.get("themeId") ?? "");
  if (intent !== "reset" || !/^\d+$/.test(themeId))
    return { ok: false as const, error: "Something went wrong." };
  try {
    await removeMenuButton(admin, themeId);
    return { ok: true as const };
  } catch (error) {
    console.error("Menu button reset failed", error);
    return {
      ok: false as const,
      error: "Couldn't reset it. Please try again.",
    };
  }
};

/** The phone-sized store window, centered over the admin. */
function openStoreWindow(
  shop: string,
  theme: StoreTheme,
  session: { t: string; api: string },
): Window | null {
  const url = new URL(`https://${shop}/`);
  // Always name the theme, the live one too: Shopify otherwise keeps showing
  // the last theme this browser previewed.
  url.searchParams.set("preview_theme_id", theme.id);
  const width = 420;
  const height = Math.min(880, window.screen.availHeight - 40);
  const left = Math.max(0, (window.screen.availWidth - width) / 2);
  const name = `chopi-pick:${JSON.stringify({ ...session, theme: theme.id, name: theme.name })}`;
  return window.open(
    url.toString(),
    name,
    `popup,width=${width},height=${height},left=${left},top=20`,
  );
}

const STEPS = [
  {
    title: "Choose your theme",
    text: "The one where tapping the menu icon still opens your theme's own menu.",
  },
  {
    title: "Tap your menu icon",
    text: "A phone-sized window of your store opens. Point at the ☰ icon and tap it.",
  },
  {
    title: "That's it",
    text: "From now on, that icon opens your Chopi menu on this theme.",
  },
];

export default function MenuButtonPage() {
  const { shop, apiKey, published, themes, statuses, buttons, sessions } =
    useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const reset = useFetcher<typeof action>();
  const statusFetcher = useFetcher<typeof action>();
  /** The theme whose store window is open, waiting for the pick. */
  const [waiting, setWaiting] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(DRAFTS_PAGE);
  const [moreStatuses, setMoreStatuses] = useState<EmbedStatuses>({});
  const storeWindow = useRef<Window | null>(null);
  const before = useRef<MenuButtons>(buttons);

  const live = themes.find((theme) => theme.live);
  const editorUrl = (themeId: string) =>
    `https://${shop}/admin/themes/${themeId}/editor?context=apps&activateAppId=${apiKey}/menu-embed`;
  const drafts = themes.filter((theme) => !theme.live);
  const matching = useMemo(() => {
    const words = query.trim().toLowerCase();
    return words
      ? drafts.filter((theme) => theme.name.toLowerCase().includes(words))
      : drafts;
  }, [drafts, query]);
  const visible = matching.slice(0, shown);
  const embedOf = (id: string) =>
    id in moreStatuses ? moreStatuses[id] : statuses[id];
  const liveEmbed = live ? embedOf(live.id) : null;

  // Load the app embed status of drafts that came into view.
  const missing = visible
    .filter((theme) => embedOf(theme.id) === undefined)
    .map((theme) => theme.id)
    .join(",");
  useEffect(() => {
    if (missing && statusFetcher.state === "idle")
      statusFetcher.submit(
        { intent: "statuses", ids: missing },
        { method: "post" },
      );
    // statusFetcher is stable enough here: only `missing` drives requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missing]);
  useEffect(() => {
    const data = statusFetcher.data;
    if (data && "statuses" in data && data.statuses) {
      const loaded = data.statuses;
      // Unknown stays unknown (null), so the same themes aren't asked again.
      setMoreStatuses((current) => ({
        ...current,
        ...Object.fromEntries(
          missing.split(",").map((id) => [id, loaded[id] ?? null]),
        ),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFetcher.data]);

  // The latest revalidator, for timers that outlive a render.
  const revalidatorRef = useRef(revalidator);
  revalidatorRef.current = revalidator;

  // While the store window is open: look for the saved icon every few
  // seconds, and stop waiting as soon as the window is closed. A window
  // handle can't always tell inside the admin, so the picker also sends a
  // heartbeat; when it stops, the window is gone.
  useEffect(() => {
    if (!waiting) return;
    const startedAt = Date.now();
    let lastBeat = 0;
    const stop = () => {
      setWaiting(null);
      revalidatorRef.current.revalidate();
    };
    const closed = () => {
      try {
        return storeWindow.current?.closed === true;
      } catch {
        return false;
      }
    };
    const check = () => {
      const now = Date.now();
      if (
        closed() ||
        (lastBeat > 0 && now - lastBeat > HEARTBEAT_LOST_MS) ||
        now - startedAt > WAIT_LIMIT_MS
      )
        stop();
    };
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; theme?: string } | null;
      if (!data || data.theme !== waiting) return;
      if (data.type === "chopi:pick-alive") lastBeat = Date.now();
      if (data.type === "chopi:pick-saved") revalidatorRef.current.revalidate();
    };
    const checkTimer = window.setInterval(check, 700);
    const pollTimer = window.setInterval(() => {
      if (revalidatorRef.current.state === "idle")
        revalidatorRef.current.revalidate();
    }, 2500);
    window.addEventListener("message", onMessage);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(checkTimer);
      window.clearInterval(pollTimer);
      window.removeEventListener("message", onMessage);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [waiting]);

  useEffect(() => {
    if (!waiting) return;
    const picked = buttons[waiting];
    if (picked && picked.pickedAt !== before.current[waiting]?.pickedAt) {
      shopify.toast.show(`Menu icon saved for ${picked.theme}`);
      setWaiting(null);
    }
  }, [buttons, waiting]);

  useEffect(() => {
    if (reset.state !== "idle" || !reset.data) return;
    if (reset.data.ok) shopify.toast.show("Back to automatic");
    else if ("error" in reset.data)
      shopify.toast.show(reset.data.error, { isError: true });
  }, [reset.state, reset.data]);

  const pick = (theme: StoreTheme) => {
    before.current = buttons;
    const opened = openStoreWindow(shop, theme, sessions[theme.id]);
    if (!opened) {
      shopify.toast.show(
        "Your browser blocked the store window. Allow pop-ups for Shopify and try again.",
        { isError: true },
      );
      return;
    }
    storeWindow.current = opened;
    setWaiting(theme.id);
  };

  const card = (theme: StoreTheme, featured = false) => (
    <ThemeCard
      key={theme.id}
      theme={theme}
      featured={featured}
      embedOn={embedOf(theme.id)}
      picked={buttons[theme.id]}
      waiting={waiting === theme.id}
      busy={Boolean(waiting)}
      resetting={
        reset.state !== "idle" && reset.formData?.get("themeId") === theme.id
      }
      editorUrl={editorUrl(theme.id)}
      onPick={() => pick(theme)}
      onCancel={() => {
        storeWindow.current?.close();
        setWaiting(null);
      }}
      onReset={() =>
        reset.submit({ intent: "reset", themeId: theme.id }, { method: "post" })
      }
    />
  );

  const anyPicked = themes.some((theme) => buttons[theme.id]);

  return (
    <s-page heading="Menu button" inlineSize="large">
      <s-link slot="breadcrumb-actions" href="/app/help">
        Help
      </s-link>
      <s-stack gap="large-400" paddingBlock="large large-400">
        <section className="chm-hero" aria-labelledby="chm-mb-title">
          <div className="chm-hero__main">
            <div className="chm-hero__copy">
              <span className="chm-hero__eyebrow">Menu button</span>
              <h2 id="chm-mb-title" className="chm-hero__title">
                Show me your <span className="chm-hero__brand">menu icon</span>
              </h2>
              <p className="chm-hero__lead">
                Chopi finds your theme&apos;s menu icon (☰) by herself on
                almost every theme. If tapping it on your phone still opens your
                theme&apos;s old menu, point at it once here. No code needed.
              </p>
              <p className="chm-mb-headsup">
                <strong>Heads up:</strong> only do this when your menu
                doesn&apos;t open by itself or something looks wrong. If it
                already works, you can skip this page.
              </p>
            </div>
            <ChopiStage>
              {waiting
                ? "I'm waiting in the store window. Tap your menu icon there!"
                : anyPicked
                  ? "Got it! I know where your menu icon is now."
                  : "Only needed if your menu doesn't open by itself."}
            </ChopiStage>
          </div>
          <ol className="chm-mb-steps">
            {STEPS.map((step, index) => (
              <li key={step.title} className="chm-mb-step">
                <span className="chm-mb-step__number">{index + 1}</span>
                <span>
                  <strong>{step.title}</strong>
                  <span>{step.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <s-section heading="Before you start">
          <ul className="chm-mb-checks">
            <Check state={published ? "done" : "todo"}>
              {published ? (
                <>
                  <strong>Your menu is published.</strong> Nothing to do here.
                </>
              ) : (
                <>
                  <strong>Publish your menu first.</strong> The menu icon opens
                  your published menu.{" "}
                  <s-link href="/app">Go to your menus</s-link>
                </>
              )}
            </Check>
            <Check
              state={liveEmbed === false ? "todo" : liveEmbed ? "done" : "tip"}
            >
              {liveEmbed === false ? (
                <>
                  <strong>Turn on the Mobile menu app embed</strong> in your
                  live theme.{" "}
                  <s-link href={editorUrl(live!.id)} target="_blank">
                    Open theme editor
                  </s-link>
                </>
              ) : liveEmbed ? (
                <>
                  <strong>The app embed is on</strong> in your live theme.
                  Drafts show their own status below.
                </>
              ) : (
                <>
                  <strong>The Mobile menu app embed must be on</strong> in the
                  theme. Each theme shows its status below.
                </>
              )}
            </Check>
            <Check state="tip">
              <strong>Test on a phone-sized screen.</strong> On desktop your
              theme&apos;s own menu stays on purpose.
            </Check>
          </ul>
        </s-section>

        {live && (
          <s-section
            heading="Your live theme"
            subheading="What shoppers see right now. Start here."
          >
            {card(live, true)}
          </s-section>
        )}

        {drafts.length > 0 && (
          <s-section
            heading={`Draft themes (${drafts.length})`}
            subheading="Each theme keeps its own menu icon, so you can set one up before you publish it."
          >
            <s-stack gap="base">
              {drafts.length > DRAFTS_PAGE && (
                <div className="chm-mb-search">
                  <TextField
                    label="Search themes"
                    labelAccessibilityVisibility="exclusive"
                    placeholder="Search draft themes"
                    value={query}
                    onChange={(value) => {
                      setQuery(value);
                      setShown(DRAFTS_PAGE);
                    }}
                  />
                </div>
              )}
              {visible.length ? (
                <div className="chm-mb-themes">
                  {visible.map((theme) => card(theme))}
                </div>
              ) : (
                <s-paragraph color="subdued">
                  No draft theme matches “{query}”.
                </s-paragraph>
              )}
              {matching.length > shown && (
                <div className="chm-mb-more">
                  <s-button
                    onClick={() => setShown((count) => count + DRAFTS_PAGE)}
                  >
                    Show more ({matching.length - shown} more)
                  </s-button>
                </div>
              )}
            </s-stack>
          </s-section>
        )}

        {themes.length === 0 && (
          <s-section heading="No themes yet">
            <s-paragraph color="subdued">
              Add a theme in Online Store › Themes first.
            </s-paragraph>
          </s-section>
        )}

        <StillNotWorkingBanner />
      </s-stack>
    </s-page>
  );
}

const CHECK_ICONS = {
  done: <path d="m4.5 8.4 2.3 2.3 4.7-5.2" />,
  todo: <path d="M8 4.5v4.2M8 11.4v.1" />,
  tip: <path d="M8 7.4v4M8 4.6v.1" />,
};

/** One line of "Before you start": done, something to do, or a tip. */
function Check({
  state,
  children,
}: {
  state: keyof typeof CHECK_ICONS;
  children: ReactNode;
}) {
  return (
    <li className={`is-${state}`}>
      <span className="chm-mb-checks__mark">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          {CHECK_ICONS[state]}
        </svg>
        <span className="chm-mb-sr">
          {state === "done" ? "Done:" : state === "todo" ? "To do:" : "Tip:"}
        </span>
      </span>
      <span>{children}</span>
    </li>
  );
}

/** One theme: its status and the button that opens the store window. */
function ThemeCard({
  theme,
  featured,
  embedOn,
  picked,
  waiting,
  busy,
  resetting,
  editorUrl,
  onPick,
  onCancel,
  onReset,
}: {
  theme: StoreTheme;
  featured: boolean;
  /** undefined: still loading; null: couldn't tell. */
  embedOn: boolean | null | undefined;
  picked: MenuButtons[string] | undefined;
  waiting: boolean;
  busy: boolean;
  resetting: boolean;
  editorUrl: string;
  onPick: () => void;
  onCancel: () => void;
  onReset: () => void;
}) {
  return (
    <div
      className={`chm-mb-theme${featured ? " chm-mb-theme--live" : ""}${picked ? " is-picked" : ""}${waiting ? " is-waiting" : ""}`}
    >
      {featured && (
        <span className="chm-mb-theme__phone" aria-hidden="true">
          <span className="chm-mb-theme__burger">☰</span>
        </span>
      )}
      <div className="chm-mb-theme__body">
        <div className="chm-mb-theme__head">
          <span className="chm-mb-theme__name">{theme.name}</span>
          <s-badge tone={theme.live ? "success" : "neutral"}>
            {theme.live ? "Live" : "Draft"}
          </s-badge>
        </div>

        <div className="chm-mb-theme__status">
          {embedOn === false ? (
            <span className="chm-mb-pill is-off">
              App embed off ·{" "}
              <a href={editorUrl} target="_blank" rel="noreferrer">
                Turn on
              </a>
            </span>
          ) : embedOn ? (
            <span className="chm-mb-pill is-on">App embed on</span>
          ) : embedOn === undefined ? (
            <span className="chm-mb-pill is-loading">Checking…</span>
          ) : null}
          <span className={`chm-mb-pill${picked ? " is-picked" : ""}`}>
            {picked ? "Menu icon picked" : "Finds the icon by itself"}
          </span>
        </div>

        {picked && (
          <code className="chm-mb-theme__code">{picked.selector}</code>
        )}

        {waiting ? (
          <div className="chm-mb-theme__waiting" role="status">
            <s-spinner size="base" accessibilityLabel="Waiting" />
            <span>
              Tap your menu icon in the store window…
              <br />
              <button type="button" className="chm-mb-link" onClick={onCancel}>
                Cancel
              </button>
            </span>
          </div>
        ) : (
          <div className="chm-mb-theme__actions">
            <s-button
              variant={picked ? "secondary" : "primary"}
              disabled={busy || embedOn === false}
              onClick={onPick}
            >
              {picked ? "Pick again" : "Point to the menu icon"}
            </s-button>
            {picked && (
              <s-button
                variant="tertiary"
                loading={resetting}
                onClick={onReset}
              >
                Back to automatic
              </s-button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
