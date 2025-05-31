import type { Context, Next } from "hono";
import type { Logger } from "pino";

import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import type { PermifyService } from "../lib/permify-service.js";

// Types for middleware configuration
export type PermifyMiddlewareConfig = {
  entity: {
    type: string;
    getId: (c: Context) => string;
  };
  permission: string;
  getUserId: (c: Context) => string | null;
  onUnauthorized?: (c: Context, reason: string) => Response;
  skipForSystemAdmin?: boolean;
};

export type PermifyMiddlewareOptions = {
  permifyService: PermifyService;
  logger: Logger;
};

/**
 * Create Permify authorization middleware
 */
export function createPermifyMiddleware(options: PermifyMiddlewareOptions) {
  const { permifyService, logger } = options;

  return function permifyMiddleware(config: PermifyMiddlewareConfig) {
    return createMiddleware(async (c: Context, next: Next) => {
      try {
        // Get user ID from context
        const userId = config.getUserId(c);
        if (!userId) {
          logger.warn("No user ID found in request context");
          throw new HTTPException(401, { message: "Authentication required" });
        }

        // Check if user is system admin (if configured to skip)
        if (config.skipForSystemAdmin) {
          const isSystemAdmin = await permifyService.isSystemAdmin(userId);
          if (isSystemAdmin) {
            logger.debug("System admin bypassing permission check", { userId });
            return next();
          }
        }

        // Get entity ID from context
        const entityId = config.entity.getId(c);
        if (!entityId) {
          logger.warn("No entity ID found in request", {
            entityType: config.entity.type,
            path: c.req.path,
          });
          throw new HTTPException(400, { message: "Invalid entity ID" });
        }

        // Check permission
        const hasPermission = await permifyService.checkPermission(
          { type: config.entity.type, id: entityId },
          config.permission,
          { type: permifyService.EntityTypes.USER, id: userId },
        );

        if (!hasPermission) {
          const reason = `User ${userId} lacks ${config.permission} permission on ${config.entity.type}:${entityId}`;
          logger.warn("Permission denied", {
            userId,
            entityType: config.entity.type,
            entityId,
            permission: config.permission,
          });

          if (config.onUnauthorized) {
            return config.onUnauthorized(c, reason);
          }

          throw new HTTPException(403, {
            message: "Insufficient permissions",
            cause: reason,
          });
        }

        logger.debug("Permission check passed", {
          userId,
          entityType: config.entity.type,
          entityId,
          permission: config.permission,
        });

        return next();
      }
      catch (error) {
        if (error instanceof HTTPException) {
          throw error;
        }

        logger.error(error, "Permission check failed");
        throw new HTTPException(500, { message: "Permission check failed" });
      }
    });
  };
}

/**
 * Helper functions for common permission patterns
 */
export function createPermifyHelpers(permifyService: PermifyService, logger: Logger) {
  const middleware = createPermifyMiddleware({ permifyService, logger });

  return {
    // System admin only
    requireSystemAdmin: () => middleware({
      entity: {
        type: permifyService.EntityTypes.SYSTEM,
        getId: () => "platform",
      },
      permission: permifyService.Permissions.MANAGE_ALL,
      getUserId: c => c.get("userId"),
    }),

    // Tenant permissions
    requireTenantAccess: (permission: string = "view_settings") => middleware({
      entity: {
        type: permifyService.EntityTypes.TENANT,
        getId: c => c.req.param("tenantId") || c.get("tenantId"),
      },
      permission,
      getUserId: c => c.get("userId"),
      skipForSystemAdmin: true,
    }),

    requireTenantManage: () => middleware({
      entity: {
        type: permifyService.EntityTypes.TENANT,
        getId: c => c.req.param("tenantId") || c.get("tenantId"),
      },
      permission: permifyService.Permissions.MANAGE,
      getUserId: c => c.get("userId"),
      skipForSystemAdmin: true,
    }),

    requireTenantAdmin: () => middleware({
      entity: {
        type: permifyService.EntityTypes.TENANT,
        getId: c => c.req.param("tenantId") || c.get("tenantId"),
      },
      permission: permifyService.Permissions.EDIT_SETTINGS,
      getUserId: c => c.get("userId"),
      skipForSystemAdmin: true,
    }),

    // Site permissions
    requireSiteAccess: (permission: string = "view") => middleware({
      entity: {
        type: permifyService.EntityTypes.SITE,
        getId: c => c.req.param("siteId"),
      },
      permission,
      getUserId: c => c.get("userId"),
      skipForSystemAdmin: true,
    }),

    requireSiteManage: () => middleware({
      entity: {
        type: permifyService.EntityTypes.SITE,
        getId: c => c.req.param("siteId"),
      },
      permission: permifyService.Permissions.MANAGE,
      getUserId: c => c.get("userId"),
      skipForSystemAdmin: true,
    }),

    // Device permissions
    requireDeviceAccess: (permission: string = "monitor") => middleware({
      entity: {
        type: permifyService.EntityTypes.DEVICE,
        getId: c => c.req.param("deviceId"),
      },
      permission,
      getUserId: c => c.get("userId"),
      skipForSystemAdmin: true,
    }),

    requireDeviceConfig: () => middleware({
      entity: {
        type: permifyService.EntityTypes.DEVICE,
        getId: c => c.req.param("deviceId"),
      },
      permission: permifyService.Permissions.CONFIGURE,
      getUserId: c => c.get("userId"),
      skipForSystemAdmin: true,
    }),

    // Task permissions
    requireTaskAccess: (permission: string = "view") => middleware({
      entity: {
        type: permifyService.EntityTypes.TASK,
        getId: c => c.req.param("taskId") || c.req.param("id"),
      },
      permission,
      getUserId: c => c.get("userId"),
      skipForSystemAdmin: true,
    }),

    requireTaskEdit: () => middleware({
      entity: {
        type: permifyService.EntityTypes.TASK,
        getId: c => c.req.param("taskId") || c.req.param("id"),
      },
      permission: permifyService.Permissions.EDIT,
      getUserId: c => c.get("userId"),
      skipForSystemAdmin: true,
    }),

    // Custom permission check
    requirePermission: (config: PermifyMiddlewareConfig) => middleware(config),
  };
}

/**
 * Utility function to check permissions in route handlers
 */
export async function checkPermissionInHandler(
  c: Context,
  permifyService: PermifyService,
  entity: { type: string; id: string },
  permission: string,
  userId?: string,
): Promise<boolean> {
  const userIdToCheck = userId || c.get("userId");
  if (!userIdToCheck) {
    return false;
  }

  try {
    return await permifyService.checkPermission(
      entity,
      permission,
      { type: permifyService.EntityTypes.USER, id: userIdToCheck },
    );
  }
  catch (error) {
    const logger = c.get("logger") as Logger;
    logger?.error(error, "Permission check failed in handler");
    return false;
  }
}

/**
 * Helper to get user permissions for an entity
 */
export async function getUserPermissions(
  c: Context,
  permifyService: PermifyService,
  entity: { type: string; id: string },
  permissions: string[],
  userId?: string,
): Promise<Record<string, boolean>> {
  const userIdToCheck = userId || c.get("userId");
  if (!userIdToCheck) {
    return permissions.reduce((acc, perm) => ({ ...acc, [perm]: false }), {});
  }

  try {
    const checks = permissions.map(permission => ({ entity, permission }));
    return await permifyService.checkMultiplePermissions(
      checks,
      { type: permifyService.EntityTypes.USER, id: userIdToCheck },
    );
  }
  catch (error) {
    const logger = c.get("logger") as Logger;
    logger?.error(error, "Multiple permission check failed");
    return permissions.reduce((acc, perm) => ({ ...acc, [perm]: false }), {});
  }
}
