import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import crypto from "node:crypto";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { db } from "../../db";
import { tenantInvitations, tenants, userTenantAssociations } from "../../db/schema";
import { requireUser } from "../../middleware/keycloak";
import { getTenant, getUserRole } from "../../middleware/tenant";
// GET /tenants - List user's tenants
export const list = async (c) => {
    const user = requireUser(c);
    // Get all tenants where user is a member
    const userTenants = await db
        .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        keycloakGroupId: tenants.keycloakGroupId,
        settings: tenants.settings,
        type: tenants.type,
        status: tenants.status,
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt,
        userRole: userTenantAssociations.role,
    })
        .from(tenants)
        .innerJoin(userTenantAssociations, eq(tenants.id, userTenantAssociations.tenantId))
        .where(and(eq(userTenantAssociations.userId, user.sub), eq(userTenantAssociations.status, "active"), eq(tenants.status, "active")));
    return c.json(userTenants, HttpStatusCodes.OK);
};
// POST /tenants - Create new tenant
export const create = async (c) => {
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
    await db.insert(userTenantAssociations).values({
        tenantId: newTenant.id,
        userId: user.sub,
        role: "owner",
    });
    return c.json(newTenant, HttpStatusCodes.CREATED);
};
// GET /tenants/{id} - Get tenant details
export const getOne = async (c) => {
    const tenant = getTenant(c);
    return c.json(tenant, HttpStatusCodes.OK);
};
// PATCH /tenants/{id} - Update tenant
export const patch = async (c) => {
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
export const remove = async (c) => {
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
export const listUsers = async (c) => {
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
        id: userTenantAssociations.id,
        tenantId: userTenantAssociations.tenantId,
        userId: userTenantAssociations.userId,
        role: userTenantAssociations.role,
        status: userTenantAssociations.status,
        invitedAt: userTenantAssociations.invitedAt,
        acceptedAt: userTenantAssociations.acceptedAt,
        invitedBy: userTenantAssociations.invitedBy,
        lastActiveAt: userTenantAssociations.lastActiveAt,
        createdAt: userTenantAssociations.createdAt,
        updatedAt: userTenantAssociations.updatedAt,
    })
        .from(userTenantAssociations)
        .where(and(eq(userTenantAssociations.tenantId, tenant.id), eq(userTenantAssociations.status, "active")));
    // Return the users data that matches the selectTenantUserSchema
    return c.json(users, HttpStatusCodes.OK);
};
// POST /tenants/{id}/invite - Invite user to tenant
export const inviteUser = async (c) => {
    const tenant = getTenant(c);
    const userRole = getUserRole(c);
    const user = requireUser(c);
    const body = c.req.valid("json");
    const { email, role = "member" } = body;
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
        createdBy: user.sub,
        token,
        expiresAt,
    })
        .returning();
    // TODO: Send invitation email
    return c.json({
        message: "Invitation sent successfully",
        invitationId: invitation.id,
        expiresAt: invitation.expiresAt.toISOString(),
    }, HttpStatusCodes.CREATED);
};
// PATCH /tenants/{tenantId}/users/{userId} - Update user role
export const updateUserRole = async (c) => {
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
        .update(userTenantAssociations)
        .set({ role })
        .where(and(eq(userTenantAssociations.tenantId, tenant.id), eq(userTenantAssociations.userId, userId)));
    return c.json({ message: "User role updated successfully" }, HttpStatusCodes.OK);
};
// DELETE /tenants/{tenantId}/users/{userId} - Remove user from tenant
export const removeUser = async (c) => {
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
        .update(userTenantAssociations)
        .set({ status: "suspended" })
        .where(and(eq(userTenantAssociations.tenantId, tenant.id), eq(userTenantAssociations.userId, userId)));
    return c.body(null, HttpStatusCodes.NO_CONTENT);
};
