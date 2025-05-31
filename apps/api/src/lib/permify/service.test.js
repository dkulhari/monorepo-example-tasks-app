import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PermifyService } from './service';
import { PermissionDeniedError, SchemaNotFoundError } from './types';
// Mock the Permify client
vi.mock('@permify/permify-node', () => ({
    Permify: vi.fn().mockImplementation(() => ({
        tenancy: {
            create: vi.fn().mockResolvedValue({}),
        },
        schema: {
            write: vi.fn().mockResolvedValue({}),
        },
        relationship: {
            write: vi.fn().mockResolvedValue({}),
            delete: vi.fn().mockResolvedValue({}),
        },
        permission: {
            check: vi.fn(),
            expand: vi.fn(),
        },
    })),
}));
// Mock fs module
vi.mock('fs', () => ({
    readFileSync: vi.fn().mockReturnValue('mock schema content'),
}));
describe('PermifyService', () => {
    let service;
    const mockConfig = {
        endpoint: 'http://localhost:3476',
        apiKey: 'test-api-key',
    };
    beforeEach(() => {
        vi.clearAllMocks();
        service = new PermifyService(mockConfig);
    });
    afterEach(() => {
        service.clearCache();
    });
    describe('initialization', () => {
        it('should initialize the schema successfully', async () => {
            await service.initialize();
            expect(service['isInitialized']).toBe(true);
        });
        it('should throw error if operations are performed before initialization', async () => {
            await expect(service.createSystemAdmin('user1')).rejects.toThrow(SchemaNotFoundError);
        });
    });
    describe('system admin management', () => {
        beforeEach(async () => {
            await service.initialize();
        });
        it('should create a system admin', async () => {
            await expect(service.createSystemAdmin('admin1')).resolves.not.toThrow();
            expect(service['client'].relationship.write).toHaveBeenCalledWith({
                tenantId: 'platform',
                metadata: { schemaVersion: '1.0.0' },
                tuples: [{
                        entity: { type: 'system', id: 'main' },
                        relation: 'admin',
                        subject: { type: 'user', id: 'admin1' },
                    }],
            });
        });
    });
    describe('tenant management', () => {
        beforeEach(async () => {
            await service.initialize();
        });
        it('should create a tenant with owner', async () => {
            await service.createTenant('tenant1', 'owner1');
            expect(service['client'].relationship.write).toHaveBeenCalledWith({
                tenantId: 'platform',
                metadata: { schemaVersion: '1.0.0' },
                tuples: [
                    {
                        entity: { type: 'tenant', id: 'tenant1' },
                        relation: 'system',
                        subject: { type: 'system', id: 'main' },
                    },
                    {
                        entity: { type: 'tenant', id: 'tenant1' },
                        relation: 'owner',
                        subject: { type: 'user', id: 'owner1' },
                    },
                ],
            });
        });
        it('should add users to tenant with roles', async () => {
            await service.addUserToTenant('tenant1', 'user1', 'admin');
            expect(service['client'].relationship.write).toHaveBeenCalledWith({
                tenantId: 'platform',
                metadata: { schemaVersion: '1.0.0' },
                tuples: [{
                        entity: { type: 'tenant', id: 'tenant1' },
                        relation: 'admin',
                        subject: { type: 'user', id: 'user1' },
                    }],
            });
        });
    });
    describe('site management', () => {
        beforeEach(async () => {
            await service.initialize();
        });
        it('should create a site under a tenant', async () => {
            await service.createSite('site1', 'tenant1', 'manager1');
            expect(service['client'].relationship.write).toHaveBeenCalledWith({
                tenantId: 'platform',
                metadata: { schemaVersion: '1.0.0' },
                tuples: [
                    {
                        entity: { type: 'site', id: 'site1' },
                        relation: 'parent',
                        subject: { type: 'tenant', id: 'tenant1' },
                    },
                    {
                        entity: { type: 'site', id: 'site1' },
                        relation: 'manager',
                        subject: { type: 'user', id: 'manager1' },
                    },
                ],
            });
        });
        it('should create a site without manager', async () => {
            await service.createSite('site1', 'tenant1');
            expect(service['client'].relationship.write).toHaveBeenCalledWith({
                tenantId: 'platform',
                metadata: { schemaVersion: '1.0.0' },
                tuples: [{
                        entity: { type: 'site', id: 'site1' },
                        relation: 'parent',
                        subject: { type: 'tenant', id: 'tenant1' },
                    }],
            });
        });
    });
    describe('device management', () => {
        beforeEach(async () => {
            await service.initialize();
        });
        it('should add a device to a site', async () => {
            await service.addDeviceToSite('device1', 'site1');
            expect(service['client'].relationship.write).toHaveBeenCalledWith({
                tenantId: 'platform',
                metadata: { schemaVersion: '1.0.0' },
                tuples: [{
                        entity: { type: 'device', id: 'device1' },
                        relation: 'site',
                        subject: { type: 'site', id: 'site1' },
                    }],
            });
        });
    });
    describe('permission checking', () => {
        beforeEach(async () => {
            await service.initialize();
        });
        it('should check permission and return allowed', async () => {
            service['client'].permission.check = vi.fn().mockResolvedValue({
                can: 'CHECK_RESULT_ALLOWED',
            });
            const result = await service.checkPermission({
                userId: 'user1',
                action: 'view',
                entityType: 'tenant',
                entityId: 'tenant1',
            });
            expect(result.allowed).toBe(true);
            expect(result.checkTime).toBeGreaterThanOrEqual(0);
        });
        it('should check permission and return denied', async () => {
            service['client'].permission.check = vi.fn().mockResolvedValue({
                can: 'CHECK_RESULT_DENIED',
            });
            const result = await service.checkPermission({
                userId: 'user1',
                action: 'delete',
                entityType: 'tenant',
                entityId: 'tenant1',
            });
            expect(result.allowed).toBe(false);
        });
        it('should use cached permission on second check', async () => {
            service['client'].permission.check = vi.fn().mockResolvedValue({
                can: 'CHECK_RESULT_ALLOWED',
            });
            // First check
            await service.checkPermission({
                userId: 'user1',
                action: 'view',
                entityType: 'tenant',
                entityId: 'tenant1',
            });
            // Second check (should use cache)
            const result = await service.checkPermission({
                userId: 'user1',
                action: 'view',
                entityType: 'tenant',
                entityId: 'tenant1',
            });
            expect(result.allowed).toBe(true);
            expect(service['client'].permission.check).toHaveBeenCalledTimes(1);
        });
        it('should throw PermissionDeniedError when asserting denied permission', async () => {
            service['client'].permission.check = vi.fn().mockResolvedValue({
                can: 'CHECK_RESULT_DENIED',
            });
            await expect(service.assertPermission({
                userId: 'user1',
                action: 'delete',
                entityType: 'tenant',
                entityId: 'tenant1',
            })).rejects.toThrow(PermissionDeniedError);
        });
    });
    describe('batch operations', () => {
        beforeEach(async () => {
            await service.initialize();
        });
        it('should batch check permissions', async () => {
            service['client'].permission.check = vi.fn()
                .mockResolvedValueOnce({ can: 'CHECK_RESULT_ALLOWED' })
                .mockResolvedValueOnce({ can: 'CHECK_RESULT_DENIED' });
            const result = await service.batchCheckPermissions({
                checks: [
                    {
                        userId: 'user1',
                        action: 'view',
                        entityType: 'tenant',
                        entityId: 'tenant1',
                    },
                    {
                        userId: 'user1',
                        action: 'delete',
                        entityType: 'tenant',
                        entityId: 'tenant1',
                    },
                ],
            });
            expect(result.results.size).toBe(2);
            const results = Array.from(result.results.values());
            expect(results[0].allowed).toBe(true);
            expect(results[1].allowed).toBe(false);
        });
    });
    describe('relationship management', () => {
        beforeEach(async () => {
            await service.initialize();
        });
        it('should delete a relationship', async () => {
            const tuple = {
                entity: { type: 'tenant', id: 'tenant1' },
                relation: 'member',
                subject: { type: 'user', id: 'user1' },
            };
            await service.deleteRelationship(tuple);
            expect(service['client'].relationship.delete).toHaveBeenCalledWith({
                tenantId: 'platform',
                tuples: [tuple],
            });
        });
    });
    describe('cache management', () => {
        beforeEach(async () => {
            await service.initialize();
        });
        it('should invalidate cache when relationships change', async () => {
            service['client'].permission.check = vi.fn().mockResolvedValue({
                can: 'CHECK_RESULT_ALLOWED',
            });
            // Check permission (cached)
            await service.checkPermission({
                userId: 'user1',
                action: 'view',
                entityType: 'tenant',
                entityId: 'tenant1',
            });
            // Write new relationship (should invalidate cache)
            await service.addUserToTenant('tenant1', 'user2', 'admin');
            // Check permission again (should not use cache)
            await service.checkPermission({
                userId: 'user1',
                action: 'view',
                entityType: 'tenant',
                entityId: 'tenant1',
            });
            expect(service['client'].permission.check).toHaveBeenCalledTimes(2);
        });
        it('should provide cache statistics', () => {
            const stats = service.getCacheStats();
            expect(stats).toHaveProperty('size');
            expect(stats).toHaveProperty('maxSize');
            expect(stats).toHaveProperty('hits');
        });
        it('should clear cache', async () => {
            service['client'].permission.check = vi.fn().mockResolvedValue({
                can: 'CHECK_RESULT_ALLOWED',
            });
            // Check permission (cached)
            await service.checkPermission({
                userId: 'user1',
                action: 'view',
                entityType: 'tenant',
                entityId: 'tenant1',
            });
            service.clearCache();
            // Check permission again (should not use cache)
            await service.checkPermission({
                userId: 'user1',
                action: 'view',
                entityType: 'tenant',
                entityId: 'tenant1',
            });
            expect(service['client'].permission.check).toHaveBeenCalledTimes(2);
        });
    });
});
