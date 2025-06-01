import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

import type { AppRouteHandler } from "../../lib/types";

import * as routes from "./users.routes";

import { db } from "../../db";
import { users } from "../../db/schema";
import { requireUser } from "../../middleware/keycloak";

// Helper to check if user is system admin
// function isSystemAdmin(user: any) {
//   // Check if user has system_admin user type
//   return user.userType === "system_admin";
// }

// GET /users - List all users (system admin only)
export const list: AppRouteHandler<typeof routes.list> = async (c) => {
  requireUser(c);

  // TODO: Implement proper system admin check
  // For now, we'll return forbidden
  return c.json(
    { message: "System admin access required" },
    HttpStatusCodes.FORBIDDEN,
  );
};

// POST /users - Create a new user (system admin only)
export const create: AppRouteHandler<typeof routes.create> = async (c) => {
  requireUser(c);
  // const userData = c.req.valid("json");

  // TODO: Implement proper system admin check
  // For now, we'll return forbidden
  return c.json(
    { message: "System admin access required" },
    HttpStatusCodes.FORBIDDEN,
  );
};

// GET /users/{id} - Get user details
export const getOne: AppRouteHandler<typeof routes.getOne> = async (c) => {
  const currentUser = requireUser(c);
  const { id } = c.req.valid("param");

  // Users can view their own profile, system admins can view any
  if (currentUser.sub !== id) {
    // TODO: Check if current user is system admin
    return c.json(
      { message: "Access denied" },
      HttpStatusCodes.FORBIDDEN,
    );
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, id) as any,
  });

  if (!user) {
    return c.json(
      { message: HttpStatusPhrases.NOT_FOUND },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.json(user);
};

// PATCH /users/{id} - Update user
export const patch: AppRouteHandler<typeof routes.patch> = async (c) => {
  const currentUser = requireUser(c);
  const { id } = c.req.valid("param");
  const updates = c.req.valid("json");

  // Users can update their own profile (limited fields), system admins can update any
  if (currentUser.sub !== id) {
    // TODO: Check if current user is system admin
    return c.json(
      { message: "Access denied" },
      HttpStatusCodes.FORBIDDEN,
    );
  }

  // Regular users can only update certain fields
  const allowedUpdates = currentUser.sub === id
    ? { name: updates.name, metadata: updates.metadata }
    : updates;

  if (Object.keys(allowedUpdates).length === 0) {
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

  const [updatedUser] = await db
    .update(users)
    .set({
      ...allowedUpdates,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id) as any)
    .returning();

  if (!updatedUser) {
    return c.json(
      { message: HttpStatusPhrases.NOT_FOUND },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.json(updatedUser);
};

// DELETE /users/{id} - Delete user (system admin only)
export const remove: AppRouteHandler<typeof routes.remove> = async (c) => {
  requireUser(c);

  // TODO: Implement proper system admin check
  // For now, we'll return forbidden
  return c.json(
    { message: "System admin access required" },
    HttpStatusCodes.FORBIDDEN,
  );
};

// GET /users/me - Get current user
export const me: AppRouteHandler<typeof routes.me> = async (c) => {
  const currentUser = requireUser(c);

  // Get user from database using Keycloak ID
  const user = await db.query.users.findFirst({
    where: eq(users.keycloakId, currentUser.sub) as any,
  });

  if (!user) {
    // Create user if doesn't exist (first login)
    const [newUser] = await db
      .insert(users)
      .values({
        keycloakId: currentUser.sub,
        email: currentUser.email || "",
        name: currentUser.name || currentUser.preferred_username || "Unknown",
        userType: "regular",
        metadata: {},
      })
      .returning();

    return c.json(newUser);
  }

  return c.json(user);
};
