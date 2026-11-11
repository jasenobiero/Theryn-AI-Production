import { timingSafeEqual } from "node:crypto";
import { getAuth } from "@clerk/express";
import { type Request, type Response, type NextFunction } from "express";
import { db, usersTable } from "@workspace/db";

export async function clerkRequireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = getAuth(req);
  const clerkUserId = auth.userId;
  const userId = clerkUserId ?? getBotUserId(req);
  if (!userId) {
    const authorization = req.get("authorization") ?? "";
    const cookieHeader = req.headers.cookie ?? "";
    req.log?.warn({
      path: req.path,
      bearerTokenPresent: /^Bearer\s+\S+/i.test(authorization),
      sessionCookiePresent: /(?:^|;\s*)__session=/.test(cookieHeader),
      clerkAuthenticated: auth.isAuthenticated,
      clerkSessionPresent: Boolean(auth.sessionId),
      hasClerkSecretKey: Boolean(process.env.CLERK_SECRET_KEY?.trim()),
      hasClerkPublishableKey: Boolean(process.env.CLERK_PUBLISHABLE_KEY?.trim()),
      origin: req.get("origin") ?? null,
      forwardedHostPresent: Boolean(req.get("x-forwarded-host")),
    }, "Clerk authentication rejected API request");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  await db.insert(usersTable).values({ id: userId }).onConflictDoNothing();
  (req as any).userId = userId;
  next();
}

function getBotUserId(req: Request): string | null {
  const expectedToken = process.env.THERYN_BOT_API_TOKEN;
  const authorization = req.get("authorization");
  const providedToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  const botUserId = req.get("x-theryn-user-id") ?? "";

  if (!expectedToken || !providedToken) return null;
  const providedBuffer = Buffer.from(providedToken);
  const expectedBuffer = Buffer.from(expectedToken);
  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) return null;
  return /^bot:(discord|telegram|slack):[A-Za-z0-9._-]{1,128}$/.test(botUserId) ? botUserId : null;
}
