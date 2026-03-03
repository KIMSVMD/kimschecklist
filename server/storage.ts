import { db } from "./db";
import { checklists, type Checklist, type InsertChecklist } from "@shared/schema";
import { desc, eq } from "drizzle-orm";

export interface IStorage {
  getChecklists(): Promise<Checklist[]>;
  getChecklist(id: number): Promise<Checklist | undefined>;
  createChecklist(checklist: InsertChecklist): Promise<Checklist>;
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
}

export const storage = new DatabaseStorage();
