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
export const tenantStatusEnum = ["active", "suspended", "inactive"] as const;
export const userStatusEnum = ["active", "invited", "suspended", "deleted"] as const;
export const userTenantStatusEnum = ["active", "invited", "suspended"] as const;
export const siteStatusEnum = ["active", "inactive", "maintenance"] as const;
export const deviceStatusEnum = ["active", "inactive", "maintenance", "offline"] as const;

// User type enum
export const userTypeEnum = ["system_admin", "regular", "service_account", "guest"] as const;

// Tenant type enum
export const tenantTypeEnum = ["enterprise", "standard", "trial", "demo"] as const;

// Role enum
export const roleEnum = ["owner", "admin", "member", "viewer"] as const;

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
] as const;

// Resource type enum
export const resourceTypeEnum = [
  "tenant",
  "user",
  "site",
  "device",
  "invitation",
  "role",
  "settings",
] as const;

// Type exports
export type TenantStatus = typeof tenantStatusEnum[number];
export type UserStatus = typeof userStatusEnum[number];
export type UserTenantStatus = typeof userTenantStatusEnum[number];
export type SiteStatus = typeof siteStatusEnum[number];
export type DeviceStatus = typeof deviceStatusEnum[number];
export type UserType = typeof userTypeEnum[number];
export type TenantType = typeof tenantTypeEnum[number];
export type Role = typeof roleEnum[number];
export type AuditAction = typeof auditActionEnum[number];
export type ResourceType = typeof resourceTypeEnum[number];