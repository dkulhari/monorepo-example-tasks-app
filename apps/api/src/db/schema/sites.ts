import {
  boolean,
  doublePrecision,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod";

import { tenants } from "./tenants";
import { users } from "./users";

// Site status enum
export const siteStatusEnum = pgEnum("site_status", [
  "active",
  "inactive",
  "maintenance",
  "decommissioned",
]);

// Sites table
export const sites = pgTable("sites", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  timezone: varchar("timezone", { length: 100 }).notNull().default("UTC"),
  metadata: jsonb("metadata"), // Store additional site metadata
  status: siteStatusEnum("status").notNull().default("active"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, table => [
  index("sites_tenant_id_idx").on(table.tenantId),
  index("sites_name_idx").on(table.name),
  index("sites_status_idx").on(table.status),
  index("sites_location_idx").on(table.latitude, table.longitude),
]);

// User site assignments table
export const userSiteAssignments = pgTable("user_site_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  assignedBy: uuid("assigned_by").notNull().references(() => users.id),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, table => [
  unique("unique_user_site").on(table.userId, table.siteId),
  index("user_site_assignments_user_id_idx").on(table.userId),
  index("user_site_assignments_site_id_idx").on(table.siteId),
  index("user_site_assignments_tenant_id_idx").on(table.tenantId),
  index("user_site_assignments_assigned_by_idx").on(table.assignedBy),
]);

// Zod schemas
export const selectSiteSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  address: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  timezone: z.string(),
  metadata: z.record(z.any()).nullable(),
  status: z.enum(["active", "inactive", "maintenance", "decommissioned"]),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertSiteSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(255),
  address: z.string().min(1),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  timezone: z.string().max(100).optional(),
  metadata: z.record(z.any()).optional(),
  status: z.enum(["active", "inactive", "maintenance", "decommissioned"]).optional(),
  isActive: z.boolean().optional(),
});

export const patchSiteSchema = insertSiteSchema.partial();

export const selectUserSiteAssignmentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  siteId: z.string(),
  tenantId: z.string(),
  assignedBy: z.string(),
  assignedAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertUserSiteAssignmentSchema = z.object({
  userId: z.string().uuid(),
  siteId: z.string().uuid(),
  tenantId: z.string().uuid(),
  assignedBy: z.string().uuid(),
});

// Type exports
export type Site = z.infer<typeof selectSiteSchema>;
export type InsertSite = z.infer<typeof insertSiteSchema>;
export type PatchSite = z.infer<typeof patchSiteSchema>;
export type SiteStatus = Site["status"];

export type UserSiteAssignment = z.infer<typeof selectUserSiteAssignmentSchema>;
export type InsertUserSiteAssignment = z.infer<typeof insertUserSiteAssignmentSchema>;
