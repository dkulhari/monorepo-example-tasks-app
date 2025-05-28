Great question! You're building a solid foundation with Hono + React + Keycloak + Permify. Here's a comprehensive design for implementing multi-tenancy:

## 1. Tenant Data Model

First, let's design the core tenant structure:

Search files...
Perfect! I can see you have a solid foundation. Let me design a comprehensive multi-tenant SaaS architecture for you:

## 1. Database Schema Design

Let's create the tenant and user management tables:

```typescript
// apps/api/src/db/schema/tenants.ts
import { pgTable, serial, text, timestamp, varchar, boolean, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(), // for subdomain/path routing
  domain: varchar("domain", { length: 255 }), // custom domain support
  plan: varchar("plan", { length: 50 }).notNull().default("free"), // free, pro, enterprise
  isActive: boolean("is_active").notNull().default(true),
  settings: text("settings"), // JSON string for tenant-specific settings
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const tenantUsers = pgTable("tenant_users", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull(), // Keycloak user ID
  role: varchar("role", { length: 50 }).notNull().default("member"), // owner, admin, member
  isActive: boolean("is_active").notNull().default(true),
  invitedBy: varchar("invited_by", { length: 255 }), // Keycloak user ID of inviter
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tenantInvitations = pgTable("tenant_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("member"),
  token: varchar("token", { length: 255 }).notNull().unique(),
  invitedBy: varchar("invited_by", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Zod schemas
export const insertTenantSchema = createInsertSchema(tenants);
export const selectTenantSchema = createSelectSchema(tenants);
export const patchTenantSchema = insertTenantSchema.partial();

export const insertTenantUserSchema = createInsertSchema(tenantUsers);
export const selectTenantUserSchema = createSelectSchema(tenantUsers);

export const insertTenantInvitationSchema = createInsertSchema(tenantInvitations);
export const selectTenantInvitationSchema = createSelectSchema(tenantInvitations);
```

## 2. Update Existing Schema for Multi-tenancy

```typescript
// Update apps/api/src/db/schema/index.ts
import { pgTable, serial, text, timestamp, varchar, boolean, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { tenants } from "./tenants";

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull(),
  name: text("name").notNull(),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

// Export everything
export * from "./tenants";
// ... existing exports
```

## 3. Permify Schema Design

Create a Permify schema for authorization:

```yaml
# permify-schema.yaml
entity user {}

entity tenant {
  relation owner @user
  relation admin @user  
  relation member @user
  
  permission read = owner or admin or member
  permission write = owner or admin or member
  permission manage_users = owner or admin
  permission manage_settings = owner
  permission delete = owner
}

entity task {
  relation tenant @tenant
  relation creator @user
  
  permission read = tenant.read
  permission write = creator or tenant.manage_users
  permission delete = creator or tenant.manage_users
}
```

## 4. Tenant Context Middleware

```typescript
// apps/api/src/middleware/tenant.ts
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { tenants, tenantUsers } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { getUser } from "./keycloak";

export interface TenantContext {
  tenant: typeof tenants.$inferSelect;
  userRole: string;
}

export function tenantMiddleware() {
  return createMiddleware(async (c, next) => {
    const user = getUser(c);
    if (!user) {
      throw new HTTPException(401, { message: "Authentication required" });
    }

    // Get tenant from subdomain, path, or header
    const tenantSlug = getTenantSlug(c);
    if (!tenantSlug) {
      throw new HTTPException(400, { message: "Tenant not specified" });
    }

    // Find tenant
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, tenantSlug),
    });

    if (!tenant || !tenant.isActive) {
      throw new HTTPException(404, { message: "Tenant not found" });
    }

    // Check user membership
    const membership = await db.query.tenantUsers.findFirst({
      where: and(
        eq(tenantUsers.tenantId, tenant.id),
        eq(tenantUsers.userId, user.sub),
        eq(tenantUsers.isActive, true)
      ),
    });

    if (!membership) {
      throw new HTTPException(403, { message: "Access denied to this tenant" });
    }

    // Set tenant context
    c.set("tenant", tenant);
    c.set("userRole", membership.role);

    await next();
  });
}

function getTenantSlug(c: any): string | null {
  // Option 1: From subdomain
  const host = c.req.header("host");
  if (host) {
    const subdomain = host.split(".")[0];
    if (subdomain && subdomain !== "www" && subdomain !== "api") {
      return subdomain;
    }
  }

  // Option 2: From path parameter
  const tenantFromPath = c.req.param("tenant");
  if (tenantFromPath) return tenantFromPath;

  // Option 3: From header
  const tenantFromHeader = c.req.header("x-tenant");
  if (tenantFromHeader) return tenantFromHeader;

  return null;
}

export function getTenant(c: any): typeof tenants.$inferSelect {
  return c.get("tenant");
}

export function getUserRole(c: any): string {
  return c.get("userRole");
}

export function requireRole(allowedRoles: string[]) {
  return createMiddleware(async (c, next) => {
    const userRole = getUserRole(c);
    if (!allowedRoles.includes(userRole)) {
      throw new HTTPException(403, { message: "Insufficient permissions" });
    }
    await next();
  });
}
```

## 5. Tenant Management Routes

```typescript
// apps/api/src/routes/tenants/tenants.routes.ts
import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, IdParamsSchema } from "stoker/openapi/schemas";
import { insertTenantSchema, selectTenantSchema, patchTenantSchema } from "../../db/schema";

const tags = ["Tenants"];

export const create = createRoute({
  path: "/tenants",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(
      insertTenantSchema.pick({ name: true, slug: true }),
      "Tenant creation data"
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(selectTenantSchema, "Tenant created"),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      createErrorSchema(z.object({ slug: z.string() })),
      "Tenant slug already exists"
    ),
  },
});

export const list = createRoute({
  path: "/tenants",
  method: "get",
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectTenantSchema),
      "List of user's tenants"
    ),
  },
});

export const getOne = createRoute({
  path: "/tenants/{id}",
  method: "get",
  tags,
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectTenantSchema, "Tenant details"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      createErrorSchema(z.object({ id: z.string() })),
      "Tenant not found"
    ),
  },
});

// Add more routes for update, delete, user management, invitations...
```

## 6. Tenant-Aware Task Routes

```typescript
// apps/api/src/routes/tasks/tasks.handlers.ts (updated)
import { and, eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import type { AppRouteHandler } from "../../lib/types";
import { db } from "../../db";
import { tasks } from "../../db/schema";
import { getUser } from "../../middleware/keycloak";
import { getTenant } from "../../middleware/tenant";

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const user = getUser(c);
  const tenant = getTenant(c);
  
  const userTasks = await db.query.tasks.findMany({
    where: and(
      eq(tasks.tenantId, tenant.id),
      user ? eq(tasks.userId, user.sub) : undefined
    ),
    orderBy(fields, operators) {
      return operators.desc(fields.createdAt);
    },
  });
  
  return c.json(userTasks);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const user = getUser(c)!;
  const tenant = getTenant(c);
  const taskData = c.req.valid("json");
  
  const [newTask] = await db
    .insert(tasks)
    .values({
      ...taskData,
      tenantId: tenant.id,
      userId: user.sub,
    })
    .returning();

  return c.json(newTask, HttpStatusCodes.CREATED);
};
```

## 7. Frontend Tenant Context

```typescript
// apps/web/src/lib/tenant-context.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { useKeycloak } from "@react-keycloak/web";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  userRole: string;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  tenants: Tenant[];
  switchTenant: (tenantSlug: string) => void;
  loading: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { keycloak, initialized } = useKeycloak();
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialized && keycloak.authenticated) {
      loadUserTenants();
    }
  }, [initialized, keycloak.authenticated]);

  const loadUserTenants = async () => {
    try {
      // Fetch user's tenants from API
      const response = await fetch("/api/tenants", {
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
        },
      });
      const userTenants = await response.json();
      setTenants(userTenants);
      
      // Set current tenant from URL or default to first
      const currentSlug = getCurrentTenantSlug();
      const tenant = userTenants.find((t: Tenant) => t.slug === currentSlug) || userTenants[0];
      setCurrentTenant(tenant);
    } catch (error) {
      console.error("Failed to load tenants:", error);
    } finally {
      setLoading(false);
    }
  };

  const switchTenant = (tenantSlug: string) => {
    const tenant = tenants.find(t => t.slug === tenantSlug);
    if (tenant) {
      setCurrentTenant(tenant);
      // Update URL or localStorage
      window.location.href = `https://${tenantSlug}.yourdomain.com`;
    }
  };

  return (
    <TenantContext.Provider value={{ currentTenant, tenants, switchTenant, loading }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within TenantProvider");
  }
  return context;
}

function getCurrentTenantSlug(): string | null {
  // Extract from subdomain
  const hostname = window.location.hostname;
  const parts = hostname.split(".");
  if (parts.length > 2) {
    return parts[0];
  }
  return null;
}
```

## 8. Deployment Architecture Options

### Option A: Subdomain-based (Recommended)
- `tenant1.yourdomain.com`
- `tenant2.yourdomain.com`
- Single deployment, tenant resolved from subdomain

### Option B: Path-based
- `yourdomain.com/tenant1/dashboard`
- `yourdomain.com/tenant2/dashboard`
- Simpler DNS setup

### Option C: Separate domains
- `tenant1.com`
- `tenant2.com`
- Custom domain support for enterprise plans

## 9. Implementation Steps

1. **Create database schema** (tenants, tenant_users, tenant_invitations)
2. **Add tenant middleware** to API routes
3. **Update existing routes** to be tenant-aware
4. **Create tenant management routes** (CRUD, user management, invitations)
5. **Set up Permify schema** and integration
6. **Add tenant context** to frontend
7. **Create tenant onboarding flow**
8. **Add billing integration** (Stripe/similar)
9. **Implement tenant isolation** in all features

## 10. Security Considerations

- **Row-level security**: Always filter by tenantId
- **API isolation**: Middleware ensures users can only access their tenant's data
- **Permify integration**: Fine-grained permissions within tenants
- **Audit logging**: Track all tenant-level actions
- **Data encryption**: Tenant-specific encryption keys for sensitive data

This architecture gives you:
- ✅ **Scalable multi-tenancy** with proper isolation
- ✅ **Flexible user management** via Keycloak + custom roles
- ✅ **Fine-grained permissions** via Permify
- ✅ **Multiple deployment options** (subdomain/path/domain)
- ✅ **Enterprise-ready features** (custom domains, billing, audit logs)

Would you like me to help you implement any specific part of this architecture first?
