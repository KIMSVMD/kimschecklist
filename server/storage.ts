import { db } from "./db";
import { checklists, guides, products, type Checklist, type InsertChecklist, type Guide, type InsertGuide, type Product, type InsertProduct } from "@shared/schema";
import { desc, eq, asc } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
