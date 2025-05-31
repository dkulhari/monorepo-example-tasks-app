import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { notFoundSchema } from "../../lib/constants";

const tags = ["Users"];

// Define user schemas
const selectUserSchema = z.object({
  id: z.string().uuid(),
  keycloakId: z.string(),
  email: z.string().email(),
  name: z.string(),
  userType: z.enum(["system_admin", "regular", "service_account", "guest"]),
  metadata: z.any(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const insertUserSchema = z.object({
  keycloakId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1).max(255),
  userType: z.enum(["system_admin", "regular", "service_account", "guest"]).optional(),
  metadata: z.any().optional(),
});

const patchUserSchema = insertUserSchema.partial();

// GET /users - List all users (system admin only)
export const list = createRoute({
  path: "/users",
  method: "get",
  tags,
  summary: "List all users",
  description: "Retrieves a list of all users in the system. This endpoint is restricted to system administrators only. Returns user profiles including their metadata and status.",
  security: [{ Bearer: [] }],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectUserSchema),
      "Complete list of system users",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "System administrator access required",
    ),
  },
});

// POST /users - Create a new user (system admin only)
export const create = createRoute({
  path: "/users",
  method: "post",
  request: {
    body: jsonContentRequired(
      insertUserSchema,
      "The user to create",
    ),
  },
  tags,
  summary: "Create a new user",
  description: "Creates a new user account in the system. This endpoint is restricted to system administrators. The keycloakId must match an existing Keycloak user. Users are typically created automatically on first login.",
  security: [{ Bearer: [] }],
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      selectUserSchema,
      "The newly created user",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      z.object({ message: z.string() }),
      "User with this email or keycloakId already exists",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "System administrator access required",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertUserSchema),
      "Validation error",
    ),
  },
});

// GET /users/{id} - Get user details
export const getOne = createRoute({
  path: "/users/{id}",
  method: "get",
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  tags,
  summary: "Get user details",
  description: "Retrieves detailed information about a specific user. Users can view their own profile. System administrators can view any user profile.",
  security: [{ Bearer: [] }],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectUserSchema,
      "The requested user profile",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "User not found",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Access denied - can only view own profile unless system admin",
    ),
  },
});

// PATCH /users/{id} - Update user
export const patch = createRoute({
  path: "/users/{id}",
  method: "patch",
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
    body: jsonContentRequired(
      patchUserSchema,
      "The user updates",
    ),
  },
  tags,
  summary: "Update user profile",
  description: "Updates user profile information. Users can update their own profile. System administrators can update any user profile. All fields are optional - only provided fields will be updated.",
  security: [{ Bearer: [] }],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectUserSchema,
      "The updated user profile",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "User not found",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Access denied - can only update own profile unless system admin",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchUserSchema),
      "Validation error",
    ),
  },
});

// DELETE /users/{id} - Delete user (system admin only)
export const remove = createRoute({
  path: "/users/{id}",
  method: "delete",
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  tags,
  summary: "Delete user",
  description: "Permanently deletes a user account. This endpoint is restricted to system administrators. Deleting a user will also remove all their tenant memberships and associated data. This action cannot be undone.",
  security: [{ Bearer: [] }],
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "User successfully deleted",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "User not found",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "System administrator access required",
    ),
  },
});

// GET /users/me - Get current user
export const me = createRoute({
  path: "/users/me",
  method: "get",
  tags,
  summary: "Get current user profile",
  description: "Retrieves the profile of the currently authenticated user. This endpoint provides a convenient way to fetch the logged-in user's information without needing to know their user ID.",
  security: [{ Bearer: [] }],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectUserSchema,
      "The authenticated user's profile",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "Authentication required",
    ),
  },
});

// Type exports
export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type MeRoute = typeof me;