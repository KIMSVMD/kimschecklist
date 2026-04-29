import { db } from "./db";
import { products, guides } from "../shared/schema";
import { count, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { InsertProduct } from "../shared/schema";

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

// ── 품질 상품 정적 목록 ────────────────────────────────────────────────────────

const QUALITY_CHEONGWA = [
  '사과', '배', '딸기', '참외', '밤', '수박', '바나나', '오렌지', '키위', '블루베리',
  '수입포도', '용과', '파인애플', '아보카도', '자몽', '레몬', '망고', '감귤', '한라봉',
  '레드향', '샤인머스켓', '방울토마토', '토마토',
];

const QUALITY_CHAESO = [
  '콜라비', '블로컬리', '양배추', '적채', '비트', '바타비아', '샐러리', '유러피안채소',
  '샐러드', '양상추', '애호박', '오이', '파프리카', '청양고추', '풋고추', '꽈리고추',
  '오이맛고추', '홍고추', '피망', '가지', '단호박', '허브채소', '양파', '대파', '깐마늘',
  '생강', '팽이버섯', '새송이버섯', '느타리버섯', '표고버섯', '양송이버섯', '머쉬멜로버섯',
  '시금치', '미나리', '모둠쌈', '상추', '깻잎', '청경채', '열무', '얼갈이', '쪽파',
  '고구마', '감자', '당근', '연근', '무', '배추', '부추', '아스파라거스',
];

const QUALITY_CHUKSAN = [
  '삼겹살(냉장)', '목심(냉장)', '앞다리(냉장)', '등갈비(냉장)', '갈비찜(냉장)',
  '보쌈/수육(냉장)', '항정살(냉장)', '한우불고기(냉장)', '한우국거리(냉장)', '한우등심(냉장)',
  '한우안심(냉장)', '한우채끝(냉장)', '한우부채살(냉장)', '척아이롤_미국', '부채살_미국',
  '살치살_미국', '갈비찜용_미국', '국거리_미국', '부채살(와규)_호주', '치마살(와규)_호주',
  '삼각살(와규)_호주', '스테이크(와규)_호주', '국거리(와규)_호주', '불고기(와규)_호주',
  '갈비찜용_호주', '부채살_호주', '살치살_호주', '척아이롤_호주', '립캡(와규)_호주', '치마살_호주',
];

export async function seedQualityProductsIfEmpty() {
  try {
    const [{ value }] = await db.select({ value: count() })
      .from(products)
      .where(eq(products.category, 'q_청과'));
    if (value > 0) return;

    const toInsert: InsertProduct[] = [
      ...QUALITY_CHEONGWA.map(name => ({ category: 'q_청과', groupName: name, productName: null })),
      ...QUALITY_CHAESO.map(name => ({ category: 'q_채소', groupName: name, productName: null })),
      ...QUALITY_CHUKSAN.map(name => ({ category: 'q_축산', groupName: name, productName: null })),
    ];

    // q_수산: copy unique groupNames from existing VM 수산
    const sunsanProds = await db.select().from(products).where(eq(products.category, '수산'));
    const uniqueSunsan = Array.from(new Set(sunsanProds.map(p => p.groupName)));
    toInsert.push(...uniqueSunsan.map(g => ({ category: 'q_수산', groupName: g, productName: null } as InsertProduct)));

    // q_공산: copy unique groupNames from existing VM 공산
    const gonsanProds = await db.select().from(products).where(eq(products.category, '공산'));
    const uniqueGonsan = Array.from(new Set(gonsanProds.map(p => p.groupName)));
    toInsert.push(...uniqueGonsan.map(g => ({ category: 'q_공산', groupName: g, productName: null } as InsertProduct)));

    if (toInsert.length > 0) {
      await db.insert(products).values(toInsert);
      console.log(`[seed] Inserted ${toInsert.length} quality products.`);
    }
  } catch (err) {
    console.error('[seed] Failed to seed quality products:', err);
  }
}

export async function seedProductsIfEmpty() {
  // 1. Ensure cleaning_inspections table exists
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

  // 2. Seed default products if table is empty
  try {
    const [{ value }] = await db.select({ value: count() }).from(products);
    if (value === 0) {
      await db.insert(products).values(DEFAULT_PRODUCTS);
      console.log(`[seed] Inserted ${DEFAULT_PRODUCTS.length} default products.`);
    }
  } catch (err) {
    console.error("[seed] Failed to seed products:", err);
  }

  // 3. Normalize guide product names to match seeded products table format
  // Fixes guides created when products table was empty (e.g. "[수입]바나나" → "[수입과일]바나나")
  try {
    const allProducts = await db.select().from(products);
    const allGuides = await db.select().from(guides);

    // Build valid product key set: "[groupName]productName" or "[groupName]"
    const validKeys = new Set<string>();
    for (const p of allProducts) {
      if (p.productName) {
        validKeys.add(`[${p.groupName}]${p.productName}`);
      } else {
        validKeys.add(`[${p.groupName}]`);
      }
    }

    for (const guide of allGuides) {
      if (validKeys.has(guide.product)) continue; // already correct

      // Try to match by extracting the product name part after "]"
      const match = guide.product.match(/^\[.*?\](.*)$/);
      const rawName = match ? match[1] : null;

      if (!rawName) continue;

      // Find a product with the same productName
      const candidate = allProducts.find(p => p.productName === rawName);
      if (candidate) {
        const correctedKey = `[${candidate.groupName}]${candidate.productName}`;
        await db.update(guides).set({ product: correctedKey }).where(eq(guides.id, guide.id));
        console.log(`[seed] Fixed guide #${guide.id}: "${guide.product}" → "${correctedKey}"`);
      }
    }
  } catch (err) {
    console.error("[seed] Failed to normalize guide product names:", err);
  }
}
