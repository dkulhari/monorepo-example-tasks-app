import { Scalar } from "@scalar/hono-api-reference";

import type { AppOpenAPI } from "./types";

import packageJSON from "../../package.json";
import { BASE_PATH } from "./constants";

export default function configureOpenAPI(app: AppOpenAPI) {
  app.doc("/doc", {
    openapi: "3.1.0",
    info: {
      version: packageJSON.version,
      title: "Multitenant IoT API",
      description: "A multitenant IoT management API with Keycloak authentication. Manages tenants, users, sites, and devices with role-based access control. For protected endpoints (POST, PATCH, DELETE), you need to:\n1. Login at http://localhost:5173\n2. Get your JWT token from browser dev tools\n3. Add 'Authorization: Bearer <token>' header",
    },
  });

  app.get(
    "/reference",
    Scalar({
      url: `${BASE_PATH}/doc`,
      theme: "kepler",
      layout: "classic",
      defaultHttpClient: {
        targetKey: "js",
        clientKey: "fetch",
      },
    }),
  );
}
