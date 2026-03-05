import { db } from "./db";
import { checklists, guides, products, cleaningInspections, cleaningReplies, type Checklist, type InsertChecklist, type Guide, type InsertGuide, type Product, type InsertProduct, type CleaningInspection, type InsertCleaning, type CleaningReply, type InsertCleaningReply } from "@shared/schema";
import { desc, eq, asc, gte, and } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
