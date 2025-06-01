import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { IdParamsSchema } from "stoker/openapi/schemas";

import { notFoundSchema } from "../../lib/constants";

// Manual schemas to avoid drizzle-zod OpenAPI issues
const selectTenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  type: z.enum(["enterprise", "standard", "trial", "demo"]),
  status: z.enum(["active", "suspended", "inactive"]),
  keycloakGroupId: z.string().nullable(),
  settings: z.object({}).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const insertTenantSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  type: z.enum(["enterprise", "standard", "trial", "demo"]).optional(),
  keycloakGroupId: z.string().max(255).optional(),
  settings: z.object({}).optional(),
});

const patchTenantSchema = insertTenantSchema.partial();

// For tenant user listing
const selectTenantUserSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["owner", "admin", "member", "viewer"]),
  status: z.enum(["active", "invited", "suspended"]),
  invitedBy: z.string().uuid().nullable(),
  invitedAt: z.string().datetime().nullable(),
  acceptedAt: z.string().datetime().nullable(),
  lastActiveAt: z.string().datetime().nullable(),
});

// Tenant Invitation schema - only need email and role for request
const insertTenantInvitationSchema = z.object({
  email: z.string().email().max(255),
  role: z.enum(["owner", "admin", "member", "viewer"]),
});

const tags = ["Tenants"];

// GET /tenants - List user's tenants
export const list = createRoute({
  path: "/tenants",
  method: "get",
  tags,
  summary: "List user's tenants",
  description: "Retrieves all tenants that the authenticated user has access to. Returns tenants where the user has an active membership with their role in each tenant.",
  security: [{ Bearer: [] }],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectTenantSchema),
      "The list of tenants the user has access to",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "Authentication required",
    ),
  },
});

// POST /tenants - Create new tenant
export const create = createRoute({
  path: "/tenants",
  method: "post",
  request: {
    body: jsonContentRequired(
      insertTenantSchema,
      "The tenant to create",
    ),
  },
  tags,
  summary: "Create a new tenant",
  description: "Creates a new tenant organization. The authenticated user will automatically be assigned as the owner of the new tenant. Tenant slugs must be unique across the system.",
  security: [{ Bearer: [] }],
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      selectTenantSchema,
      "The created tenant with the user as owner",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      z.object({ message: z.string() }),
      "Validation error - check slug uniqueness and field requirements",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      z.object({ message: z.string() }),
      "Tenant with this slug already exists",
    ),
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
  summary: "Get tenant details",
  description: "Retrieves detailed information about a specific tenant. User must have membership in the tenant to access this endpoint.",
  security: [{ Bearer: [] }],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectTenantSchema,
      "The requested tenant details",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Tenant not found or user does not have access",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "User does not have access to this tenant",
    ),
  },
});

// PATCH /tenants/{id} - Update tenant
export const patch = createRoute({
  path: "/tenants/{id}",
  method: "patch",
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(
      patchTenantSchema,
      "The tenant updates",
    ),
  },
  tags,
  summary: "Update tenant",
  description: "Updates tenant information. Only tenant owners and admins can update tenant details. All fields are optional - only provided fields will be updated.",
  security: [{ Bearer: [] }],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectTenantSchema,
      "The updated tenant",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Tenant not found",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Insufficient permissions - owner or admin role required",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      z.object({ message: z.string() }),
      "Validation error",
    ),
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
  summary: "Delete tenant",
  description: "Permanently deletes a tenant and all associated data. Only tenant owners can delete tenants. This action cannot be undone.",
  security: [{ Bearer: [] }],
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "Tenant successfully deleted",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Tenant not found",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Only tenant owners can delete tenants",
    ),
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
  summary: "List tenant users",
  description: "Retrieves all users who have access to the tenant, including their roles and membership status. Only tenant owners and admins can view the user list.",
  security: [{ Bearer: [] }],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectTenantUserSchema),
      "List of users with their roles and status",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Tenant not found",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Insufficient permissions - owner or admin role required",
    ),
  },
});

// POST /tenants/{id}/invite - Invite user to tenant
export const inviteUser = createRoute({
  path: "/tenants/{id}/invite",
  method: "post",
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(
      insertTenantInvitationSchema,
      "The invitation details",
    ),
  },
  tags,
  summary: "Invite user to tenant",
  description: "Sends an invitation to a user to join the tenant. Only tenant owners and admins can invite users. The invitation expires after 7 days. An email notification will be sent to the invited user.",
  security: [{ Bearer: [] }],
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      z.object({
        message: z.string(),
        invitationId: z.string(),
        expiresAt: z.string(),
      }),
      "Invitation created successfully",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      z.object({ message: z.string() }),
      "User already invited or is a member",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Insufficient permissions - owner or admin role required",
    ),
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
    body: jsonContentRequired(
      z.object({ role: z.enum(["owner", "admin", "member", "viewer"]) }),
      "The role update",
    ),
  },
  tags,
  summary: "Update user role",
  description: "Updates a user's role within the tenant. Only tenant owners and admins can change user roles. Owners cannot change their own role if they are the last owner.",
  security: [{ Bearer: [] }],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ message: z.string() }),
      "User role successfully updated",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Tenant or user not found",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Insufficient permissions or cannot change last owner",
    ),
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
  summary: "Remove user from tenant",
  description: "Removes a user's access to the tenant. Only tenant owners and admins can remove users. Users cannot remove themselves, and the last owner cannot be removed.",
  security: [{ Bearer: [] }],
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "User successfully removed from tenant",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Tenant or user not found",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Cannot remove yourself or the last owner",
    ),
  },
});

// Type exports
export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type ListUsersRoute = typeof listUsers;
export type InviteUserRoute = typeof inviteUser;
export type UpdateUserRoleRoute = typeof updateUserRole;
export type RemoveUserRoute = typeof removeUser;
