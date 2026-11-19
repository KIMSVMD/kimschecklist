// One-time DB setup (NoA guardrail: no table creation while the app runs).
// Run once against Vibe Base with the owner connection, e.g.
//   DATABASE_URL="<owner url>" npm run db:push      (creates every table from shared/schema.ts)
//   DATABASE_URL="<owner url>" npm run db:migrate   (extra columns/tables + default products and branch codes)
import { pool } from "../server/db";
import { seedProductsIfEmpty, seedQualityProductsIfEmpty } from "../server/seed";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  await seedProductsIfEmpty();
  await seedQualityProductsIfEmpty();
  console.log("DB setup done");
}

main()
  .catch(err => { console.error(err); process.exitCode = 1; })
  .finally(() => pool.end());
