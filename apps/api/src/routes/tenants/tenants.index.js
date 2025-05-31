import createRouter from "../../lib/create-router";
import { keycloakAuth } from "../../middleware/keycloak";
import { tenantMiddleware } from "../../middleware/tenant";
import * as handlers from "./tenants.handlers";
import * as routes from "./tenants.routes";
// Auth middleware
function authMiddleware(c, next) {
    return keycloakAuth()(c, next);
}
// Tenant middleware wrapper
function tenantAuthMiddleware(c, next) {
    return tenantMiddleware()(c, next);
}
// Public tenant routes (require auth but no tenant context)
const publicRouter = createRouter();
publicRouter.use("/tenants", authMiddleware);
publicRouter.openapi(routes.list, handlers.list);
publicRouter.openapi(routes.create, handlers.create);
// Tenant-specific routes (require auth and tenant context)
const tenantRouter = createRouter();
tenantRouter.use("/tenants/:id/*", authMiddleware);
tenantRouter.use("/tenants/:id/*", tenantAuthMiddleware);
tenantRouter.openapi(routes.getOne, handlers.getOne);
tenantRouter.openapi(routes.patch, handlers.patch);
tenantRouter.openapi(routes.remove, handlers.remove);
tenantRouter.openapi(routes.listUsers, handlers.listUsers);
tenantRouter.openapi(routes.inviteUser, handlers.inviteUser);
tenantRouter.openapi(routes.updateUserRole, handlers.updateUserRole);
tenantRouter.openapi(routes.removeUser, handlers.removeUser);
// Parent router
const router = createRouter()
    .route("/", publicRouter)
    .route("/", tenantRouter);
export default router;
