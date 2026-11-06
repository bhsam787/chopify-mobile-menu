# Chopify Menu: product and technical plan

Status: draft v1 (2026-11-02). Scope: **mobile menu** (desktop menu comes later).

## 1. Concept

Merchants design their storefront's **mobile drawer menu** in a visual editor and publish it to their theme. When they turn on the app embed, the theme's own burger menu is taken over by the app's menu.

- **Templates:** start from a ready-made design and change anything.
- **Widgets:** drop in building blocks such as story circles (best sellers), featured cards, pills, promo banners, reviews and links.
- **Visual editor:** live phone preview, drag-and-drop, and per-element styling (font sizes, colors, spacing, radius). A free-form canvas section allows Figma-like layouts.
- **Theme takeover:** the app embed hides the theme's drawer and opens ours from the theme's burger icon, with no theme code edits.
- **Pricing:** Free (every feature, but draft/preview themes only), Pro at $20/month with a 7-day trial (live theme), and free on development stores.

### What we keep from bbb-menu-sh and speckshop-menu-sh

| Kept | Why |
|---|---|
| The whole design is one JSON document published to a metafield that Liquid reads | Fast, no runtime API calls, works in every theme |
| Link objects (`type`, `id`, `url`, `title`) and a **hidden Shopify links menu** that Liquid reads for current URLs | Links follow handle changes and are localized by Shopify |
| Per-locale translation maps with fallback to the default language | Proven in both projects |
| Sections in a reorderable `section_order`, each with content plus a style object | This becomes the widget model |
| A "Live on storefront" switch | Becomes publish / unpublish |
| Widget ideas: top bar, deal highlight, bestsellers, collection cards, review, promo banners, featured menus with sub-menus, pills, footer links, country/language | The starting widget library |

### What changes, and why

| Old (custom apps) | New (public app) | Reason |
|---|---|---|
| Shopify-hosted App Home extension, no backend | **Embedded React Router app + Postgres** (this repo) | App Home extensions allow custom distribution only. We also need drag-and-drop, real HTML preview, drafts and history |
| SVG picture preview that estimated text widths | **The same renderer** draws the editor preview and the storefront | What you see is what ships, with no drift |
| ↑ ↓ buttons | Real drag-and-drop | The iframe app has no renderer limits |
| Liquid snippet hand-edited into one theme | **Theme app extension (app embed)** | Works on any theme with no code edits. Required for the App Store |
| Hardcoded store defaults, logo and namespace | Templates filled from the shop's own data. `$app` namespace | Works for any store |
| Metafield up to 2 MB | **The published JSON must fit in 128 KB** | Limit for new apps since API 2026-04. Editor state lives in Postgres and only a compact compiled version is published |

## 2. Architecture

```
Admin (embedded iframe app, React Router)                Storefront (any theme)
┌──────────────────────────────────────────┐            ┌───────────────────────────────┐
│ Dashboard · Templates · Editor · Billing  │            │ App embed (Liquid, body)       │
│ Editor: canvas + layers + inspector       │            │  - reads app-data metafields   │
│ Preview = @chopify/renderer in an iframe  │            │  - resolves links/products/    │
└───────────────┬──────────────────────────┘            │    locale in Liquid → JSON     │
                │ save draft / publish                   │  - hides theme drawer (CSS)    │
        ┌───────▼────────┐   compile    ┌──────────────┐ │  - chopify-menu.js (~10 KB gz) │
        │ Postgres (Neon)│ ───────────▶ │ Shopify       │─▶│    = @chopify/renderer       │
        │ drafts, history│   publish    │ $app metafield│ │    takes over the burger      │
        └────────────────┘              │ + links menu  │ └───────────────────────────────┘
                                        └──────────────┘
```

### Repository layout (npm workspaces)

```
app/                          React Router admin app (routes, *.server.js services)
packages/menu-core/           TypeScript: design schema (zod), defaults, schema migrations,
                              compile(design) → published JSON, link helpers. Shared by app + build.
packages/menu-renderer/       TypeScript, no framework: render(published, data) → DOM + drawer
                              behavior (open/close, sub-menu screens, focus trap). Used by the editor
                              preview and bundled into the extension.
packages/widgets/             One folder per widget: schema, defaults, render(), inspector config.
extensions/chopify-menu/      Theme app extension: blocks/menu-embed.liquid, assets/ (built
                              renderer + CSS), locales/.
docs/                         This plan, the theme-adapter notes and the metafield contract.
```

New code is TypeScript. The template's existing JS routes are converted as they're touched.

## 3. Data model

### Postgres (Prisma)

| Table | Purpose |
|---|---|
| `Session` | Existing |
| `Shop` | `shop` (domain, unique), plan, `isDevStore`, `installedAt`, `uninstalledAt`. Created/refreshed in the `afterAuth` hook. Theme info and locales get added when a feature needs them (`shopLocales` would also need the `read_markets_home` scope) |
| `Menu` | `shopId`, `name`, `draft` (JSON, full editor state), `published` (JSON, nullable), `publishedAt`, `schemaVersion`, `status`. One active menu per shop for now; the table allows more (desktop, A/B) later |
| `MenuVersion` | Snapshot per publish (and named saves) → restore |
| `WebhookEvent` | *Deferred.* Current handlers are idempotent by design. Add this (`webhookId` unique) with the first handler that isn't, likely billing |

Every query is scoped by `shop`. Templates are **not** stored in the DB: they ship in code (`packages/widgets/templates/*.json`), versioned with the app.

### Design document (editor state, `Menu.draft`)

The Figma designs are built from nested containers: background zones, white rounded panels, 2-column grids, scroll rows, tabs and accordions. So the design is a **node tree, like Figma auto-layout**, not a flat list of sections.

```ts
Design {
  schemaVersion: number
  tokens: { fontFamily: 'theme' | FontRef, colors: {...}, radius, spacing, background }
  header: Node                 // pinned top: logo, language, close (a container like any other)
  footer: Node                 // pinned bottom: account link, socials, country/language
  screens: Screen[]            // [0] = main; others = sub-menu screens (slide-in with "‹ Title" back bar)
  translations: { [locale]: { [textId]: string } }
  behavior: { breakpoint, openFrom: 'left' | 'right', width: '100%' | number, overlay, animation }
}
Screen { id, title, root: Node }

Node = Container | Tabs | Widget
Container { type: 'container', layout: 'stack' | 'grid' | 'scroll',
            columns?: 1-4, gap, padding, background (color | image | gradient), radius, border,
            children: Node[] }
Tabs      { type: 'tabs', style, tabs: { label, root: Node }[] }       // pill tabs (IOS, oils designs)
Widget    { type: WidgetType, props, style, link?: LinkRef, visibility?: Rule[], hidden?: bool }

Link targets on cards and rows: open a URL | open a sub-menu screen | expand inline (accordion)
Free canvas widget: props.layers: Layer[]   // absolutely positioned: x, y, w, h in % of the canvas,
                                           // typography, color, z-order, link
```

A Figma frame maps almost 1:1 onto this tree, which keeps templates faithful to the designs.

`compile(design)` in `menu-core` strips editor-only data, merges defaults, minifies keys and checks the size (warn at 100 KB, block at 128 KB).

### Shopify-side storage

- **`$app` app-data metafields (AppInstallation)**, read in the embed through `app.metafields`:
  - `menu`: the compiled design (json, ≤128 KB)
  - `entitlement`: `{ plan, liveAllowed }`, written on install, on plan change and on the `app_subscriptions/update` webhook
- **Hidden links menu** `chopify-menu-links`, named "Chopify Menu links (managed by app, don't edit)": one item per link, rewritten on publish (the bbb approach). Liquid looks items up by stable title/key and gets the current, translated URL.
- **Images:** Shopify Files (`fileCreate`). We store the CDN URL plus the file GID, and Liquid/CDN resize them.

## 4. Storefront engine (theme app extension)

### App embed `menu-embed.liquid` (target `body`)

1. Reads `app.metafields.chopify.menu` and `.entitlement`. Outputs nothing if the menu is unpublished.
2. Resolves dynamic data **in Liquid** into a `<script type="application/json">` block:
   - link URLs from `linklists['chopify-menu-links']`
   - widget data: products/collections for story circles and cards (`collections[handle].products`, limited counts), with images through `image_url: width:`
   - the active locale's texts (`request.locale.iso_code`), plus `localization` for the country/language picker
   - `customer`, `cart.item_count`, `routes.*`
3. Loads `chopify-menu.js` with `defer`, plus a small CSS file.

### Takeover strategy

- **Intercept, don't remove:** a capture-phase click listener on the theme's burger element calls `preventDefault` and `stopImmediatePropagation`, then opens our drawer. The theme's icon and header layout stay as they are, and CSS hides the theme's drawer as a safety net.
- **Only below the breakpoint** (default 990px, configurable). Desktop is untouched.
- **Theme adapters:** a registry in `menu-renderer/adapters` maps a theme to `{ burgerSelector, drawerSelector, breakpoint, quirks }`.
  - Detection uses `read_themes`: `theme_store_id` first, then the theme name. Renamed and duplicated themes keep their store ID, so detection survives them.
  - Themes that aren't in the registry get a generic heuristic, and merchants can enter a manual selector (an embed setting and an app setting, with a "test" button).
  - Popular Theme Store themes come first. Each theme family shares one adapter where its header code is shared:

  | Tier | Themes | When |
  |---|---|---|
  | **1 (launch, required)** | **Horizon** (and the Horizon family that shares its header), **Dawn** (and the Dawn family: Refresh, Sense, Craft, Studio, Taste, Origin, Crave, Colorblock, Ride, Spotlight, Publisher), **Impulse**, **Prestige**, **Broadcast** | Phase 1 spike + launch |
  | **2 (launch, best effort)** | Symmetry, Motion, Warehouse, Focal, Empire, Be Yours, Enterprise, Expanse, Stiletto, Pipeline, Streamline, Palo Alto | Before App Store submission |
  | **3** | Anything else via the generic heuristic + manual selector. Add adapters from support requests | After launch |

  Before each tier is signed off, every adapter is checked against the theme's **latest version**, on the test checklist in §10. Theme updates can change header markup, so the adapter registry carries the theme versions it was tested on.
- **Lazy rendering:** the drawer DOM is built on first open (or on idle), so page load pays only for the small loader. No layout shift.
- **Theme editor:** when `request.design_mode` is on, show a small "Chopify Menu active" badge.
- **Accessibility:** `<dialog>`/focus trap, Esc to close, `aria-expanded` on the theme burger, reduced-motion support.

### Performance budget (App Store review measures storefront impact)

- Loader JS ≤10 KB gzipped (theme-check `AssetSizeAppBlockJavaScript`). The full renderer is lazy-loaded on first tap if it's bigger.
- CSS ≤8 KB, no external fonts by default (inherit the theme font).
- Lighthouse delta measured on Dawn and Horizon before submission.

## 5. Admin app

### Screens

1. **Home / onboarding checklist:** pick a template, customize, enable the app embed (deep link into the theme editor), publish. Shows embed status from `shopify.app.extensions()` and the plan.
2. **Template gallery:** cards with previews. Applying a template fills it with the shop's data (main-menu links, top collections, best sellers) so it looks like their store immediately.
3. **Editor:** full-screen (App Bridge max modal / app window).
   - Left: widget library (drag in) and a layers tree (drag to reorder, hide, duplicate, delete).
   - Center: phone frame with the live renderer (360/390/430 widths, language switcher, main and sub-menu screens). Click an element to select it.
   - Right: inspector with Content, Style and Visibility tabs.
   - Top bar: undo/redo, autosave state, "Preview on store", **Publish**.
4. **Settings:** breakpoint, theme adapter / manual selector, languages.
5. **Plan & billing.**

### Editor mechanics

- State: one design store with undo/redo (immer patches). Autosaves the draft to Postgres (debounced). Publishing is explicit.
- Drag and drop with `@dnd-kit` for the library → canvas, section reorder and layer tree. Free-canvas layers get move/resize handles, snapping and alignment guides.
- Preview: `@chopify/renderer` inside a sandboxed iframe with the same CSS as the storefront, fed by a preview data resolver that mimics the Liquid output using Admin API data.
- Pickers: App Bridge resource picker for products and collections. A link picker covers pages, blogs, articles, policies, routes and custom URLs. Images come from Shopify Files.

### Layout model (decision)

The menu is built from **auto-layout containers**: stack, grid (1–4 columns) or horizontal scroll, each with its own padding, gap, background and radius, and widgets inside them. Merchants drag widgets into containers and nest containers, the way Figma auto-layout works. That stays correct on every phone width, with translated text and with live data.

For full freedom, a **Free canvas** widget lets merchants place text, image, button and shape layers anywhere inside a fixed-ratio area. Free positioning is limited to these areas because a whole drawer of absolutely positioned elements breaks across screen sizes and languages.

## 6. Widget library

Derived from bbb-menu-sh, speckshop-menu-sh and the Figma file (`Rkml80qkqixTKqJRFWxWzR`, page 7: First Loop, Second Loop, Components, IOS Konzept / Konzept Neu).

### Structure (containers)

| Node | Seen in |
|---|---|
| **Container**: stack / grid (1–4 cols) / horizontal scroll, with background zone, padding, radius | Every design: IOS white panels on grey, the oils beige footer zone |
| **Tabs**: pill tabs, each with its own content | IOS (Produktkategorien / Looks), oils (Produktkategorien / Anwendungsziele) |
| **Sub-menu screen**: slide-in with a "‹ Title" back bar | IOS "Kategorie geöffnet (Anzüge)" |
| **Accordion**: a card expands inline into a sub-list | Control menu "Alle Produkte" |

### Widgets

| Widget | Variants (style presets) | Seen in |
|---|---|---|
| **Header** | logo left/center; flag + language dropdown; close plain / in a circle | IOS, oils, BBB |
| **Category card** | *Studio*: title top-left, image right, arrow chip · *Product*: title, image, arrow, badge · *Overlay*: full image, gradient, label + arrow · *Bottom label*: image, then label + arrow · *Circle*: round image tile | IOS, oils A/B/C, Anwendungsziele, Components "Kategorie-Karte A/B/C" |
| **Story circles** | bestsellers from a collection or manual picks; ring color | BBB |
| **List row** | thumbnail + title + subline + chevron · icon + title (+ subline) · plain text · highlighted (accent color) | IOS sub-menu, BBB cards, oils "Special Deals / Zertifikate", Huel-style rows |
| **Promo banner** | image + title + subline + arrow chip (configurator) · avatar + text (referral) | Wunschset-Banner, "Freunde werben" |
| **Highlight card** | dark card: eyebrow, badge, title, text, CTA button, image | BBB "Top Deal" |
| **Split banner** | solid color left, photo with gradient fade right, label | Control menu "Über uns", "Hilfe & Kontakt" |
| **Countdown banner** | title, subline, code, live timer; 5 color presets | Sale-Banner (Components) |
| **Promo pill** | icon + short text on a tinted pill | "Gratis Nelken Roll-On ab 59 €", "Schenke 30 €" |
| **Chips row** | horizontal scroll of icon + label chips | Control menu "Wonach suchst du?" |
| **Heading** | text, size, weight, case | "Bestseller", "Wonach suchst du?" |
| **CTA button** | full-width pill; filled / outline | "Alle Produkte", "Look ansehen" |
| **Related card** | image, eyebrow, title, text, outline button | IOS "Passend dazu" |
| **Review** | quote, stars, author + photo | BBB |
| **Top bar / social proof** | avatars, verified badge, rich text | BBB |
| **Footer bar** | account link (Anmelden/Einloggen) + social icons | IOS, oils, Control |
| **Country / language** | dropdowns or flag + code | BBB, IOS |
| **Divider / spacer** | | |
| **Free canvas** | | Phase 4 |

### Atoms (shared by widgets, styled once in tokens)

Arrow chip (white / filled / plain), tab pill (active / inactive), badge (`NEU`, `SALE`, `SPAREN`, round numeric like "3600"), icon set (deals, certificate, people, help, user, social), image with ratio, radius and fit.

Each widget is a folder with: schema (zod), defaults, `render()`, an inspector field config and an estimated compiled size.

### Later

Product carousel with price / add to cart, recently viewed, video/GIF banner, blog posts, visibility rules by market and schedule.

## 7. Templates

Launch set, each rebuilt as a **brand-neutral** design. The Figma files contain real client brands (IOS, Huel, BBB, the oils store), so we ship neutral names, colors and placeholder imagery and fill the content from the merchant's own shop:

| Template | Based on | Structure |
|---|---|---|
| Spotlight | BBB | social-proof top bar, highlight card, story circles, image list rows, review, country/language |
| Studio | IOS Konzept | header with language, tabs, 2-col studio cards, sub-menu screens with thumbnail rows, related card, CTA, footer bar |
| Studio Simple | IOS Konzept Neu | Studio without tabs |
| Botanical Grid | Oils, Vorschlag A | tabs, configurator banner, product cards with badges, CTA, beige zone with icon rows, footer bar |
| Image Tiles | Anwendungsziele | tabs, overlay image cards, CTA, icon rows |
| Circle Tiles | Vorschlag C (Kreis-Kacheln) | circle tiles grid, CTA, rows |
| Mono Grid | Huel-style frames | black/white bottom-label cards, referral banner, plain rows, promo pill |
| Accordion | Control menu | heading, chips row, image rows with accordion, split banners, footer bar |

**Decided 2026-11-03:** templates are **pre-filled sample designs** (texts + images following the Figma frames), not filled from the shop's data, so previews always look finished. Images are served from `public/templates/` (WebP) for previews and copied to the merchant's Shopify Files on the first save. The sample photos are original generated stand-ins (same subjects and crops as the Figma frames, invented labels such as GROVE and NORTH, no client brand marks). Prompts are in `packages/menu-core/src/templates/images.json`. Each app menu creates its own Shopify navigation menu "<name> (Chopify Menu)" on save; deleting the app menu deletes it (never the store's own menus).

Other template rules:

- A template is a `Design` with placeholders (`{{shop.main_menu}}`, `{{shop.bestsellers}}`) that are resolved when it's applied.
- Gallery thumbnails are rendered by the same renderer.

## 8. Billing and plan gating

- Use **Shopify App Pricing** (configured in the Partner Dashboard), which Shopify recommends for public apps:
  - **Free:** $0, every feature.
  - **Pro:** $20/month with a 7-day free trial, plus the "Free for partners and developers" option for dev stores.
- Read the current plan with an `activeSubscription` check. On change, update `Shop.plan` and the `entitlement` metafield.
- **Free = draft/preview themes only:**
  - Storefront: when `liveAllowed` is false, the embed script doesn't take over on the **published** theme (detected with `window.Shopify.theme.role === 'main'`; to be verified in the spike, see §10). The theme's own menu keeps working, so nothing breaks.
  - Admin: if the embed is active on the published theme while on Free, a banner says the menu shows only in theme previews and offers an upgrade.
  - This client-side check can be bypassed by a determined user. That's acceptable for a $20 app, and it never harms the shopper.

## 9. App Store readiness (applies to every phase)

- Mandatory compliance webhooks: `customers/data_request` and `customers/redact` (we store no customer data, so acknowledge them), and `shop/redact` (delete the shop's rows).
- `app/uninstalled`: delete sessions and mark the shop as uninstalled. The metafields go with the app installation.
- Scopes (minimal): `read_products`, `read_content`, `read_legal_policies`, `write_online_store_navigation` (hidden links menu), `read_themes` (adapter detection, embed status from the backend), `read_files`/`write_files` (images), `read_locales`. The template's `write_metaobjects*` scopes are removed.
- Remove template leftovers: the demo product metafield, the demo metaobject, the `product-price-change` event and the example routes.
- Polaris web components for every admin screen except the editor canvas. Loading, empty and error states throughout.
- Listing assets: screenshots, a demo video and a theme compatibility list.

## 10. Risks to prove first (Phase 1 spike)

| Risk | How we check |
|---|---|
| Burger takeover across themes | Prototype on the tier 1 themes (Horizon, Dawn, Impulse, Prestige, Broadcast) on dev store `shiam-dev-05`. Checklist per theme: tap opens our drawer and never the theme's; no flash of the theme drawer; header layout unchanged; works after Ajax/section re-renders; the cart drawer and search still work; desktop is untouched; works in the theme editor |
| Whether `Shopify.theme.role` is available and reliable on preview vs live | Test on a dev store with a published and an unpublished theme |
| The 128 KB metafield limit | Compile the largest template and measure. Text-heavy designs with 5+ locales are the worst case |
| Liquid limits for widget data (product lookups per page) | Story circles from a collection with N ≤ 12 |
| Lighthouse impact | Run before and after on Dawn |
| Hidden links menu acceptance | Check the App Store guidance. Fallback: store handles and resolve them through `collections[handle]` / `pages[handle]` |

## 11. Phases

| Phase | Deliverables | Exit criteria |
|---|---|---|
| **0. Foundation** ✅ code done 2026-11-03 | Remove template leftovers, minimal scopes, compliance + uninstall webhooks, `Shop`/`Menu`/`MenuVersion` tables, TypeScript setup, app shell with home checklist. (The `packages/*` workspace is set up in Phase 1, together with its first real package) | Lint, typecheck, build and `app config validate` pass. **Still to verify:** install on `shiam-dev-05` |
| **1. Storefront spike** 🟡 code done 2026-11-03, needs store testing | Theme extension with app embed, metafield publish pipeline, full renderer (all MVP widgets), tier 1 adapters (selectors unverified), role check, hidden links menu, loader 1.4 KB + lazy menu 11.3 KB gz | A real design opens from the theme burger on Horizon, Dawn, Impulse, Prestige and Broadcast; all §10 risks answered |
| **2. Editor MVP** 🟡 code done 2026-11-03, needs store testing | Section-list editor: BBB/Speckshop clarity (numbered sections · visibility · Design modal · Customize; item rows with Edit modal; Browse link menu) plus what App Home extensions couldn't do: drag & drop reordering (↑↓ kept for keyboard), real clickable preview with phone sizes, drafts in Postgres, undo/redo, 22 widgets, link picker, image upload to Files, translations, save bar + publish. Not yet: version restore UI | A merchant builds and publishes a menu without touching code |
| **3. Templates + widgets** 🟡 5 of 8 templates done (Studio, Studio Simple, Botanical Grid, Spotlight, Accordion) + gallery with live previews | Your Figma designs as templates, the rest of the MVP widgets, the template gallery with shop-data filling | Every template looks right on the 5 test themes |
| **4. Canvas** 🟡 code done 2026-11-03, needs store testing | "Start from scratch" → blank **Canvas** menu; **Canvas** section in the library; full-screen **Canvas editor** in an App Bridge max modal (`/app/canvas/:menuId/:canvasId`): elements panel (drag or click), layers (drag to reorder z), move/resize with smart guides (Alt = off), Shift = keep ratio, arrow nudge, undo/redo, X/Y/W/H fields, content + design inspector. Canvas is designed at 390px and scales proportionally on every phone. **Edit as canvas** converts any template screen into a canvas at measured positions (pixel-identical; container boxes → shapes; tabs/accordions/scroll rows stay single elements; previous draft kept as a MenuVersion). **Nested layers (2026-11-03):** shapes are Figma-like frames (`ShapeNode.children`, frames relative to the parent, optional clip/icon); click selects at the current level, double-click goes inside / edits text in place, ⌘/Ctrl-click selects the innermost, Esc selects the parent, dragging a layer into/out of a frame regroups it; Layers panel is a tree. Banners, cards, rows, reviews and pills are added as layers; other widgets can be **Split into layers** (measured off-screen render → image/text/shape/icon layers). **Figma toolkit:** ~38 elements (text, shapes, media, buttons & links, widgets); multi-select (Shift-click, marquee, ⌘A), move together, align/distribute, group/ungroup (⌘G/⇧⌘G), copy/cut/paste (⌘C/⌘X/⌘V, pastes as sibling), duplicate, z-order (⌘]/⌘[, ⌥ for front/back), lock (⇧⌘L) and hide (⇧⌘H), rename in Layers; per-layer effects (opacity, rotation, flip, preset/custom drop shadow, layer blur, background blur, blend mode); shapes: two-color gradients, dashed/dotted borders, icons; images: fit + focus; text: font family, align, line height, underline. **Template parity (2026-11-03):** free tabs (`TabsNode.tabs[].child` may be a shape panel; bar height + `TAB_GAP` offset), sideways-scrolling frames (`ShapeNode.scroll`), accordion frames (`ShapeNode.collapsible`; `canvasLayout()` in menu-core pushes layers below, mirrored in behavior.ts and the editor overlay), sub-menu screens as canvases (screen switcher in the canvas editor, new sub-menus are canvases, section sub-menus convert on open); "Layouts" elements (Tabs, Accordion, Chip row, Card carousel, Card grid, Link list); "Edit as canvas"/template apply converts tabs, accordions and scroll rows into these | Figma-like editing; same look on 360–430px phones |
| **5. Billing + onboarding** | App Pricing plans, gating, embed deep link + status checklist, settings | Free/Pro behavior verified on dev, preview and live themes |
| **6. Launch** | Cross-theme QA, performance pass, accessibility pass, App Store review checklist, listing | Submitted for review |

Later: desktop / mega menu, A/B tests, analytics (menu click tracking), market and schedule visibility rules.

## 12. Open questions for you

1. **Editor fonts:** inherit the theme font only, or also offer a curated list? Each extra font costs storefront performance.
2. **Countdown banner:** should the timer count down to a fixed date, or run as a rolling daily timer (resetting at midnight)?

Resolved:
- Figma designs received (2026-11-02), see §6 and §7.
- Theme support (2026-11-03): popular Theme Store themes, with tier 1 = Horizon, Dawn, Impulse, Prestige and Broadcast (§4). Dev store: `shiam-dev-05.myshopify.com`.

### 2026-11-03 — Menus, publishing and preview modes
- Merchants can make many menus (blank canvas or template) and name them when creating (unique default like "Canvas menu 2"); **Rename** in the editor also retitles the menu's Shopify navigation menu.
- Only one menu is live per store: publishing another asks to replace the live one; **Unpublish** takes the menu off the store (draft kept). Home shows "Live on store" / "Draft".
- Live preview has **Edit** (click to select) and **Preview** (storefront behaviour in a sandbox: tabs, accordions, sub-menus, drag-to-swipe; links/forms/close stay in the editor) modes.

### 2026-11-03 — Smart lists and menu structure on the canvas
- `ShapeNode.list` (column / row / grid + gap/columns) makes a frame a smart list (auto layout in the editor, `app/canvas/items.ts` + `lists.ts`): items re-flow after add/remove/reorder/drag; resizing one resizes all; "Make all items look like this one" copies design but keeps content.
- Items panel (right) and **Menu** tab (tree of main menu → items → sub-menus → …) with Add item / Add sub-menu / Open at every level. "Add sub-menu" creates a canvas screen pre-filled with a heading and a list styled like the parent; works at any depth.
- Layouts elements (Link list, Card grid, Chip row, Carousel, Tabs' grids) are smart lists with sample links; "Edit as canvas" turns repeated cards/rows/chips and scroll rows into smart lists.
- Editor previews never follow links (pointer-events off + click guard).

### 2026-11-03 — "Sliding Menu" template (Figma 2074:659 / 2074:668)
- Pill tab switch (Categories / Occasions) with a track, round photos on a pink band, full-width icon rows with thin dividers; arrow rows slide to sub-menu screens (7 sub-menus). Neutral English sample copy (the frames show a real store).
- Renderer options added for it: `TabsNode.style.track` / `inset`, `RowNode.thumbBackground`, `StoriesNode.ringWidth`.
- ⚠️ Images in `public/templates/kids/` are cropped from the Figma frames (a real store's photos/icons): dev-only, replace before App Store submission (marked `source: "figma"` in images.json).
- Links inside any link (2026-11-05): in a list of links (stacked rows), every link has "Add links inside", which turns it into a fold-out (`addLinksInside` in `packages/menu-core/src/sublinks.ts`). It keeps its look, its old link becomes the first link inside ("Shop all …"), and the links inside copy the style of a fold-out next to it. A fold-out with at most one link can go back to a single link (`removeLinksInside`). Fold-outs don't nest.

### 2026-11-05 — Home and Templates redesign (Shopify Homepage pattern, Polaris 2)
- Home (`app/routes/app._index.tsx` + `app/home/*`):
  - A welcome card with a fan of template phones (first visit only).
  - A setup guide with detected steps: it leads until a menu is live, then folds away at the bottom so the async embed check never shifts the page.
  - A metrics row: live menu, links, sub-menus, app embed. Only numbers the app knows; no made-up analytics.
  - The live menu (else the latest draft) running in a phone, with status and actions.
  - The menus table, three template tiles (they open `/app/templates?preview=<id>`), and footer help.
- Templates: a blank-canvas card, feature filter chips (`Template.features` / `isNew` in menu-core), tiles on a backdrop tinted with each template's accent, and a large Preview modal driven by the URL.
- Custom CSS is only `app/components/gallery.css` (phone stages, fan, sketch). Polaris responsive `gridTemplateColumns` values must not contain commas (`minmax(0, 1fr)` breaks the parser) and need an `s-query-container`.

### 2026-11-06 — Links resolve by ID; no more Shopify navigation menu
- Removed: the per-menu Shopify navigation menu ("<name> (Chopify Menu)"), `navigation.server.ts`, `navigationTree`, the `Menu.shopifyMenuId/Handle` columns (migration `drop_shopify_menu`) and the `write_online_store_navigation` scope.
- On publish, `compile()` returns `references` (GIDs by type). `writeMenuReferences` stores them as `list.<type>_reference` app-owned shop metafields (`$app:chopify`, chunks of 50 because Liquid loops 50 references without `paginate`, which would follow the page's own `?page=`). There's a cap of 200 per type, checked on publish only (`TooManyLinksError`).
- The embed loops the references and prints `kind:id → {url,title,image}`. Story-circle collections come from `product_collections`, with `collection.products limit: meta.productLimit`; there's no `collections[handle]` anymore.
- Storefront `liveResources: true`: a collection/product/page/post missing from the resolved resources (deleted or unpublished) hides its item (card/row/chip/pill/button/banner/image, story items) instead of linking to a 404. Blogs (no reference type) keep their stored URL. The editor never hides.
- Unpublish deletes the reference metafields too.

### 2026-11-06 — "Add a section" catalog redesign
- `app/editor/sectionCatalog.ts`: one catalog for the library.
  - Basic sections from `WIDGETS`, with styles (Banner ×4, Category card ×6, Link row ×3, Button ×2).
  - 20 "From templates" sections read from the template designs via `pick` predicates (so they never drift). Each comes with the sub-menus it links to, copied with new screen ids.
  - Built lazily when the library opens.
- `SectionLibrary.tsx`:
  - A sticky search bar plus kind chips with counts, and an empty state.
  - Tiles with a big clickable preview and a hover "+ Add", template badges, style pickers, and buttons aligned at the bottom.
  - `onAdd` receives `{ node, screens }`; the editor appends the screens.
- Bug fixed: `MenuPreview` restored the open tab with `.click()`, which in edit mode selected the Tabs section on every re-render (it opened, and the page scrolled to it after any edit). It now uses `selectTab()` from the renderer.
- Not yet shared with the canvas Elements panel (canvas items need frames/free layout); a follow-up is to generate canvas elements from the same catalog.

### 2026-11-06 — Translations
- `menu-core/translations.ts`:
  - `collectTexts(design)` lists every text in storefront order: main menu, each sub-menu (title + contents, canvas layers included), then built-in words.
  - `resolveTexts(translations, locale)`: exact locale → base language → a regional variant, over ready-made packs of built-in words (`ui.close/menu/back/country/language`, ~19 languages).
  - `isRtlLocale`.
- Renderer: uses `resolveTexts`; built-in words go through `t("ui", …)`; `dir="rtl"` on the root for RTL locales, with mirrored chevrons, arrows and back icons.
- Storage: `compile()` strips translations from the menu and returns them per locale. Publish writes one app-data metafield per language (`chopify.t_<locale>`, its own 128 KB limit) and deletes removed languages; unpublish deletes them all. The embed loads only `t_<request locale>` (or its base language) and the storefront script merges it in. Older published menus with inline translations still render.
- Editor: Translations manager (`app/editor/TranslationsPanel.tsx`), opened from the editor header and the canvas toolbar.
  - Language chips with %, progress, "Missing only", search, groups with missing counts, "Copy original", rich text where needed, built-in words showing their ready-made value.
  - Phone preview in that language, with the focused text's item outlined.
  - The inline translate mode (language dropdown in the header) stays.
