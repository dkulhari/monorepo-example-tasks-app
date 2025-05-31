// Re-export all schemas and types
export * from "./common";
export * from "./tenants-new";
export * from "./users";
export * from "./user-tenant-associations";
export * from "./sites";
export * from "./user-site-assignments";
export * from "./devices";
export * from "./audit-logs";
export * from "./tenant-invitations";
// Import tables
import { tenants } from "./tenants-new";
import { users } from "./users";
import { userTenantAssociations } from "./user-tenant-associations";
import { sites } from "./sites";
import { userSiteAssignments } from "./user-site-assignments";
import { devices } from "./devices";
import { auditLogs } from "./audit-logs";
import { tenantInvitations } from "./tenant-invitations";
// Import all relations from the separate relations file
import { tenantsRelations, usersRelations, userTenantAssociationsRelations, sitesRelations, userSiteAssignmentsRelations, devicesRelations, auditLogsRelations, tenantInvitationsRelations, } from "./relations";
// Export all relations
export { tenantsRelations, usersRelations, userTenantAssociationsRelations, sitesRelations, userSiteAssignmentsRelations, devicesRelations, auditLogsRelations, tenantInvitationsRelations, };
// Export all tables as a single object for easy access
export const schema = {
    // Tables
    tenants,
    users,
    userTenantAssociations,
    sites,
    userSiteAssignments,
    devices,
    auditLogs,
    tenantInvitations,
    // Relations
    tenantsRelations,
    usersRelations,
    userTenantAssociationsRelations,
    sitesRelations,
    userSiteAssignmentsRelations,
    devicesRelations,
    auditLogsRelations,
    tenantInvitationsRelations,
};
