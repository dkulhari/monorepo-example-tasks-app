import { boolean, pgTable, serial, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { z } from "zod";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(), // for subdomain/path routing
  domain: varchar("domain", { length: 255 }), // custom domain support
  settings: text("settings"), // JSON settings
  plan: varchar("plan", { length: 50 }).notNull().default("free"), // free, pro, enterprise
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const tenantUsers = pgTable("tenant_users", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull(), // Keycloak user ID
  role: varchar("role", { length: 50 }).notNull().default("member"), // owner, admin, member
  isActive: boolean("is_active").notNull().default(true),
  invitedBy: varchar("invited_by", { length: 255 }), // Keycloak user ID of inviter
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tenantInvitations = pgTable("tenant_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("member"),
  token: varchar("token", { length: 255 }).notNull().unique(),
  invitedBy: varchar("invited_by", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Manual Zod schemas to avoid drizzle-zod compatibility issues
export const selectTenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  domain: z.string().nullable(),
  settings: z.string().nullable(),
  plan: z.string(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertTenantSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100),
  domain: z.string().max(255).optional(),
  settings: z.string().optional(),
  plan: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const patchTenantSchema = insertTenantSchema.partial();

export const selectTenantUserSchema = z.object({
  id: z.number(),
  tenantId: z.string(),
  userId: z.string(),
  role: z.string(),
  isActive: z.boolean(),
  createdAt: z.date(),
});

export const insertTenantUserSchema = z.object({
  tenantId: z.string(),
  userId: z.string(),
  role: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const selectTenantInvitationSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  email: z.string().email(),
  role: z.string(),
  invitedBy: z.string(),
  token: z.string(),
  expiresAt: z.date(),
  createdAt: z.date(),
});

export const insertTenantInvitationSchema = z.object({
  tenantId: z.string(),
  email: z.string().email(),
  role: z.string().optional(),
  invitedBy: z.string(),
  token: z.string(),
  expiresAt: z.date(),
});

// Type exports
export type Tenant = z.infer<typeof selectTenantSchema>;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type PatchTenant = z.infer<typeof patchTenantSchema>;
export type TenantUser = z.infer<typeof selectTenantUserSchema>;
export type InsertTenantUser = z.infer<typeof insertTenantUserSchema>;
export type TenantInvitation = z.infer<typeof selectTenantInvitationSchema>;
export type InsertTenantInvitation = z.infer<typeof insertTenantInvitationSchema>;
