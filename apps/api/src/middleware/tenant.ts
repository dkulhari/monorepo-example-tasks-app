import { and, eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import { db } from "../db";
import { tenants, tenantUsers } from "../db/schema";
import { getUser } from "./keycloak";

export type TenantContext = {
  tenant: typeof tenants.$inferSelect;
  userRole: string;
};

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
        eq(tenantUsers.isActive, true),
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
  if (tenantFromPath)
    return tenantFromPath;

  // Option 3: From header
  const tenantFromHeader = c.req.header("x-tenant");
  if (tenantFromHeader)
    return tenantFromHeader;

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
