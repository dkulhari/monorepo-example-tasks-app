import { auditLogs } from "./audit-logs";
import { devices } from "./devices";
// Import all relations from the separate relations file
import {
  auditLogsRelations,
  devicesRelations,
  sitesRelations,
  tenantInvitationsRelations,
  tenantsRelations,
  userSiteAssignmentsRelations,
  usersRelations,
  userTenantAssociationsRelations,
} from "./relations";
import { sites } from "./sites";
import { tenantInvitations } from "./tenant-invitations";
// Import tables
import { tenants } from "./tenants-new";
import { userSiteAssignments } from "./user-site-assignments";
import { userTenantAssociations } from "./user-tenant-associations";
import { users } from "./users";

export * from "./audit-logs";
// Re-export all schemas and types
export * from "./common";
export * from "./devices";
export * from "./sites";
export * from "./tenant-invitations";
export * from "./tenants-new";
export * from "./user-site-assignments";
export * from "./user-tenant-associations";
export * from "./users";

// Export all relations
export {
  auditLogsRelations,
  devicesRelations,
  sitesRelations,
  tenantInvitationsRelations,
  tenantsRelations,
  userSiteAssignmentsRelations,
  usersRelations,
  userTenantAssociationsRelations,
};

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
