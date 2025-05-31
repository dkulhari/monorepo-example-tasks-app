import { HTTPException } from "hono/http-exception";
import { getPermifyService } from "../lib/permify";
import { PermissionDeniedError } from "../lib/permify/types";
/**
 * Extract permission context from the request
 */
function getPermissionContext(c) {
    // Get user ID from JWT payload (assumes keycloak middleware has run)
    const payload = c.get("jwtPayload");
    const userId = payload?.sub;
    if (!userId) {
        throw new HTTPException(401, { message: "Unauthorized" });
    }
    // Get tenant ID from context (set by tenant middleware)
    const tenantId = c.get("tenantId");
    return { userId, tenantId };
}
/**
 * Middleware to check permissions
 */
export function requirePermission(entityType, action, getEntityId) {
    return async (c, next) => {
        try {
            const permifyService = getPermifyService();
            const { userId, tenantId } = getPermissionContext(c);
            // Determine entity ID
            let entityId;
            if (getEntityId) {
                entityId = getEntityId(c);
            }
            else if (entityType === "tenant" && tenantId) {
                entityId = tenantId;
            }
            else {
                // Try to get from route params
                entityId = c.req.param("id") || c.req.param(`${entityType}Id`) || "";
            }
            if (!entityId) {
                throw new HTTPException(400, {
                    message: `Missing ${entityType} ID for permission check`,
                });
            }
            // Check permission
            await permifyService.assertPermission({
                userId,
                action,
                entityType,
                entityId,
            });
            // Permission granted, continue
            await next();
        }
        catch (error) {
            if (error instanceof PermissionDeniedError) {
                throw new HTTPException(403, { message: error.message });
            }
            throw error;
        }
    };
}
/**
 * Middleware to check if user is a system admin
 */
export function requireSystemAdmin() {
    return async (c, next) => {
        try {
            const permifyService = getPermifyService();
            const { userId } = getPermissionContext(c);
            await permifyService.assertPermission({
                userId,
                action: "create_tenant",
                entityType: "system",
                entityId: "main",
            });
            await next();
        }
        catch (error) {
            if (error instanceof PermissionDeniedError) {
                throw new HTTPException(403, {
                    message: "System admin privileges required",
                });
            }
            throw error;
        }
    };
}
/**
 * Middleware to check tenant membership
 */
export function requireTenantMembership(minRole) {
    return async (c, next) => {
        try {
            const permifyService = getPermifyService();
            const { userId, tenantId } = getPermissionContext(c);
            if (!tenantId) {
                throw new HTTPException(400, { message: "Tenant context required" });
            }
            // Determine action based on minimum role
            let action = "view";
            if (minRole === "admin") {
                action = "update";
            }
            else if (minRole === "owner") {
                action = "delete";
            }
            await permifyService.assertPermission({
                userId,
                action,
                entityType: "tenant",
                entityId: tenantId,
            });
            await next();
        }
        catch (error) {
            if (error instanceof PermissionDeniedError) {
                throw new HTTPException(403, {
                    message: `Tenant ${minRole || "member"} privileges required`,
                });
            }
            throw error;
        }
    };
}
/**
 * Helper to check permissions in route handlers
 */
export async function checkPermission(c, entityType, action, entityId) {
    try {
        const permifyService = getPermifyService();
        const { userId } = getPermissionContext(c);
        const result = await permifyService.checkPermission({
            userId,
            action,
            entityType,
            entityId,
        });
        return result.allowed;
    }
    catch (error) {
        console.error("Permission check failed:", error);
        return false;
    }
}
/**
 * Initialize Permify on app startup
 */
export async function initializePermissions(endpoint, apiKey) {
    const permifyService = getPermifyService({ endpoint, apiKey });
    await permifyService.initialize();
}
