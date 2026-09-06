import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const userSettingsTable = pgTable("user_settings", {
  userId: varchar("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  bio: text("bio"),
  elevenlabsApiKey: text("elevenlabs_api_key"),
  openaiApiKey: text("openai_api_key"),
  anthropicApiKey: text("anthropic_api_key"),
  openrouterApiKey: text("openrouter_api_key"),
  defaultProvider: text("default_provider").default("openai"),
  defaultModel: text("default_model").default("gpt-5.2"),
  streamingEnabled: text("streaming_enabled").default("true"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type UserSettings = typeof userSettingsTable.$inferSelect;
export type InsertUserSettings = typeof userSettingsTable.$inferInsert;
