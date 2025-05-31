import createRouter from "../../lib/create-router";

import * as handlers from "./users.handlers";
import * as routes from "./users.routes";

const router = createRouter()
  .openapi(routes.me, handlers.me) // Put /me before /{id} to avoid route conflicts
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove);

export default router;