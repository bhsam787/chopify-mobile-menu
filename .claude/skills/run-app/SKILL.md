---
name: run-app
description: Start the Chopify Menu app locally (shopify app dev against a dev store, Postgres via .env). Use when asked to run, start, or preview the app.
---

1. Ensure `.env` has `DATABASE_URL` and `DIRECT_URL`. If migrations are pending (`npx prisma migrate status`), run `npx prisma migrate deploy`.
2. Run in the background: `shopify app dev --store shiam-dev-05.myshopify.com` (the project's development store).
3. Wait for the preview URL line in the output, then give the user that URL (press `p` equivalent: the "Preview URL" printed by the CLI).
4. If the CLI asks to log in or to link an app, tell the user to run the command once in their own terminal — those prompts are interactive.
