/* eslint-disable ts/no-redeclare */
import createRouter from "@/api/lib/create-router";

import type { AppOpenAPI } from "../lib/types";

import { BASE_PATH } from "../lib/constants";
import devicesRouter from "./devices/devices.index";
import indexRoute from "./index.route";
import sitesRouter from "./sites/sites.index";
import tenantsRouter from "./tenants/tenants.index";
import usersRouter from "./users/users.index";

export function registerRoutes(app: AppOpenAPI) {
  return app
    .route("/", indexRoute)
    .route("/", tenantsRouter)
    .route("/", usersRouter)
    .route("/", sitesRouter)
    .route("/", devicesRouter);
}

// stand alone router type used for api client
export const router = registerRoutes(
  createRouter().basePath(BASE_PATH),
);
export type router = typeof router;
