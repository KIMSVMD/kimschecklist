import { db } from "./db";
import { products } from "@shared/schema";
import { count } from "drizzle-orm";
import { sql } from "drizzle-orm";

const DEFAULT_PRODUCTS = [
  { category: "농산", groupName: "시즌", productName: "딸기" },
  { category: "농산", groupName: "시즌", productName: "만감류" },
  { category: "농산", groupName: "시즌", productName: "오렌지" },
  { category: "농산", groupName: "시즌", productName: "참외" },
  { category: "농산", groupName: "시즌", productName: "수박" },
  { category: "농산", groupName: "시즌", productName: "복숭아" },
  { category: "농산", groupName: "시즌", productName: "사과" },
  { category: "농산", groupName: "시즌", productName: "배" },
  { category: "농산", groupName: "시즌", productName: "포도" },
  { category: "농산", groupName: "시즌", productName: "감" },
  { category: "농산", groupName: "시즌", productName: "감귤" },
  { category: "농산", groupName: "데일리", productName: "토마토" },
  { category: "농산", groupName: "데일리", productName: "사과" },
  { category: "농산", groupName: "수입과일", productName: "바나나" },
  { category: "농산", groupName: "수입과일", productName: "수입과일" },
  { category: "농산", groupName: "수입과일", productName: "키위" },
  { category: "농산", groupName: "채소", productName: "제주채소" },
  { category: "농산", groupName: "양곡", productName: null },
  { category: "수산", groupName: "견과", productName: null },
  { category: "수산", groupName: "간편식", productName: null },
  { category: "축산", groupName: "돈육", productName: null },
  { category: "축산", groupName: "한우", productName: "암소한우" },
  { category: "축산", groupName: "한우", productName: "시즈닝 스테이크" },
  { category: "축산", groupName: "수입육", productName: null },
  { category: "축산", groupName: "양념육", productName: null },
  { category: "축산", groupName: "계육", productName: null },
  { category: "공산", groupName: "직수입", productName: null },
  { category: "공산", groupName: "건기식", productName: null },
  { category: "공산", groupName: "공산행사장", productName: null },
];

export async function seedProductsIfEmpty() {
  // Ensure cleaning_inspections table exists in production
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS cleaning_inspections (
        id SERIAL PRIMARY KEY,
        branch TEXT NOT NULL,
        zone TEXT NOT NULL,
        inspection_time TEXT NOT NULL,
        items JSONB,
        overall_status TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
  } catch (err) {
    console.error("[seed] Failed to ensure cleaning_inspections table:", err);
  }

  // Seed default products if table is empty
  try {
    const [{ value }] = await db.select({ value: count() }).from(products);
    if (value === 0) {
      await db.insert(products).values(DEFAULT_PRODUCTS);
      console.log(`[seed] Inserted ${DEFAULT_PRODUCTS.length} default products.`);
    }
  } catch (err) {
    console.error("[seed] Failed to seed products:", err);
  }
}
