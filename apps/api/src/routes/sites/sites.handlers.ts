import { and, eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import type { AppRouteHandler } from "../../lib/types";
import type * as routes from "./sites.routes";

import { db } from "../../db";
import { sites } from "../../db/schema";
import { getDataSyncService } from "../../lib/permify/data-sync";
import { requireUser } from "../../middleware/keycloak";
import { getTenant } from "../../middleware/tenant";

// GET /tenants/{tenantId}/sites - List sites for a tenant
export const list: AppRouteHandler<typeof routes.list> = async (c) => {
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
export const create: AppRouteHandler<typeof routes.create> = async (c) => {
  requireUser(c);
  const tenant = getTenant(c);
  const { tenantId } = c.req.valid("param");
  const siteData = c.req.valid("json");
  const dataSync = getDataSyncService();

  // Verify tenant access
  if (tenant.id !== tenantId) {
    return c.json(
      { message: "Access denied" },
      HttpStatusCodes.FORBIDDEN,
    );
  }

  // Use transaction for consistency
  const result = await db.transaction(async (tx) => {
    const [newSite] = await tx
      .insert(sites)
      .values({
        ...siteData,
        tenantId,
      })
      .returning();

    // Sync to Permify
    // Note: We could assign the creator as site manager if needed
    await dataSync.syncSiteCreation(newSite.id, tenantId);

    return newSite;
  });

  return c.json(result, HttpStatusCodes.CREATED);
};

// GET /tenants/{tenantId}/sites/{id} - Get site details
export const getOne: AppRouteHandler<typeof routes.getOne> = async (c) => {
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
export const patch: AppRouteHandler<typeof routes.patch> = async (c) => {
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
      { 
        error: { 
          issues: [{ 
            code: "invalid_updates", 
            path: [], 
            message: "No updates provided" 
          }], 
          name: "ValidationError" 
        }, 
        success: false 
      },
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
export const remove: AppRouteHandler<typeof routes.remove> = async (c) => {
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

  await db
    .delete(sites)
    .where(
      and(
        eq(sites.id, id),
        eq(sites.tenantId, tenantId),
      ),
    );

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
