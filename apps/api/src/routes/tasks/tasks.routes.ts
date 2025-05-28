import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { insertTasksSchema, patchTasksSchema, selectTasksSchema } from "../../db/schema";
import { notFoundSchema } from "../../lib/constants";

const tags = ["Tasks"];

// Tenant-aware task routes
export const list = createRoute({
  path: "/tenants/{tenantId}/tasks",
  method: "get",
  request: {
    params: z.object({
      tenantId: z.string(),
    }),
  },
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.array(selectTasksSchema),
      "The list of tasks for the tenant",
    ),
  },
});

export const create = createRoute({
  path: "/tenants/{tenantId}/tasks",
  method: "post",
  request: {
    params: z.object({
      tenantId: z.string(),
    }),
    body: jsonContentRequired(
      insertTasksSchema,
      "The task to create",
    ),
  },
  tags,
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      selectTasksSchema,
      "The created task",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertTasksSchema),
      "The validation error(s)",
    ),
  },
});

export const getOne = createRoute({
  path: "/tenants/{tenantId}/tasks/{id}",
  method: "get",
  request: {
    params: z.object({
      tenantId: z.string(),
      id: z.coerce.number(),
    }),
  },
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectTasksSchema,
      "The requested task",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Task not found",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.object({
        tenantId: z.string(),
        id: z.coerce.number(),
      })),
      "Invalid parameters",
    ),
  },
});

export const patch = createRoute({
  path: "/tenants/{tenantId}/tasks/{id}",
  method: "patch",
  request: {
    params: z.object({
      tenantId: z.string(),
      id: z.coerce.number(),
    }),
    body: jsonContentRequired(
      patchTasksSchema,
      "The task updates",
    ),
  },
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectTasksSchema,
      "The updated task",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Task not found",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchTasksSchema)
        .or(createErrorSchema(z.object({
          tenantId: z.string(),
          id: z.coerce.number(),
        }))),
      "The validation error(s)",
    ),
  },
});

export const remove = createRoute({
  path: "/tenants/{tenantId}/tasks/{id}",
  method: "delete",
  request: {
    params: z.object({
      tenantId: z.string(),
      id: z.coerce.number(),
    }),
  },
  tags,
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "Task deleted",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Task not found",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.object({
        tenantId: z.string(),
        id: z.coerce.number(),
      })),
      "Invalid parameters",
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
