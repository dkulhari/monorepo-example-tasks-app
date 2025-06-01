import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";

import { notFoundSchema } from "../../lib/constants";

const tags = ["Devices"];

// Define schemas manually to avoid drizzle-zod OpenAPI issues
const selectDeviceSchema = z.object({
  id: z.string().uuid(),
  siteId: z.string().uuid(),
  name: z.string(),
  type: z.string(),
  manufacturer: z.string().nullable(),
  model: z.string().nullable(),
  serialNumber: z.string().nullable(),
  status: z.enum(["active", "inactive", "maintenance", "offline"]),
  lastSeenAt: z.string().datetime().nullable(),
  metadata: z.object({}).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const insertDeviceSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.string().min(1).max(100),
  manufacturer: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  serialNumber: z.string().max(255).optional(),
  status: z.enum(["active", "inactive", "maintenance", "offline"]).optional(),
  metadata: z.object({}).optional(),
});

const patchDeviceSchema = insertDeviceSchema.partial();

// GET /tenants/{tenantId}/sites/{siteId}/devices - List devices for a site
export const list = createRoute({
  path: "/tenants/{tenantId}/sites/{siteId}/devices",
  method: "get",
  request: {
    params: z.object({
      tenantId: z.string().uuid(),
      siteId: z.string().uuid(),
    }),
  },
  tags,
  summary: "List site devices",
  description: "Retrieves all devices installed at a specific site. Devices represent physical equipment or sensors deployed at the site. Only users with tenant membership can access this endpoint.",
  security: [{ Bearer: [] }],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectDeviceSchema),
      "List of devices with their type, serial number, and status",
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

// POST /tenants/{tenantId}/sites/{siteId}/devices - Create a new device
export const create = createRoute({
  path: "/tenants/{tenantId}/sites/{siteId}/devices",
  method: "post",
  request: {
    params: z.object({
      tenantId: z.string().uuid(),
      siteId: z.string().uuid(),
    }),
    body: jsonContentRequired(
      insertDeviceSchema,
      "The device to create",
    ),
  },
  tags,
  summary: "Register new device",
  description: "Registers a new device at a site. Devices must have unique serial numbers within the tenant. Only tenant owners and admins can register new devices.",
  security: [{ Bearer: [] }],
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      selectDeviceSchema,
      "The newly registered device",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Site not found or does not belong to this tenant",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      z.object({ message: z.string() }),
      "Device with this serial number already exists in tenant",
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

// GET /tenants/{tenantId}/sites/{siteId}/devices/{id} - Get device details
export const getOne = createRoute({
  path: "/tenants/{tenantId}/sites/{siteId}/devices/{id}",
  method: "get",
  request: {
    params: z.object({
      tenantId: z.string().uuid(),
      siteId: z.string().uuid(),
      id: z.string().uuid(),
    }),
  },
  tags,
  summary: "Get device details",
  description: "Retrieves detailed information about a specific device including its configuration, status, and metadata. User must have tenant membership to access device details.",
  security: [{ Bearer: [] }],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectDeviceSchema,
      "The requested device with full details",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Device not found or does not belong to this site",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "User does not have access to this tenant",
    ),
  },
});

// PATCH /tenants/{tenantId}/sites/{siteId}/devices/{id} - Update device
export const patch = createRoute({
  path: "/tenants/{tenantId}/sites/{siteId}/devices/{id}",
  method: "patch",
  request: {
    params: z.object({
      tenantId: z.string().uuid(),
      siteId: z.string().uuid(),
      id: z.string().uuid(),
    }),
    body: jsonContentRequired(
      patchDeviceSchema,
      "The device updates",
    ),
  },
  tags,
  summary: "Update device configuration",
  description: "Updates device information such as name, status, or configuration metadata. Only tenant owners and admins can update devices. All fields are optional - only provided fields will be updated.",
  security: [{ Bearer: [] }],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectDeviceSchema,
      "The updated device",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Device not found or does not belong to this site",
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

// DELETE /tenants/{tenantId}/sites/{siteId}/devices/{id} - Delete device
export const remove = createRoute({
  path: "/tenants/{tenantId}/sites/{siteId}/devices/{id}",
  method: "delete",
  request: {
    params: z.object({
      tenantId: z.string().uuid(),
      siteId: z.string().uuid(),
      id: z.string().uuid(),
    }),
  },
  tags,
  summary: "Decommission device",
  description: "Permanently removes a device from the system. Only tenant owners and admins can delete devices. This will also delete all historical data associated with the device. This action cannot be undone.",
  security: [{ Bearer: [] }],
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "Device successfully decommissioned",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Device not found or does not belong to this site",
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Insufficient permissions - owner or admin role required",
    ),
  },
});

// Type exports
export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
