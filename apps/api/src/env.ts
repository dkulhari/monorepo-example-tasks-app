import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { z } from "zod";

expand(config());

export const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]),
  NODE_ENV: z.enum(["development", "production"]),
  // Database configuration
  DB_HOST: z.string(),
  DB_PORT: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  // Keycloak configuration
  KEYCLOAK_URL: z.string().default("http://localhost:8080"),
  KEYCLOAK_REALM: z.string().default("contrack"),
  KEYCLOAK_CLIENT_ID: z.string().default("contrackapi"),
  // Permify configuration
  PERMIFY_ENABLED: z.string().default("true"),
  PERMIFY_ENDPOINT: z.string().default("localhost:3476"),
  PERMIFY_TENANT_ID: z.string().default("default"),
  PERMIFY_CACHE_TTL: z.string().default("300"),
  PERMIFY_CACHE_MAX_KEYS: z.string().default("10000"),
  PERMIFY_TIMEOUT: z.string().default("5000"),
  SYSTEM_ADMIN_USER_ID: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

// eslint-disable-next-line import/no-mutable-exports
let env: AppEnv;
try {
  // eslint-disable-next-line node/no-process-env
  env = envSchema.parse(process.env);
}
catch (e) {
  const error = e as z.ZodError;
  console.error("❌Invalid environment variables: ", error.flatten().fieldErrors);
  process.exit(1);
}

export { env };
export default env;
