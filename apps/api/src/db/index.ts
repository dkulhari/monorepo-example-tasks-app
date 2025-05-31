import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import env from "../env";
import * as schema from "./schema";

// Create a new Pool instance
const pool = new Pool({
  // connectionString: env.DATABASE_URL,
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
});

// Create the Drizzle client
export const db = drizzle(pool, { schema });

// Export the pool for direct access if needed
export { pool };
