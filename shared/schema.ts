import { pgTable, text, serial, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
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
  adminComment: text("admin_comment"),
  commentConfirmed: boolean("comment_confirmed").default(false),
  staffReply: text("staff_reply"),
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

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  groupName: text("group_name").notNull(),
  productName: text("product_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Cleaning inspection per zone per session
export const cleaningInspections = pgTable("cleaning_inspections", {
  id: serial("id").primaryKey(),
  branch: text("branch").notNull(),
  zone: text("zone").notNull(),
  inspectionTime: text("inspection_time").notNull(), // 오픈 / 마감
  items: jsonb("items").$type<Record<string, { status: string; photoUrl?: string | null; memo?: string | null }>>(),
  overallStatus: text("overall_status").notNull(), // ok / issue
  adminComment: text("admin_comment"),
  commentConfirmed: boolean("comment_confirmed").default(false),
  staffReply: text("staff_reply"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCleaningSchema = createInsertSchema(cleaningInspections).omit({
  id: true,
  createdAt: true,
});

export type InsertCleaning = z.infer<typeof insertCleaningSchema>;
export type CleaningInspection = typeof cleaningInspections.$inferSelect;
