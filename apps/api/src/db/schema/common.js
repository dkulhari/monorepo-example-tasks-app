import { uuid, timestamp } from "drizzle-orm/pg-core";
// Common timestamp columns
export const timestamps = {
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
};
// Common ID column
export const id = {
    id: uuid("id")
        .primaryKey()
        .defaultRandom(),
};
// Status enums
export const tenantStatusEnum = ["active", "suspended", "inactive"];
export const userStatusEnum = ["active", "invited", "suspended", "deleted"];
export const userTenantStatusEnum = ["active", "invited", "suspended"];
export const siteStatusEnum = ["active", "inactive", "maintenance"];
export const deviceStatusEnum = ["active", "inactive", "maintenance", "offline"];
// User type enum
export const userTypeEnum = ["system_admin", "regular", "service_account", "guest"];
// Tenant type enum
export const tenantTypeEnum = ["enterprise", "standard", "trial", "demo"];
// Role enum
export const roleEnum = ["owner", "admin", "member", "viewer"];
// Audit action enum
export const auditActionEnum = [
    "create",
    "update",
    "delete",
    "login",
    "logout",
    "invite",
    "accept_invite",
    "reject_invite",
    "suspend",
    "activate",
    "deactivate",
    "assign_role",
    "revoke_role",
    "export_data",
    "import_data",
];
// Resource type enum
export const resourceTypeEnum = [
    "tenant",
    "user",
    "site",
    "device",
    "invitation",
    "role",
    "settings",
];
