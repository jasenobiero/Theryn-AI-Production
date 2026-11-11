# THERYN AI

THERYN AI is a full-stack monorepo for a multi-provider AI command center. It includes a Vite + React frontend, an Express API server, a PostgreSQL + Drizzle data layer, and integrations for OpenAI, Anthropic, OpenRouter, and ElevenLabs.

## Architecture

- Frontend: [artifacts/ai-hub](artifacts/ai-hub)
- API: [artifacts/api-server](artifacts/api-server)
- Shared libraries: [lib](lib)
- Repo tooling: [scripts](scripts)

## Requirements

- Node.js 22+
- pnpm
- PostgreSQL database
- AI provider keys
- Clerk keys

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. In PowerShell, create local environment files without overwriting existing ones, then fill in your local database, Clerk, and provider credentials:

   ```powershell
   if (!(Test-Path .env)) { Copy-Item .env.example .env }
   if (!(Test-Path artifacts/api-server/.env)) { Copy-Item artifacts/api-server/.env.example artifacts/api-server/.env }
   if (!(Test-Path artifacts/ai-hub/.env)) { Copy-Item artifacts/ai-hub/.env.example artifacts/ai-hub/.env }
   ```

   Use Clerk development keys locally and leave `VITE_CLERK_PROXY_URL` empty. After setting `DATABASE_URL` in the workspace `.env`, apply the schema:

   ```powershell
   pnpm -C lib/db push
   ```

3. In PowerShell, start the API from the workspace root (port 3001):

   ```bash
   pnpm -C artifacts/api-server run dev
   ```

4. In a second PowerShell terminal, start the frontend (port 3000). Its `/api/*` requests are proxied to the API:

   ```bash
   pnpm -C artifacts/ai-hub run dev
   ```

The API requires a reachable PostgreSQL database and valid provider/Clerk credentials; placeholder values in the example files are not usable.

## Production build

```bash
pnpm run typecheck
pnpm -C artifacts/ai-hub build
```

## Deployment notes

- The production frontend is deployed as static assets through the Cloudflare Worker in [wrangler.jsonc](wrangler.jsonc).
- That Worker also binds Cloudflare Workers AI and forwards same-origin `/api/*` requests to the Express API on Render.
- The production API is the `Theryn-AI-Production` Render service. Keep its secrets in Render; do not put them in the frontend build or git.
- See [DEPLOYMENT.md](DEPLOYMENT.md) for build, publish, and verification steps.

## Key environment variables

### Frontend

- `VITE_CLERK_PUBLISHABLE_KEY` (set at production build time; it is public)
- `VITE_CLERK_PROXY_URL` only if a verified Clerk proxy is configured

### API

- `DATABASE_URL`
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `SESSION_SECRET`
- `CORS_ALLOWED_ORIGINS`
- `APP_BASE_URL`
- `OPENAI_API_KEY` or `AI_INTEGRATIONS_OPENAI_API_KEY` for images and GIFs
- `RUNWAY_API_KEY` or `RUNWAYML_API_SECRET` for video generation
- `ELEVENLABS_API_KEY`
- `THERYN_BOT_API_TOKEN`
- `APP_BASE_URL`
- `CLERK_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `FEATURE_ANNOUNCEMENT_ADMIN_TOKEN`
- `PAYPAL_ENV`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`
- `PAYPAL_PLAN_ID_PLUS`, `PAYPAL_PLAN_ID_PRO`, `PAYPAL_PLAN_ID_ULTRA`

Theryn chat, Studio, and Arena use Cloudflare Workers AI; Anthropic and OpenRouter API keys are not required for those features.

Image generation and animated GIF generation use the OpenAI API key. GPT Image API access, organization verification where required, and available API billing are prerequisites. Video generation uses a Runway API key and billed Runway credits. Chat subscriptions use the configured PayPal REST app, webhook, and monthly plan IDs; Apple Pay and Google Pay availability depends on the PayPal checkout/account and recurring-payment eligibility for the buyer's region.

PayPal recurring billing, Cloudflare API routing, Clerk founder enrollment, and early-feature email setup are documented in [DEPLOYMENT.md](DEPLOYMENT.md).

## Security

The API already includes:

- Helmet
- CORS allowlist
- request rate limiting
- Clerk authentication middleware
- environment-based secret handling

Keep live secrets in your deployment provider, not in git.
