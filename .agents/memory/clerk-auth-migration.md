---
name: Clerk Auth Migration
description: Clerk replaces Replit Auth for THERYN. Key patterns, gotchas, and CSS/routing decisions.
---

## Setup

- App: `app_3EUYxCLlbVHvIKpbnWr8I6A0QHW` provisioned via `setupClerkWhitelabelAuth()`.
- Secrets set: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`.
- Server deps: `@clerk/express`, `@clerk/shared`, `http-proxy-middleware`.
- Client deps: `@clerk/react`, `@clerk/themes`.

## Server wiring (app.ts)

- Mount `CLERK_PROXY_PATH` (`/api/__clerk`) **before** body parsers.
- Use `clerkMiddleware()` with `publishableKeyFromHost` callback using `getClerkProxyHost`.
- Removed: `authMiddleware`, `cookieParser` kept (still needed).

## Auth middleware for routes

- `clerkRequireAuth` in `artifacts/api-server/src/middlewares/clerkRequireAuth.ts`.
- Sets `(req as any).userId = auth.userId`.
- Replaces old local `requireAuth` + `req.isAuthenticated()` pattern in settings.ts and studio/index.ts.

## Frontend wiring (App.tsx)

- `ClerkProvider` wraps `QueryClientProvider` (note: ClerkProvider OUTSIDE QueryClientProvider).
- `publishableKeyFromHost` imported from `@clerk/react/internal` (re-exports from `@clerk/shared/keys`).
- `proxyUrl={import.meta.env.VITE_CLERK_PROXY_URL}` — undefined in dev, set at deploy for prod.
- Routing: `routing="path"` with `path="\${basePath}/sign-in"` and `path="\${basePath}/sign-up"`.
- Unauthenticated catch-all: `<Redirect to="/sign-in" />` (NOT rendering `<SignIn>` inline — fails with `routing="path"`).
- Loading state: use `const { isLoaded, isSignedIn } = useAuth()` with explicit spinner.

## Tailwind v4 CSS

- `@layer theme, base, clerk, components, utilities;` before `@import "tailwindcss"`.
- `tailwindcss({ optimize: false })` in vite.config.ts.
- **NO** `@import "@clerk/themes/shadcn.css"` — that file does NOT exist in the package. The `shadcn` theme is a JS object: `import { shadcn } from "@clerk/themes"`.

## User field mapping (Replit → Clerk)

- `user.email` → `user.emailAddresses?.[0]?.emailAddress`
- `user.profileImageUrl` → `user.imageUrl`
- `logout()` → `signOut({ redirectUrl: basePath || "/" })`
- `user.id` stays `user.id`
- `user.firstName`, `user.lastName` stay the same

## Why

Clerk enables Google/Apple/Email login without requiring a Replit account, which was blocking real user adoption.
