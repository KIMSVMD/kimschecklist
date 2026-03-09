import { pgTable, text, serial, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
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
  year: integer("year"),
  month: integer("month"),
  adminScore: integer("admin_score"),
  adminItems: jsonb("admin_items").$type<Record<string, 'ok' | 'notok'>>(),
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

// Thread replies for cleaning inspections (multiple per record, admin & staff both)
export const checklistReplies = pgTable("checklist_replies", {
  id: serial("id").primaryKey(),
  checklistId: integer("checklist_id").notNull().references(() => checklists.id, { onDelete: "cascade" }),
  authorType: text("author_type").notNull(), // 'admin' | 'staff'
  content: text("content").notNull(),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChecklistReplySchema = createInsertSchema(checklistReplies).omit({ id: true, createdAt: true });
export type InsertChecklistReply = z.infer<typeof insertChecklistReplySchema>;
export type ChecklistReply = typeof checklistReplies.$inferSelect;

export const cleaningReplies = pgTable("cleaning_replies", {
  id: serial("id").primaryKey(),
  cleaningId: integer("cleaning_id").notNull().references(() => cleaningInspections.id, { onDelete: "cascade" }),
  authorType: text("author_type").notNull(), // 'admin' | 'staff'
  content: text("content").notNull(),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCleaningReplySchema = createInsertSchema(cleaningReplies).omit({
  id: true,
  createdAt: true,
});

export type InsertCleaningReply = z.infer<typeof insertCleaningReplySchema>;
export type CleaningReply = typeof cleaningReplies.$inferSelect;

// Tracks when admin overrides an item's status (score change notifications for staff)
export const staffScoreNotifications = pgTable("staff_score_notifications", {
  id: serial("id").primaryKey(),
  targetType: text("target_type").notNull(), // 'vm' | 'cleaning'
  branch: text("branch").notNull(),
  checklistId: integer("checklist_id"),
  cleaningId: integer("cleaning_id"),
  itemName: text("item_name").notNull(),
  oldStatus: text("old_status"),
  newStatus: text("new_status").notNull(),
  product: text("product"),
  category: text("category"),
  zone: text("zone"),
  inspectionTime: text("inspection_time"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type StaffScoreNotification = typeof staffScoreNotifications.$inferSelect;
