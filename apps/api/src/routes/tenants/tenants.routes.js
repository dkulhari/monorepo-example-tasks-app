import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, IdParamsSchema } from "stoker/openapi/schemas";
import { notFoundSchema } from "../../lib/constants";
// Define tenant schemas
const selectTenantSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    type: z.enum(["enterprise", "standard", "trial", "demo"]),
    status: z.enum(["active", "suspended", "inactive"]),
    keycloakGroupId: z.string().nullable(),
    settings: z.object({
        features: z.object({
            maxUsers: z.number().optional(),
            maxSites: z.number().optional(),
            maxDevices: z.number().optional(),
            enabledModules: z.array(z.string()).optional(),
        }).optional(),
        branding: z.object({
            logo: z.string().optional(),
            primaryColor: z.string().optional(),
            secondaryColor: z.string().optional(),
        }).optional(),
        notifications: z.object({
            emailEnabled: z.boolean().optional(),
            smsEnabled: z.boolean().optional(),
            webhookUrl: z.string().optional(),
        }).optional(),
    }),
    createdAt: z.date(),
    updatedAt: z.date(),
});
const insertTenantSchema = z.object({
    name: z.string().min(1).max(255),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
    type: z.enum(["enterprise", "standard", "trial", "demo"]).optional(),
    status: z.enum(["active", "suspended", "inactive"]).optional(),
    keycloakGroupId: z.string().optional(),
    settings: z.any().optional(),
});
const patchTenantSchema = insertTenantSchema.partial();
// User-Tenant Association schema
const selectTenantUserSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    tenantId: z.string().uuid(),
    role: z.enum(["owner", "admin", "member", "viewer"]),
    status: z.enum(["active", "invited", "suspended"]),
    invitedAt: z.date().nullable(),
    acceptedAt: z.date().nullable(),
    invitedBy: z.string().uuid().nullable(),
    lastActiveAt: z.date().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
// Tenant Invitation schema
const insertTenantInvitationSchema = z.object({
    email: z.string().email(),
    role: z.enum(["owner", "admin", "member", "viewer"]).optional(),
});
const tags = ["Tenants"];
// GET /tenants - List user's tenants
export const list = createRoute({
    path: "/tenants",
    method: "get",
    tags,
    responses: {
        [HttpStatusCodes.OK]: jsonContent(z.array(selectTenantSchema), "The list of tenants"),
    },
});
// POST /tenants - Create new tenant
export const create = createRoute({
    path: "/tenants",
    method: "post",
    request: {
        body: jsonContentRequired(insertTenantSchema, "The tenant to create"),
    },
    tags,
    responses: {
        [HttpStatusCodes.CREATED]: jsonContent(selectTenantSchema, "The created tenant"),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(createErrorSchema(insertTenantSchema), "The validation error(s)"),
    },
});
// GET /tenants/{id} - Get tenant details
export const getOne = createRoute({
    path: "/tenants/{id}",
    method: "get",
    request: {
        params: IdParamsSchema,
    },
    tags,
    responses: {
        [HttpStatusCodes.OK]: jsonContent(selectTenantSchema, "The requested tenant"),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Tenant not found"),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(createErrorSchema(IdParamsSchema), "Invalid id error"),
    },
});
// PATCH /tenants/{id} - Update tenant
export const patch = createRoute({
    path: "/tenants/{id}",
    method: "patch",
    request: {
        params: IdParamsSchema,
        body: jsonContentRequired(patchTenantSchema, "The tenant updates"),
    },
    tags,
    responses: {
        [HttpStatusCodes.OK]: jsonContent(selectTenantSchema, "The updated tenant"),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Tenant not found"),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(createErrorSchema(patchTenantSchema)
            .or(createErrorSchema(IdParamsSchema)), "The validation error(s)"),
    },
});
// DELETE /tenants/{id} - Delete tenant
export const remove = createRoute({
    path: "/tenants/{id}",
    method: "delete",
    request: {
        params: IdParamsSchema,
    },
    tags,
    responses: {
        [HttpStatusCodes.NO_CONTENT]: {
            description: "Tenant deleted",
        },
        [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Tenant not found"),
        [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(createErrorSchema(IdParamsSchema), "Invalid id error"),
    },
});
// GET /tenants/{id}/users - List tenant users
export const listUsers = createRoute({
    path: "/tenants/{id}/users",
    method: "get",
    request: {
        params: IdParamsSchema,
    },
    tags,
    responses: {
        [HttpStatusCodes.OK]: jsonContent(z.array(selectTenantUserSchema), "The list of tenant users"),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Tenant not found"),
    },
});
// POST /tenants/{id}/invite - Invite user to tenant
export const inviteUser = createRoute({
    path: "/tenants/{id}/invite",
    method: "post",
    request: {
        params: IdParamsSchema,
        body: jsonContentRequired(insertTenantInvitationSchema, "The invitation details"),
    },
    tags,
    responses: {
        [HttpStatusCodes.CREATED]: jsonContent(z.object({
            message: z.string(),
            invitationId: z.string(),
            expiresAt: z.string(),
        }), "Invitation sent"),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Tenant not found"),
    },
});
// PATCH /tenants/{tenantId}/users/{userId} - Update user role
const userParamsSchema = z.object({
    tenantId: z.string(),
    userId: z.string(),
});
export const updateUserRole = createRoute({
    path: "/tenants/{tenantId}/users/{userId}",
    method: "patch",
    request: {
        params: userParamsSchema,
        body: jsonContentRequired(z.object({ role: z.string() }), "The role update"),
    },
    tags,
    responses: {
        [HttpStatusCodes.OK]: jsonContent(z.object({ message: z.string() }), "User role updated"),
        [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Tenant or user not found"),
    },
});
// DELETE /tenants/{tenantId}/users/{userId} - Remove user from tenant
export const removeUser = createRoute({
    path: "/tenants/{tenantId}/users/{userId}",
    method: "delete",
    request: {
        params: userParamsSchema,
    },
    tags,
    responses: {
        [HttpStatusCodes.NO_CONTENT]: {
            description: "User removed from tenant",
        },
        [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Tenant or user not found"),
    },
});
