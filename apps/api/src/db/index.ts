import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import type { AppEnv } from "../lib/types";

import * as schema from "./schema";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function createDb(env: AppEnv["Bindings"]) {
  if (!pool) {
    pool = new Pool({
      host: env.DB_HOST || "localhost",
      port: Number(env.DB_PORT) || 5432,
      user: env.DB_USER || "myappuser",
      password: env.DB_PASSWORD || "myapppassword",
      database: env.DB_NAME || "myappdb",
    });
  }
  
  return drizzle(pool, {
    schema,
  });
}
