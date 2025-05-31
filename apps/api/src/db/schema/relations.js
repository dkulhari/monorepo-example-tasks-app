import { relations } from "drizzle-orm";
import { auditLogs } from "./audit-logs";
import { devices } from "./devices";
import { sites } from "./sites";
import { tenantInvitations } from "./tenant-invitations";
import { tenants } from "./tenants-new";
import { userSiteAssignments } from "./user-site-assignments";
import { userTenantAssociations } from "./user-tenant-associations";
import { users } from "./users";
// Tenant Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
    userAssociations: many(userTenantAssociations),
    sites: many(sites),
    auditLogs: many(auditLogs),
    invitations: many(tenantInvitations),
}));
// User Relations
export const usersRelations = relations(users, ({ many, one }) => ({
    tenantAssociations: many(userTenantAssociations),
    siteAssignments: many(userSiteAssignments),
    createdUsers: many(users, { relationName: "createdUsers" }),
    creator: one(users, {
        fields: [users.createdBy],
        references: [users.id],
        relationName: "createdUsers",
    }),
    auditLogs: many(auditLogs),
    createdInvitations: many(tenantInvitations),
}));
// User-Tenant Association Relations
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
// Site Relations
export const sitesRelations = relations(sites, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [sites.tenantId],
        references: [tenants.id],
    }),
    userAssignments: many(userSiteAssignments),
    devices: many(devices),
}));
// User-Site Assignment Relations
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
// Device Relations
export const devicesRelations = relations(devices, ({ one }) => ({
    site: one(sites, {
        fields: [devices.siteId],
        references: [sites.id],
    }),
}));
// Audit Log Relations
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
    tenant: one(tenants, {
        fields: [auditLogs.tenantId],
        references: [tenants.id],
    }),
    user: one(users, {
        fields: [auditLogs.userId],
        references: [users.id],
    }),
}));
// Tenant Invitation Relations
export const tenantInvitationsRelations = relations(tenantInvitations, ({ one }) => ({
    tenant: one(tenants, {
        fields: [tenantInvitations.tenantId],
        references: [tenants.id],
    }),
    createdByUser: one(users, {
        fields: [tenantInvitations.createdBy],
        references: [users.id],
    }),
}));
