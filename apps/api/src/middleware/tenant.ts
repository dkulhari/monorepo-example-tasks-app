import type { Context } from "hono";

import { and, eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import { db } from "../db";
import { tenants, userTenantAssociations } from "../db/schema";
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
    const tenantIdentifier = getTenantIdentifier(c);

    if (!tenantIdentifier) {
      throw new HTTPException(400, { message: "Tenant not specified" });
    }

    // Find tenant by slug or ID
    let tenant;

    // Check if it's a UUID (tenant ID) or a slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantIdentifier);

    if (isUUID) {
      // Look up by tenant ID
      tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, tenantIdentifier),
      });
    }
    else {
      // Look up by tenant slug
      tenant = await db.query.tenants.findFirst({
        where: eq(tenants.slug, tenantIdentifier),
      });
    }

    if (!tenant || tenant.status !== "active") {
      throw new HTTPException(404, { message: "Tenant not found" });
    }

    // Check user membership
    const membership = await db.query.userTenantAssociations.findFirst({
      where: and(
        eq(userTenantAssociations.tenantId, tenant.id),
        eq(userTenantAssociations.userId, user.sub),
        eq(userTenantAssociations.status, "active"),
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

function getTenantIdentifier(c: Context): string | null {
  // Option 1: From path parameter (check both tenantId and tenant) - prioritize this for API routes
  const tenantIdFromPath = c.req.param("tenantId");
  if (tenantIdFromPath) {
    return tenantIdFromPath;
  }

  const tenantFromPath = c.req.param("tenant");
  if (tenantFromPath) {
    return tenantFromPath;
  }

  // Option 2: From subdomain (only for production-like domains, not localhost)
  const host = c.req.header("host");
  if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
    const subdomain = host.split(".")[0];
    if (subdomain && subdomain !== "www" && subdomain !== "api") {
      return subdomain;
    }
  }

  // Option 3: From header
  const tenantFromHeader = c.req.header("x-tenant");
  if (tenantFromHeader) {
    return tenantFromHeader;
  }

  return null;
}

export function getTenant(c: Context): typeof tenants.$inferSelect {
  const tenant = c.get("tenant");
  return tenant;
}

export function getUserRole(c: Context): string {
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
