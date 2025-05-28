import { and, eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import type { AppRouteHandler } from "../../lib/types";
import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from "./tasks.routes";

import { db } from "../../db";
import { tasks } from "../../db/schema";
import { ZOD_ERROR_CODES, ZOD_ERROR_MESSAGES } from "../../lib/constants";
import { requireUser } from "../../middleware/keycloak";
import { getTenant } from "../../middleware/tenant";

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const user = requireUser(c);
  const tenant = getTenant(c);

  const userTasks = await db.query.tasks.findMany({
    where(fields, operators) {
      return operators.and(
        operators.eq(fields.tenantId, tenant.id),
        operators.eq(fields.userId, user.sub),
      );
    },
    orderBy(fields, operators) {
      return operators.desc(fields.createdAt);
    },
  });
  return c.json(userTasks);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const user = requireUser(c);
  const tenant = getTenant(c);
  const task = c.req.valid("json");

  const [inserted] = await db.insert(tasks).values({
    ...task,
    tenantId: tenant.id,
    userId: user.sub,
    done: task.done ?? false,
  }).returning();

  return c.json(inserted, HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const user = requireUser(c);
  const tenant = getTenant(c);

  const task = await db.query.tasks.findFirst({
    where(fields, operators) {
      return operators.and(
        operators.eq(fields.id, id),
        operators.eq(fields.tenantId, tenant.id),
        operators.eq(fields.userId, user.sub),
      );
    },
  });

  if (!task) {
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.json(task, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const user = requireUser(c);
  const tenant = getTenant(c);
  const updates = c.req.valid("json");

  if (Object.keys(updates).length === 0) {
    return c.json(
      {
        success: false,
        error: {
          issues: [
            {
              code: ZOD_ERROR_CODES.INVALID_UPDATES,
              path: [],
              message: ZOD_ERROR_MESSAGES.NO_UPDATES,
            },
          ],
          name: "ZodError",
        },
      },
      HttpStatusCodes.UNPROCESSABLE_ENTITY,
    );
  }

  const [task] = await db.update(tasks)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(and(
      eq(tasks.id, id),
      eq(tasks.tenantId, tenant.id),
      eq(tasks.userId, user.sub),
    ))
    .returning();

  if (!task) {
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.json(task, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const user = requireUser(c);
  const tenant = getTenant(c);

  const [deleted] = await db.delete(tasks)
    .where(and(
      eq(tasks.id, id),
      eq(tasks.tenantId, tenant.id),
      eq(tasks.userId, user.sub),
    ))
    .returning();

  if (!deleted) {
    return c.json(
      {
        message: HttpStatusPhrases.NOT_FOUND,
      },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
