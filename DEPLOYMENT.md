# Deployment guide

## Production architecture

Theryn is deployed as one public site with two services behind the same origin:

1. Cloudflare Worker `theryn-site` serves the Vite frontend from `artifacts/ai-hub/dist/public`, binds Workers AI, and forwards `/api/*` to the API.
2. Render web service `Theryn-AI-Production` runs the Express API from `artifacts/api-server` and keeps the private environment variables.
3. The Cloudflare Worker custom domain `theryn.dev` serves the site. Its `API_ORIGIN` setting points to the Render service.

Chat, Studio, and Arena use Cloudflare Workers AI. Image and animated GIF generation use OpenAI, video uses Runway, voice uses ElevenLabs, authentication uses Clerk, subscriptions use PayPal, and email uses Resend. PostgreSQL is external and configured through the Render `DATABASE_URL`.

The Worker config is [wrangler.jsonc](wrangler.jsonc); it already declares the `AI` binding, static asset directory, and Render API origin. `API_ORIGIN` is a service URL, not an API credential. Never put provider secrets in the Vite build or Cloudflare static assets.

## Publish from a clean checkout

Run these steps from the repository root in PowerShell. The frontend Clerk publishable key is intentionally supplied only at build time; it is public, while Clerk's secret key remains on Render.

```powershell
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm --filter @workspace/api-server build
$env:VITE_CLERK_PUBLISHABLE_KEY = "<Clerk production publishable key>"
pnpm --filter @workspace/ai-hub build
Remove-Item Env:VITE_CLERK_PUBLISHABLE_KEY
pnpm exec wrangler deploy --dry-run
pnpm exec wrangler deploy
```

The Wrangler deployment uploads both the Worker and the built frontend. For the first publish, attach `theryn.dev` to the `theryn-site` Worker as a custom domain in Cloudflare Workers & Pages. Cloudflare manages the website routing for that hostname. Keep the domain registration, Clerk CNAME records, and existing mail MX/TXT records intact.

The Render API auto-deploys commits pushed to its configured `main` branch. Review and merge a production change only after the typecheck/build pass; the Render service deploys from that commit automatically. Do not replace all Render environment variables during an update; merge only the exact variables being changed.

## Post-deploy checks

1. `https://theryn.dev/api/healthz` returns JSON with HTTP 200.
2. `https://theryn.dev/api/subscription/plans` returns the configured public plans.
3. Sign in and load Settings and Subscription & Billing; these require a valid Clerk session.
4. Send one short prompt through each of the six Workers AI model choices and through Studio.
5. Exercise image/GIF/video/voice generation only with a small prompt and confirm the provider account has available credits.
6. Verify Clerk webhooks, PayPal webhooks, and Resend sender status in their provider dashboards. Use PayPal Sandbox for checkout tests; never use a live checkout as a smoke test.

Cloudflare Free Workers and Render Free services may sleep or throttle. If Render cold starts are too slow for a smooth always-on experience, an always-on paid Render plan is required; upgrading changes monthly costs and must be chosen in Render by the account owner.

## Required environment variables

### Frontend

- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_CLERK_PROXY_URL` only when a Clerk proxy is configured and verified; otherwise leave it unset.
- `PORT` and `BASE_PATH` are local/development settings.

### API

- `DATABASE_URL`
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `SESSION_SECRET`
- `CORS_ALLOWED_ORIGINS`
- `APP_BASE_URL` (set to `https://theryn.dev`)
- `OPENAI_API_KEY` or `AI_INTEGRATIONS_OPENAI_API_KEY` for image/GIF generation
- `RUNWAY_API_KEY` or `RUNWAYML_API_SECRET` for video generation
- `ELEVENLABS_API_KEY`
- `THERYN_BOT_API_TOKEN`
- `CLERK_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `EMAIL_FROM` (must use a verified Resend domain; current sender is `THERYN AI <no-reply@updates.theryn.dev>`)
- `FEATURE_ANNOUNCEMENT_ADMIN_TOKEN` (long random token; never expose to frontend)
- `PAYPAL_ENV` (`sandbox` while testing, `live` for real payments)
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_PLAN_ID_PLUS`
- `PAYPAL_PLAN_ID_PRO`
- `PAYPAL_PLAN_ID_ULTRA`

`AI_INTEGRATIONS_OPENAI_BASE_URL` is optional and defaults to the official OpenAI API. The optional Anthropic and OpenRouter keys are not required for Theryn chat, Studio, or Arena; those requests run on Workers AI.

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
