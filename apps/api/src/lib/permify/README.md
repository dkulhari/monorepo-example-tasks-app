# Permify Integration for Multi-Tenant Platform

This module provides a complete authorization system using Permify for our multi-tenant platform.

## Architecture

### Entity Hierarchy

```
System
  └── Tenant
       └── Site
            └── Device
```

### User Types

- **System Admin**: Platform-wide administration
- **Tenant Admin**: Full control within tenant
- **Regular User**: Standard access based on roles
- **Service Account**: API/integration access
- **Guest User**: Limited, temporary access

### Permission Model

1. **System Level**

   - System admins can perform all actions across the platform
   - Only system admins can create tenants and manage global users

2. **Tenant Level**

   - Owner: Full control including billing and deletion
   - Admin: User management, site creation, settings
   - Member: Basic access to view tenant resources

3. **Site Level**

   - Manager: Full control of site and devices
   - Operator: Operate devices and view reports
   - Inherited permissions from tenant cascade down

4. **Device Level**
   - Permissions inherited from site
   - Manager can configure and maintain
   - Operator can control and read data

## Usage

### Initialize Permify

```typescript
import { initializePermissions } from "./middleware/permissions";

// In your app initialization
await initializePermissions(
  process.env.PERMIFY_URL || "http://localhost:3476",
  process.env.PERMIFY_API_KEY
);
```

### Route Protection

```typescript
import { requirePermission, requireSystemAdmin, requireTenantMembership } from "./middleware/permissions";

// Protect routes with specific permissions
app.post("/api/tenants", requireSystemAdmin(), createTenantHandler);

// Require tenant membership
app.get("/api/tenants/:id", requireTenantMembership(), getTenantHandler);

// Require specific permission
app.delete(
  "/api/sites/:id",
  requirePermission("site", "delete"),
  deleteSiteHandler
);
```

### Manual Permission Checks

```typescript
import { checkPermission } from "./middleware/permissions";

// In route handler
const canEdit = await checkPermission(
  c,
  "tenant",
  "update",
  tenantId
);

if (!canEdit) {
  return c.json({ error: "Permission denied" }, 403);
}
```

### Direct Service Usage

```typescript
import { getPermifyService } from "./lib/permify";

const permifyService = getPermifyService();

// Create relationships
await permifyService.createTenant("tenant123", "user456");
await permifyService.addUserToTenant("tenant123", "user789", "admin");
await permifyService.createSite("site123", "tenant123", "user789");

// Check permissions
const result = await permifyService.checkPermission({
  userId: "user789",
  action: "manage_devices",
  entityType: "site",
  entityId: "site123"
});

// Batch checks for efficiency
const results = await permifyService.batchCheckPermissions({
  checks: [
    { userId: "user1", action: "view", entityType: "tenant", entityId: "tenant1" },
    { userId: "user1", action: "update", entityType: "site", entityId: "site1" }
  ]
});
```

## Caching

The service includes an LRU cache for permission checks:

- Default TTL: 5 minutes
- Default max size: 10,000 entries
- Cache is automatically invalidated when relationships change

```typescript
// Get cache statistics
const stats = permifyService.getCacheStats();

// Clear cache manually if needed
permifyService.clearCache();
```

## Testing

Run the test suite:

```bash
pnpm --filter api test src/lib/permify/service.test.ts
```

## Environment Variables

```env
PERMIFY_URL=http://localhost:3476
PERMIFY_API_KEY=your-api-key  # Optional
```

## Common Patterns

### 1. User Registration Flow

```typescript
// System admin creates user and assigns to tenant
await permifyService.createSystemAdmin("admin1");
await permifyService.createTenant("tenant1", "admin1");
await permifyService.addUserToTenant("tenant1", "newuser1", "member");
```

### 2. Permission Cascade Example

```typescript
// Tenant admin can manage sites
await permifyService.addUserToTenant("tenant1", "admin1", "admin");
// This user can now create sites
await permifyService.createSite("site1", "tenant1", "admin1");
// And the site manager can add devices
await permifyService.addDeviceToSite("device1", "site1");
```

### 3. Cross-Tenant Access

```typescript
// User can belong to multiple tenants with different roles
await permifyService.addUserToTenant("tenant1", "user1", "admin");
await permifyService.addUserToTenant("tenant2", "user1", "member");
```

## Error Handling

The module provides specific error types:

- `PermifyError`: Base error for all Permify-related issues
- `PermissionDeniedError`: User lacks required permission
- `SchemaNotFoundError`: Permify schema not initialized

```typescript
try {
  await permifyService.assertPermission({
    userId: "user1",
    action: "delete",
    entityType: "tenant",
    entityId: "tenant1"
  });
}
catch (error) {
  if (error instanceof PermissionDeniedError) {
    // Handle permission denied
  }
}
```
