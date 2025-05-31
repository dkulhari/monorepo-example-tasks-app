import { and, eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import type { AppRouteHandler } from "../../lib/types";
import type * as routes from "./sites.routes";

import { db } from "../../db";
import { sites } from "../../db/schema";
import { requireUser } from "../../middleware/keycloak";
import { getTenant, requireRole } from "../../middleware/tenant";

// GET /tenants/{tenantId}/sites - List sites for a tenant
export const list: AppRouteHandler<routes.ListRoute> = async (c) => {
  requireUser(c);
  const tenant = getTenant(c);
  const { tenantId } = c.req.valid("param");

  // Verify tenant access
  if (tenant.id !== tenantId) {
    return c.json(
      { message: "Access denied" },
      HttpStatusCodes.FORBIDDEN,
    );
  }

  const tenantSites = await db.query.sites.findMany({
    where: eq(sites.tenantId, tenantId),
    orderBy: (sites, { desc }) => [desc(sites.createdAt)],
  });

  return c.json(tenantSites);
};

// POST /tenants/{tenantId}/sites - Create a new site
export const create: AppRouteHandler<routes.CreateRoute> = async (c) => {
  requireUser(c);
  const tenant = getTenant(c);
  const { tenantId } = c.req.valid("param");
  const siteData = c.req.valid("json");

  // Verify tenant access
  if (tenant.id !== tenantId) {
    return c.json(
      { message: "Access denied" },
      HttpStatusCodes.FORBIDDEN,
    );
  }

  const [newSite] = await db
    .insert(sites)
    .values({
      ...siteData,
      tenantId,
    })
    .returning();

  return c.json(newSite, HttpStatusCodes.CREATED);
};

// GET /tenants/{tenantId}/sites/{id} - Get site details
export const getOne: AppRouteHandler<routes.GetOneRoute> = async (c) => {
  requireUser(c);
  const tenant = getTenant(c);
  const { tenantId, id } = c.req.valid("param");

  // Verify tenant access
  if (tenant.id !== tenantId) {
    return c.json(
      { message: "Access denied" },
      HttpStatusCodes.FORBIDDEN,
    );
  }

  const site = await db.query.sites.findFirst({
    where: and(
      eq(sites.id, id),
      eq(sites.tenantId, tenantId),
    ),
  });

  if (!site) {
    return c.json(
      { message: HttpStatusPhrases.NOT_FOUND },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.json(site);
};

// PATCH /tenants/{tenantId}/sites/{id} - Update site
export const patch: AppRouteHandler<routes.PatchRoute> = async (c) => {
  requireUser(c);
  const tenant = getTenant(c);
  const { tenantId, id } = c.req.valid("param");
  const updates = c.req.valid("json");

  // Verify tenant access
  if (tenant.id !== tenantId) {
    return c.json(
      { message: "Access denied" },
      HttpStatusCodes.FORBIDDEN,
    );
  }

  if (Object.keys(updates).length === 0) {
    return c.json(
      { message: "No updates provided" },
      HttpStatusCodes.UNPROCESSABLE_ENTITY,
    );
  }

  const [updatedSite] = await db
    .update(sites)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(sites.id, id),
        eq(sites.tenantId, tenantId),
      ),
    )
    .returning();

  if (!updatedSite) {
    return c.json(
      { message: HttpStatusPhrases.NOT_FOUND },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.json(updatedSite);
};

// DELETE /tenants/{tenantId}/sites/{id} - Delete site
export const remove: AppRouteHandler<routes.RemoveRoute> = async (c) => {
  requireUser(c);
  const tenant = getTenant(c);
  const { tenantId, id } = c.req.valid("param");

  // Verify tenant access
  if (tenant.id !== tenantId) {
    return c.json(
      { message: "Access denied" },
      HttpStatusCodes.FORBIDDEN,
    );
  }

  const result = await db
    .delete(sites)
    .where(
      and(
        eq(sites.id, id),
        eq(sites.tenantId, tenantId),
      ),
    );

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};