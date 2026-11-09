import type { Request, Response, NextFunction } from "express";

/** Keep production generation on the Cloudflare AI binding path. */
export function requireCloudflareAi(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === "production" && req.hostname !== "theryn.dev") {
    res.status(403).json({ error: "Use the Theryn site for Cloudflare Workers AI requests." });
    return;
  }
  next();
}
