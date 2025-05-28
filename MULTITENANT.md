# Multi-tenant SaaS Architecture

This application implements a comprehensive multi-tenant SaaS architecture with the following features:

## 🏗️ Architecture Overview

### Core Components
- **Hono API** - Backend with tenant-aware routes
- **React Frontend** - Multi-tenant UI with tenant switching
- **Keycloak** - User authentication and management
- **Permify** - Fine-grained authorization
- **PostgreSQL** - Multi-tenant database with row-level security
- **MinIO** - Tenant-isolated object storage

### Tenancy Model
- **Shared Database, Shared Schema** - All tenants share the same database and schema
- **Row-level Isolation** - Data is isolated by `tenant_id` foreign keys
- **Tenant Context Middleware** - Ensures users can only access their tenant's data

## 🗄️ Database Schema

### Core Tables

#### `tenants`
- `id` (UUID) - Primary key
- `name` - Display name
- `slug` - URL-safe identifier for routing
- `domain` - Custom domain support
- `plan` - Subscription plan (free, pro, enterprise)
- `is_active` - Tenant status
- `settings` - JSON configuration

#### `tenant_users`
- `tenant_id` - Foreign key to tenants
- `user_id` - Keycloak user ID
- `role` - User role (owner, admin, member)
- `is_active` - Membership status

#### `tenant_invitations`
- `tenant_id` - Foreign key to tenants
- `email` - Invited user email
- `token` - Invitation token
- `role` - Invited role
- `expires_at` - Expiration timestamp

### Updated Tables
All existing tables now include `tenant_id` for isolation:
- `tasks` - Now tenant-aware

## 🔐 Authentication & Authorization

### Authentication Flow
1. User authenticates with Keycloak
2. JWT token contains user identity
3. API validates token and extracts user info

### Tenant Resolution
The system resolves tenant context through:
1. **Subdomain** - `tenant1.yourdomain.com`
2. **Path parameter** - `/api/tenants/{slug}/...`
3. **Header** - `X-Tenant: tenant-slug`

### Authorization Layers
1. **Authentication** - Keycloak JWT validation
2. **Tenant Membership** - User must be active member of tenant
3. **Role-based Permissions** - Owner/Admin/Member roles
4. **Resource-level** - Permify for fine-grained permissions

## 🛠️ API Endpoints

### Tenant Management
- `GET /api/tenants` - List user's tenants
- `POST /api/tenants` - Create new tenant
- `GET /api/tenants/{id}` - Get tenant details
- `PATCH /api/tenants/{id}` - Update tenant (owners only)
- `DELETE /api/tenants/{id}` - Delete tenant (owners only)

### User Management
- `GET /api/tenants/{id}/users` - List tenant users
- `POST /api/tenants/{id}/invite` - Invite user to tenant
- `PATCH /api/tenants/{id}/users/{userId}` - Update user role
- `DELETE /api/tenants/{id}/users/{userId}` - Remove user from tenant

### Tenant-aware Resources
All resource endpoints now require tenant context:
- `GET /api/tasks` - Lists tasks for current tenant only
- `POST /api/tasks` - Creates task in current tenant

## 🚀 Development Setup

### Quick Start
```bash
# Run the setup script
./setup-tenants.sh

# Start development servers
pnpm dev
```

### Manual Setup
```bash
# Start infrastructure
docker-compose up -d

# Install dependencies
pnpm install

# Setup database
cd apps/api
pnpm db:push
cd ../..

# Start development
pnpm dev
```

## 🧪 Testing Multi-tenancy

### 1. Create Test Tenants
```bash
# Via API
curl -X POST http://localhost:3001/api/tenants \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Company", "slug": "test-company"}'
```

### 2. Test Tenant Isolation
```bash
# Create task in tenant 1
curl -X POST http://localhost:3001/api/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant: tenant1" \
  -H "Content-Type: application/json" \
  -d '{"name": "Tenant 1 Task", "done": false}'

# Verify task is not visible in tenant 2
curl -X GET http://localhost:3001/api/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Tenant: tenant2"
```

### 3. Test Role-based Access
```bash
# Try to invite user as member (should fail)
curl -X POST http://localhost:3001/api/tenants/{id}/invite \
  -H "Authorization: Bearer MEMBER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "new@user.com", "role": "member"}'
```

## 🔧 Configuration

### Environment Variables
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=myappuser
DB_PASSWORD=myapppassword
DB_NAME=myappdb

# Keycloak
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=contrack
KEYCLOAK_CLIENT_ID=contrackapi

# Permify (optional)
PERMIFY_URL=http://localhost:3476
```

### Tenant Routing Options

#### Option A: Subdomain-based (Recommended)
- `tenant1.yourdomain.com`
- `tenant2.yourdomain.com`
- Requires wildcard DNS setup

#### Option B: Path-based
- `yourdomain.com/tenant1/dashboard`
- `yourdomain.com/tenant2/dashboard`
- Simpler DNS setup

#### Option C: Header-based
- Use `X-Tenant` header
- Good for API-only access

## 🏢 Deployment Considerations

### Database Scaling
- **Current**: Shared database with row-level isolation
- **Future**: Consider database-per-tenant for large customers
- **Monitoring**: Track tenant-specific query performance

### Caching Strategy
- Cache tenant metadata
- Tenant-aware cache keys
- Separate cache namespaces per tenant

### Backup & Recovery
- Tenant-specific backup strategies
- Point-in-time recovery per tenant
- Data export capabilities

### Monitoring & Observability
- Tenant-specific metrics
- Usage tracking per tenant
- Performance monitoring by tenant

## 🔒 Security Best Practices

### Data Isolation
- ✅ All queries filtered by `tenant_id`
- ✅ Middleware enforces tenant context
- ✅ No cross-tenant data leakage possible

### Access Control
- ✅ JWT token validation
- ✅ Tenant membership verification
- ✅ Role-based permissions
- ✅ Resource-level authorization via Permify

### Audit Logging
- Track all tenant-level actions
- Log user role changes
- Monitor cross-tenant access attempts

## 📈 Scaling Considerations

### Performance
- Index all `tenant_id` columns
- Consider partitioning large tables by tenant
- Implement tenant-aware connection pooling

### Storage
- Tenant-specific file storage paths
- Quota management per tenant
- Cleanup policies for inactive tenants

### Billing Integration
- Track usage per tenant
- Implement plan limits
- Usage-based billing metrics

## 🚨 Common Pitfalls

### Development
- ❌ Forgetting to add `tenant_id` to new tables
- ❌ Missing tenant context in queries
- ❌ Not testing cross-tenant isolation

### Production
- ❌ Missing database indexes on `tenant_id`
- ❌ Inadequate monitoring of tenant performance
- ❌ Not implementing proper backup strategies

## 🔄 Migration Guide

### Adding New Resources
1. Add `tenant_id` column to table
2. Update schema with foreign key constraint
3. Add tenant middleware to routes
4. Update queries to filter by tenant
5. Test tenant isolation

### Example Migration
```sql
-- Add tenant_id to existing table
ALTER TABLE existing_table 
ADD COLUMN tenant_id UUID NOT NULL 
REFERENCES tenants(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX idx_existing_table_tenant_id 
ON existing_table(tenant_id);
```

## 📚 Additional Resources

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Permify Documentation](https://docs.permify.co/)
- [Multi-tenant Database Patterns](https://docs.microsoft.com/en-us/azure/sql-database/saas-tenancy-app-design-patterns)
- [SaaS Architecture Best Practices](https://aws.amazon.com/blogs/apn/saas-architecture-fundamentals-building-multi-tenant-applications-on-aws/) 