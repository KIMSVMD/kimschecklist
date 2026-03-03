import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const checklists = pgTable("checklists", {
  id: serial("id").primaryKey(),
  branch: text("branch").notNull(),
  category: text("category").notNull(),
  product: text("product").notNull(),
  status: text("status").notNull(), // 'excellent' | 'average' | 'poor'
  photoUrl: text("photo_url"),
  notes: text("notes"),
  items: jsonb("items").$type<Record<string, string>>(), // { "위치": "excellent", "면적": "poor", ... }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChecklistSchema = createInsertSchema(checklists).omit({ 
  id: true, 
  createdAt: true 
});

export type InsertChecklist = z.infer<typeof insertChecklistSchema>;
export type Checklist = typeof checklists.$inferSelect;
