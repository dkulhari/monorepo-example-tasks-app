import { relations } from "drizzle-orm";
import { index, json, pgEnum, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";

import { id, siteStatusEnum, timestamps } from "./common";
import { tenants } from "./tenants-new";

// Create enum
export const siteStatusEnumPg = pgEnum("site_status", siteStatusEnum);

// Sites table
export const sites = pgTable("sites", {
  ...id,
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  coordinates: json("coordinates").$type<{
    latitude: number;
    longitude: number;
  }>(),
  timezone: varchar("timezone", { length: 50 }).notNull().default("UTC"),
  metadata: json("metadata").$type<{
    type?: string;
    size?: number;
    operatingHours?: {
      monday?: { open: string; close: string };
      tuesday?: { open: string; close: string };
      wednesday?: { open: string; close: string };
      thursday?: { open: string; close: string };
      friday?: { open: string; close: string };
      saturday?: { open: string; close: string };
      sunday?: { open: string; close: string };
    };
    contactInfo?: {
      phone?: string;
      email?: string;
      emergencyContact?: string;
    };
    customFields?: Record<string, any>;
  }>().default({}),
  status: siteStatusEnumPg("status").notNull().default("active"),
  ...timestamps,
}, table => ({
  // Indexes for performance
  tenantIdIdx: index("sites_tenant_id_idx").on(table.tenantId),
  statusIdx: index("sites_status_idx").on(table.status),
  nameIdx: index("sites_name_idx").on(table.name),
  // Composite index for tenant queries
  tenantStatusIdx: index("sites_tenant_status_idx").on(table.tenantId, table.status),
}));

// Relations
export const sitesRelations = relations(sites, ({ one }) => ({
  tenant: one(tenants, {
    fields: [sites.tenantId],
    references: [tenants.id],
  }),
}));

// Type exports
export type Site = typeof sites.$inferSelect;
export type NewSite = typeof sites.$inferInsert;
