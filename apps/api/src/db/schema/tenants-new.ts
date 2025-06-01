import { index, json, pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { tenantStatusEnum, tenantTypeEnum } from "./common";

// Create enums
export const tenantTypeEnumPg = pgEnum("tenant_type", tenantTypeEnum);
export const tenantStatusEnumPg = pgEnum("tenant_status", tenantStatusEnum);

// Tenants table - defined without spread operators to work with drizzle-zod
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  type: tenantTypeEnumPg("type").notNull().default("standard"),
  status: tenantStatusEnumPg("status").notNull().default("active"),
  keycloakGroupId: varchar("keycloak_group_id", { length: 255 }).unique(),
  settings: json("settings").$type<{
    features?: {
      maxUsers?: number;
      maxSites?: number;
      maxDevices?: number;
      enabledModules?: string[];
    };
    branding?: {
      logo?: string;
      primaryColor?: string;
      secondaryColor?: string;
    };
    notifications?: {
      emailEnabled?: boolean;
      smsEnabled?: boolean;
      webhookUrl?: string;
    };
  }>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, table => ({
  // Indexes for performance
  slugIdx: index("tenants_slug_idx").on(table.slug),
  statusIdx: index("tenants_status_idx").on(table.status),
  keycloakGroupIdx: index("tenants_keycloak_group_idx").on(table.keycloakGroupId),
}));

// Type exports
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;

// Zod schemas using drizzle-zod
export const insertTenantsSchema = createInsertSchema(tenants, {
  slug: (schema) => schema.regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
});

export const selectTenantsSchema = createSelectSchema(tenants);

export const patchTenantsSchema = insertTenantsSchema.partial();
