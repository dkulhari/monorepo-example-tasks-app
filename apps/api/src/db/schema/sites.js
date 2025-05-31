import { pgTable, uuid, varchar, text, pgEnum, json, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { id, timestamps, siteStatusEnum } from "./common";
import { tenants } from "./tenants-new";
// Create enum
export const siteStatusEnumPg = pgEnum("site_status", siteStatusEnum);
// Sites table
export const sites = pgTable("sites", {
    ...id,
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    address: text("address"),
    coordinates: json("coordinates").$type(),
    timezone: varchar("timezone", { length: 50 }).notNull().default("UTC"),
    metadata: json("metadata").$type().default({}),
    status: siteStatusEnumPg("status").notNull().default("active"),
    ...timestamps,
}, (table) => ({
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
