import { index, json, pgEnum, pgTable, varchar } from "drizzle-orm/pg-core";

import { id, tenantStatusEnum, tenantTypeEnum, timestamps } from "./common";

// Create enums
export const tenantTypeEnumPg = pgEnum("tenant_type", tenantTypeEnum);
export const tenantStatusEnumPg = pgEnum("tenant_status", tenantStatusEnum);

// Tenants table
export const tenants = pgTable("tenants", {
  ...id,
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
  ...timestamps,
}, table => ({
  // Indexes for performance
  slugIdx: index("tenants_slug_idx").on(table.slug),
  statusIdx: index("tenants_status_idx").on(table.status),
  keycloakGroupIdx: index("tenants_keycloak_group_idx").on(table.keycloakGroupId),
}));

// Type exports
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
