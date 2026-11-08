import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { Request, Response } from "express";
import {
  clerkWebhookEvents,
  db,
  founderMemberships,
  founderProgramState,
  userSettingsTable,
  usersTable,
} from "@workspace/db";
import { sendEmail, escapeHtml } from "../lib/email";

type ClerkEmail = {
  id?: string;
  email_address?: string;
  verification?: { status?: string } | null;
};

type ClerkUser = {
  id?: string;
  primary_email_address_id?: string | null;
  email_addresses?: ClerkEmail[];
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
  created_at?: number;
};

type ClerkEvent = {
  type?: string;
  data?: ClerkUser;
};

export async function handleClerkWebhook(req: Request, res: Response): Promise<void> {
  const eventId = req.get("svix-id");
  const timestamp = req.get("svix-timestamp");
  const signature = req.get("svix-signature");
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";

  if (!eventId || !timestamp || !signature || !rawBody) {
    res.status(400).json({ error: "Invalid Clerk webhook headers or body." });
    return;
  }
  if (!verifyClerkSignature(eventId, timestamp, signature, rawBody)) {
    res.status(400).json({ error: "Invalid Clerk webhook signature." });
    return;
  }

  let event: ClerkEvent;
  try {
    event = JSON.parse(rawBody) as ClerkEvent;
  } catch {
    res.status(400).json({ error: "Invalid Clerk webhook JSON." });
    return;
  }
  if (typeof event.type !== "string" || !event.data || typeof event.data.id !== "string") {
    res.status(400).json({ error: "Invalid Clerk webhook event." });
    return;
  }

  const [inserted] = await db.insert(clerkWebhookEvents).values({
    eventId,
    eventType: event.type,
  }).onConflictDoNothing().returning({ eventId: clerkWebhookEvents.eventId });
  if (!inserted) {
    const [existing] = await db.select({ processedAt: clerkWebhookEvents.processedAt })
      .from(clerkWebhookEvents)
      .where(eq(clerkWebhookEvents.eventId, eventId))
      .limit(1);
    if (existing?.processedAt) {
      res.status(204).end();
      return;
    }
  }

  try {
    if (event.type === "user.created" || event.type === "user.updated") {
      await syncClerkUser(event.data, event.type === "user.created");
    }
    await db.update(clerkWebhookEvents)
      .set({ processedAt: new Date(), processingError: null })
      .where(eq(clerkWebhookEvents.eventId, eventId));
    res.status(204).end();
  } catch (error) {
    req.log?.error({ err: error, eventId, eventType: event.type }, "Clerk webhook processing failed");
    await db.update(clerkWebhookEvents)
      .set({ processingError: "Clerk webhook processing failed" })
      .where(eq(clerkWebhookEvents.eventId, eventId));
    res.status(500).json({ error: "Clerk webhook processing failed." });
  }
}

function verifyClerkSignature(eventId: string, timestamp: string, signatures: string, rawBody: string): boolean {
  const secret = process.env.CLERK_WEBHOOK_SECRET?.trim();
  const timestampSeconds = Number(timestamp);
  if (!secret || !Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 300) return false;

  const encodedSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let secretBytes: Buffer;
  try {
    secretBytes = Buffer.from(encodedSecret, "base64");
  } catch {
    return false;
  }
  const expected = createHmac("sha256", secretBytes)
    .update(`${eventId}.${timestamp}.${rawBody}`)
    .digest();

  return signatures.split(" ").some(value => {
    const [version, candidate] = value.split(",", 2);
    if (version !== "v1" || !candidate) return false;
    try {
      const actual = Buffer.from(candidate, "base64");
      return actual.length === expected.length && timingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  });
}

async function syncClerkUser(user: ClerkUser, isCreated: boolean): Promise<void> {
  if (!user.id) return;
  const addresses = user.email_addresses ?? [];
  const primary = addresses.find(address => address.id === user.primary_email_address_id)
    ?? addresses.find(address => address.verification?.status === "verified")
    ?? addresses[0];
  const email = primary?.email_address ?? null;
  const emailVerified = primary?.verification?.status === "verified";
  const createdAt = typeof user.created_at === "number" && Number.isFinite(user.created_at)
    ? new Date(user.created_at)
    : new Date();

  await db.insert(usersTable).values({
    id: user.id,
    email,
    emailVerified,
    firstName: user.first_name ?? null,
    lastName: user.last_name ?? null,
    profileImageUrl: user.image_url ?? null,
    createdAt,
  }).onConflictDoUpdate({
    target: usersTable.id,
    set: {
      email,
      emailVerified,
      firstName: user.first_name ?? null,
      lastName: user.last_name ?? null,
      profileImageUrl: user.image_url ?? null,
      createdAt,
      updatedAt: new Date(),
    },
  });

  await db.insert(userSettingsTable).values({ userId: user.id }).onConflictDoNothing();
  await db.update(founderMemberships)
    .set({ email })
    .where(and(eq(founderMemberships.userId, user.id), isNull(founderMemberships.welcomeEmailSentAt)));
  if (isCreated) await enrollFounder(user.id, email);

  const [membership] = await db.select()
    .from(founderMemberships)
    .where(and(eq(founderMemberships.userId, user.id), isNull(founderMemberships.welcomeEmailSentAt)))
    .limit(1);
  if (membership && email && emailVerified) {
    const firstName = user.first_name?.trim();
    const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : "Hello,";
    const founderNumber = membership.founderNumber;
    const subject = `You're THERYN AI founder #${founderNumber}`;
    const text = `${greeting}\n\nCongratulations! You're founder #${founderNumber} of the first 1,000 THERYN AI users. Your account has lifetime access to THERYN Ultra.\n\nSign in at ${process.env.APP_BASE_URL ?? "https://theryn.dev"}`;
    const html = `<main style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#171717"><h1>Welcome, THERYN AI founder #${founderNumber}</h1><p>${greeting}</p><p>Congratulations! You are founder <strong>#${founderNumber}</strong> in the first 1,000 THERYN AI users.</p><p>Your account has lifetime access to THERYN Ultra.</p><p><a href="${escapeHtml(process.env.APP_BASE_URL ?? "https://theryn.dev")}">Open THERYN AI</a></p></main>`;
    await sendEmail({
      to: email,
      subject,
      text,
      html,
      idempotencyKey: `founder-welcome-${user.id}`,
    });
    await db.update(founderMemberships)
      .set({ email, welcomeEmailSentAt: new Date() })
      .where(eq(founderMemberships.userId, user.id));
  }
}

async function enrollFounder(userId: string, email: string | null): Promise<number | null> {
  return db.transaction(async tx => {
    await tx.insert(founderProgramState).values({ id: 1 }).onConflictDoNothing();
    const [state] = await tx.select()
      .from(founderProgramState)
      .where(eq(founderProgramState.id, 1))
      .for("update");
    const [existing] = await tx.select({ founderNumber: founderMemberships.founderNumber })
      .from(founderMemberships)
      .where(eq(founderMemberships.userId, userId))
      .limit(1);
    if (existing) return existing.founderNumber;
    if (!state?.initializedAt || state.nextFounderNumber > 1000) return null;

    const founderNumber = state.nextFounderNumber;
    await tx.insert(founderMemberships).values({ userId, email, founderNumber });
    await tx.update(founderProgramState)
      .set({ nextFounderNumber: founderNumber + 1, updatedAt: new Date() })
      .where(eq(founderProgramState.id, 1));
    return founderNumber;
  });
}