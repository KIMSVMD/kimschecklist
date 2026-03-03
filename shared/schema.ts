import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const checklists = pgTable("checklists", {
  id: serial("id").primaryKey(),
  branch: text("branch").notNull(),
  category: text("category").notNull(),
  product: text("product").notNull(),
  status: text("status").notNull(),
  photoUrl: text("photo_url"),
  notes: text("notes"),
  items: jsonb("items").$type<Record<string, string>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChecklistSchema = createInsertSchema(checklists).omit({ 
  id: true, 
  createdAt: true 
});

export type InsertChecklist = z.infer<typeof insertChecklistSchema>;
export type Checklist = typeof checklists.$inferSelect;

export const guides = pgTable("guides", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  product: text("product").notNull(),
  imageUrl: text("image_url"),
  points: text("points").array().notNull().default([]),
  items: text("items").array().notNull().default([]),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGuideSchema = createInsertSchema(guides).omit({
  id: true,
  updatedAt: true,
});

export type InsertGuide = z.infer<typeof insertGuideSchema>;
export type Guide = typeof guides.$inferSelect;
