import { getAuth } from "@clerk/express";
import { type Request, type Response, type NextFunction } from "express";

export function clerkRequireAuth(req: Request, res: Response, next: NextFunction) {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).userId = userId;
  next();
}
