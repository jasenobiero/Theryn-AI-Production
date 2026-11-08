import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const subscriptionPlanOverrides = pgTable("subscription_plan_overrides", {
  planId: varchar("plan_id", { length: 16 }).primaryKey(),
  priceMonthlyUsdCents: integer("price_monthly_usd_cents").notNull(),
  featureAccess: jsonb("feature_access").notNull(),
  usageAllowances: jsonb("usage_allowances").notNull().default(sql`'{}'::jsonb`),
  updatedBy: varchar("updated_by").references(() => usersTable.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userSubscriptions = pgTable("user_subscriptions", {
  userId: varchar("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  planId: varchar("plan_id", { length: 16 }).notNull().default("free"),
  status: varchar("status", { length: 32 }).notNull().default("free"),
  provider: varchar("provider", { length: 32 }),
  providerCustomerId: varchar("provider_customer_id", { length: 255 }),
  providerSubscriptionId: varchar("provider_subscription_id", { length: 255 }),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  uniqueIndex("user_subscriptions_provider_subscription_unique").on(table.provider, table.providerSubscriptionId),
  index("user_subscriptions_status_idx").on(table.status),
]);

export const usageRecords = pgTable("usage_records", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  feature: varchar("feature", { length: 64 }).notNull(),
  credits: integer("credits").notNull(),
  providerCostMicros: integer("provider_cost_micros"),
  idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }),
}, table => [
  uniqueIndex("usage_records_user_idempotency_unique").on(table.userId, table.idempotencyKey),
  index("usage_records_user_created_idx").on(table.userId, table.createdAt),
  index("usage_records_status_idx").on(table.status),
]);

export const billingRecords = pgTable("billing_records", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  providerObjectId: varchar("provider_object_id", { length: 255 }).notNull(),
  kind: varchar("kind", { length: 32 }).notNull(),
  amountUsdCents: integer("amount_usd_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("usd"),
  status: varchar("status", { length: 32 }).notNull(),
  invoiceUrl: text("invoice_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  uniqueIndex("billing_records_provider_object_unique").on(table.providerObjectId),
  index("billing_records_user_created_idx").on(table.userId, table.createdAt),
]);

export const billingWebhookEvents = pgTable("billing_webhook_events", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  provider: varchar("provider", { length: 32 }).notNull(),
  eventId: varchar("event_id", { length: 255 }).notNull(),
  eventType: varchar("event_type", { length: 128 }).notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  processingError: text("processing_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  uniqueIndex("billing_webhook_events_provider_event_unique").on(table.provider, table.eventId),
]);