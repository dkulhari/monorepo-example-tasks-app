import { pgTable, uuid, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { sites } from "./sites";
import { tenants } from "./tenants-new";
// User-Site Assignments table (many-to-many)
export const userSiteAssignments = pgTable("user_site_assignments", {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    assignedBy: uuid("assigned_by").notNull().references(() => users.id),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    // Composite primary key
    pk: primaryKey({ columns: [table.userId, table.siteId] }),
    // Indexes for performance
    userIdIdx: index("user_site_user_id_idx").on(table.userId),
    siteIdIdx: index("user_site_site_id_idx").on(table.siteId),
    tenantIdIdx: index("user_site_tenant_id_idx").on(table.tenantId),
    // Composite indexes for common queries
    userTenantIdx: index("user_site_user_tenant_idx").on(table.userId, table.tenantId),
    siteTenantIdx: index("user_site_site_tenant_idx").on(table.siteId, table.tenantId),
}));
// Relations
export const userSiteAssignmentsRelations = relations(userSiteAssignments, ({ one }) => ({
    user: one(users, {
        fields: [userSiteAssignments.userId],
        references: [users.id],
    }),
    site: one(sites, {
        fields: [userSiteAssignments.siteId],
        references: [sites.id],
    }),
    tenant: one(tenants, {
        fields: [userSiteAssignments.tenantId],
        references: [tenants.id],
    }),
    assignedByUser: one(users, {
        fields: [userSiteAssignments.assignedBy],
        references: [users.id],
    }),
}));
