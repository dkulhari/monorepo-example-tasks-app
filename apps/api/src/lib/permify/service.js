import { grpc } from "@permify/permify-node";
import { LRUCache } from "lru-cache";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const { newClient, newTenancyInterceptor } = grpc;
import { PermifyError, PermissionDeniedError, SchemaNotFoundError, } from "./types";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export class PermifyService {
    config;
    client; // Type will be inferred from newClient
    permissionCache;
    schemaVersion = "1.0.0";
    isInitialized = false;
    constructor(config, cacheOptions = { ttl: 300, maxSize: 10000 }) {
        this.config = config;
        this.client = newClient({
            endpoint: config.endpoint,
        }, newTenancyInterceptor(config.apiKey || ""));
        this.permissionCache = new LRUCache({
            max: cacheOptions.maxSize,
            ttl: cacheOptions.ttl * 1000, // Convert to milliseconds
        });
    }
    /**
     * Initialize the Permify schema
     */
    async initialize() {
        try {
            // Read the schema file
            const schemaPath = join(__dirname, "schema.perm");
            const schema = readFileSync(schemaPath, "utf-8");
            // Write the schema to Permify
            await this.client.tenancy.create({
                id: "platform",
                name: "Multi-tenant Platform",
            });
            await this.client.schema.write({
                tenantId: "platform",
                schema,
            });
            this.isInitialized = true;
            console.log("Permify schema initialized successfully");
        }
        catch (error) {
            console.error("Failed to initialize Permify schema:", error);
            throw new PermifyError("Failed to initialize Permify schema", "SCHEMA_INIT_FAILED", 500);
        }
    }
    /**
     * Ensure the service is initialized
     */
    ensureInitialized() {
        if (!this.isInitialized) {
            throw new SchemaNotFoundError();
        }
    }
    /**
     * Create a system admin user
     */
    async createSystemAdmin(userId) {
        this.ensureInitialized();
        await this.writeRelationship({
            entity: { type: "system", id: "main" },
            relation: "admin",
            subject: { type: "user", id: userId },
        });
    }
    /**
     * Create a tenant with an owner
     */
    async createTenant(tenantId, ownerId) {
        this.ensureInitialized();
        await this.writeRelationships([
            {
                entity: { type: "tenant", id: tenantId },
                relation: "system",
                subject: { type: "system", id: "main" },
            },
            {
                entity: { type: "tenant", id: tenantId },
                relation: "owner",
                subject: { type: "user", id: ownerId },
            },
        ]);
    }
    /**
     * Add a user to a tenant with a specific role
     */
    async addUserToTenant(tenantId, userId, role) {
        this.ensureInitialized();
        await this.writeRelationship({
            entity: { type: "tenant", id: tenantId },
            relation: role,
            subject: { type: "user", id: userId },
        });
    }
    /**
     * Create a site under a tenant
     */
    async createSite(siteId, tenantId, managerId) {
        this.ensureInitialized();
        const relationships = [
            {
                entity: { type: "site", id: siteId },
                relation: "parent",
                subject: { type: "tenant", id: tenantId },
            },
        ];
        if (managerId) {
            relationships.push({
                entity: { type: "site", id: siteId },
                relation: "manager",
                subject: { type: "user", id: managerId },
            });
        }
        await this.writeRelationships(relationships);
    }
    /**
     * Add a device to a site
     */
    async addDeviceToSite(deviceId, siteId) {
        this.ensureInitialized();
        await this.writeRelationship({
            entity: { type: "device", id: deviceId },
            relation: "site",
            subject: { type: "site", id: siteId },
        });
    }
    /**
     * Write a single relationship
     */
    async writeRelationship(tuple) {
        try {
            await this.client.relationship.write({
                tenantId: "platform",
                metadata: {
                    schemaVersion: this.schemaVersion,
                },
                tuples: [tuple],
            });
            // Invalidate relevant cache entries
            this.invalidateCache(tuple);
        }
        catch (error) {
            console.error("Failed to write relationship:", error);
            throw new PermifyError("Failed to write relationship", "WRITE_RELATIONSHIP_FAILED", 500);
        }
    }
    /**
     * Write multiple relationships
     */
    async writeRelationships(tuples) {
        try {
            await this.client.relationship.write({
                tenantId: "platform",
                metadata: {
                    schemaVersion: this.schemaVersion,
                },
                tuples,
            });
            // Invalidate relevant cache entries
            tuples.forEach(tuple => this.invalidateCache(tuple));
        }
        catch (error) {
            console.error("Failed to write relationships:", error);
            throw new PermifyError("Failed to write relationships", "WRITE_RELATIONSHIPS_FAILED", 500);
        }
    }
    /**
     * Delete a relationship
     */
    async deleteRelationship(tuple) {
        try {
            await this.client.relationship.delete({
                tenantId: "platform",
                tuples: [tuple],
            });
            // Invalidate relevant cache entries
            this.invalidateCache(tuple);
        }
        catch (error) {
            console.error("Failed to delete relationship:", error);
            throw new PermifyError("Failed to delete relationship", "DELETE_RELATIONSHIP_FAILED", 500);
        }
    }
    /**
     * Check if a user has permission to perform an action
     */
    async checkPermission(request) {
        this.ensureInitialized();
        const cacheKey = this.getCacheKey(request);
        const cached = this.permissionCache.get(cacheKey);
        if (cached && this.isCacheValid(cached)) {
            return {
                allowed: cached.allowed,
                checkTime: Date.now() - cached.timestamp,
            };
        }
        const startTime = Date.now();
        try {
            const response = await this.client.permission.check({
                tenantId: "platform",
                metadata: {
                    schemaVersion: this.schemaVersion,
                },
                entity: {
                    type: request.entityType,
                    id: request.entityId,
                },
                permission: request.action,
                subject: {
                    type: "user",
                    id: request.userId,
                },
            });
            const result = {
                allowed: response.can === "CHECK_RESULT_ALLOWED",
                checkTime: Date.now() - startTime,
            };
            // Cache the result
            this.permissionCache.set(cacheKey, {
                allowed: result.allowed,
                timestamp: Date.now(),
                ttl: 300000, // 5 minutes
            });
            return result;
        }
        catch (error) {
            console.error("Failed to check permission:", error);
            throw new PermifyError("Failed to check permission", "CHECK_PERMISSION_FAILED", 500);
        }
    }
    /**
     * Batch check permissions
     */
    async batchCheckPermissions(request) {
        this.ensureInitialized();
        const results = new Map();
        // Check cache first
        const uncachedChecks = [];
        for (const check of request.checks) {
            const cacheKey = this.getCacheKey(check);
            const cached = this.permissionCache.get(cacheKey);
            if (cached && this.isCacheValid(cached)) {
                results.set(cacheKey, {
                    allowed: cached.allowed,
                    checkTime: Date.now() - cached.timestamp,
                });
            }
            else {
                uncachedChecks.push(check);
            }
        }
        // Perform uncached checks
        if (uncachedChecks.length > 0) {
            const checkPromises = uncachedChecks.map(check => this.checkPermission(check).then(result => ({
                key: this.getCacheKey(check),
                result,
            })));
            const batchResults = await Promise.all(checkPromises);
            for (const { key, result } of batchResults) {
                results.set(key, result);
            }
        }
        return { results };
    }
    /**
     * Assert permission (throws if denied)
     */
    async assertPermission(request) {
        const result = await this.checkPermission(request);
        if (!result.allowed) {
            throw new PermissionDeniedError(request.action, `${request.entityType}:${request.entityId}`);
        }
    }
    /**
     * Get all permissions for a user on an entity
     */
    async getUserPermissions(userId, entityType, entityId) {
        this.ensureInitialized();
        try {
            const response = await this.client.permission.expand({
                tenantId: "platform",
                metadata: {
                    schemaVersion: this.schemaVersion,
                },
                entity: {
                    type: entityType,
                    id: entityId,
                },
                permission: "view", // Start with basic permission
            });
            // Parse the response to extract allowed actions
            // This is a simplified version - actual implementation would need to parse the expand tree
            return ["view"]; // Placeholder
        }
        catch (error) {
            console.error("Failed to get user permissions:", error);
            throw new PermifyError("Failed to get user permissions", "GET_PERMISSIONS_FAILED", 500);
        }
    }
    /**
     * Clear the permission cache
     */
    clearCache() {
        this.permissionCache.clear();
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.permissionCache.size,
            maxSize: this.permissionCache.max,
            hits: this.permissionCache.size, // Simplified - real implementation would track hits/misses
        };
    }
    /**
     * Generate cache key for a permission check
     */
    getCacheKey(request) {
        return `${request.userId}:${request.entityType}:${request.entityId}:${request.action}`;
    }
    /**
     * Check if cached permission is still valid
     */
    isCacheValid(cached) {
        return Date.now() - cached.timestamp < cached.ttl;
    }
    /**
     * Invalidate cache entries related to a relationship change
     */
    invalidateCache(tuple) {
        // Simple invalidation - clear all entries for the affected entity
        // More sophisticated implementation would be more selective
        const pattern = new RegExp(`.*:${tuple.entity.type}:${tuple.entity.id}:.*`);
        for (const key of this.permissionCache.keys()) {
            if (pattern.test(key)) {
                this.permissionCache.delete(key);
            }
        }
    }
}
// Singleton instance
let permifyService = null;
/**
 * Get or create the Permify service instance
 */
export function getPermifyService(config) {
    if (!permifyService) {
        if (!config) {
            throw new Error("Permify service not initialized. Please provide configuration.");
        }
        permifyService = new PermifyService(config);
    }
    return permifyService;
}
