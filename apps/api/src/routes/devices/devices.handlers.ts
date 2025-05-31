import { and, eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import type { AppRouteHandler } from "../../lib/types";
import type * as routes from "./devices.routes";

import { db } from "../../db";
import { devices, sites } from "../../db/schema";
import { requireUser } from "../../middleware/keycloak";
import { getTenant } from "../../middleware/tenant";

// GET /tenants/{tenantId}/sites/{siteId}/devices - List devices for a site
export const list: AppRouteHandler<routes.ListRoute> = async (c) => {
  requireUser(c);
  const tenant = getTenant(c);
  const { tenantId, siteId } = c.req.valid("param");

  // Verify tenant access
  if (tenant.id !== tenantId) {
    return c.json(
      { message: "Access denied" },
      HttpStatusCodes.FORBIDDEN,
    );
  }

  // Verify site belongs to tenant
  const site = await db.query.sites.findFirst({
    where: and(
      eq(sites.id, siteId),
      eq(sites.tenantId, tenantId),
    ),
  });

  if (!site) {
    return c.json(
      { message: "Site not found" },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  const siteDevices = await db.query.devices.findMany({
    where: eq(devices.siteId, siteId),
    orderBy: (devices, { desc }) => [desc(devices.createdAt)],
  });

  return c.json(siteDevices);
};

// POST /tenants/{tenantId}/sites/{siteId}/devices - Create a new device
export const create: AppRouteHandler<routes.CreateRoute> = async (c) => {
  requireUser(c);
  const tenant = getTenant(c);
  const { tenantId, siteId } = c.req.valid("param");
  const deviceData = c.req.valid("json");

  // Verify tenant access
  if (tenant.id !== tenantId) {
    return c.json(
      { message: "Access denied" },
      HttpStatusCodes.FORBIDDEN,
    );
  }

  // Verify site belongs to tenant
  const site = await db.query.sites.findFirst({
    where: and(
      eq(sites.id, siteId),
      eq(sites.tenantId, tenantId),
    ),
  });

  if (!site) {
    return c.json(
      { message: "Site not found" },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  const [newDevice] = await db
    .insert(devices)
    .values({
      ...deviceData,
      siteId,
    })
    .returning();

  return c.json(newDevice, HttpStatusCodes.CREATED);
};

// GET /tenants/{tenantId}/sites/{siteId}/devices/{id} - Get device details
export const getOne: AppRouteHandler<routes.GetOneRoute> = async (c) => {
  requireUser(c);
  const tenant = getTenant(c);
  const { tenantId, siteId, id } = c.req.valid("param");

  // Verify tenant access
  if (tenant.id !== tenantId) {
    return c.json(
      { message: "Access denied" },
      HttpStatusCodes.FORBIDDEN,
    );
  }

  // Verify site belongs to tenant
  const site = await db.query.sites.findFirst({
    where: and(
      eq(sites.id, siteId),
      eq(sites.tenantId, tenantId),
    ),
  });

  if (!site) {
    return c.json(
      { message: "Site not found" },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  const device = await db.query.devices.findFirst({
    where: and(
      eq(devices.id, id),
      eq(devices.siteId, siteId),
    ),
  });

  if (!device) {
    return c.json(
      { message: HttpStatusPhrases.NOT_FOUND },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.json(device);
};

// PATCH /tenants/{tenantId}/sites/{siteId}/devices/{id} - Update device
export const patch: AppRouteHandler<routes.PatchRoute> = async (c) => {
  requireUser(c);
  const tenant = getTenant(c);
  const { tenantId, siteId, id } = c.req.valid("param");
  const updates = c.req.valid("json");

  // Verify tenant access
  if (tenant.id !== tenantId) {
    return c.json(
      { message: "Access denied" },
      HttpStatusCodes.FORBIDDEN,
    );
  }

  // Verify site belongs to tenant
  const site = await db.query.sites.findFirst({
    where: and(
      eq(sites.id, siteId),
      eq(sites.tenantId, tenantId),
    ),
  });

  if (!site) {
    return c.json(
      { message: "Site not found" },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  if (Object.keys(updates).length === 0) {
    return c.json(
      { message: "No updates provided" },
      HttpStatusCodes.UNPROCESSABLE_ENTITY,
    );
  }

  const [updatedDevice] = await db
    .update(devices)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(devices.id, id),
        eq(devices.siteId, siteId),
      ),
    )
    .returning();

  if (!updatedDevice) {
    return c.json(
      { message: HttpStatusPhrases.NOT_FOUND },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.json(updatedDevice);
};

// DELETE /tenants/{tenantId}/sites/{siteId}/devices/{id} - Delete device
export const remove: AppRouteHandler<routes.RemoveRoute> = async (c) => {
  requireUser(c);
  const tenant = getTenant(c);
  const { tenantId, siteId, id } = c.req.valid("param");

  // Verify tenant access
  if (tenant.id !== tenantId) {
    return c.json(
      { message: "Access denied" },
      HttpStatusCodes.FORBIDDEN,
    );
  }

  // Verify site belongs to tenant
  const site = await db.query.sites.findFirst({
    where: and(
      eq(sites.id, siteId),
      eq(sites.tenantId, tenantId),
    ),
  });

  if (!site) {
    return c.json(
      { message: "Site not found" },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  await db
    .delete(devices)
    .where(
      and(
        eq(devices.id, id),
        eq(devices.siteId, siteId),
      ),
    );

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};