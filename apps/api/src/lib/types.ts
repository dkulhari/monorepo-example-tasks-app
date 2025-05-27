import type { OpenAPIHono, RouteConfig, RouteHandler } from "@hono/zod-openapi";

import type { BASE_PATH } from "./constants";
import type { KeycloakUser } from "./keycloak";

export type AppEnv = {
  Bindings: {
    DB_HOST?: string;
    DB_PORT?: string;
    DB_USER?: string;
    DB_PASSWORD?: string;
    DB_NAME?: string;
    KEYCLOAK_URL?: string;
    KEYCLOAK_REALM?: string;
    KEYCLOAK_CLIENT_ID?: string;
  };
  Variables: {
    user?: KeycloakUser;
    token?: string;
  };
};

// eslint-disable-next-line ts/no-empty-object-type
export type AppOpenAPI = OpenAPIHono<AppEnv, {}, typeof BASE_PATH>;

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppEnv>;
