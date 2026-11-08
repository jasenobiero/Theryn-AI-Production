# Deployment guide

## Recommended architecture

Use a split deployment behind the same public origin:

1. Cloudflare Pages for the frontend in [artifacts/ai-hub](artifacts/ai-hub)
2. A separate Node host for the API in [artifacts/api-server](artifacts/api-server)
   - Railway
   - Render
   - VPS / Docker
   - Fly.io

The frontend makes same-origin `/api/*` requests. Configure Cloudflare to route `/api/*` to the Express API host; merely deploying the static Pages build does not deploy the API. Do not put an interactive browser challenge in front of API or webhook routes.

## GitHub / Cloudflare path

1. Create a GitHub repo and push the project.
2. Connect the frontend to Cloudflare Pages.
3. Set the build command to:
   - `cd artifacts/ai-hub && pnpm install && pnpm build`
4. Set the output directory to:
   - `artifacts/ai-hub/dist/public`
5. Host the API on a separate Node runtime and route `https://theryn.dev/api/*` to it.
6. Point the Cloudflare domain to the Pages deployment and configure the API route/origin.
7. Configure DNS and SSL for the frontend and API origins.

## Local PowerShell deployment preparation

The Wrangler config at the project download root is intended to be deployed from that root. It builds the frontend as static assets and uses `src/worker.ts` to forward `/api/*` requests to the separately hosted Express API. The nested `Theryn-AI/wrangler.jsonc` is also valid when running Wrangler from inside `Theryn-AI`.

From `C:\Users\obier\Downloads\theryn`, build and typecheck locally before deploying:

```powershell
pnpm -C .\Theryn-AI install --frozen-lockfile
pnpm -C .\Theryn-AI run typecheck
pnpm -C .\Theryn-AI\artifacts\ai-hub run build
wrangler deploy --config .\wrangler.jsonc
```

Before the first public deployment, configure the Worker secret `API_ORIGIN` with the HTTPS origin of the Express API host (for example, `https://your-api-host.example.com`, with no path). From the download root, run `wrangler secret put API_ORIGIN --config .\wrangler.jsonc` and enter the origin at Wrangler's prompt. Until this value is configured, API requests return a JSON `503` rather than silently falling through to the static site. Never put API credentials in the frontend or the Wrangler config.

## Cloudflare API access

The AI Hub uses cookie-authenticated requests and streaming AI responses under `/api/`. A Cloudflare managed challenge returns HTML/403 to JavaScript `fetch` calls, which prevents chat, settings, billing, and webhooks from working. The verified production site currently needs this corrected.

In Cloudflare, create a narrowly scoped WAF custom rule for host `theryn.dev` and paths beginning `/api/`. Configure its Skip action to skip the challenge-producing security feature/rule (for example the specific managed challenge or bot rule), while keeping the API's own Helmet, Clerk authentication, and rate limits enabled. Also ensure Under Attack mode is off for API requests. Then verify `https://theryn.dev/api/healthz` returns JSON with HTTP 200, not a Cloudflare challenge page. Do not disable Cloudflare security globally.

Use this rule expression:

```text
(http.host eq "theryn.dev" and starts_with(http.request.uri.path, "/api/"))
```

## Required environment variables

### Frontend

- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_CLERK_PROXY_URL`
- `VITE_API_BASE_URL`
- `BASE_PATH`
- `PORT` (local/dev only)

### API

- `DATABASE_URL`
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `SESSION_SECRET`
- `CORS_ALLOWED_ORIGINS`
- `AI_INTEGRATIONS_OPENAI_BASE_URL`
- `AI_INTEGRATIONS_OPENAI_API_KEY`
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY`
- `AI_INTEGRATIONS_OPENROUTER_BASE_URL`
- `AI_INTEGRATIONS_OPENROUTER_API_KEY`
- `ELEVENLABS_API_KEY`
- `THERYN_BOT_API_TOKEN`
- `APP_BASE_URL` (public frontend origin)
- `CLERK_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `EMAIL_FROM` (must be a verified sender domain in Resend)
- `FEATURE_ANNOUNCEMENT_ADMIN_TOKEN` (long random token; never expose to frontend)
- `PAYPAL_ENV` (`sandbox` while testing, `live` for real payments)
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_PLAN_ID_PLUS`
- `PAYPAL_PLAN_ID_PRO`
- `PAYPAL_PLAN_ID_ULTRA`

## PayPal recurring billing setup

PayPal checkout is implemented as monthly subscriptions. The PayPal REST app credentials must belong to the PayPal Business account that should receive the funds. Keep the client secret on the API host only; never put it in a `VITE_` variable or frontend build setting.

1. In the PayPal Developer Dashboard, create a REST app for Sandbox and use its client ID and secret with `PAYPAL_ENV=sandbox`.
2. Create a subscription product and three monthly billing plans matching the prices displayed by the app: Plus USD 9, Pro USD 19, and Ultra USD 39. Add the corresponding plan IDs to the API host environment.
3. Register a PayPal webhook pointing to `https://YOUR-API-DOMAIN/api/subscription/paypal/webhook` and subscribe to:
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `BILLING.SUBSCRIPTION.EXPIRED`
   - `BILLING.SUBSCRIPTION.PAYMENT.FAILED`
   - `PAYMENT.SALE.COMPLETED`
   - `PAYMENT.SALE.DENIED`
   - `PAYMENT.SALE.REFUNDED`
4. Set the webhook's ID as `PAYPAL_WEBHOOK_ID`. The server verifies webhook signatures with PayPal before processing events.
5. Test checkout and webhook delivery in Sandbox before switching to `PAYPAL_ENV=live` and using the Live REST app credentials, plan IDs, and webhook ID.
6. Confirm your deployment has the required database tables and that the browser can reach the API routes under `/api`.

PayPal checkout will remain disabled until all required PayPal values and all three paid-plan IDs are configured. The app does not receive or store card details; PayPal handles approval and recurring charges.
If you change a plan's price in the app, create a matching PayPal plan and update the corresponding plan ID before enabling checkout. A mismatched database price override disables checkout to avoid showing one price and charging another.

## Founder access and pre-release emails

The first 1,000 Clerk accounts by account creation time receive founder numbers and lifetime Ultra access. Founder welcome messages are transactional. Pre-release feature emails are separate and only sent to users who enable **Settings → Preferences → Send me pre-release feature updates**; every message includes an unsubscribe link.

1. Apply the database schema using the production `DATABASE_URL` (`pnpm -C lib/db push`).
2. Configure a verified sender in Resend and set `RESEND_API_KEY` and `EMAIL_FROM` on the API host.
3. Set `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, and `FEATURE_ANNOUNCEMENT_ADMIN_TOKEN` on the API host.
4. Before enabling the Clerk webhook, call `POST /api/admin/founders/backfill` once with `Authorization: Bearer <FEATURE_ANNOUNCEMENT_ADMIN_TOKEN>`. It imports existing Clerk users oldest-first, assigns up to 1,000 founder numbers, and sends welcome emails to verified addresses. Public signup should remain paused until backfill completes.
5. In Clerk Production, create a webhook for `https://theryn.dev/api/webhooks/clerk` subscribed to `user.created` and `user.updated`, then set the endpoint's signing secret as `CLERK_WEBHOOK_SECRET` and restart the API.
6. To send a feature preview email, POST `{ "slug": "unique-feature-id", "title": "Feature name", "summary": "What users can preview", "previewUrl": "https://..." }` to `/api/admin/feature-announcements` with the admin bearer token. Repeating the same slug retries only unsent deliveries; the content must match the original.

The founder sequence is assigned at activation/backfill, not retroactively from unimported accounts. The backfill uses Clerk's existing account creation timestamps so the first 1,000 are ordered consistently.

## Production hardening

- enable rate limiting and helmet protections already present in [artifacts/api-server/src/app.ts](artifacts/api-server/src/app.ts)
- restrict `CORS_ALLOWED_ORIGINS`
- do not commit real secrets
- validate build and typecheck before merging
- ensure monitoring, logging, and abuse controls are enabled for public access

## Optional future migration

If you want the backend on Cloudflare as well, the current Express server should be rewritten or proxied via Cloudflare Workers / Pages Functions. The present repo is still a Node Express app and is not directly a native Cloudflare Pages backend.
