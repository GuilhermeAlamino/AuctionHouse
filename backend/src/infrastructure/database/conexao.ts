
import "dotenv/config";

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL não configurada.");
}

export const pool = new Pool({
  connectionString: databaseUrl,
});

export const db = drizzle({ client: pool });
