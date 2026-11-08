import { timingSafeEqual } from "node:crypto";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  featureAnnouncementDeliveries,
  featureAnnouncements,
  founderMemberships,
  founderProgramState,
  userSettingsTable,
  usersTable,
} from "@workspace/db";
import { clerkRequireAuth } from "../middlewares/clerkRequireAuth";
import { escapeHtml, sendEmail, sendEmailBatch } from "../lib/email";

const router: IRouter = Router();

router.get("/founders/me", clerkRequireAuth, async (req, res) => {
  const userId = (req as Request & { userId: string }).userId;
  const [membership] = await db.select({ founderNumber: founderMemberships.founderNumber })
    .from(founderMemberships)
    .where(eq(founderMemberships.userId, userId))
    .limit(1);
  res.json(membership ? { isFounder: true, founderNumber: membership.founderNumber, totalFounderSpots: 1000 } : { isFounder: false, founderNumber: null, totalFounderSpots: 1000 });
});

router.post("/admin/founders/backfill", async (req: Request, res: Response) => {
  if (!isAuthorizedAdmin(req)) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }
  const clerkSecret = process.env.CLERK_SECRET_KEY?.trim();
  if (!clerkSecret || !process.env.RESEND_API_KEY?.trim() || !process.env.EMAIL_FROM?.trim()) {
    res.status(503).json({ error: "Clerk and email provider credentials must be configured before founder backfill." });
    return;
  }

  try {
    const clerkUsers: ClerkBackfillUser[] = [];
    for (let offset = 0; offset < 100_000; offset += 500) {
      const response = await fetch(`https://api.clerk.com/v1/users?limit=500&offset=${offset}`, {
        headers: { Authorization: `Bearer ${clerkSecret}` },
      });
      if (!response.ok) throw new Error(`Clerk user import failed (${response.status}).`);
      const batch = await response.json() as ClerkBackfillUser[];
      clerkUsers.push(...batch);
      if (batch.length < 500) break;
    }
    clerkUsers.sort((left, right) => left.created_at - right.created_at || left.id.localeCompare(right.id));

    await db.transaction(async tx => {
      await tx.insert(founderProgramState).values({ id: 1 }).onConflictDoNothing();
      const [state] = await tx.select()
        .from(founderProgramState)
        .where(eq(founderProgramState.id, 1))
        .for("update");
      if (state?.initializedAt) return;

      const founderUsers = clerkUsers.slice(0, 1000);
      for (const [index, user] of founderUsers.entries()) {
        const addresses = user.email_addresses ?? [];
        const primary = addresses.find(address => address.id === user.primary_email_address_id)
          ?? addresses.find(address => address.verification?.status === "verified")
          ?? addresses[0];
        const createdAt = new Date(user.created_at);
        const email = primary?.email_address ?? null;
        await tx.insert(usersTable).values({
          id: user.id,
          email,
          emailVerified: primary?.verification?.status === "verified",
          firstName: user.first_name ?? null,
          lastName: user.last_name ?? null,
          profileImageUrl: user.image_url ?? null,
          createdAt,
        }).onConflictDoUpdate({
          target: usersTable.id,
          set: {
            email,
            emailVerified: primary?.verification?.status === "verified",
            firstName: user.first_name ?? null,
            lastName: user.last_name ?? null,
            profileImageUrl: user.image_url ?? null,
            createdAt,
            updatedAt: new Date(),
          },
        });
        await tx.insert(userSettingsTable).values({ userId: user.id }).onConflictDoNothing();
        await tx.insert(founderMemberships).values({ userId: user.id, founderNumber: index + 1, email }).onConflictDoNothing();
      }
      await tx.update(founderProgramState)
        .set({ nextFounderNumber: founderUsers.length + 1, initializedAt: new Date(), updatedAt: new Date() })
        .where(eq(founderProgramState.id, 1));
    });

    const pending = await db.select({
      userId: founderMemberships.userId,
      founderNumber: founderMemberships.founderNumber,
      email: usersTable.email,
      firstName: usersTable.firstName,
      unsubscribeToken: userSettingsTable.featureUpdatesUnsubscribeToken,
    })
      .from(founderMemberships)
      .innerJoin(usersTable, eq(usersTable.id, founderMemberships.userId))
      .innerJoin(userSettingsTable, eq(userSettingsTable.userId, usersTable.id))
      .where(and(isNull(founderMemberships.welcomeEmailSentAt), eq(usersTable.emailVerified, true)))
      .orderBy(asc(founderMemberships.founderNumber));
    const appUrl = process.env.APP_BASE_URL?.trim() || "https://theryn.dev";
    let sent = 0;
    let failed = 0;
    for (let offset = 0; offset < pending.length; offset += 100) {
      const batch = pending.slice(offset, offset + 100).filter(row => row.email);
      if (batch.length === 0) continue;
      try {
        await sendEmailBatch(batch.map(row => {
          const greeting = row.firstName ? `Hi ${escapeHtml(row.firstName)},` : "Hello,";
          const subject = `You're THERYN AI founder #${row.founderNumber}`;
          const unsubscribeUrl = new URL(`/api/feature-updates/unsubscribe/${row.unsubscribeToken}`, appUrl).toString();
          return {
            to: row.email!,
            subject,
            text: `${greeting}\n\nCongratulations! You're founder #${row.founderNumber} in the first 1,000 THERYN AI users. Your account has lifetime access to THERYN Ultra.\n\n${appUrl}`,
            html: `<main style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#171717"><h1>THERYN AI founder #${row.founderNumber}</h1><p>${greeting}</p><p>Congratulations! Your account has lifetime access to THERYN Ultra.</p><p><a href="${escapeHtml(appUrl)}">Open THERYN AI</a></p><p><a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe from feature preview emails</a></p></main>`,
            unsubscribeUrl,
          };
        }), `founder-backfill-${offset}`);
        const userIds = batch.map(row => row.userId);
        await db.update(founderMemberships)
          .set({ welcomeEmailSentAt: new Date() })
          .where(inArray(founderMemberships.userId, userIds));
        sent += batch.length;
      } catch {
        failed += batch.length;
      }
    }
    const [state] = await db.select({ nextFounderNumber: founderProgramState.nextFounderNumber })
      .from(founderProgramState)
      .where(eq(founderProgramState.id, 1))
      .limit(1);
    res.json({ founderSpotsAssigned: Math.min((state?.nextFounderNumber ?? 1) - 1, 1000), welcomeEmailsSent: sent, welcomeEmailsFailed: failed });
  } catch (error) {
    req.log?.error({ err: error }, "Founder backfill failed");
    res.status(502).json({ error: "Founder backfill failed. Check server logs and retry." });
  }
});

router.post("/admin/feature-announcements", async (req: Request, res: Response) => {
  if (!isAuthorizedAdmin(req)) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  const { slug, title, summary, previewUrl } = req.body ?? {};
  if (typeof slug !== "string" || !/^[a-z0-9][a-z0-9-]{2,79}$/.test(slug)
    || typeof title !== "string" || !title.trim() || title.length > 160
    || typeof summary !== "string" || !summary.trim() || summary.length > 4000
    || (previewUrl !== undefined && previewUrl !== null && typeof previewUrl !== "string")) {
    res.status(400).json({ error: "Provide a lowercase slug, title (max 160 chars), and summary (max 4,000 chars)." });
    return;
  }
  if (previewUrl) {
    try {
      if (new URL(previewUrl).protocol !== "https:") throw new Error("HTTPS required");
    } catch {
      res.status(400).json({ error: "Preview links must be valid HTTPS URLs." });
      return;
    }
  }

  const normalized = { slug, title: title.trim(), summary: summary.trim(), previewUrl: previewUrl ?? null };
  let [announcement] = await db.insert(featureAnnouncements).values(normalized)
    .onConflictDoNothing()
    .returning();
  if (!announcement) {
    [announcement] = await db.select().from(featureAnnouncements)
      .where(eq(featureAnnouncements.slug, slug))
      .limit(1);
    if (!announcement || announcement.title !== normalized.title || announcement.summary !== normalized.summary || announcement.previewUrl !== normalized.previewUrl) {
      res.status(409).json({ error: "That announcement slug already belongs to different content." });
      return;
    }
  }

  const recipients = await db.select({
    userId: usersTable.id,
    email: usersTable.email,
    unsubscribeToken: userSettingsTable.featureUpdatesUnsubscribeToken,
  })
    .from(usersTable)
    .innerJoin(userSettingsTable, eq(userSettingsTable.userId, usersTable.id))
    .where(and(
      eq(userSettingsTable.featureUpdatesEnabled, true),
      eq(usersTable.emailVerified, true),
    ));

  const pending: typeof recipients = [];
  for (const recipient of recipients) {
    if (!recipient.email) continue;
    await db.insert(featureAnnouncementDeliveries).values({
      announcementId: announcement.id,
      userId: recipient.userId,
    }).onConflictDoNothing();
    const [delivery] = await db.select({ sentAt: featureAnnouncementDeliveries.sentAt })
      .from(featureAnnouncementDeliveries)
      .where(and(
        eq(featureAnnouncementDeliveries.announcementId, announcement.id),
        eq(featureAnnouncementDeliveries.userId, recipient.userId),
      ))
      .limit(1);
    if (!delivery?.sentAt) pending.push(recipient);
  }

  const appBaseUrl = process.env.APP_BASE_URL?.trim() || "https://theryn.dev";
  const sentUserIds: string[] = [];
  let failed = 0;
  for (const recipient of pending) {
    const unsubscribeUrl = new URL(`/api/feature-updates/unsubscribe/${recipient.unsubscribeToken}`, appBaseUrl).toString();
    const subject = `THERYN feature preview: ${normalized.title}`;
    const safeTitle = escapeHtml(normalized.title);
    const safeSummary = escapeHtml(normalized.summary).replace(/\n/g, "<br>");
    const previewLink = normalized.previewUrl
      ? `<p><a href="${escapeHtml(normalized.previewUrl)}">Explore the preview</a></p>`
      : "";
    try {
      await sendEmail({
        to: recipient.email!,
        subject,
        text: `${normalized.title}\n\n${normalized.summary}${normalized.previewUrl ? `\n\nPreview: ${normalized.previewUrl}` : ""}\n\nUnsubscribe: ${unsubscribeUrl}`,
        html: `<main style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#171717"><p>THERYN AI feature preview</p><h1>${safeTitle}</h1><p>${safeSummary}</p>${previewLink}<p><a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe from feature preview emails</a></p></main>`,
        idempotencyKey: `feature-${announcement.id}-${recipient.userId}`,
        unsubscribeUrl,
      });
      sentUserIds.push(recipient.userId);
    } catch {
      failed += 1;
      await db.update(featureAnnouncementDeliveries)
        .set({ lastError: "Email delivery failed" })
        .where(and(
          eq(featureAnnouncementDeliveries.announcementId, announcement.id),
          eq(featureAnnouncementDeliveries.userId, recipient.userId),
        ));
    }
  }

  if (sentUserIds.length > 0) {
    await db.update(featureAnnouncementDeliveries)
      .set({ sentAt: new Date(), lastError: null })
      .where(and(
        eq(featureAnnouncementDeliveries.announcementId, announcement.id),
        inArray(featureAnnouncementDeliveries.userId, sentUserIds),
      ));
  }
  res.json({ eligible: recipients.filter(recipient => recipient.email).length, sent: sentUserIds.length, failed, remaining: pending.length - sentUserIds.length - failed });
});

router.get("/feature-updates/unsubscribe/:token", async (req, res) => {
  if (typeof req.params.token !== "string" || !/^[a-f0-9]{32,64}$/i.test(req.params.token)) {
    res.status(404).send("Unsubscribe link not found.");
    return;
  }
  res.type("html").send(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email preferences</title><body style="font-family:Arial,sans-serif;max-width:520px;margin:80px auto;padding:24px;color:#181818"><h1>Feature preview emails</h1><p>Confirm that you want to stop receiving THERYN pre-release feature emails.</p><form method="post"><button style="padding:12px 18px">Unsubscribe</button></form></body></html>`);
});

router.post("/feature-updates/unsubscribe/:token", async (req, res) => {
  if (typeof req.params.token !== "string" || !/^[a-f0-9]{32,64}$/i.test(req.params.token)) {
    res.status(404).send("Unsubscribe link not found.");
    return;
  }
  const [updated] = await db.update(userSettingsTable)
    .set({ featureUpdatesEnabled: false, updatedAt: new Date() })
    .where(eq(userSettingsTable.featureUpdatesUnsubscribeToken, req.params.token))
    .returning({ userId: userSettingsTable.userId });
  res.type("html").send(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email preferences</title><body style="font-family:Arial,sans-serif;max-width:520px;margin:80px auto;padding:24px;color:#181818"><h1>${updated ? "You’re unsubscribed" : "Link not found"}</h1><p>${updated ? "You will no longer receive THERYN pre-release feature emails." : "This unsubscribe link is invalid or expired."}</p></body></html>`);
});

function isAuthorizedAdmin(req: Request): boolean {
  const expected = process.env.FEATURE_ANNOUNCEMENT_ADMIN_TOKEN;
  const authorization = req.get("authorization") ?? "";
  const provided = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!expected || !provided) return false;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

interface ClerkBackfillUser {
  id: string;
  created_at: number;
  primary_email_address_id?: string | null;
  email_addresses?: Array<{ id?: string; email_address?: string; verification?: { status?: string } | null }>;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
}

export default router;