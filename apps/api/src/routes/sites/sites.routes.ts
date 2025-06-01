import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import {
  insertSitesSchema,
  patchSitesSchema,
  selectSitesSchema,
} from "../../db/schema";
import { notFoundSchema } from "../../lib/constants";

const tags = ["Sites"];

// Customize schemas for OpenAPI
const selectSiteSchema = selectSitesSchema.extend({
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  postalCode: z.string().nullable(),
  timezone: z.string().nullable(),
});

// No need to override insertSiteSchema as the database schema is appropriate
const insertSiteSchema = insertSitesSchema;
const patchSiteSchema = patchSitesSchema;

// GET /tenants/{tenantId}/sites - List sites for a tenant
export const list = createRoute({
  path: "/tenants/{tenantId}/sites",
  method: "get",
  request: {
    params: z.object({
      tenantId: z.string().uuid(),
    }),
  },
  tags,
  summary: "List tenant sites",
  description: "Retrieves all sites belonging to a specific tenant. Sites represent physical locations where devices are deployed. Only users with tenant membership can access this endpoint.",
  security: [{ Bearer: [] }],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectSiteSchema),
      "List of sites with their location and status",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "User does not have access to this tenant",
    ),
  },
});

// POST /tenants/{tenantId}/sites - Create a new site
export const create = createRoute({
  path: "/tenants/{tenantId}/sites",
  method: "post",
  request: {
    params: z.object({
      tenantId: z.string().uuid(),
    }),
    body: jsonContentRequired(
      insertSiteSchema,
      "The site to create",
    ),
  },
  tags,
  summary: "Create a new site",
  description: "Creates a new site within a tenant. Sites represent physical locations where devices can be deployed. Only tenant owners and admins can create new sites. Coordinates and timezone help with location-based features.",
  security: [{ Bearer: [] }],
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      selectSiteSchema,
      "The newly created site",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Insufficient permissions - owner or admin role required",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSiteSchema),
      "Validation error",
    ),
  },
});

// GET /tenants/{tenantId}/sites/{id} - Get site details
export const getOne = createRoute({
  path: "/tenants/{tenantId}/sites/{id}",
  method: "get",
  request: {
    params: z.object({
      tenantId: z.string().uuid(),
      id: z.string().uuid(),
    }),
  },
  tags,
  summary: "Get site details",
  description: "Retrieves detailed information about a specific site including its location, status, and metadata. User must have tenant membership to access site details.",
  security: [{ Bearer: [] }],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectSiteSchema,
      "The requested site with full details",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Site not found or does not belong to this tenant",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "User does not have access to this tenant",
    ),
  },
});

// PATCH /tenants/{tenantId}/sites/{id} - Update site
export const patch = createRoute({
  path: "/tenants/{tenantId}/sites/{id}",
  method: "patch",
  request: {
    params: z.object({
      tenantId: z.string().uuid(),
      id: z.string().uuid(),
    }),
    body: jsonContentRequired(
      patchSiteSchema,
      "The site updates",
    ),
  },
  tags,
  summary: "Update site information",
  description: "Updates site details such as name, address, coordinates, or status. Only tenant owners and admins can update sites. All fields are optional - only provided fields will be updated.",
  security: [{ Bearer: [] }],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectSiteSchema,
      "The updated site",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Site not found or does not belong to this tenant",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Insufficient permissions - owner or admin role required",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSiteSchema),
      "Validation error",
    ),
  },
});

// DELETE /tenants/{tenantId}/sites/{id} - Delete site
export const remove = createRoute({
  path: "/tenants/{tenantId}/sites/{id}",
  method: "delete",
  request: {
    params: z.object({
      tenantId: z.string().uuid(),
      id: z.string().uuid(),
    }),
  },
  tags,
  summary: "Delete site",
  description: "Permanently deletes a site and all its associated data. Only tenant owners and admins can delete sites. Warning: This will also delete all devices associated with this site. This action cannot be undone.",
  security: [{ Bearer: [] }],
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "Site successfully deleted",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Site not found or does not belong to this tenant",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Insufficient permissions - owner or admin role required",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      z.object({ message: z.string() }),
      "Cannot delete site with active devices",
    ),
  },
});

// Type exports
export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
