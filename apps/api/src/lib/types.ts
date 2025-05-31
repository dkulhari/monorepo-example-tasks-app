import type { OpenAPIHono, RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { PinoLogger } from "hono-pino";

// Import tenant types directly from tenants schema
import type { tenants } from "../db/schema/tenants";
import type { AppEnv } from "../env";
import type { KeycloakUser } from "../middleware/keycloak";
import type { createPermifyHelpers } from "../middleware/permify";
import type { BASE_PATH } from "./constants";
import type { PermifyService } from "./permify-service";

export type AppBinding = {
  Bindings: AppEnv;
  Variables: {
    logger: PinoLogger;
    user?: KeycloakUser;
    userId?: string;
    token?: string;
    tenant?: typeof tenants.$inferSelect;
    tenantId?: string;
    userRole?: string;
    permifyService?: PermifyService | null;
    permifyHelpers?: ReturnType<typeof createPermifyHelpers> | null;
  };
};

// eslint-disable-next-line ts/no-empty-object-type
export type AppOpenAPI = OpenAPIHono<AppBinding, {}, typeof BASE_PATH>;

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppBinding>;
