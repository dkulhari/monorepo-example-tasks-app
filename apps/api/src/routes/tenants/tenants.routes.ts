import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema, IdParamsSchema } from "stoker/openapi/schemas";

import { 
  insertTenantSchema, 
  patchTenantSchema, 
  selectTenantSchema,
  selectTenantUserSchema,
  insertTenantInvitationSchema
} from "../../db/schema/tenants";
import { notFoundSchema } from "../../lib/constants";

const tags = ["Tenants"];

// GET /tenants - List user's tenants
export const list = createRoute({
  path: "/tenants",
  method: "get",
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectTenantSchema),
      "The list of tenants",
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
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      selectTenantSchema,
      "The created tenant",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertTenantSchema),
      "The validation error(s)",
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
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectTenantSchema,
      "The requested tenant",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Tenant not found",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdParamsSchema),
      "Invalid id error",
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
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectTenantSchema,
      "The updated tenant",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Tenant not found",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchTenantSchema)
        .or(createErrorSchema(IdParamsSchema)),
      "The validation error(s)",
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
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "Tenant deleted",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Tenant not found",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdParamsSchema),
      "Invalid id error",
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
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectTenantUserSchema),
      "The list of tenant users",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Tenant not found",
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
      insertTenantInvitationSchema.omit({ tenantId: true, invitedBy: true, token: true, expiresAt: true }),
      "The invitation details",
    ),
  },
  tags,
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      z.object({
        message: z.string(),
        invitationId: z.string(),
        expiresAt: z.string(),
      }),
      "Invitation sent",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Tenant not found",
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
      z.object({ role: z.string() }),
      "The role update",
    ),
  },
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ message: z.string() }),
      "User role updated",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Tenant or user not found",
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
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "User removed from tenant",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Tenant or user not found",
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