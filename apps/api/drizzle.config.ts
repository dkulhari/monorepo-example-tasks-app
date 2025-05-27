import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./src/db/migrations",
  schema: "./src/db/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || "myappuser",
    password: process.env.DB_PASSWORD || "myapppassword",
    database: process.env.DB_NAME || "myappdb",
    ssl: false,
  },
});
