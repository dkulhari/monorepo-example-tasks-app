import type { PermifyService } from "./service";

import { getPermifyService } from "./service";

export type SyncOptions = {
  retryOnFailure?: boolean;
  maxRetries?: number;
  logErrors?: boolean;
};

/**
 * DataSyncService handles synchronization between database and Permify
 * Implements the hybrid approach where database is source of truth
 */
export class DataSyncService {
  private permifyService: PermifyService;
  private defaultOptions: SyncOptions = {
    retryOnFailure: true,
    maxRetries: 3,
    logErrors: true,
  };

  constructor(permifyService?: PermifyService) {
    this.permifyService = permifyService || getPermifyService();
  }

  /**
   * Sync tenant creation to Permify
   */
  async syncTenantCreation(
    tenantId: string,
    ownerId: string,
    options?: SyncOptions,
  ): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      await this.permifyService.createTenant(tenantId, ownerId);
    }
    catch (error) {
      await this.handleSyncError("syncTenantCreation", error, opts, () =>
        this.syncTenantCreation(tenantId, ownerId, { ...opts, maxRetries: opts.maxRetries! - 1 }));
    }
  }

  /**
   * Sync user-tenant association to Permify
   */
  async syncUserTenantAssociation(
    tenantId: string,
    userId: string,
    role: "owner" | "admin" | "member" | "viewer",
    options?: SyncOptions,
  ): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      // Map viewer role to member in Permify (as schema doesn't have viewer)
      const permifyRole = role === "viewer" ? "member" : role;

      if (permifyRole === "owner") {
        // Owner is set during tenant creation, update if needed
        await this.permifyService.writeRelationship({
          entity: { type: "tenant", id: tenantId },
          relation: "owner",
          subject: { type: "user", id: userId },
        });
      }
      else {
        await this.permifyService.addUserToTenant(
          tenantId,
          userId,
          permifyRole as "admin" | "member",
        );
      }
    }
    catch (error) {
      await this.handleSyncError("syncUserTenantAssociation", error, opts, () =>
        this.syncUserTenantAssociation(tenantId, userId, role, { ...opts, maxRetries: opts.maxRetries! - 1 }));
    }
  }

  /**
   * Sync user removal from tenant to Permify
   */
  async syncUserTenantRemoval(
    tenantId: string,
    userId: string,
    role: string,
    options?: SyncOptions,
  ): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      const permifyRole = role === "viewer" ? "member" : role;

      await this.permifyService.deleteRelationship({
        entity: { type: "tenant", id: tenantId },
        relation: permifyRole,
        subject: { type: "user", id: userId },
      });
    }
    catch (error) {
      await this.handleSyncError("syncUserTenantRemoval", error, opts, () =>
        this.syncUserTenantRemoval(tenantId, userId, role, { ...opts, maxRetries: opts.maxRetries! - 1 }));
    }
  }

  /**
   * Sync site creation to Permify
   */
  async syncSiteCreation(
    siteId: string,
    tenantId: string,
    managerId?: string,
    options?: SyncOptions,
  ): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      await this.permifyService.createSite(siteId, tenantId, managerId);
    }
    catch (error) {
      await this.handleSyncError("syncSiteCreation", error, opts, () =>
        this.syncSiteCreation(siteId, tenantId, managerId, { ...opts, maxRetries: opts.maxRetries! - 1 }));
    }
  }

  /**
   * Sync device creation to Permify
   */
  async syncDeviceCreation(
    deviceId: string,
    siteId: string,
    options?: SyncOptions,
  ): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      await this.permifyService.addDeviceToSite(deviceId, siteId);
    }
    catch (error) {
      await this.handleSyncError("syncDeviceCreation", error, opts, () =>
        this.syncDeviceCreation(deviceId, siteId, { ...opts, maxRetries: opts.maxRetries! - 1 }));
    }
  }

  /**
   * Sync system admin creation to Permify
   */
  async syncSystemAdmin(
    userId: string,
    options?: SyncOptions,
  ): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      await this.permifyService.createSystemAdmin(userId);
    }
    catch (error) {
      await this.handleSyncError("syncSystemAdmin", error, opts, () =>
        this.syncSystemAdmin(userId, { ...opts, maxRetries: opts.maxRetries! - 1 }));
    }
  }

  /**
   * Batch sync multiple operations (useful for migrations)
   */
  async batchSync(operations: Array<() => Promise<void>>): Promise<{
    succeeded: number;
    failed: number;
    errors: Error[];
  }> {
    const results = {
      succeeded: 0,
      failed: 0,
      errors: [] as Error[],
    };

    for (const operation of operations) {
      try {
        await operation();
        results.succeeded++;
      }
      catch (error) {
        results.failed++;
        results.errors.push(error as Error);
      }
    }

    return results;
  }

  /**
   * Handle sync errors with retry logic
   */
  private async handleSyncError(
    operation: string,
    error: unknown,
    options: SyncOptions,
    retryFn: () => Promise<void>,
  ): Promise<void> {
    if (options.logErrors) {
      console.error(`Permify sync error in ${operation}:`, error);
    }

    if (options.retryOnFailure && options.maxRetries! > 0) {
      // Wait before retry (exponential backoff)
      const delay = (3 - options.maxRetries!) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));

      return retryFn();
    }

    // Store failed sync in a queue table for later retry (optional)
    // await this.queueFailedSync(operation, error);

    // Don't throw - database operation should succeed even if Permify sync fails
    // This maintains database as source of truth
  }
}

// Singleton instance
let dataSyncService: DataSyncService | null = null;

/**
 * Get or create the data sync service instance
 */
export function getDataSyncService(): DataSyncService {
  if (!dataSyncService) {
    dataSyncService = new DataSyncService();
  }
  return dataSyncService;
}
