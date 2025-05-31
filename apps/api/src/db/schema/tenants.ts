import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod";

import { users } from "./users";

// Tenant type and status enums
export const tenantTypeEnum = pgEnum("tenant_type", [
  "enterprise",
  "standard",
  "starter",
  "trial",
]);

export const tenantStatusEnum = pgEnum("tenant_status", [
  "active",
  "suspended",
  "archived",
  "pending",
]);

export const userTenantRoleEnum = pgEnum("user_tenant_role", [
  "owner",
  "admin",
  "member",
  "viewer",
]);

export const userTenantStatusEnum = pgEnum("user_tenant_status", [
  "active",
  "invited",
  "suspended",
]);

// Enhanced tenants table
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  type: tenantTypeEnum("type").notNull().default("starter"),
  status: tenantStatusEnum("status").notNull().default("active"),
  keycloakGroupId: varchar("keycloak_group_id", { length: 255 }),
  settings: jsonb("settings"), // JSON settings for tenant configuration
  domain: varchar("domain", { length: 255 }), // custom domain support
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, table => [
  index("tenants_slug_idx").on(table.slug),
  index("tenants_type_idx").on(table.type),
  index("tenants_status_idx").on(table.status),
  index("tenants_keycloak_group_id_idx").on(table.keycloakGroupId),
]);

// Enhanced user tenant associations
export const userTenantAssociations = pgTable("user_tenant_associations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  role: userTenantRoleEnum("role").notNull().default("member"),
  status: userTenantStatusEnum("status").notNull().default("active"),
  invitedAt: timestamp("invited_at"),
  acceptedAt: timestamp("accepted_at"),
  invitedBy: uuid("invited_by").references(() => users.id),
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, table => [
  unique("unique_user_tenant").on(table.userId, table.tenantId),
  index("user_tenant_associations_user_id_idx").on(table.userId),
  index("user_tenant_associations_tenant_id_idx").on(table.tenantId),
  index("user_tenant_associations_role_idx").on(table.role),
  index("user_tenant_associations_status_idx").on(table.status),
  index("user_tenant_associations_invited_by_idx").on(table.invitedBy),
]);

// Enhanced tenant invitations
export const tenantInvitations = pgTable("tenant_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  role: userTenantRoleEnum("role").notNull().default("member"),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  accepted: boolean("accepted").notNull().default(false),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, table => [
  index("tenant_invitations_email_idx").on(table.email),
  index("tenant_invitations_tenant_id_idx").on(table.tenantId),
  index("tenant_invitations_token_idx").on(table.token),
  index("tenant_invitations_created_by_idx").on(table.createdBy),
  index("tenant_invitations_expires_at_idx").on(table.expiresAt),
]);

// Zod schemas
export const selectTenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  type: z.enum(["enterprise", "standard", "starter", "trial"]),
  status: z.enum(["active", "suspended", "archived", "pending"]),
  keycloakGroupId: z.string().nullable(),
  settings: z.record(z.any()).nullable(),
  domain: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertTenantSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100),
  type: z.enum(["enterprise", "standard", "starter", "trial"]).optional(),
  status: z.enum(["active", "suspended", "archived", "pending"]).optional(),
  keycloakGroupId: z.string().max(255).optional(),
  settings: z.record(z.any()).optional(),
  domain: z.string().max(255).optional(),
  isActive: z.boolean().optional(),
});

export const patchTenantSchema = insertTenantSchema.partial();

export const selectUserTenantAssociationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tenantId: z.string(),
  role: z.enum(["owner", "admin", "member", "viewer"]),
  status: z.enum(["active", "invited", "suspended"]),
  invitedAt: z.date().nullable(),
  acceptedAt: z.date().nullable(),
  invitedBy: z.string().nullable(),
  lastActiveAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertUserTenantAssociationSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  role: z.enum(["owner", "admin", "member", "viewer"]).optional(),
  status: z.enum(["active", "invited", "suspended"]).optional(),
  invitedBy: z.string().uuid().optional(),
});

export const selectTenantInvitationSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  tenantId: z.string(),
  role: z.enum(["owner", "admin", "member", "viewer"]),
  token: z.string(),
  expiresAt: z.date(),
  createdBy: z.string(),
  accepted: z.boolean(),
  acceptedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertTenantInvitationSchema = z.object({
  email: z.string().email().max(255),
  tenantId: z.string().uuid(),
  role: z.enum(["owner", "admin", "member", "viewer"]).optional(),
  token: z.string().max(255),
  expiresAt: z.date(),
  createdBy: z.string().uuid(),
});

// Type exports
export type Tenant = z.infer<typeof selectTenantSchema>;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type PatchTenant = z.infer<typeof patchTenantSchema>;
export type TenantType = Tenant["type"];
export type TenantStatus = Tenant["status"];

export type UserTenantAssociation = z.infer<typeof selectUserTenantAssociationSchema>;
export type InsertUserTenantAssociation = z.infer<typeof insertUserTenantAssociationSchema>;
export type UserTenantRole = UserTenantAssociation["role"];
export type UserTenantStatus = UserTenantAssociation["status"];

export type TenantInvitation = z.infer<typeof selectTenantInvitationSchema>;
export type InsertTenantInvitation = z.infer<typeof insertTenantInvitationSchema>;
