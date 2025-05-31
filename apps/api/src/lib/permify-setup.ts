import { PermifyService, type RelationshipData } from './permify-service.js';
import { createPermifyHelpers } from '../middleware/permify.js';
import type { Logger } from 'pino';
import { env } from '../env.js';

// Environment variables for Permify configuration
export type PermifyEnvConfig = {
  PERMIFY_ENDPOINT?: string;
  PERMIFY_TENANT_ID?: string;
  PERMIFY_CACHE_TTL?: string;
  PERMIFY_CACHE_MAX_KEYS?: string;
  PERMIFY_TIMEOUT?: string;
  PERMIFY_ENABLED?: string;
}

// Default configuration
const defaultConfig = {
  endpoint: 'localhost:3476',
  tenantId: 'default',
  cacheConfig: {
    stdTTL: 300, // 5 minutes
    checkperiod: 120, // 2 minutes
    maxKeys: 10000,
  },
  timeout: 5000,
};

/**
 * Create Permify configuration from environment variables
 */
export function createPermifyConfig(envConfig?: PermifyEnvConfig) {
  const config = envConfig || env;
  
  return {
    endpoint: config.PERMIFY_ENDPOINT || defaultConfig.endpoint,
    tenantId: config.PERMIFY_TENANT_ID || defaultConfig.tenantId,
    cacheConfig: {
      stdTTL: config.PERMIFY_CACHE_TTL ? parseInt(config.PERMIFY_CACHE_TTL, 10) : defaultConfig.cacheConfig.stdTTL,
      checkperiod: defaultConfig.cacheConfig.checkperiod,
      maxKeys: config.PERMIFY_CACHE_MAX_KEYS ? parseInt(config.PERMIFY_CACHE_MAX_KEYS, 10) : defaultConfig.cacheConfig.maxKeys,
    },
    timeout: config.PERMIFY_TIMEOUT ? parseInt(config.PERMIFY_TIMEOUT, 10) : defaultConfig.timeout,
  };
}

/**
 * Check if Permify is enabled
 */
export function isPermifyEnabled(envConfig?: PermifyEnvConfig): boolean {
  const config = envConfig || env;
  return config.PERMIFY_ENABLED !== 'false';
}

/**
 * Initialize Permify service with configuration
 */
export async function initializePermify(logger: Logger, envConfig?: PermifyEnvConfig): Promise<{
  permifyService: PermifyService | null;
  permifyHelpers: ReturnType<typeof createPermifyHelpers> | null;
}> {
  if (!isPermifyEnabled(envConfig)) {
    logger.info('Permify is disabled, skipping initialization');
    return { permifyService: null, permifyHelpers: null };
  }

  try {
    const config = createPermifyConfig(envConfig);
    logger.info('Initializing Permify service', { 
      endpoint: config.endpoint,
      tenantId: config.tenantId,
      cacheEnabled: true,
    });

    const permifyService = new PermifyService(config, logger);
    await permifyService.initialize();

    const permifyHelpers = createPermifyHelpers(permifyService, logger);

    logger.info('Permify service initialized successfully');
    return { permifyService, permifyHelpers };
  } catch (error) {
    logger.error(error, 'Failed to initialize Permify service');
    
    // In development, you might want to continue without Permify
    // In production, you might want to fail fast
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    
    logger.warn('Continuing without Permify in development mode');
    return { permifyService: null, permifyHelpers: null };
  }
}

/**
 * Setup initial system data in Permify
 */
export async function setupInitialPermifyData(
  permifyService: PermifyService,
  logger: Logger,
  options: {
    systemAdminUserId?: string;
    createSampleData?: boolean;
  } = {}
): Promise<void> {
  const { systemAdminUserId, createSampleData = false } = options;

  try {
    logger.info('Setting up initial Permify data');

    // Create system admin if provided
    if (systemAdminUserId) {
      logger.info('Creating system admin', { userId: systemAdminUserId });
      await permifyService.createSystemAdmin(systemAdminUserId);
    }

    // Create sample data for development
    if (createSampleData && process.env.NODE_ENV === 'development') {
      logger.info('Creating sample Permify data for development');
      await createSamplePermifyData(permifyService, logger);
    }

    logger.info('Initial Permify data setup completed');
  } catch (error) {
    logger.error(error, 'Failed to setup initial Permify data');
    throw error;
  }
}

/**
 * Create sample data for development and testing
 */
async function createSamplePermifyData(
  permifyService: PermifyService,
  logger: Logger
): Promise<void> {
  try {
    // Sample tenant with users
    await permifyService.createTenantWithOwner('acme_corp', 'alice');
    await permifyService.addUserToTenant('bob', 'acme_corp', 'admin');
    await permifyService.addUserToTenant('charlie', 'acme_corp', 'member');

    // Sample site
    await permifyService.createSite('headquarters', 'acme_corp', 'bob');
    await permifyService.writeRelationship({
      entity: { type: permifyService.EntityTypes.SITE, id: 'headquarters' },
      relation: permifyService.Relations.OPERATOR,
      subject: { type: permifyService.EntityTypes.USER, id: 'david' },
    });

    // Sample device
    await permifyService.createDevice('server_001', 'headquarters');

    // Sample task relationships
    const taskRelationships: RelationshipData[] = [
      {
        entity: { type: permifyService.EntityTypes.TASK, id: 'maintenance_001' },
        relation: permifyService.Relations.TENANT,
        subject: { type: permifyService.EntityTypes.TENANT, id: 'acme_corp' },
      },
      {
        entity: { type: permifyService.EntityTypes.TASK, id: 'maintenance_001' },
        relation: permifyService.Relations.SITE,
        subject: { type: permifyService.EntityTypes.SITE, id: 'headquarters' },
      },
      {
        entity: { type: permifyService.EntityTypes.TASK, id: 'maintenance_001' },
        relation: permifyService.Relations.DEVICE,
        subject: { type: permifyService.EntityTypes.DEVICE, id: 'server_001' },
      },
      {
        entity: { type: permifyService.EntityTypes.TASK, id: 'maintenance_001' },
        relation: permifyService.Relations.CREATOR,
        subject: { type: permifyService.EntityTypes.USER, id: 'bob' },
      },
      {
        entity: { type: permifyService.EntityTypes.TASK, id: 'maintenance_001' },
        relation: permifyService.Relations.ASSIGNEE,
        subject: { type: permifyService.EntityTypes.USER, id: 'david' },
      },
    ];

    await permifyService.writeBulkRelationships({ relationships: taskRelationships });

    logger.info('Sample Permify data created successfully');
  } catch (error) {
    logger.error(error, 'Failed to create sample Permify data');
    throw error;
  }
}

/**
 * Health check endpoint data
 */
export async function getPermifyHealthStatus(
  permifyService: PermifyService | null
): Promise<{
  enabled: boolean;
  status: 'healthy' | 'unhealthy' | 'disabled';
  details?: any;
  cacheStats?: any;
}> {
  if (!permifyService) {
    return {
      enabled: false,
      status: 'disabled',
    };
  }

  try {
    const health = await permifyService.healthCheck();
    const cacheStats = permifyService.getCacheStats();

    return {
      enabled: true,
      status: health.status,
      details: health.details,
      cacheStats,
    };
  } catch (error) {
    return {
      enabled: true,
      status: 'unhealthy',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Utility to sync database changes with Permify
 */
export class PermifyDataSync {
  constructor(
    private permifyService: PermifyService,
    private logger: Logger
  ) {}

  /**
   * Sync tenant creation
   */
  async syncTenantCreated(tenantId: string, ownerId: string): Promise<void> {
    try {
      await this.permifyService.createTenantWithOwner(tenantId, ownerId);
      this.logger.info('Synced tenant creation to Permify', { tenantId, ownerId });
    } catch (error) {
      this.logger.error(error, 'Failed to sync tenant creation to Permify', { tenantId, ownerId });
      throw error;
    }
  }

  /**
   * Sync user addition to tenant
   */
  async syncUserAddedToTenant(
    userId: string,
    tenantId: string,
    role: 'owner' | 'admin' | 'member'
  ): Promise<void> {
    try {
      await this.permifyService.addUserToTenant(userId, tenantId, role);
      this.logger.info('Synced user addition to tenant in Permify', { userId, tenantId, role });
    } catch (error) {
      this.logger.error(error, 'Failed to sync user addition to Permify', { userId, tenantId, role });
      throw error;
    }
  }

  /**
   * Sync site creation
   */
  async syncSiteCreated(siteId: string, tenantId: string, managerId?: string): Promise<void> {
    try {
      await this.permifyService.createSite(siteId, tenantId, managerId);
      this.logger.info('Synced site creation to Permify', { siteId, tenantId, managerId });
    } catch (error) {
      this.logger.error(error, 'Failed to sync site creation to Permify', { siteId, tenantId });
      throw error;
    }
  }

  /**
   * Sync device creation
   */
  async syncDeviceCreated(deviceId: string, siteId: string): Promise<void> {
    try {
      await this.permifyService.createDevice(deviceId, siteId);
      this.logger.info('Synced device creation to Permify', { deviceId, siteId });
    } catch (error) {
      this.logger.error(error, 'Failed to sync device creation to Permify', { deviceId, siteId });
      throw error;
    }
  }

  /**
   * Sync task assignment
   */
  async syncTaskAssigned(
    taskId: string,
    assigneeId: string,
    creatorId: string,
    context: {
      tenantId?: string;
      siteId?: string;
      deviceId?: string;
    }
  ): Promise<void> {
    try {
      const relationships: RelationshipData[] = [
        {
          entity: { type: this.permifyService.EntityTypes.TASK, id: taskId },
          relation: this.permifyService.Relations.ASSIGNEE,
          subject: { type: this.permifyService.EntityTypes.USER, id: assigneeId },
        },
        {
          entity: { type: this.permifyService.EntityTypes.TASK, id: taskId },
          relation: this.permifyService.Relations.CREATOR,
          subject: { type: this.permifyService.EntityTypes.USER, id: creatorId },
        },
      ];

      // Add context relationships
      if (context.tenantId) {
        relationships.push({
          entity: { type: this.permifyService.EntityTypes.TASK, id: taskId },
          relation: this.permifyService.Relations.TENANT,
          subject: { type: this.permifyService.EntityTypes.TENANT, id: context.tenantId },
        });
      }

      if (context.siteId) {
        relationships.push({
          entity: { type: this.permifyService.EntityTypes.TASK, id: taskId },
          relation: this.permifyService.Relations.SITE,
          subject: { type: this.permifyService.EntityTypes.SITE, id: context.siteId },
        });
      }

      if (context.deviceId) {
        relationships.push({
          entity: { type: this.permifyService.EntityTypes.TASK, id: taskId },
          relation: this.permifyService.Relations.DEVICE,
          subject: { type: this.permifyService.EntityTypes.DEVICE, id: context.deviceId },
        });
      }

      await this.permifyService.writeBulkRelationships({ relationships });
      this.logger.info('Synced task assignment to Permify', { taskId, assigneeId, creatorId, context });
    } catch (error) {
      this.logger.error(error, 'Failed to sync task assignment to Permify', { taskId, assigneeId, creatorId });
      throw error;
    }
  }
} 