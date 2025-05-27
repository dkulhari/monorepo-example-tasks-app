import { notFound, onError } from "stoker/middlewares";

import type { AppOpenAPI } from "./types";

import { createPinoLogger } from "../middleware/pino-logger";
import { BASE_PATH } from "./constants";
import createRouter from "./create-router";
import { optionalKeycloakAuth } from "./keycloak";

export default function createApp() {
  const app = createRouter()
    .use(createPinoLogger())
    .use("*", async (c, next) => {
      if (c.req.path.startsWith(BASE_PATH)) {
        return next();
      }
      // SPA redirect - redirect to web app using request origin
      const requestUrl = new URL(c.req.url);
      const webAppUrl = `${requestUrl.protocol}//${requestUrl.hostname}:5173`;
      return c.redirect(webAppUrl);
    })
    .basePath(BASE_PATH) as AppOpenAPI;

  app
    .use("*", (c, next) => {
      return optionalKeycloakAuth()(c, next);
    })
    .notFound(notFound)
    .onError(onError);

  return app;
}

export function createTestApp<R extends AppOpenAPI>(router: R) {
  return createApp().route("/", router);
}
