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

- The frontend is designed to deploy to Cloudflare Pages.
- The API is a Node/Express service and should be hosted separately (for example Railway, Render, Fly.io, or a VPS).
- Do not deploy the API directly on Cloudflare Pages without converting it to Workers/Pages Functions.

## Key environment variables

### Frontend

- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_CLERK_PROXY_URL`
- `VITE_API_BASE_URL`

### API

- `DATABASE_URL`
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `SESSION_SECRET`
- `CORS_ALLOWED_ORIGINS`
- `AI_INTEGRATIONS_OPENAI_API_KEY`
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY`
- `RUNWAY_API_KEY` for text-to-video generation (Runway Gen-4.5)
- `AI_INTEGRATIONS_OPENROUTER_API_KEY`
- `ELEVENLABS_API_KEY`
- `THERYN_BOT_API_TOKEN`
- `APP_BASE_URL`
- `CLERK_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `FEATURE_ANNOUNCEMENT_ADMIN_TOKEN`
- `PAYPAL_ENV`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`
- `PAYPAL_PLAN_ID_PLUS`, `PAYPAL_PLAN_ID_PRO`, `PAYPAL_PLAN_ID_ULTRA`

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
