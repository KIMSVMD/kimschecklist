import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";

const { Pool } = pg;

const connectionString = process.env.RENDER_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const sslConfig = connectionString.includes("render.com") || connectionString.includes("sslmode=require")
  ? { rejectUnauthorized: false }
  : false;

export const pool = new Pool({
  connectionString,
  ssl: sslConfig,
});
export const db = drizzle(pool, { schema });
