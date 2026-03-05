import { db } from "./db";
import { checklists, guides, products, cleaningInspections, cleaningReplies, checklistReplies, type Checklist, type InsertChecklist, type Guide, type InsertGuide, type Product, type InsertProduct, type CleaningInspection, type InsertCleaning, type CleaningReply, type InsertCleaningReply, type ChecklistReply, type InsertChecklistReply } from "@shared/schema";
import { desc, eq, asc, gte, and, sql } from "drizzle-orm";

export type AdminNotification = {
  id: number;
  notifType: 'new_inspection' | 'reply';
  type: 'vm' | 'cleaning';
  createdAt: Date;
  branch: string;
  // reply-only
  replyId?: number;
  content?: string | null;
  photoUrl?: string | null;
  // vm
  checklistId?: number;
  product?: string;
  category?: string;
  // cleaning
  cleaningId?: number;
  zone?: string;
  inspectionTime?: string;
};

export interface IStorage {
  getChecklists(): Promise<Checklist[]>;
  getChecklist(id: number): Promise<Checklist | undefined>;
  createChecklist(checklist: InsertChecklist): Promise<Checklist>;
  updateChecklist(id: number, data: Partial<InsertChecklist>): Promise<Checklist | undefined>;
  deleteChecklist(id: number): Promise<void>;
  getGuides(): Promise<Guide[]>;
  getGuide(id: number): Promise<Guide | undefined>;
  getGuideByProduct(product: string): Promise<Guide | undefined>;
  createGuide(guide: InsertGuide): Promise<Guide>;
  updateGuide(id: number, guide: Partial<InsertGuide>): Promise<Guide | undefined>;
  deleteGuide(id: number): Promise<void>;
  getProductsByCategory(category: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  getCleaningInspections(filters?: { branch?: string; date?: string }): Promise<CleaningInspection[]>;
  upsertCleaningInspection(data: InsertCleaning): Promise<{ record: CleaningInspection; created: boolean }>;
  updateCleaningInspection(id: number, data: Record<string, any>): Promise<CleaningInspection | undefined>;
  deleteCleaningInspection(id: number): Promise<void>;
  getCleaningReplies(cleaningId: number): Promise<CleaningReply[]>;
  addCleaningReply(data: InsertCleaningReply): Promise<CleaningReply>;
  updateCleaningItemStatus(id: number, itemName: string, newStatus: string): Promise<CleaningInspection | undefined>;
  updateChecklistItemStatus(id: number, itemName: string, newStatus: string): Promise<Checklist | undefined>;
  getChecklistReplies(checklistId: number): Promise<ChecklistReply[]>;
  addChecklistReply(data: InsertChecklistReply): Promise<ChecklistReply>;
  getAdminNotifications(): Promise<AdminNotification[]>;
}

export class DatabaseStorage implements IStorage {
  async getChecklists(): Promise<Checklist[]> {
    return await db.select().from(checklists).orderBy(desc(checklists.createdAt));
  }

  async getChecklist(id: number): Promise<Checklist | undefined> {
    const [checklist] = await db.select().from(checklists).where(eq(checklists.id, id));
    return checklist;
  }

  async createChecklist(insertChecklist: InsertChecklist): Promise<Checklist> {
    const [checklist] = await db.insert(checklists).values(insertChecklist).returning();
    return checklist;
  }

  async updateChecklist(id: number, data: Partial<InsertChecklist>): Promise<Checklist | undefined> {
    const [checklist] = await db.update(checklists)
      .set(data)
      .where(eq(checklists.id, id))
      .returning();
    return checklist;
  }

  async deleteChecklist(id: number): Promise<void> {
    await db.delete(checklists).where(eq(checklists.id, id));
  }

  async getGuides(): Promise<Guide[]> {
    return await db.select().from(guides).orderBy(desc(guides.updatedAt));
  }

  async getGuide(id: number): Promise<Guide | undefined> {
    const [guide] = await db.select().from(guides).where(eq(guides.id, id));
    return guide;
  }

  async getGuideByProduct(product: string): Promise<Guide | undefined> {
    const [guide] = await db.select().from(guides).where(eq(guides.product, product));
    return guide;
  }

  async createGuide(insertGuide: InsertGuide): Promise<Guide> {
    const [guide] = await db.insert(guides).values(insertGuide).returning();
    return guide;
  }

  async updateGuide(id: number, data: Partial<InsertGuide>): Promise<Guide | undefined> {
    const [guide] = await db.update(guides)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(guides.id, id))
      .returning();
    return guide;
  }

  async deleteGuide(id: number): Promise<void> {
    await db.delete(guides).where(eq(guides.id, id));
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return await db.select().from(products)
      .where(eq(products.category, category))
      .orderBy(asc(products.groupName), asc(products.productName));
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(insertProduct).returning();
    return product;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async getCleaningInspections(filters?: { branch?: string; date?: string }): Promise<CleaningInspection[]> {
    let query = db.select().from(cleaningInspections).orderBy(desc(cleaningInspections.createdAt));
    if (filters?.branch) {
      const rows = await db.select().from(cleaningInspections)
        .where(
          filters.date
            ? and(eq(cleaningInspections.branch, filters.branch), gte(cleaningInspections.createdAt, new Date(filters.date)))
            : eq(cleaningInspections.branch, filters.branch)
        )
        .orderBy(desc(cleaningInspections.createdAt));
      return rows;
    }
    return query;
  }

  async upsertCleaningInspection(data: InsertCleaning): Promise<{ record: CleaningInspection; created: boolean }> {
    // Find existing record for same branch + zone + inspectionTime on same calendar day
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existing = await db.select().from(cleaningInspections)
      .where(
        and(
          eq(cleaningInspections.branch, data.branch),
          eq(cleaningInspections.zone, data.zone),
          eq(cleaningInspections.inspectionTime, data.inspectionTime),
          gte(cleaningInspections.createdAt, todayStart)
        )
      )
      .orderBy(desc(cleaningInspections.createdAt))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db.update(cleaningInspections)
        .set({ items: data.items, overallStatus: data.overallStatus })
        .where(eq(cleaningInspections.id, existing[0].id))
        .returning();
      return { record: updated, created: false };
    }

    const [row] = await db.insert(cleaningInspections).values(data).returning();
    return { record: row, created: true };
  }

  async updateCleaningInspection(id: number, data: Record<string, any>): Promise<CleaningInspection | undefined> {
    const [row] = await db.update(cleaningInspections).set(data as any).where(eq(cleaningInspections.id, id)).returning();
    return row;
  }

  async deleteCleaningInspection(id: number): Promise<void> {
    await db.delete(cleaningInspections).where(eq(cleaningInspections.id, id));
  }

  async getCleaningReplies(cleaningId: number): Promise<CleaningReply[]> {
    return await db.select().from(cleaningReplies)
      .where(eq(cleaningReplies.cleaningId, cleaningId))
      .orderBy(asc(cleaningReplies.createdAt));
  }

  async addCleaningReply(data: InsertCleaningReply): Promise<CleaningReply> {
    const [row] = await db.insert(cleaningReplies).values(data).returning();
    return row;
  }

  async getChecklistReplies(checklistId: number): Promise<ChecklistReply[]> {
    return await db.select().from(checklistReplies)
      .where(eq(checklistReplies.checklistId, checklistId))
      .orderBy(asc(checklistReplies.createdAt));
  }

  async addChecklistReply(data: InsertChecklistReply): Promise<ChecklistReply> {
    const [row] = await db.insert(checklistReplies).values(data).returning();
    return row;
  }

  async updateCleaningItemStatus(id: number, itemName: string, newStatus: string): Promise<CleaningInspection | undefined> {
    const [existing] = await db.select().from(cleaningInspections).where(eq(cleaningInspections.id, id));
    if (!existing) return undefined;
    const items = (existing.items as Record<string, any>) || {};
    if (!items[itemName]) return existing;
    items[itemName] = { ...items[itemName], status: newStatus };
    const hasIssue = Object.values(items).some((v: any) => v.status === 'issue');
    const [updated] = await db.update(cleaningInspections)
      .set({ items, overallStatus: hasIssue ? 'issue' : 'ok' })
      .where(eq(cleaningInspections.id, id))
      .returning();
    return updated;
  }

  async getAdminNotifications(): Promise<AdminNotification[]> {
    // Staff replies — VM
    const vmReplies = await db
      .select({
        replyId: checklistReplies.id,
        checklistId: checklistReplies.checklistId,
        content: checklistReplies.content,
        photoUrl: checklistReplies.photoUrl,
        createdAt: checklistReplies.createdAt,
        branch: checklists.branch,
        product: checklists.product,
        category: checklists.category,
      })
      .from(checklistReplies)
      .innerJoin(checklists, eq(checklistReplies.checklistId, checklists.id))
      .where(eq(checklistReplies.authorType, 'staff'))
      .orderBy(desc(checklistReplies.createdAt))
      .limit(100);

    // Staff replies — cleaning
    const cleanReplies = await db
      .select({
        replyId: cleaningReplies.id,
        cleaningId: cleaningReplies.cleaningId,
        content: cleaningReplies.content,
        photoUrl: cleaningReplies.photoUrl,
        createdAt: cleaningReplies.createdAt,
        branch: cleaningInspections.branch,
        zone: cleaningInspections.zone,
        inspectionTime: cleaningInspections.inspectionTime,
      })
      .from(cleaningReplies)
      .innerJoin(cleaningInspections, eq(cleaningReplies.cleaningId, cleaningInspections.id))
      .where(eq(cleaningReplies.authorType, 'staff'))
      .orderBy(desc(cleaningReplies.createdAt))
      .limit(100);

    // New VM inspections
    const newVM = await db
      .select({
        id: checklists.id,
        branch: checklists.branch,
        product: checklists.product,
        category: checklists.category,
        createdAt: checklists.createdAt,
      })
      .from(checklists)
      .orderBy(desc(checklists.createdAt))
      .limit(60);

    // New cleaning inspections
    const newCleaning = await db
      .select({
        id: cleaningInspections.id,
        branch: cleaningInspections.branch,
        zone: cleaningInspections.zone,
        inspectionTime: cleaningInspections.inspectionTime,
        createdAt: cleaningInspections.createdAt,
      })
      .from(cleaningInspections)
      .orderBy(desc(cleaningInspections.createdAt))
      .limit(60);

    const all: AdminNotification[] = [
      ...vmReplies.map((r, i) => ({
        id: i, replyId: r.replyId, notifType: 'reply' as const, type: 'vm' as const,
        content: r.content, photoUrl: r.photoUrl, createdAt: r.createdAt,
        branch: r.branch, checklistId: r.checklistId, product: r.product ?? undefined, category: r.category ?? undefined,
      })),
      ...cleanReplies.map((r, i) => ({
        id: vmReplies.length + i, replyId: r.replyId, notifType: 'reply' as const, type: 'cleaning' as const,
        content: r.content, photoUrl: r.photoUrl, createdAt: r.createdAt,
        branch: r.branch, cleaningId: r.cleaningId, zone: r.zone ?? undefined, inspectionTime: r.inspectionTime ?? undefined,
      })),
      ...newVM.map((r, i) => ({
        id: vmReplies.length + cleanReplies.length + i,
        notifType: 'new_inspection' as const, type: 'vm' as const,
        createdAt: r.createdAt, branch: r.branch, checklistId: r.id,
        product: r.product ?? undefined, category: r.category ?? undefined,
      })),
      ...newCleaning.map((r, i) => ({
        id: vmReplies.length + cleanReplies.length + newVM.length + i,
        notifType: 'new_inspection' as const, type: 'cleaning' as const,
        createdAt: r.createdAt, branch: r.branch, cleaningId: r.id,
        zone: r.zone ?? undefined, inspectionTime: r.inspectionTime ?? undefined,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
     .slice(0, 120);

    return all;
  }

  async updateChecklistItemStatus(id: number, itemName: string, newStatus: string): Promise<Checklist | undefined> {
    const [existing] = await db.select().from(checklists).where(eq(checklists.id, id));
    if (!existing) return undefined;
    const items = (existing.items as Record<string, string>) || {};
    if (!(itemName in items)) return existing;
    const updatedItems = { ...items, [itemName]: newStatus };
    // Recalculate overall status
    const vals = Object.values(updatedItems);
    const overallStatus = vals.every(v => v === 'excellent') ? 'excellent'
      : vals.some(v => v === 'poor') ? 'poor' : 'average';
    const [updated] = await db.update(checklists)
      .set({ items: updatedItems, status: overallStatus })
      .where(eq(checklists.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
