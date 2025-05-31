import { defineConfig } from "drizzle-kit";

import env from "./src/env";

export default defineConfig({
  out: "./src/db/migrations",
  schema: "./src/db/schema/*",
  dialect: "postgresql",
  dbCredentials: {
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },
  verbose: true,
  strict: true,
  // Generate migration with custom naming
  migrations: {
    prefix: 'timestamp',
    schema: 'public',
  },
  // Include triggers and custom SQL
  extensionsFilters: ["postgis"],
  // Break out schemas by table
  breakpoints: true,
});
