import { pgTable, serial, text, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const studioProjects = pgTable("studio_projects", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull().default("Untitled Project"),
  provider: text("provider").notNull().default("openai"),
  messages: jsonb("messages").notNull().default([]),
  artifactTitle: text("artifact_title"),
  artifactContent: text("artifact_content"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type StudioProject = typeof studioProjects.$inferSelect;
export type InsertStudioProject = typeof studioProjects.$inferInsert;
