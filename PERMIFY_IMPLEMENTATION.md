# Permify Multi-Tenant Authorization Implementation

This document describes the comprehensive Permify implementation for the multi-tenant tasks application, providing fine-grained authorization with proper permission inheritance.

## Overview

The implementation provides:
- **Multi-tenant authorization** with proper isolation
- **Hierarchical permissions** that cascade from system → tenant → site → device
- **Role-based access control** with system admin, tenant admin, and member roles
- **Caching layer** for performance optimization
- **Middleware integration** with Hono framework
- **Comprehensive testing** with Jest

## Architecture

### Entity Hierarchy

```
System (platform-wide)
├── Tenant (organization level)
│   ├── Site (location/facility level)
│   │   └── Device (equipment level)
│   └── Task (work items)
└── User (individuals)
```

### Permission Inheritance

- **System Admins**: Can do everything across all tenants
- **Tenant Owners/Admins**: Full control within their tenant, cascades to sites and devices
- **Site Managers**: Manage specific sites and their devices
- **Site Operators**: Monitor devices, limited configuration access
- **Tenant Members**: Basic access based on assignments

## Schema Definition

The Permify schema is defined in `permify-schema.yaml`:

```yaml
schema: >
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
  }
```

## Implementation Components

### 1. PermifyService (`apps/api/src/lib/permify-service.ts`)

Core service class that handles:
- Schema initialization
- Relationship management
- Permission checking with caching
- Health monitoring

```typescript
const permifyService = new PermifyService({
  endpoint: 'localhost:3476',
  tenantId: 'default',
  cacheConfig: {
    stdTTL: 300, // 5 minutes
    checkperiod: 120,
    maxKeys: 10000,
  }
}, logger);

await permifyService.initialize();
```

### 2. Middleware Integration (`apps/api/src/middleware/permify.ts`)

Hono middleware for route-level authorization:

```typescript
import { createPermifyHelpers } from '../middleware/permify.js';

const permifyHelpers = createPermifyHelpers(permifyService, logger);

// Protect routes
app.get('/tenants/:tenantId', 
  permifyHelpers.requireTenantAccess('view_settings'),
  async (c) => {
    // Route handler
  }
);

app.post('/tenants/:tenantId/sites',
  permifyHelpers.requireTenantAdmin(),
  async (c) => {
    // Only tenant admins can create sites
  }
);
```

### 3. Setup and Configuration (`apps/api/src/lib/permify-setup.ts`)

Utilities for service initialization and data synchronization:

```typescript
import { initializePermify, setupInitialPermifyData } from '../lib/permify-setup.js';

// Initialize service
const { permifyService, permifyHelpers } = await initializePermify(logger);

// Setup initial data
if (permifyService) {
  await setupInitialPermifyData(permifyService, logger, {
    systemAdminUserId: 'admin-user-id',
    createSampleData: true
  });
}
```

## Environment Configuration

Add these variables to your `.env` file:

```env
# Permify Configuration
PERMIFY_ENABLED=true
PERMIFY_ENDPOINT=localhost:3476
PERMIFY_TENANT_ID=default
PERMIFY_CACHE_TTL=300
PERMIFY_CACHE_MAX_KEYS=10000
PERMIFY_TIMEOUT=5000

# System Administration
SYSTEM_ADMIN_USER_ID=your-admin-user-id
```

## Usage Examples

### Creating Tenants and Users

```typescript
// Create a new tenant with owner
await permifyService.createTenantWithOwner('acme-corp', 'alice-user-id');

// Add users to tenant
await permifyService.addUserToTenant('bob-user-id', 'acme-corp', 'admin');
await permifyService.addUserToTenant('charlie-user-id', 'acme-corp', 'member');
```

### Setting Up Sites and Devices

```typescript
// Create a site within a tenant
await permifyService.createSite('headquarters', 'acme-corp', 'bob-user-id');

// Add device to site
await permifyService.createDevice('server-001', 'headquarters');
```

### Permission Checks

```typescript
// Check if user can manage tenant
const canManage = await permifyService.canManageTenant('alice-user-id', 'acme-corp');

// Check device configuration permission
const canConfigure = await permifyService.canConfigureDevice('bob-user-id', 'server-001');

// Multiple permission check
const permissions = await permifyService.checkMultiplePermissions([
  { entity: { type: 'tenant', id: 'acme-corp' }, permission: 'manage' },
  { entity: { type: 'site', id: 'headquarters' }, permission: 'view' }
], { type: 'user', id: 'charlie-user-id' });
```

### Route Protection

```typescript
// System admin only
app.get('/admin/tenants', 
  permifyHelpers.requireSystemAdmin(),
  listAllTenants
);

// Tenant management
app.put('/tenants/:tenantId/settings',
  permifyHelpers.requireTenantAdmin(),
  updateTenantSettings
);

// Device operations
app.post('/devices/:deviceId/reboot',
  permifyHelpers.requireDeviceConfig(),
  rebootDevice
);

// Task management
app.put('/tasks/:taskId',
  permifyHelpers.requireTaskEdit(),
  updateTask
);
```

### Data Synchronization

```typescript
import { PermifyDataSync } from '../lib/permify-setup.js';

const dataSync = new PermifyDataSync(permifyService, logger);

// Sync tenant creation
await dataSync.syncTenantCreated('new-tenant-id', 'owner-user-id');

// Sync task assignment
await dataSync.syncTaskAssigned('task-123', 'assignee-id', 'creator-id', {
  tenantId: 'acme-corp',
  siteId: 'headquarters',
  deviceId: 'server-001'
});
```

## Testing

Comprehensive Jest tests are provided in `apps/api/src/test/permify-service.test.ts`:

```bash
# Run Permify tests
pnpm test -- src/test/permify-service.test.ts

# Run all tests
pnpm test
```

Test coverage includes:
- Service initialization
- Relationship management
- Permission checking with caching
- Error handling
- Helper methods
- Cache management

## User Management Requirements

Based on your specifications:

### System Admin Responsibilities
- **Create tenants**: Only system admins can create new tenant organizations
- **Assign tenant admins**: System admins designate initial tenant administrators
- **User management**: System admins handle user creation and assignment
- **No self-registration**: Users cannot register themselves

### Implementation Flow
1. **System Admin** creates tenant via admin interface
2. **System Admin** assigns initial tenant admin user
3. **Tenant Admin** can then invite additional users to their tenant
4. **Users** are managed through Keycloak for authentication
5. **Permissions** are managed through Permify for authorization

### Example Admin Workflow

```typescript
// 1. System admin creates tenant
await permifyService.createTenantWithOwner('new-company', 'tenant-admin-user-id');

// 2. Tenant admin can now invite users
await permifyService.addUserToTenant('new-user-id', 'new-company', 'member');

// 3. Set up organizational structure
await permifyService.createSite('main-office', 'new-company', 'site-manager-id');
await permifyService.createDevice('printer-001', 'main-office');
```

## Performance Considerations

### Caching Strategy
- **Permission results** cached for 5 minutes by default
- **Cache invalidation** on relationship changes
- **Bulk operations** for multiple permission checks
- **Health monitoring** for service availability

### Optimization Tips
- Use bulk relationship writes when possible
- Leverage permission inheritance to reduce explicit assignments
- Monitor cache hit rates and adjust TTL as needed
- Use system admin bypass for administrative operations

## Security Features

### Multi-Tenant Isolation
- Tenant-scoped permission checks
- Hierarchical access control
- System admin override capabilities
- Audit logging for permission changes

### Error Handling
- Graceful degradation when Permify is unavailable
- Comprehensive error logging
- Circuit breaker pattern for resilience
- Health check endpoints

## Deployment

### Permify Server Setup
1. Deploy Permify server (Docker recommended)
2. Configure endpoint in environment variables
3. Initialize schema on startup
4. Set up monitoring and health checks

### Application Integration
1. Install dependencies: `@permify/permify-node`, `node-cache`
2. Configure environment variables
3. Initialize service in application startup
4. Add middleware to protected routes
5. Implement data synchronization hooks

This implementation provides a robust, scalable authorization system that supports your multi-tenant SaaS requirements with proper user management controls and system admin oversight. 