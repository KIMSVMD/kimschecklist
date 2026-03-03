import { db } from "./db";
import { checklists, guides, type Checklist, type InsertChecklist, type Guide, type InsertGuide } from "@shared/schema";
import { desc, eq } from "drizzle-orm";

export interface IStorage {
  getChecklists(): Promise<Checklist[]>;
  getChecklist(id: number): Promise<Checklist | undefined>;
  createChecklist(checklist: InsertChecklist): Promise<Checklist>;
  getGuides(): Promise<Guide[]>;
  getGuide(id: number): Promise<Guide | undefined>;
  getGuideByProduct(product: string): Promise<Guide | undefined>;
  createGuide(guide: InsertGuide): Promise<Guide>;
  updateGuide(id: number, guide: Partial<InsertGuide>): Promise<Guide | undefined>;
  deleteGuide(id: number): Promise<void>;
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
}

export const storage = new DatabaseStorage();
