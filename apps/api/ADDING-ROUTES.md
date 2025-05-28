# Adding New Routes to the Hono API

This guide explains how to add a new resource with full CRUD operations to our Hono API. We'll use a hypothetical "User" resource as an example.

## Overview

Our API follows a structured pattern for organizing routes:
- **Database Schema**: Define the data structure
- **Route Definitions**: Define OpenAPI specifications
- **Handlers**: Implement the business logic
- **Router**: Wire everything together
- **Registration**: Add to the main app

## Step-by-Step Process

### 1. Define Database Schema

First, create the database schema in `src/db/schema/`:

```typescript
// src/db/schema/users.ts
import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const patchUserSchema = insertUserSchema.partial();
```

Don't forget to export from the main schema file:

```typescript
// src/db/schema/index.ts
export * from "./users";
export * from "./tasks"; // existing
```

### 2. Create Route Definitions

Create route specifications in `src/routes/users/users.routes.ts`:

```typescript
import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, IdParamsSchema } from "stoker/openapi/schemas";

import { insertUserSchema, patchUserSchema, selectUserSchema } from "@/api/db/schema";

const tags = ["Users"];

// GET /users - List all users
export const list = createRoute({
  path: "/users",
  method: "get",
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectUserSchema),
      "List of users"
    ),
  },
});

// POST /users - Create a new user
export const create = createRoute({
  path: "/users",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(insertUserSchema, "User to create"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(selectUserSchema, "Created user"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertUserSchema),
      "Validation error"
    ),
  },
});

// GET /users/{id} - Get user by ID
export const getOne = createRoute({
  path: "/users/{id}",
  method: "get",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectUserSchema, "User details"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      createErrorSchema(z.object({ id: z.number() })),
      "User not found"
    ),
  },
});

// PATCH /users/{id} - Update user
export const patch = createRoute({
  path: "/users/{id}",
  method: "patch",
  tags,
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(patchUserSchema, "User updates"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectUserSchema, "Updated user"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      createErrorSchema(z.object({ id: z.number() })),
      "User not found"
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchUserSchema),
      "Validation error"
    ),
  },
});

// DELETE /users/{id} - Delete user
export const remove = createRoute({
  path: "/users/{id}",
  method: "delete",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "User deleted successfully",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      createErrorSchema(z.object({ id: z.number() })),
      "User not found"
    ),
  },
});
```

### 3. Implement Handlers

Create the business logic in `src/routes/users/users.handlers.ts`:

```typescript
import { eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { HTTPException } from "hono/http-exception";

import type { AppRouteHandler } from "@/api/lib/types";
import { db } from "@/api/db";
import { users } from "@/api/db/schema";
import { requireUser } from "@/api/middleware/keycloak";

import * as routes from "./users.routes";

// GET /users
export const list: AppRouteHandler<typeof routes.list> = async (c) => {
  // Optional: Check authentication if needed
  // const currentUser = requireUser(c);
  
  const allUsers = await db.select().from(users);
  return c.json(allUsers, HttpStatusCodes.OK);
};

// POST /users
export const create: AppRouteHandler<typeof routes.create> = async (c) => {
  // Require authentication for creating users
  const currentUser = requireUser(c);
  
  const userData = c.req.valid("json");
  
  const [newUser] = await db
    .insert(users)
    .values({
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return c.json(newUser, HttpStatusCodes.CREATED);
};

// GET /users/{id}
export const getOne: AppRouteHandler<typeof routes.getOne> = async (c) => {
  const { id } = c.req.valid("param");
  
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (user.length === 0) {
    throw new HTTPException(HttpStatusCodes.NOT_FOUND, {
      message: "User not found",
    });
  }

  return c.json(user[0], HttpStatusCodes.OK);
};

// PATCH /users/{id}
export const patch: AppRouteHandler<typeof routes.patch> = async (c) => {
  const currentUser = requireUser(c);
  const { id } = c.req.valid("param");
  const updates = c.req.valid("json");

  const [updatedUser] = await db
    .update(users)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();

  if (!updatedUser) {
    throw new HTTPException(HttpStatusCodes.NOT_FOUND, {
      message: "User not found",
    });
  }

  return c.json(updatedUser, HttpStatusCodes.OK);
};

// DELETE /users/{id}
export const remove: AppRouteHandler<typeof routes.remove> = async (c) => {
  const currentUser = requireUser(c);
  const { id } = c.req.valid("param");

  const result = await db
    .delete(users)
    .where(eq(users.id, id))
    .returning({ id: users.id });

  if (result.length === 0) {
    throw new HTTPException(HttpStatusCodes.NOT_FOUND, {
      message: "User not found",
    });
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
```

### 4. Create Router

Wire everything together in `src/routes/users/users.index.ts`:

```typescript
import createRouter from "@/api/lib/create-router";
import { keycloakAuth, optionalKeycloakAuth } from "@/api/middleware/keycloak";

import * as handlers from "./users.handlers";
import * as routes from "./users.routes";

const router = createRouter()
  // Public routes (no auth required)
  .openapi(routes.list, handlers.list)
  .openapi(routes.getOne, handlers.getOne)
  
  // Protected routes (auth required)
  .use("*", keycloakAuth()) // Apply auth to all routes below
  .openapi(routes.create, handlers.create)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove);

export default router;
```

### 5. Register Routes

Add your new router to the main routes in `src/routes/index.ts`:

```typescript
import type { AppOpenAPI } from "@/api/lib/types";

import indexRoute from "./index.route";
import tasksRouter from "./tasks/tasks.index";
import usersRouter from "./users/users.index"; // Add this import

export function registerRoutes(app: AppOpenAPI) {
  return app
    .route("/", indexRoute)
    .route("/", tasksRouter)
    .route("/", usersRouter); // Add this line
}

// Export the router type for RPC client
export const router = registerRoutes(createRouter());
export type router = typeof router;
```

### 6. Run Database Migration

Push your schema changes to the database:

```bash
pnpm db:push
```

Or generate and run migrations:

```bash
pnpm db:generate
pnpm db:migrate
```

## Authentication Patterns

### Public Routes
For routes that don't require authentication:
```typescript
// No auth middleware needed
.openapi(routes.list, handlers.list)
```

### Protected Routes
For routes that require authentication:
```typescript
// Apply auth middleware
.use("*", keycloakAuth())
.openapi(routes.create, handlers.create)
```

### Optional Authentication
For routes that work with or without auth:
```typescript
// Use optionalKeycloakAuth in create-app.ts (already configured)
// Then in handlers, check: const user = getUser(c);
```

## Testing Your Routes

1. **Start the development server**:
   ```bash
   pnpm dev
   ```

2. **View API documentation**:
   - Open http://localhost:3001/api/reference
   - Your new routes should appear in the documentation

3. **Test with curl**:
   ```bash
   # List users
   curl http://localhost:3001/api/users
   
   # Create user (requires auth token)
   curl -X POST http://localhost:3001/api/users \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{"email":"test@example.com","name":"Test User"}'
   ```

## Best Practices

1. **Validation**: Always use Zod schemas for request/response validation
2. **Error Handling**: Use HTTPException for consistent error responses
3. **Authentication**: Apply appropriate auth middleware based on route sensitivity
4. **Database**: Use transactions for complex operations
5. **Logging**: The logger is available via `c.get('logger')` in handlers
6. **Type Safety**: Use `AppRouteHandler<typeof routes.routeName>` for handlers

## File Structure

Your new routes should follow this structure:

```
src/routes/users/
├── users.index.ts     # Router configuration
├── users.routes.ts    # OpenAPI route definitions
├── users.handlers.ts  # Business logic
└── users.test.ts      # Unit tests (optional)
```

## Common Gotchas

1. **Import paths**: Use `@/api/*` alias for imports
2. **Schema exports**: Don't forget to export from `src/db/schema/index.ts`
3. **Route registration**: Add to `src/routes/index.ts`
4. **Auth middleware**: Apply in the correct order (auth before protected routes)
5. **Database migrations**: Run `pnpm db:push` after schema changes

## Next Steps

After adding your routes:
1. Write unit tests in `users.test.ts`
2. Update the frontend API client to use the new endpoints
3. Add any necessary database indexes for performance
4. Consider adding rate limiting for sensitive operations

Happy coding! 🚀 