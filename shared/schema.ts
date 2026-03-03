import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChecklistSchema = createInsertSchema(checklists).omit({ 
  id: true, 
  createdAt: true 
});

export type InsertChecklist = z.infer<typeof insertChecklistSchema>;
export type Checklist = typeof checklists.$inferSelect;
