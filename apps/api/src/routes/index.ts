/* eslint-disable ts/no-redeclare */
import createRouter from "@/api/lib/create-router";

import type { AppOpenAPI } from "../lib/types";

import { BASE_PATH } from "../lib/constants";
import indexRoute from "./index.route";
import tasksRouter from "./tasks/tasks.index";
import tenantsRouter from "./tenants/tenants.index";

export function registerRoutes(app: AppOpenAPI) {
  return app
    .route("/", indexRoute)
    .route("/", tasksRouter)
    .route("/", tenantsRouter);
}

// stand alone router type used for api client
export const router = registerRoutes(
  createRouter().basePath(BASE_PATH),
);
export type router = typeof router;
