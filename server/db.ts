import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";

const { Pool } = pg;

// NoA Vibe Base: the app connects with DATABASE_URL (rw account). The API handler refuses requests
// when it is missing (fail-closed), so nothing here throws at import time — `next build` loads this module.
const connectionString = process.env.DATABASE_URL;

const sslConfig = connectionString?.includes("sslmode=require") || connectionString?.includes("neon.tech")
  ? { rejectUnauthorized: false }
  : false;

export const pool = new Pool({
  connectionString,
  ssl: sslConfig,
  // Serverless + PgBouncer with a small rw connection limit: one connection per instance,
  // released quickly when idle.
  max: 1,
  idleTimeoutMillis: 10_000,
});
export const db = drizzle(pool, { schema });
