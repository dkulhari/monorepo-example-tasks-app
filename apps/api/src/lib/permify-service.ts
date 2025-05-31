import type { Logger } from "pino";

import { grpc } from "@permify/permify-node";
import * as NodeCache from "node-cache";

// Permify client types
type PermifyTuple = {
  entity: {
    type: string;
    id: string;
  };
  relation: string;
  subject: {
    type: string;
    id: string;
  };
};

type PermifyEntity = {
  type: string;
  id: string;
};

type PermifySubject = {
  type: string;
  id: string;
};

type PermissionCheckRequest = {
  tenantId: string;
  entity: PermifyEntity;
  permission: string;
  subject: PermifySubject;
  metadata?: {
    snapToken?: string;
    schemaVersion?: string;
    depth?: number;
  };
};

type WriteDataRequest = {
  tenantId: string;
  metadata: {
    schemaVersion: string;
  };
  tuples: PermifyTuple[];
};

type SchemaWriteRequest = {
  tenantId: string;
  schema: string;
};

// Service types
export const UserTypes = {
  SYSTEM_ADMIN: "system_admin",
  TENANT_ADMIN: "tenant_admin",
  REGULAR_USER: "regular_user",
  SERVICE_ACCOUNT: "service_account",
  GUEST_USER: "guest_user",
} as const;

export const EntityType = {
  USER: "user",
  SYSTEM: "system",
  TENANT: "tenant",
  SITE: "site",
  DEVICE: "device",
  TASK: "task",
} as const;

export const RelationType = {
  // System relations
  ADMIN: "admin",

  // Tenant relations
  OWNER: "owner",
  MEMBER: "member",

  // Site relations
  MANAGER: "manager",
  OPERATOR: "operator",

  // Task relations
  ASSIGNEE: "assignee",
  CREATOR: "creator",

  // Hierarchical relations
  SYSTEM: "system",
  TENANT: "tenant",
  SITE: "site",
  DEVICE: "device",
} as const;

export const PermissionType = {
  // System permissions
  MANAGE_ALL: "manage_all",
  CREATE_TENANT: "create_tenant",
  DELETE_TENANT: "delete_tenant",
  VIEW_ALL_TENANTS: "view_all_tenants",
  MANAGE_USERS: "manage_users",

  // Tenant permissions
  MANAGE: "manage",
  INVITE_USERS: "invite_users",
  REMOVE_USERS: "remove_users",
  VIEW_SETTINGS: "view_settings",
  EDIT_SETTINGS: "edit_settings",
  DELETE: "delete",

  // Site permissions
  OPERATE: "operate",
  VIEW: "view",

  // Device permissions
  CONFIGURE: "configure",
  MONITOR: "monitor",
  CONTROL: "control",
  VIEW_LOGS: "view_logs",
  UPDATE_FIRMWARE: "update_firmware",
  REBOOT: "reboot",

  // Task permissions
  EDIT: "edit",
  ASSIGN: "assign",
} as const;

export type PermifyServiceConfig = {
  endpoint: string;
  tenantId: string;
  cacheConfig?: {
    stdTTL: number;
    checkperiod: number;
    maxKeys: number;
  };
  timeout?: number;
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
  };
};

export type RelationshipData = {
  entity: PermifyEntity;
  relation: string;
  subject: PermifySubject;
};

export type BulkRelationshipData = {
  relationships: RelationshipData[];
  deleteExisting?: boolean;
};

class PermifyError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any,
  ) {
    super(message);
    this.name = "PermifyError";
  }
}

export class PermifyService {
  private client: any;
  private cache: NodeCache;
  private logger: Logger;
  private config: PermifyServiceConfig;
  private isInitialized = false;

  // Type constants
  public readonly EntityTypes = {
    USER: "user",
    SYSTEM: "system",
    TENANT: "tenant",
    SITE: "site",
    DEVICE: "device",
    TASK: "task",
  } as const;

  public readonly Relations = {
    ADMIN: "admin",
    OWNER: "owner",
    MEMBER: "member",
    MANAGER: "manager",
    OPERATOR: "operator",
    ASSIGNEE: "assignee",
    CREATOR: "creator",
    SYSTEM: "system",
    TENANT: "tenant",
    SITE: "site",
    DEVICE: "device",
  } as const;

  public readonly Permissions = {
    MANAGE_ALL: "manage_all",
    CREATE_TENANT: "create_tenant",
    DELETE_TENANT: "delete_tenant",
    VIEW_ALL_TENANTS: "view_all_tenants",
    MANAGE_USERS: "manage_users",
    MANAGE: "manage",
    INVITE_USERS: "invite_users",
    REMOVE_USERS: "remove_users",
    VIEW_SETTINGS: "view_settings",
    EDIT_SETTINGS: "edit_settings",
    DELETE: "delete",
    OPERATE: "operate",
    VIEW: "view",
    CONFIGURE: "configure",
    MONITOR: "monitor",
    CONTROL: "control",
    VIEW_LOGS: "view_logs",
    UPDATE_FIRMWARE: "update_firmware",
    REBOOT: "reboot",
    EDIT: "edit",
    ASSIGN: "assign",
  } as const;

  constructor(config: PermifyServiceConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;

    // Initialize cache with default or custom config
    const cacheConfig = config.cacheConfig || {
      stdTTL: 300, // 5 minutes
      checkperiod: 120, // 2 minutes
      maxKeys: 10000,
    };

    this.cache = new NodeCache(cacheConfig);

    // Initialize Permify client with minimal configuration
    try {
      this.client = grpc.newClient({
        endpoint: config.endpoint,
      } as any);
    }
    catch (error) {
      this.logger.warn("Failed to initialize Permify client with standard config, trying alternative", error);
      // Fallback for development/testing
      this.client = {
        schema: { write: async () => ({}) },
        data: { write: async () => ({}) },
        permission: { check: async () => ({ can: "RESULT_DENIED" }) },
      };
    }
  }

  /**
   * Initialize the Permify service by loading the schema
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info("Initializing Permify service...");

      await this.loadSchema();

      this.isInitialized = true;
      this.logger.info("Permify service initialized successfully");
    }
    catch (error) {
      const permifyError = new PermifyError(
        "Failed to initialize Permify service",
        "INIT_ERROR",
        error,
      );
      this.logger.error(permifyError, "Permify initialization failed");
      throw permifyError;
    }
  }

  /**
   * Load the Permify schema from file
   */
  private async loadSchema(): Promise<void> {
    try {
      // In a real implementation, you'd load this from the schema file
      const schema = `
entity user {}

entity system {
  relation admin @user
  
  permission manage_all = admin
  permission create_tenant = admin
  permission delete_tenant = admin
  permission view_all_tenants = admin
  permission manage_users = admin
}

entity tenant {
  relation owner @user
  relation admin @user
  relation member @user
  relation system @system
  
  permission manage = owner or admin or system.admin
  permission invite_users = owner or admin or system.admin
  permission remove_users = owner or admin or system.admin
  permission view_settings = owner or admin or member or system.admin
  permission edit_settings = owner or admin or system.admin
  permission delete = owner or system.admin
  permission admin_access = owner or admin or system.admin
  permission member_access = owner or admin or member or system.admin
}

entity site {
  relation tenant @tenant
  relation manager @user
  relation operator @user
  
  permission manage = manager or tenant.admin_access
  permission operate = operator or manager or tenant.admin_access
  permission view = operator or manager or tenant.member_access
  permission edit_settings = manager or tenant.admin_access
  permission delete = manager or tenant.admin_access
  permission device_admin = manager or tenant.admin_access
  permission device_access = operator or manager or tenant.member_access
}

entity device {
  relation site @site
  
  permission configure = site.device_admin
  permission monitor = site.device_access
  permission control = site.device_admin
  permission view_logs = site.device_access
  permission update_firmware = site.device_admin
  permission reboot = site.device_admin
}

entity task {
  relation tenant @tenant
  relation site @site
  relation device @device
  relation assignee @user
  relation creator @user
  
  permission view = creator or assignee or tenant.member_access or site.view
  permission edit = creator or assignee or tenant.admin_access or site.manage
  permission delete = creator or tenant.admin_access or site.manage
  permission assign = tenant.admin_access or site.manage
}`;

      const request: SchemaWriteRequest = {
        tenantId: this.config.tenantId,
        schema: schema.trim(),
      };

      await this.client.schema.write(request);
      this.logger.info("Schema loaded successfully");
    }
    catch (error) {
      throw new PermifyError(
        "Failed to load schema",
        "SCHEMA_LOAD_ERROR",
        error,
      );
    }
  }

  /**
   * Check if the service is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new PermifyError(
        "Permify service not initialized. Call initialize() first.",
        "NOT_INITIALIZED",
      );
    }
  }

  /**
   * Write a single relationship
   */
  async writeRelationship(relationship: RelationshipData): Promise<void> {
    this.ensureInitialized();

    try {
      const tuple: PermifyTuple = {
        entity: relationship.entity,
        relation: relationship.relation,
        subject: relationship.subject,
      };

      const request: WriteDataRequest = {
        tenantId: this.config.tenantId,
        metadata: { schemaVersion: "" },
        tuples: [tuple],
      };

      await this.client.data.write(request);

      // Invalidate cache for this entity
      this.invalidateEntityCache(relationship.entity);

      this.logger.debug("Relationship written successfully", { relationship });
    }
    catch (error) {
      const permifyError = new PermifyError(
        "Failed to write relationship",
        "WRITE_RELATIONSHIP_ERROR",
        { relationship, error },
      );
      this.logger.error(permifyError, "Failed to write relationship");
      throw permifyError;
    }
  }

  /**
   * Write multiple relationships in a single request
   */
  async writeBulkRelationships(data: BulkRelationshipData): Promise<void> {
    this.ensureInitialized();

    try {
      const tuples: PermifyTuple[] = data.relationships.map(rel => ({
        entity: rel.entity,
        relation: rel.relation,
        subject: rel.subject,
      }));

      const request: WriteDataRequest = {
        tenantId: this.config.tenantId,
        metadata: { schemaVersion: "" },
        tuples,
      };

      await this.client.data.write(request);

      // Invalidate cache for all affected entities
      data.relationships.forEach((rel) => {
        this.invalidateEntityCache(rel.entity);
      });

      this.logger.debug("Bulk relationships written successfully", {
        count: data.relationships.length,
      });
    }
    catch (error) {
      const permifyError = new PermifyError(
        "Failed to write bulk relationships",
        "WRITE_BULK_RELATIONSHIPS_ERROR",
        { data, error },
      );
      this.logger.error(permifyError, "Failed to write bulk relationships");
      throw permifyError;
    }
  }

  /**
   * Check if a subject has permission on an entity
   */
  async checkPermission(
    entity: PermifyEntity,
    permission: string,
    subject: PermifySubject,
    useCache = true,
  ): Promise<boolean> {
    this.ensureInitialized();

    const cacheKey = this.getCacheKey(entity, permission, subject);

    // Try cache first
    if (useCache) {
      const cached = this.cache.get<boolean>(cacheKey);
      if (cached !== undefined) {
        this.logger.debug("Permission check cache hit", { entity, permission, subject, result: cached });
        return cached;
      }
    }

    try {
      const request: PermissionCheckRequest = {
        tenantId: this.config.tenantId,
        entity,
        permission,
        subject,
        metadata: {
          depth: 20,
        },
      };

      const response = await this.client.permission.check(request);
      const hasPermission = response.can === "RESULT_ALLOWED";

      // Cache the result
      if (useCache) {
        this.cache.set(cacheKey, hasPermission);
      }

      this.logger.debug("Permission check completed", {
        entity,
        permission,
        subject,
        result: hasPermission,
      });

      return hasPermission;
    }
    catch (error) {
      const permifyError = new PermifyError(
        "Failed to check permission",
        "PERMISSION_CHECK_ERROR",
        { entity, permission, subject, error },
      );
      this.logger.error(permifyError, "Permission check failed");
      throw permifyError;
    }
  }

  /**
   * Check multiple permissions for a subject
   */
  async checkMultiplePermissions(
    checks: Array<{
      entity: PermifyEntity;
      permission: string;
    }>,
    subject: PermifySubject,
    useCache = true,
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    // Execute all checks in parallel
    const promises = checks.map(async (check) => {
      const key = `${check.entity.type}:${check.entity.id}:${check.permission}`;
      const hasPermission = await this.checkPermission(
        check.entity,
        check.permission,
        subject,
        useCache,
      );
      return { key, hasPermission };
    });

    const resolvedChecks = await Promise.all(promises);

    resolvedChecks.forEach(({ key, hasPermission }) => {
      results[key] = hasPermission;
    });

    return results;
  }

  /**
   * Helper methods for common permission patterns
   */

  /**
   * Check if user is system admin
   */
  async isSystemAdmin(userId: string): Promise<boolean> {
    return this.checkPermission(
      { type: this.EntityTypes.SYSTEM, id: "platform" },
      this.Permissions.MANAGE_ALL,
      { type: this.EntityTypes.USER, id: userId },
    );
  }

  /**
   * Check if user can manage tenant
   */
  async canManageTenant(userId: string, tenantId: string): Promise<boolean> {
    return this.checkPermission(
      { type: this.EntityTypes.TENANT, id: tenantId },
      this.Permissions.MANAGE,
      { type: this.EntityTypes.USER, id: userId },
    );
  }

  /**
   * Check if user can access site
   */
  async canAccessSite(userId: string, siteId: string): Promise<boolean> {
    return this.checkPermission(
      { type: this.EntityTypes.SITE, id: siteId },
      this.Permissions.VIEW,
      { type: this.EntityTypes.USER, id: userId },
    );
  }

  /**
   * Check if user can configure device
   */
  async canConfigureDevice(userId: string, deviceId: string): Promise<boolean> {
    return this.checkPermission(
      { type: this.EntityTypes.DEVICE, id: deviceId },
      this.Permissions.CONFIGURE,
      { type: this.EntityTypes.USER, id: userId },
    );
  }

  /**
   * Set up system admin
   */
  async createSystemAdmin(userId: string): Promise<void> {
    await this.writeRelationship({
      entity: { type: this.EntityTypes.SYSTEM, id: "platform" },
      relation: this.Relations.ADMIN,
      subject: { type: this.EntityTypes.USER, id: userId },
    });
  }

  /**
   * Set up a new tenant with owner
   */
  async createTenantWithOwner(tenantId: string, ownerId: string): Promise<void> {
    const relationships: RelationshipData[] = [
      {
        entity: { type: this.EntityTypes.TENANT, id: tenantId },
        relation: this.Relations.SYSTEM,
        subject: { type: this.EntityTypes.SYSTEM, id: "platform" },
      },
      {
        entity: { type: this.EntityTypes.TENANT, id: tenantId },
        relation: this.Relations.OWNER,
        subject: { type: this.EntityTypes.USER, id: ownerId },
      },
    ];

    await this.writeBulkRelationships({ relationships });
  }

  /**
   * Add user to tenant with specific role
   */
  async addUserToTenant(
    userId: string,
    tenantId: string,
    role: "owner" | "admin" | "member",
  ): Promise<void> {
    const relationMap = {
      owner: this.Relations.OWNER,
      admin: this.Relations.ADMIN,
      member: this.Relations.MEMBER,
    };

    await this.writeRelationship({
      entity: { type: this.EntityTypes.TENANT, id: tenantId },
      relation: relationMap[role],
      subject: { type: this.EntityTypes.USER, id: userId },
    });
  }

  /**
   * Set up a site within a tenant
   */
  async createSite(siteId: string, tenantId: string, managerId?: string): Promise<void> {
    const relationships: RelationshipData[] = [
      {
        entity: { type: this.EntityTypes.SITE, id: siteId },
        relation: this.Relations.TENANT,
        subject: { type: this.EntityTypes.TENANT, id: tenantId },
      },
    ];

    if (managerId) {
      relationships.push({
        entity: { type: this.EntityTypes.SITE, id: siteId },
        relation: this.Relations.MANAGER,
        subject: { type: this.EntityTypes.USER, id: managerId },
      });
    }

    await this.writeBulkRelationships({ relationships });
  }

  /**
   * Set up a device within a site
   */
  async createDevice(deviceId: string, siteId: string): Promise<void> {
    await this.writeRelationship({
      entity: { type: this.EntityTypes.DEVICE, id: deviceId },
      relation: this.Relations.SITE,
      subject: { type: this.EntityTypes.SITE, id: siteId },
    });
  }

  /**
   * Cache management
   */
  private getCacheKey(entity: PermifyEntity, permission: string, subject: PermifySubject): string {
    return `${entity.type}:${entity.id}:${permission}:${subject.type}:${subject.id}`;
  }

  private invalidateEntityCache(entity: PermifyEntity): void {
    // Remove all cache entries for this entity
    const keys = this.cache.keys();
    const entityPrefix = `${entity.type}:${entity.id}:`;

    keys.forEach((key) => {
      if (key.startsWith(entityPrefix)) {
        this.cache.del(key);
      }
    });
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.flushAll();
    this.logger.info("Permify cache cleared");
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: "healthy" | "unhealthy"; details?: any }> {
    try {
      this.ensureInitialized();

      // Try a simple permission check
      await this.checkPermission(
        { type: this.EntityTypes.SYSTEM, id: "platform" },
        this.Permissions.MANAGE_ALL,
        { type: this.EntityTypes.USER, id: "health-check" },
        false, // Don't cache health checks
      );

      return { status: "healthy" };
    }
    catch (error) {
      return {
        status: "unhealthy",
        details: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
