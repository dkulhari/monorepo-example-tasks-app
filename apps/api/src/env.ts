import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { z } from "zod";

expand(config());

export const envSchema = z.object({
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
export default env;
