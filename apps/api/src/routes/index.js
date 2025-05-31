/* eslint-disable ts/no-redeclare */
import createRouter from "@/api/lib/create-router";
import { BASE_PATH } from "../lib/constants";
import indexRoute from "./index.route";
import tenantsRouter from "./tenants/tenants.index";
export function registerRoutes(app) {
    return app
        .route("/", indexRoute)
        .route("/", tenantsRouter);
}
// stand alone router type used for api client
export const router = registerRoutes(createRouter().basePath(BASE_PATH));
