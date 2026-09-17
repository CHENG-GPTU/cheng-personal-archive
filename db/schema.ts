import { boolean, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

export const aipmProfiles = pgTable("aipm_profiles", {
  ownerId: text("owner_id").primaryKey(),
  currentLevel: integer("current_level").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const aipmLevelRecords = pgTable("aipm_level_records", {
  ownerId: text("owner_id").notNull(),
  levelId: integer("level_id").notNull(),
  status: text("status").notNull().default("open"),
  draft: text("draft").notNull().default(""),
  scoreJson: text("score_json"),
  feedback: text("feedback"),
  evidence: text("evidence"),
  passedAt: text("passed_at"),
  updatedAt: text("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.ownerId, table.levelId] })]);

export const aipmMessages = pgTable("aipm_messages", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  levelId: integer("level_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
});

export const aipmEvidence = pgTable("aipm_evidence", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  levelId: integer("level_id").notNull(),
  project: text("project").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  publicSelected: boolean("public_selected").notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
