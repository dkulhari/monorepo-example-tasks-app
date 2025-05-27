import { notFound, onError } from "stoker/middlewares";

import type { AppOpenAPI } from "./types";

import { createPinoLogger } from "../middleware/pino-logger";
import { BASE_PATH } from "./constants";
import createRouter from "./create-router";
import { optionalKeycloakAuth } from "./keycloak";

export default function createApp() {
  const app = createRouter()
    .use(createPinoLogger())
    .use("*", (c, next) => {
      if (c.req.path.startsWith(BASE_PATH)) {
        return next();
      }
      // SPA redirect to /index.html
      const requestUrl = new URL(c.req.raw.url);
      return c.env.ASSETS.fetch(new URL("/index.html", requestUrl.origin));
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
