import type { Context, Next } from "hono";

import createRouter from "../../lib/create-router";
import { keycloakAuth } from "../../middleware/keycloak";
import { tenantMiddleware } from "../../middleware/tenant";
import * as handlers from "./tasks.handlers";
import * as routes from "./tasks.routes";

// Auth middleware
function authMiddleware(c: Context, next: Next) {
  return keycloakAuth()(c, next);
}

// Tenant middleware wrapper
function tenantAuthMiddleware(c: Context, next: Next) {
  return tenantMiddleware()(c, next);
}

// All task routes require authentication and tenant context
const router = createRouter();
router.use("/tenants/:tenantId/tasks", authMiddleware);
router.use("/tenants/:tenantId/tasks", tenantAuthMiddleware);
router.use("/tenants/:tenantId/tasks/:id", authMiddleware);
router.use("/tenants/:tenantId/tasks/:id", tenantAuthMiddleware);
router.openapi(routes.list, handlers.list);
router.openapi(routes.create, handlers.create);
router.openapi(routes.getOne, handlers.getOne);
router.openapi(routes.patch, handlers.patch);
router.openapi(routes.remove, handlers.remove);

export default router;
