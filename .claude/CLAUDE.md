# Chopi - Menu — project notes

- **Product and technical plan: [docs/PLAN.md](../docs/PLAN.md).** Read it before starting any feature; update it when a decision changes.

- Stack: Shopify embedded app, React Router 7 (`app/routes`, file-based), Polaris web components, App Bridge.
- Workspaces:
  - `packages/menu-core`: design types, templates, widgets, edit ops, `compile()` (storefront payload + 128 KB check), `parseDesign()`.
  - `packages/menu-renderer`: `renderMenu()` HTML + `attachBehavior()` + `MENU_CSS`. One renderer for the editor preview AND the storefront (shadow DOM). Theme burger adapters in `adapters.ts`.
  - `extensions/chopi-menu`: app embed `blocks/menu-embed.liquid`. Its `assets/chopi-menu*.js` are BUILT by `npm run build:storefront` (gitignored) — rerun after renderer changes.
- Storefront data: app-data metafields `chopi.menu` + `chopi.entitlement` on the AppInstallation (`app/services/publish.server.ts`), plus the reference metafields below.
- Links on the storefront resolve by ID: on publish, linked collections/products/pages/posts are written as reference-list metafields (`shop.metafields["$app:chopi"]`, keys `<type>_1..4`, 50 each + `product_collections`; `app/services/references.server.ts`). Liquid resolves current URL/title/image per render, so handle changes need no republish; deleted resources drop out (renderer `liveResources` hides their items). The app does NOT create Shopify navigation menus and never touches merchant menus. Never look resources up by handle in Liquid (`collections[handle]`).
- Menu button (themes whose menu icon isn't detected): `app/routes/app.menu-button.tsx`. The merchant picks a theme and taps the icon in a phone-sized store window (storefronts can't be framed); `packages/menu-renderer/src/picker.ts` (bundle `chopi-picker.js`, loaded only when `window.name` starts with `chopi-pick:`) posts the selector with a signed token to `app/routes/api.menu-button.ts`. Saved per theme id in the app-data metafield `chopi.menu_buttons` (`app/services/menu-button.server.ts`). Loader priority: embed setting `trigger_selector` > picked icon > theme adapter.
- Translations: keys `"<id>.<field>"` in `design.translations[locale]`; built-in words are `ui.*`. Every new user-visible text must go through the renderer's `t()` AND be listed in `collectTexts()` (`packages/menu-core/src/translations.ts`), or it can't be translated. They're published as one metafield per language (`chopi.t_<locale>`).
- Templates are pre-filled sample designs (`packages/menu-core/src/templates/*`, after the Figma frames). Sample images live in `public/templates/` (manifest + prompts: `templates/images.json`); on first publish they're copied to the merchant's Shopify Files (`app/services/template-images.server.ts`).
- Renderer widgets for store/promo elements (products, perks, contact, discount, ticker) live in `packages/menu-renderer/src/widgets.ts`; shared render helpers in `state.ts`.
- Custom CSS: `design.customCss`, edited at `app/routes/app_.css.$menuId.tsx` (CodeMirror in `app/editor/css/`); always pass it through `cleanCustomCss` (menu-core) before injecting. Code editors can't live in Polaris `s-modal` (selection breaks): use a max-modal `src` route.
- Billing: Shopify App Pricing (plans in the Partner Dashboard, hosted plan page). Free = everything, and published menus run on draft themes; the live theme needs Starter (template menus) or Pro (canvas menus), checked by the storefront. Development stores are unrestricted (`livePlan()`). Plans and the gating rule: `app/billing/plans.ts`; plan reads (Partner API `activeSubscription`, 5-minute cache on `Shop`): `app/services/billing.server.ts`. Never create charges with the Billing API. See PLAN.md §8.
- Header: one per menu, shared by every screen. Ready-made styles live in `packages/menu-core/src/headerStyles.ts`; editor UI in `app/editor/HeaderFields.tsx`. The canvas editor shows the header and footer around the canvas (read-only).
- Editor: `app/routes/app.menus.$id.tsx` + `app/editor/*`. Polaris form fields go through `app/editor/controls.tsx` (React 18 doesn't wire custom-element change events).
- Shopify auth/client: `app/shopify.server.ts`. Prisma client: `app/db.server.ts`. Shop rows: `app/models/shop.server.ts`.
- Database: PostgreSQL (Neon). `DATABASE_URL` (pooled) and `DIRECT_URL` (direct, used by migrations) live in `.env` — never commit or print them.
- Schema changes: edit `prisma/schema.prisma`, then `npx prisma migrate dev --name <change>`. Never edit an applied migration.
- App config (scopes, webhooks, metafields, metaobjects): `shopify.app.toml`. Webhook handlers: `app/routes/webhooks.*.ts`.
- Extensions go in `extensions/` (create with `npm run generate`).
- Before finishing a change: `npm run lint` and `npm run typecheck`.
- Use the Shopify AI Toolkit / `shopify-dev-mcp` to look up and validate Admin GraphQL, Polaris, and extension APIs — don't guess field names.

## Admin UI: learn from Shopify first, then go beyond App Home limits

**Before building or changing any admin screen, research it with the Shopify Dev MCP / Shopify AI Toolkit plugin:**
1. `learn_shopify_api` with `api: "polaris-app-home"`. This app uses the **iframe App Home model** (our own React Router app + Polaris web components + App Bridge), not App Home UI extensions.
2. `search_docs_chunks` for the matching **pattern or template** (Homepage, Index, Details, Settings, Setup guide, Resource list, Index table, Empty state…) and the **Built for Shopify** design requirements, and follow them.
3. Validate every component with `validate` (`api: "polaris-app-home"`) and every GraphQL operation with `api: "admin"`.

**The reference apps are not a ceiling.** `bbb-menu-sh` and `speckshop-menu-sh` (in `/Users/bhshiam/move/shopify/App development/`) were App Home *extensions*. Their UX is our baseline for clarity:
- numbered sections in storefront order
- Customize / Design
- item rows with an Edit modal
- the Browse link menu
- a sticky live preview

But many of their choices were workarounds for extension limits we don't have:

| App Home extension limit (old apps) | What we do instead |
|---|---|
| No drag and drop, only ↑ ↓ buttons | Drag to reorder sections and items (keep ↑ ↓ for keyboard and accessibility) |
| SVG *picture* preview with estimated text widths | The real storefront renderer, so the preview is exact and clickable: click to edit, hover to highlight |
| No custom CSS, token colors only | Our own CSS where Polaris has no component (preview frame, drag states), styled to match the admin |
| No backend: everything saved to one metafield on Save | Drafts in Postgres, publish when ready, version history, server validation |
| Rows keyed by index, file picker under modals, other renderer quirks | Normal React keys; App Bridge pickers work normally |
| 64 KB bundle limit | Normal app bundle (still lazy-load heavy editor pieces) |

**Rules that still apply:**
- Look and behave like the Shopify admin: content in cards (`s-section`), Polaris buttons and spacing, a back button on sub-pages, a responsive layout and no content jumping (Built for Shopify 4.1).
- For complex full-screen editing, Shopify recommends an **App Bridge max modal with a `src` route**. HTML-content App Bridge modals can't run custom JS such as drag-and-drop libraries.
- Use App Bridge for platform UI: Save Bar, toasts, resource picker, modals.

## This is a public App Store app

Chopi - Menu will be listed on the Shopify App Store and installed by many merchants. Write production code: clean, multi-tenant, secure and ready for App Store review. Don't write throwaway or demo code.

### Multi-tenancy
- Every row you store must belong to a shop: give it a `shop` column, index it, and filter every query by the session's shop. Never read or write data across shops.
- Never hardcode a shop domain, product ID, currency, locale or market. Write code that works for any store, including large catalogs and non-English stores.
- Don't keep per-shop state in module-level variables or caches.

### App Store requirements
- Use session-token auth only, via `authenticate.admin` / `authenticate.webhook` from `app/shopify.server.ts`. Never use cookies or third-party auth in the embedded app.
- Implement and test the mandatory compliance webhooks: `customers/data_request`, `customers/redact` and `shop/redact`. On `app/uninstalled`, delete that shop's sessions and data.
- Request the fewest access scopes the app needs. Remove the template's demo scopes, metafields and metaobjects before release.
- Charge through Shopify only: Shopify App Pricing (plans in the Partner Dashboard), never your own payments or Billing API charges in code.
- Build the UI with Polaris and App Bridge: fast, accessible, with loading, empty and error states. No console errors.
- Theme-facing features go in theme app extensions (app blocks/embeds). Never edit merchant theme files.

### Robustness at scale
- Respect Admin API rate limits. Paginate every list query, use bulk operations for large data, and retry on throttling.
- Keep webhook handlers fast and idempotent: verify the request, respond quickly and tolerate duplicate deliveries.
- Validate all input on the server. Never trust the client or URL params for the shop.
- Never log tokens, customer PII or secrets.
- Schema changes must be backward-compatible migrations that are safe to run against a populated production database.

### Code quality
- Keep it small and readable: server logic in `*.server.ts` modules (`app/services`, `app/models`), thin route files, no dead code or leftover template examples.
- No new dependencies without a clear reason.
- Write clear names. Comments should explain *why*, not *what*.
- Handle errors explicitly and show the merchant a useful message.
- Every change must pass `npm run lint` and `npm run typecheck` (use `/check`).
