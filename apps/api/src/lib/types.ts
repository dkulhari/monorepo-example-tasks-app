import type { OpenAPIHono, RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { PinoLogger } from "hono-pino";

// Import tenant types directly from schema
import type { tenants } from "../db/schema";
import type { AppEnv } from "../env";
import type { KeycloakUser } from "../middleware/keycloak";
import type { BASE_PATH } from "./constants";

export type AppBinding = {
  Bindings: AppEnv;
  Variables: {
    logger: PinoLogger;
    user?: KeycloakUser;
    token?: string;
    tenant?: typeof tenants.$inferSelect;
    userRole?: string;
  };
};

// eslint-disable-next-line ts/no-empty-object-type
export type AppOpenAPI = OpenAPIHono<AppBinding, {}, typeof BASE_PATH>;

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppBinding>;
