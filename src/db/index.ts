import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
  const sql = postgres(url, {
    // Supabase's transaction pooler (the URL to use on Vercel) doesn't support prepared statements.
    prepare: false,
    // Serverless functions each hold their own pool; keep it small.
    max: 5,
  });
  return drizzle(sql, { schema });
}

// Dev hot reload re-runs this module; reuse one client instead of leaking a pool per edit.
const globalForDb = globalThis as unknown as { db?: ReturnType<typeof createDb> };

/**
 * The database, connected on first use. Lazy so pages that never query (guest play, builds)
 * work without DATABASE_URL.
 */
export function getDb() {
  globalForDb.db ??= createDb();
  return globalForDb.db;
}
