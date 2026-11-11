import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { handleClerkWebhook } from "./routes/clerkWebhook";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";

const app: Express = express();
app.set("trust proxy", 1);

const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});




function normalizeOrigin(value: string): string | null {
  try {
    const parsed = new URL(value);
    if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || parsed.origin === "null") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map(origin => normalizeOrigin(origin.trim()))
  .filter((origin): origin is string => Boolean(origin));
const appBaseOrigin = process.env.APP_BASE_URL ? normalizeOrigin(process.env.APP_BASE_URL) : null;
const allowedOrigins = new Set(configuredOrigins);
if (appBaseOrigin) allowedOrigins.add(appBaseOrigin);

const clerkAuthorizedParties = new Set(allowedOrigins);
if (process.env.NODE_ENV === "production") {
  clerkAuthorizedParties.add("https://theryn.dev");
}
// Let Clerk's Frontend API proxy handle its route before authentication.
app.use(CLERK_PROXY_PATH, helmet(), clerkProxyMiddleware());

// Clerk must run before CORS, parsers, and application routes.
app.use(
  clerkMiddleware((req) => {
    // Same-origin GET requests commonly omit Origin. Restore it from the
    // trusted proxy host before Clerk validates the session token's azp.
    if (!req.headers.origin) {
      const host = getClerkProxyHost(req);
      const rawProtocol = req.headers["x-forwarded-proto"];
      const protocol = (Array.isArray(rawProtocol) ? rawProtocol[0] : rawProtocol)?.split(",")[0]?.trim() || "https";
      if (host) {
        const forwardedOrigin = `${protocol}://${host}`;
        if (clerkAuthorizedParties.has(forwardedOrigin)) req.headers.origin = forwardedOrigin;
      }
    }
    return {
      authorizedParties: [...clerkAuthorizedParties],
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY?.trim()
        || publishableKeyFromHost(getClerkProxyHost(req) ?? ""),
    };
  }),
);

app.use(helmet());
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.has(origin));
  },
}));
app.use(cookieParser());
app.post("/api/webhooks/clerk", apiRateLimit, express.raw({ type: "application/json", limit: "1mb" }), handleClerkWebhook);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// The browser calls this API through a same-origin Worker. Browsers commonly
// omit Origin on same-origin GET requests, so restore it from the trusted
// forwarded host before Clerk checks the token's authorized party.


app.use("/api", apiRateLimit, router);

export default app;
