import { relations } from "drizzle-orm";
import { index, pgEnum, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { roleEnum, userTenantStatusEnum } from "./common";
import { tenants } from "./tenants-new";
import { users } from "./users";

// Create enums
export const userTenantStatusEnumPg = pgEnum("user_tenant_status", userTenantStatusEnum);
export const roleEnumPg = pgEnum("role", roleEnum);

// User-Tenant Associations table - defined without spread operators to work with drizzle-zod
export const userTenantAssociations = pgTable("user_tenant_associations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: roleEnumPg("role").notNull().default("member"),
  status: userTenantStatusEnumPg("status").notNull().default("invited"),
  invitedAt: timestamp("invited_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  invitedBy: uuid("invited_by").references(() => users.id),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, table => ({
  // Composite unique constraint
  userTenantUnique: unique("user_tenant_unique").on(table.userId, table.tenantId),
  // Indexes for performance
  userIdIdx: index("user_tenant_user_id_idx").on(table.userId),
  tenantIdIdx: index("user_tenant_tenant_id_idx").on(table.tenantId),
  statusIdx: index("user_tenant_status_idx").on(table.status),
  roleIdx: index("user_tenant_role_idx").on(table.role),
  lastActiveIdx: index("user_tenant_last_active_idx").on(table.lastActiveAt),
  // Composite indexes for common queries
  tenantStatusIdx: index("user_tenant_tenant_status_idx").on(table.tenantId, table.status),
  userStatusIdx: index("user_tenant_user_status_idx").on(table.userId, table.status),
}));

// Relations
export const userTenantAssociationsRelations = relations(userTenantAssociations, ({ one }) => ({
  user: one(users, {
    fields: [userTenantAssociations.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [userTenantAssociations.tenantId],
    references: [tenants.id],
  }),
  inviter: one(users, {
    fields: [userTenantAssociations.invitedBy],
    references: [users.id],
  }),
}));

// Type exports
export type UserTenantAssociation = typeof userTenantAssociations.$inferSelect;
export type NewUserTenantAssociation = typeof userTenantAssociations.$inferInsert;

// Zod schemas using drizzle-zod
export const insertUserTenantAssociationsSchema = createInsertSchema(userTenantAssociations);
export const selectUserTenantAssociationsSchema = createSelectSchema(userTenantAssociations);
export const patchUserTenantAssociationsSchema = insertUserTenantAssociationsSchema.partial();
