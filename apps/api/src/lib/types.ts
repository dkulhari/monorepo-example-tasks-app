import type { OpenAPIHono, RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { PinoLogger } from "hono-pino";

import type { AppEnv } from "../env";
import type { BASE_PATH } from "./constants";
import type { KeycloakUser } from "./keycloak";

export type AppBinding = {
  Bindings: AppEnv;
  Variables: {
    logger: PinoLogger;
    user?: KeycloakUser;
    token?: string;
  };
};

// eslint-disable-next-line ts/no-empty-object-type
export type AppOpenAPI = OpenAPIHono<AppBinding, {}, typeof BASE_PATH>;

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppBinding>;
