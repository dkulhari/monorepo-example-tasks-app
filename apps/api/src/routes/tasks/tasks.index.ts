import type { Context, Next } from "hono";

import createRouter from "@/api/lib/create-router";
import { keycloakAuth } from "@/api/middleware/keycloak";

import * as handlers from "./tasks.handlers";
import * as routes from "./tasks.routes";

// Auth middleware
function authMiddleware(c: Context, next: Next) {
  return keycloakAuth()(c, next);
}

// Public router
const publicRouter = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.getOne, handlers.getOne);

// Authenticated router (middleware before any .openapi)
const authRouter = createRouter() as ReturnType<typeof createRouter>;
authRouter.use("/tasks", authMiddleware);
authRouter.openapi(routes.create, handlers.create);
authRouter.openapi(routes.patch, handlers.patch);
authRouter.openapi(routes.remove, handlers.remove);

// Parent router
const router = createRouter()
  .route("/", publicRouter)
  .route("/", authRouter);

export default router;
