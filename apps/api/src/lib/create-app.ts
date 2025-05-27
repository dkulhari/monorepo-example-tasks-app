import { notFound, onError } from "stoker/middlewares";

import type { AppOpenAPI } from "./types";

import { createPinoLogger } from "../middleware/pino-logger";
import { BASE_PATH } from "./constants";
import createRouter from "./create-router";
import { optionalKeycloakAuth } from "./keycloak";

export default function createApp() {
  const app = createRouter()
    .use("*", (c, next) => {
      // Add environment variables to context
      c.env = {
        ...c.env,
        DB_HOST: process.env.DB_HOST,
        DB_PORT: process.env.DB_PORT,
        DB_USER: process.env.DB_USER,
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_NAME: process.env.DB_NAME,
        KEYCLOAK_URL: process.env.KEYCLOAK_URL,
        KEYCLOAK_REALM: process.env.KEYCLOAK_REALM,
        KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID,
      };
      return next();
    })
    .basePath(BASE_PATH) as AppOpenAPI;

  app
    .use("*", (c, next) => {
      return optionalKeycloakAuth()(c, next);
    })
    .use(createPinoLogger())
    .notFound(notFound)
    .onError(onError);

  return app;
}

export function createTestApp<R extends AppOpenAPI>(router: R) {
  return createApp().route("/", router);
}
