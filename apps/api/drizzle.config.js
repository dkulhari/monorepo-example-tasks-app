import { defineConfig } from "drizzle-kit";
import env from "./src/env";
export default defineConfig({
    out: "./src/db/migrations",
    schema: "./src/db/schema/index.ts",
    dialect: "postgresql",
    dbCredentials: {
        host: env.DB_HOST,
        port: Number(env.DB_PORT),
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
        ssl: false,
    },
});
