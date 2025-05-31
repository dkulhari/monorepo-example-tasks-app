import createApp from "@/api/lib/create-app";
import { registerRoutes } from "@/api/routes";

import { env } from "./env";
import configureOpenAPI from "./lib/configure-open-api";
import { getPermifyService } from "./lib/permify/service";

const app = registerRoutes(createApp());
configureOpenAPI(app);

// Initialize Permify on startup (non-blocking)
if (env.PERMIFY_ENDPOINT) {
  const permifyService = getPermifyService({
    endpoint: env.PERMIFY_ENDPOINT,
    apiKey: env.PERMIFY_API_KEY,
  });

  permifyService.initialize().catch((error) => {
    console.error("Failed to initialize Permify:", error);
    // Don't crash the app - database is source of truth
  });
}

export default app;
