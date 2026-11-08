import { sql } from "drizzle-orm";
import { integer, pgTable, primaryKey, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const founderProgramState = pgTable("founder_program_state", {
  id: integer("id").primaryKey().default(1),
  nextFounderNumber: integer("next_founder_number").notNull().default(1),
  initializedAt: timestamp("initialized_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const founderMemberships = pgTable("founder_memberships", {
  userId: varchar("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  founderNumber: integer("founder_number").notNull(),
  email: varchar("email"),
  welcomeEmailSentAt: timestamp("welcome_email_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  uniqueIndex("founder_memberships_founder_number_unique").on(table.founderNumber),
]);

export const clerkWebhookEvents = pgTable("clerk_webhook_events", {
  eventId: varchar("event_id", { length: 255 }).primaryKey(),
  eventType: varchar("event_type", { length: 128 }).notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  processingError: text("processing_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const featureAnnouncements = pgTable("feature_announcements", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug", { length: 80 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  summary: text("summary").notNull(),
  previewUrl: text("preview_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  uniqueIndex("feature_announcements_slug_unique").on(table.slug),
]);

export const featureAnnouncementDeliveries = pgTable("feature_announcement_deliveries", {
  announcementId: varchar("announcement_id", { length: 36 }).notNull().references(() => featureAnnouncements.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  primaryKey({ columns: [table.announcementId, table.userId], name: "feature_announcement_deliveries_pk" }),
]);