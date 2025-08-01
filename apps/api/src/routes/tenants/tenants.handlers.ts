import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import crypto from "node:crypto";
import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "../../lib/types";
import type * as routes from "./tenants.routes";

import { db } from "../../db";
import { tenantInvitations, tenants, tenantUsers } from "../../db/schema";
import { requireUser } from "../../middleware/keycloak";
import { getTenant, getUserRole } from "../../middleware/tenant";

// GET /tenants - List user's tenants
export const list: AppRouteHandler<routes.ListRoute> = async (c) => {
  const user = requireUser(c);

  // Get all tenants where user is a member
  const userTenants = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      domain: tenants.domain,
      settings: tenants.settings,
      plan: tenants.plan,
      isActive: tenants.isActive,
      createdAt: tenants.createdAt,
      updatedAt: tenants.updatedAt,
      userRole: tenantUsers.role,
    })
    .from(tenants)
    .innerJoin(tenantUsers, eq(tenants.id, tenantUsers.tenantId))
    .where(
      and(
        eq(tenantUsers.userId, user.sub),
        eq(tenantUsers.isActive, true),
        eq(tenants.isActive, true),
      ),
    );

  return c.json(userTenants, HttpStatusCodes.OK);
};

// POST /tenants - Create new tenant
export const create: AppRouteHandler<routes.CreateRoute> = async (c) => {
  const user = requireUser(c);
  const { name, slug } = c.req.valid("json");

  // Check if slug already exists
  const existingTenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, slug),
  });

  if (existingTenant) {
    throw new HTTPException(HttpStatusCodes.CONFLICT, {
      message: "Tenant with this slug already exists",
    });
  }

  // Create tenant
  const [newTenant] = await db
    .insert(tenants)
    .values({
      name,
      slug,
    })
    .returning();

  // Add user as owner
  await db.insert(tenantUsers).values({
    tenantId: newTenant.id,
    userId: user.sub,
    role: "owner",
  });

  return c.json(newTenant, HttpStatusCodes.CREATED);
};

// GET /tenants/{id} - Get tenant details
export const getOne: AppRouteHandler<routes.GetOneRoute> = async (c) => {
  const tenant = getTenant(c);
  return c.json(tenant, HttpStatusCodes.OK);
};

// PATCH /tenants/{id} - Update tenant
export const patch: AppRouteHandler<routes.PatchRoute> = async (c) => {
  const tenant = getTenant(c);
  const userRole = getUserRole(c);
  const updateData = c.req.valid("json");

  // Only owners and admins can update tenant
  if (!["owner", "admin"].includes(userRole)) {
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: "Insufficient permissions to update tenant",
    });
  }

  const [updatedTenant] = await db
    .update(tenants)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenant.id))
    .returning();

  return c.json(updatedTenant, HttpStatusCodes.OK);
};

// DELETE /tenants/{id} - Delete tenant
export const remove: AppRouteHandler<routes.RemoveRoute> = async (c) => {
  const tenant = getTenant(c);
  const userRole = getUserRole(c);

  // Only owners can delete tenant
  if (userRole !== "owner") {
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: "Only tenant owners can delete the tenant",
    });
  }

  await db.delete(tenants).where(eq(tenants.id, tenant.id));

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

// GET /tenants/{id}/users - List tenant users
export const listUsers: AppRouteHandler<routes.ListUsersRoute> = async (c) => {
  const tenant = getTenant(c);
  const userRole = getUserRole(c);

  // Only owners and admins can list users
  if (!["owner", "admin"].includes(userRole)) {
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: "Insufficient permissions to list tenant users",
    });
  }

  const users = await db
    .select({
      id: tenantUsers.id,
      tenantId: tenantUsers.tenantId,
      userId: tenantUsers.userId,
      role: tenantUsers.role,
      isActive: tenantUsers.isActive,
      createdAt: tenantUsers.createdAt,
    })
    .from(tenantUsers)
    .where(
      and(
        eq(tenantUsers.tenantId, tenant.id),
        eq(tenantUsers.isActive, true),
      ),
    );

  // Return the users data that matches the selectTenantUserSchema
  return c.json(users, HttpStatusCodes.OK);
};

// POST /tenants/{id}/invite - Invite user to tenant
export const inviteUser: AppRouteHandler<routes.InviteUserRoute> = async (c) => {
  const tenant = getTenant(c);
  const userRole = getUserRole(c);
  const user = requireUser(c);
  const { email, role = "member" } = c.req.valid("json");

  // Only owners and admins can invite users
  if (!["owner", "admin"].includes(userRole)) {
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: "Insufficient permissions to invite users",
    });
  }

  // Generate invitation token and expiry
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const [invitation] = await db
    .insert(tenantInvitations)
    .values({
      tenantId: tenant.id,
      email,
      role,
      invitedBy: user.sub,
      token,
      expiresAt,
    })
    .returning();

  // TODO: Send invitation email

  return c.json(
    {
      message: "Invitation sent successfully",
      invitationId: invitation.id,
      expiresAt: invitation.expiresAt.toISOString(),
    },
    HttpStatusCodes.CREATED,
  );
};

// PATCH /tenants/{tenantId}/users/{userId} - Update user role
export const updateUserRole: AppRouteHandler<routes.UpdateUserRoleRoute> = async (c) => {
  const tenant = getTenant(c);
  const userRole = getUserRole(c);
  const { userId } = c.req.valid("param");
  const { role } = c.req.valid("json");

  // Only owners and admins can update user roles
  if (!["owner", "admin"].includes(userRole)) {
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: "Insufficient permissions to update user roles",
    });
  }

  await db
    .update(tenantUsers)
    .set({ role })
    .where(
      and(
        eq(tenantUsers.tenantId, tenant.id),
        eq(tenantUsers.userId, userId),
      ),
    );

  return c.json({ message: "User role updated successfully" }, HttpStatusCodes.OK);
};

// DELETE /tenants/{tenantId}/users/{userId} - Remove user from tenant
export const removeUser: AppRouteHandler<routes.RemoveUserRoute> = async (c) => {
  const tenant = getTenant(c);
  const userRole = getUserRole(c);
  const { userId } = c.req.valid("param");

  // Only owners and admins can remove users
  if (!["owner", "admin"].includes(userRole)) {
    throw new HTTPException(HttpStatusCodes.FORBIDDEN, {
      message: "Insufficient permissions to remove users",
    });
  }

  await db
    .update(tenantUsers)
    .set({ isActive: false })
    .where(
      and(
        eq(tenantUsers.tenantId, tenant.id),
        eq(tenantUsers.userId, userId),
      ),
    );

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};
