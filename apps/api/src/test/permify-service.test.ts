import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import { PermifyService } from '../lib/permify-service.js';
import type { Logger } from 'pino';

// Mock the Permify client
const mockPermifyClient = {
  schema: {
    write: vi.fn(),
  },
  data: {
    write: vi.fn(),
  },
  permission: {
    check: vi.fn(),
  },
};

// Mock the grpc module
vi.mock('@permify/permify-node', () => ({
  grpc: {
    newClient: vi.fn(() => mockPermifyClient),
  },
}));

// Mock NodeCache
const mockCache = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(() => []),
  flushAll: vi.fn(),
  getStats: vi.fn(() => ({ keys: 0, hits: 0, misses: 0 })),
};

vi.mock('node-cache', () => {
  return vi.fn(() => mockCache);
});

// Mock logger
const mockLogger: Logger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
} as any;

describe('PermifyService', () => {
  let permifyService: PermifyService;
  const config = {
    endpoint: 'localhost:3476',
    tenantId: 'test-tenant',
    cacheConfig: {
      stdTTL: 300,
      checkperiod: 120,
      maxKeys: 1000,
    },
  };

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    mockCache.get.mockReturnValue(undefined);
    
    permifyService = new PermifyService(config, mockLogger);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initialization', () => {
    test('should initialize successfully', async () => {
      mockPermifyClient.schema.write.mockResolvedValue({});

      await permifyService.initialize();

      expect(mockPermifyClient.schema.write).toHaveBeenCalledWith({
        tenantId: config.tenantId,
        schema: expect.stringContaining('entity user {}'),
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Initializing Permify service...');
      expect(mockLogger.info).toHaveBeenCalledWith('Permify service initialized successfully');
    });

    test('should handle initialization errors', async () => {
      const error = new Error('Schema write failed');
      mockPermifyClient.schema.write.mockRejectedValue(error);

      await expect(permifyService.initialize()).rejects.toThrow('Failed to initialize Permify service');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to initialize Permify service',
          code: 'INIT_ERROR',
        }),
        'Permify initialization failed'
      );
    });
  });

  describe('relationship management', () => {
    beforeEach(async () => {
      mockPermifyClient.schema.write.mockResolvedValue({});
      await permifyService.initialize();
      vi.clearAllMocks(); // Clear initialization calls
    });

    test('should write single relationship successfully', async () => {
      mockPermifyClient.data.write.mockResolvedValue({});

      const relationship = {
        entity: { type: 'tenant', id: 'tenant1' },
        relation: 'owner',
        subject: { type: 'user', id: 'user1' },
      };

      await permifyService.writeRelationship(relationship);

      expect(mockPermifyClient.data.write).toHaveBeenCalledWith({
        tenantId: config.tenantId,
        metadata: { schemaVersion: '' },
        tuples: [{
          entity: relationship.entity,
          relation: relationship.relation,
          subject: relationship.subject,
        }],
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Relationship written successfully',
        { relationship }
      );
    });

    test('should write bulk relationships successfully', async () => {
      mockPermifyClient.data.write.mockResolvedValue({});

      const relationships = [
        {
          entity: { type: 'tenant', id: 'tenant1' },
          relation: 'owner',
          subject: { type: 'user', id: 'user1' },
        },
        {
          entity: { type: 'tenant', id: 'tenant1' },
          relation: 'admin',
          subject: { type: 'user', id: 'user2' },
        },
      ];

      await permifyService.writeBulkRelationships({ relationships });

      expect(mockPermifyClient.data.write).toHaveBeenCalledWith({
        tenantId: config.tenantId,
        metadata: { schemaVersion: '' },
        tuples: relationships.map(rel => ({
          entity: rel.entity,
          relation: rel.relation,
          subject: rel.subject,
        })),
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Bulk relationships written successfully',
        { count: 2 }
      );
    });

    test('should handle relationship write errors', async () => {
      const error = new Error('Write failed');
      mockPermifyClient.data.write.mockRejectedValue(error);

      const relationship = {
        entity: { type: 'tenant', id: 'tenant1' },
        relation: 'owner',
        subject: { type: 'user', id: 'user1' },
      };

      await expect(permifyService.writeRelationship(relationship)).rejects.toThrow(
        'Failed to write relationship'
      );
    });
  });

  describe('permission checking', () => {
    beforeEach(async () => {
      mockPermifyClient.schema.write.mockResolvedValue({});
      await permifyService.initialize();
      vi.clearAllMocks();
    });

    test('should check permission successfully - allowed', async () => {
      mockPermifyClient.permission.check.mockResolvedValue({
        can: 'RESULT_ALLOWED',
      });

      const result = await permifyService.checkPermission(
        { type: 'tenant', id: 'tenant1' },
        'manage',
        { type: 'user', id: 'user1' }
      );

      expect(result).toBe(true);
      expect(mockPermifyClient.permission.check).toHaveBeenCalledWith({
        tenantId: config.tenantId,
        entity: { type: 'tenant', id: 'tenant1' },
        permission: 'manage',
        subject: { type: 'user', id: 'user1' },
        metadata: { depth: 20 },
      });
    });

    test('should check permission successfully - denied', async () => {
      mockPermifyClient.permission.check.mockResolvedValue({
        can: 'RESULT_DENIED',
      });

      const result = await permifyService.checkPermission(
        { type: 'tenant', id: 'tenant1' },
        'manage',
        { type: 'user', id: 'user1' }
      );

      expect(result).toBe(false);
    });

    test('should use cache for permission checks', async () => {
      mockCache.get.mockReturnValue(true);

      const result = await permifyService.checkPermission(
        { type: 'tenant', id: 'tenant1' },
        'manage',
        { type: 'user', id: 'user1' }
      );

      expect(result).toBe(true);
      expect(mockPermifyClient.permission.check).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Permission check cache hit',
        expect.objectContaining({ result: true })
      );
    });

    test('should cache permission check results', async () => {
      mockPermifyClient.permission.check.mockResolvedValue({
        can: 'RESULT_ALLOWED',
      });

      await permifyService.checkPermission(
        { type: 'tenant', id: 'tenant1' },
        'manage',
        { type: 'user', id: 'user1' }
      );

      expect(mockCache.set).toHaveBeenCalledWith(
        'tenant:tenant1:manage:user:user1',
        true
      );
    });

    test('should skip cache when requested', async () => {
      mockCache.get.mockReturnValue(true);
      mockPermifyClient.permission.check.mockResolvedValue({
        can: 'RESULT_DENIED',
      });

      const result = await permifyService.checkPermission(
        { type: 'tenant', id: 'tenant1' },
        'manage',
        { type: 'user', id: 'user1' },
        false // useCache = false
      );

      expect(result).toBe(false);
      expect(mockPermifyClient.permission.check).toHaveBeenCalled();
    });

    test('should handle permission check errors', async () => {
      const error = new Error('Permission check failed');
      mockPermifyClient.permission.check.mockRejectedValue(error);

      await expect(
        permifyService.checkPermission(
          { type: 'tenant', id: 'tenant1' },
          'manage',
          { type: 'user', id: 'user1' }
        )
      ).rejects.toThrow('Failed to check permission');
    });
  });

  describe('multiple permission checking', () => {
    beforeEach(async () => {
      mockPermifyClient.schema.write.mockResolvedValue({});
      await permifyService.initialize();
      vi.clearAllMocks();
    });

    test('should check multiple permissions successfully', async () => {
      mockPermifyClient.permission.check
        .mockResolvedValueOnce({ can: 'RESULT_ALLOWED' })
        .mockResolvedValueOnce({ can: 'RESULT_DENIED' });

      const checks = [
        { entity: { type: 'tenant', id: 'tenant1' }, permission: 'manage' },
        { entity: { type: 'tenant', id: 'tenant1' }, permission: 'delete' },
      ];

      const result = await permifyService.checkMultiplePermissions(
        checks,
        { type: 'user', id: 'user1' }
      );

      expect(result).toEqual({
        'tenant:tenant1:manage': true,
        'tenant:tenant1:delete': false,
      });
      expect(mockPermifyClient.permission.check).toHaveBeenCalledTimes(2);
    });
  });

  describe('helper methods', () => {
    beforeEach(async () => {
      mockPermifyClient.schema.write.mockResolvedValue({});
      await permifyService.initialize();
      vi.clearAllMocks();
    });

    test('should check system admin correctly', async () => {
      mockPermifyClient.permission.check.mockResolvedValue({
        can: 'RESULT_ALLOWED',
      });

      const result = await permifyService.isSystemAdmin('user1');

      expect(result).toBe(true);
      expect(mockPermifyClient.permission.check).toHaveBeenCalledWith({
        tenantId: config.tenantId,
        entity: { type: 'system', id: 'platform' },
        permission: 'manage_all',
        subject: { type: 'user', id: 'user1' },
        metadata: { depth: 20 },
      });
    });

    test('should check tenant management permission', async () => {
      mockPermifyClient.permission.check.mockResolvedValue({
        can: 'RESULT_DENIED',
      });

      const result = await permifyService.canManageTenant('user1', 'tenant1');

      expect(result).toBe(false);
      expect(mockPermifyClient.permission.check).toHaveBeenCalledWith({
        tenantId: config.tenantId,
        entity: { type: 'tenant', id: 'tenant1' },
        permission: 'manage',
        subject: { type: 'user', id: 'user1' },
        metadata: { depth: 20 },
      });
    });

    test('should create system admin relationship', async () => {
      mockPermifyClient.data.write.mockResolvedValue({});

      await permifyService.createSystemAdmin('user1');

      expect(mockPermifyClient.data.write).toHaveBeenCalledWith({
        tenantId: config.tenantId,
        metadata: { schemaVersion: '' },
        tuples: [{
          entity: { type: 'system', id: 'platform' },
          relation: 'admin',
          subject: { type: 'user', id: 'user1' },
        }],
      });
    });

    test('should create tenant with owner', async () => {
      mockPermifyClient.data.write.mockResolvedValue({});

      await permifyService.createTenantWithOwner('tenant1', 'user1');

      expect(mockPermifyClient.data.write).toHaveBeenCalledWith({
        tenantId: config.tenantId,
        metadata: { schemaVersion: '' },
        tuples: [
          {
            entity: { type: 'tenant', id: 'tenant1' },
            relation: 'system',
            subject: { type: 'system', id: 'platform' },
          },
          {
            entity: { type: 'tenant', id: 'tenant1' },
            relation: 'owner',
            subject: { type: 'user', id: 'user1' },
          },
        ],
      });
    });

    test('should add user to tenant with specific role', async () => {
      mockPermifyClient.data.write.mockResolvedValue({});

      await permifyService.addUserToTenant('user1', 'tenant1', 'admin');

      expect(mockPermifyClient.data.write).toHaveBeenCalledWith({
        tenantId: config.tenantId,
        metadata: { schemaVersion: '' },
        tuples: [{
          entity: { type: 'tenant', id: 'tenant1' },
          relation: 'admin',
          subject: { type: 'user', id: 'user1' },
        }],
      });
    });

    test('should create site with manager', async () => {
      mockPermifyClient.data.write.mockResolvedValue({});

      await permifyService.createSite('site1', 'tenant1', 'user1');

      expect(mockPermifyClient.data.write).toHaveBeenCalledWith({
        tenantId: config.tenantId,
        metadata: { schemaVersion: '' },
        tuples: [
          {
            entity: { type: 'site', id: 'site1' },
            relation: 'tenant',
            subject: { type: 'tenant', id: 'tenant1' },
          },
          {
            entity: { type: 'site', id: 'site1' },
            relation: 'manager',
            subject: { type: 'user', id: 'user1' },
          },
        ],
      });
    });

    test('should create device', async () => {
      mockPermifyClient.data.write.mockResolvedValue({});

      await permifyService.createDevice('device1', 'site1');

      expect(mockPermifyClient.data.write).toHaveBeenCalledWith({
        tenantId: config.tenantId,
        metadata: { schemaVersion: '' },
        tuples: [{
          entity: { type: 'device', id: 'device1' },
          relation: 'site',
          subject: { type: 'site', id: 'site1' },
        }],
      });
    });
  });

  describe('cache management', () => {
    beforeEach(async () => {
      mockPermifyClient.schema.write.mockResolvedValue({});
      await permifyService.initialize();
      vi.clearAllMocks();
    });

    test('should clear cache', () => {
      permifyService.clearCache();

      expect(mockCache.flushAll).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Permify cache cleared');
    });

    test('should get cache stats', () => {
      const stats = permifyService.getCacheStats();

      expect(mockCache.getStats).toHaveBeenCalled();
      expect(stats).toEqual({ keys: 0, hits: 0, misses: 0 });
    });

    test('should invalidate entity cache on relationship write', async () => {
      mockPermifyClient.data.write.mockResolvedValue({});
      mockCache.keys.mockReturnValue([
        'tenant:tenant1:manage:user:user1',
        'tenant:tenant1:view:user:user2',
        'site:site1:view:user:user1',
      ]);

      const relationship = {
        entity: { type: 'tenant', id: 'tenant1' },
        relation: 'owner',
        subject: { type: 'user', id: 'user1' },
      };

      await permifyService.writeRelationship(relationship);

      expect(mockCache.del).toHaveBeenCalledWith('tenant:tenant1:manage:user:user1');
      expect(mockCache.del).toHaveBeenCalledWith('tenant:tenant1:view:user:user2');
      expect(mockCache.del).not.toHaveBeenCalledWith('site:site1:view:user:user1');
    });
  });

  describe('health check', () => {
    test('should return healthy when service is working', async () => {
      mockPermifyClient.schema.write.mockResolvedValue({});
      mockPermifyClient.permission.check.mockResolvedValue({
        can: 'RESULT_DENIED',
      });

      await permifyService.initialize();

      const health = await permifyService.healthCheck();

      expect(health).toEqual({ status: 'healthy' });
    });

    test('should return unhealthy when service is not initialized', async () => {
      const health = await permifyService.healthCheck();

      expect(health).toEqual({
        status: 'unhealthy',
        details: 'Permify service not initialized. Call initialize() first.',
      });
    });

    test('should return unhealthy when permission check fails', async () => {
      mockPermifyClient.schema.write.mockResolvedValue({});
      mockPermifyClient.permission.check.mockRejectedValue(new Error('Connection failed'));

      await permifyService.initialize();

      const health = await permifyService.healthCheck();

      expect(health).toEqual({
        status: 'unhealthy',
        details: expect.stringContaining('Failed to check permission'),
      });
    });
  });

  describe('error handling', () => {
    test('should throw error when not initialized', async () => {
      await expect(
        permifyService.writeRelationship({
          entity: { type: 'tenant', id: 'tenant1' },
          relation: 'owner',
          subject: { type: 'user', id: 'user1' },
        })
      ).rejects.toThrow('Permify service not initialized');
    });

    test('should handle schema loading errors gracefully', async () => {
      const error = new Error('Schema loading failed');
      mockPermifyClient.schema.write.mockRejectedValue(error);

      await expect(permifyService.initialize()).rejects.toThrow(
        'Failed to initialize Permify service'
      );
    });
  });

  describe('constants', () => {
    test('should have correct entity types', () => {
      expect(permifyService.EntityTypes.USER).toBe('user');
      expect(permifyService.EntityTypes.SYSTEM).toBe('system');
      expect(permifyService.EntityTypes.TENANT).toBe('tenant');
      expect(permifyService.EntityTypes.SITE).toBe('site');
      expect(permifyService.EntityTypes.DEVICE).toBe('device');
      expect(permifyService.EntityTypes.TASK).toBe('task');
    });

    test('should have correct relation types', () => {
      expect(permifyService.Relations.ADMIN).toBe('admin');
      expect(permifyService.Relations.OWNER).toBe('owner');
      expect(permifyService.Relations.MEMBER).toBe('member');
      expect(permifyService.Relations.MANAGER).toBe('manager');
      expect(permifyService.Relations.OPERATOR).toBe('operator');
    });

    test('should have correct permission types', () => {
      expect(permifyService.Permissions.MANAGE_ALL).toBe('manage_all');
      expect(permifyService.Permissions.CREATE_TENANT).toBe('create_tenant');
      expect(permifyService.Permissions.MANAGE).toBe('manage');
      expect(permifyService.Permissions.CONFIGURE).toBe('configure');
      expect(permifyService.Permissions.MONITOR).toBe('monitor');
    });
  });
}); 