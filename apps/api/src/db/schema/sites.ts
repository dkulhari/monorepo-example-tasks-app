import { relations } from "drizzle-orm";
import { index, json, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { siteStatusEnum } from "./common";
import { tenants } from "./tenants-new";

// Create enum
export const siteStatusEnumPg = pgEnum("site_status", siteStatusEnum);

// Sites table - defined without spread operators to work with drizzle-zod
export const sites = pgTable("sites", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }),
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  status: siteStatusEnumPg("status").notNull().default("active"),
  metadata: json("metadata").$type<{
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    operatingHours?: Array<{
      day: string;
      open: string;
      close: string;
    }>;
    contacts?: Array<{
      name: string;
      role: string;
      email?: string;
      phone?: string;
    }>;
    features?: string[];
    capacity?: number;
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

// Zod schemas using drizzle-zod
export const insertSitesSchema = createInsertSchema(sites);
export const selectSitesSchema = createSelectSchema(sites);
export const patchSitesSchema = insertSitesSchema.partial();
