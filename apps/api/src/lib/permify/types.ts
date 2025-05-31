// Permify types and interfaces for the multi-tenant system

export type PermifyConfig = {
  endpoint: string;
  apiKey?: string;
};

// Entity types
export type EntityType = "user" | "system" | "tenant" | "site" | "device" | "resource" | "role";

// Relation types
export type SystemRelation = "admin";
export type TenantRelation = "system" | "owner" | "admin" | "member";
export type SiteRelation = "parent" | "manager" | "operator";
export type DeviceRelation = "site";
export type ResourceRelation = "owner" | "viewer";
export type RoleRelation = "tenant" | "assignee" | "permissions";

// Action types
export type SystemAction = "create_tenant" | "manage_users" | "view_all_data";
export type TenantAction = "create" | "delete" | "update" | "view" | "manage_users" | "manage_sites" | "manage_billing" | "invite_users" | "remove_users" | "change_settings";
export type SiteAction = "create" | "delete" | "update" | "view" | "manage_devices" | "operate_devices" | "view_reports" | "configure_alerts";
export type DeviceAction = "create" | "delete" | "update" | "view" | "control" | "read_data" | "configure" | "maintenance";
export type ResourceAction = "create" | "delete" | "update" | "view";
export type RoleAction = "create" | "delete" | "update" | "assign";

// User types
export enum UserType {
  SYSTEM_ADMIN = "system_admin",
  TENANT_ADMIN = "tenant_admin",
  REGULAR_USER = "regular_user",
  SERVICE_ACCOUNT = "service_account",
  GUEST_USER = "guest_user",
}

export enum UserStatus {
  ACTIVE = "active",
  INVITED = "invited",
  SUSPENDED = "suspended",
  DELETED = "deleted",
}

// Permission check interfaces
export type PermissionCheckRequest = {
  userId: string;
  action: string;
  entityType: EntityType;
  entityId: string;
};

export type PermissionCheckResponse = {
  allowed: boolean;
  checkTime: number;
};

// Relationship interfaces
export type RelationshipTuple = {
  entity: {
    type: EntityType;
    id: string;
  };
  relation: string;
  subject: {
    type: EntityType;
    id: string;
    relation?: string;
  };
};

// Batch operations
export type BatchCheckRequest = {
  checks: PermissionCheckRequest[];
};

export type BatchCheckResponse = {
  results: Map<string, PermissionCheckResponse>;
};

// Cache types
export type CacheOptions = {
  ttl: number; // Time to live in seconds
  maxSize: number; // Maximum number of entries
};

export type CachedPermission = {
  allowed: boolean;
  timestamp: number;
  ttl: number;
};

// Error types
export class PermifyError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "PermifyError";
  }
}

export class PermissionDeniedError extends PermifyError {
  constructor(action: string, resource: string) {
    super(
      `Permission denied: Cannot perform action '${action}' on resource '${resource}'`,
      "PERMISSION_DENIED",
      403,
    );
  }
}

export class SchemaNotFoundError extends PermifyError {
  constructor() {
    super("Permify schema not found or not initialized", "SCHEMA_NOT_FOUND", 500);
  }
}

// Helper type for entity-action mapping
export type EntityActionMap = {
  system: SystemAction;
  tenant: TenantAction;
  site: SiteAction;
  device: DeviceAction;
  resource: ResourceAction;
  role: RoleAction;
};

// Type-safe action helper
export type ActionForEntity<T extends EntityType> = T extends keyof EntityActionMap
  ? EntityActionMap[T]
  : never;
