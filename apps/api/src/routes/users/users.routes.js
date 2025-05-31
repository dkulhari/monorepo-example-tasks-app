import createRouter from "../../lib/create-router";
import { requireSystemAdmin, requireTenantMembership } from "../../middleware/permissions";
import { getPermifyService } from "../../lib/permify";
import { z } from "zod";
const createUserSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1),
    tenantId: z.string().uuid(),
    role: z.enum(["admin", "member"]),
});
const userResponseSchema = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    status: z.enum(["active", "invited", "suspended", "deleted"]),
    createdAt: z.string(),
});
const userRoutesHandler = (app) => {
    return app
        // Create a new user (system admin only)
        .openapi({
        method: "post",
        path: "/users",
        summary: "Create a new user",
        description: "System admins can create new users and assign them to tenants",
        tags: ["Users"],
        middleware: [requireSystemAdmin()],
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: createUserSchema,
                    },
                },
            },
        },
        responses: {
            200: {
                description: "User created successfully",
                content: {
                    "application/json": {
                        schema: userResponseSchema,
                    },
                },
            },
            403: {
                description: "Forbidden - System admin privileges required",
            },
        },
    }, async (c) => {
        const { email, name, tenantId, role } = c.req.valid("json");
        const permifyService = getPermifyService();
        // TODO: Create user in Keycloak
        const userId = `user_${Date.now()}`; // Placeholder
        // Add user to tenant with specified role
        await permifyService.addUserToTenant(tenantId, userId, role);
        return c.json({
            id: userId,
            email,
            name,
            status: "invited",
            createdAt: new Date().toISOString(),
        });
    })
        // Assign user to tenant
        .openapi({
        method: "post",
        path: "/users/:userId/assign-tenant",
        summary: "Assign user to tenant",
        description: "Tenant admins can add users to their tenant",
        tags: ["Users"],
        middleware: [requireTenantMembership("admin")],
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: z.object({
                            tenantId: z.string().uuid(),
                            role: z.enum(["admin", "member"]),
                        }),
                    },
                },
            },
        },
        responses: {
            200: {
                description: "User assigned to tenant successfully",
            },
            403: {
                description: "Forbidden - Tenant admin privileges required",
            },
        },
    }, async (c) => {
        const { userId } = c.req.param();
        const { tenantId, role } = c.req.valid("json");
        const permifyService = getPermifyService();
        // Add user to tenant
        await permifyService.addUserToTenant(tenantId, userId, role);
        return c.json({ success: true });
    })
        // Make user a system admin
        .openapi({
        method: "post",
        path: "/users/:userId/make-system-admin",
        summary: "Grant system admin privileges",
        description: "Only system admins can grant system admin privileges",
        tags: ["Users"],
        middleware: [requireSystemAdmin()],
        responses: {
            200: {
                description: "System admin privileges granted",
            },
            403: {
                description: "Forbidden - System admin privileges required",
            },
        },
    }, async (c) => {
        const { userId } = c.req.param();
        const permifyService = getPermifyService();
        // Grant system admin privileges
        await permifyService.createSystemAdmin(userId);
        return c.json({ success: true });
    });
};
export const userRoutes = createRouter(userRoutesHandler);
