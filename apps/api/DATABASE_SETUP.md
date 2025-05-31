# Database Setup Guide

This guide covers the complete database setup for the multi-tenant task management application using Drizzle ORM with PostgreSQL.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Schema Overview](#schema-overview)
- [Migration Management](#migration-management)
- [Seed Data](#seed-data)
- [Database Scripts](#database-scripts)
- [Troubleshooting](#troubleshooting)

## 🚀 Quick Start

### Prerequisites
- PostgreSQL 12+ running locally or accessible remotely
- Node.js 18+ with pnpm installed
- Environment variables configured (see `.env.example`)

### Initial Setup

1. **Configure environment variables:**
```bash
# Copy and edit environment file
cp .env.example .env

# Required database variables:
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=tasks_app
```

2. **Generate and run initial migration:**
```bash
# Generate migration files from schema
pnpm db:generate

# Run migrations
pnpm db:migrate:up

# Validate schema
pnpm db:migrate:validate
```

3. **Seed the database:**
```bash
# Create sample data for development
pnpm db:seed
```

4. **Verify setup:**
```bash
# Open Drizzle Studio to inspect data
pnpm db:studio
```

## 📊 Schema Overview

### Core Entities

#### 1. Users (`users`)
- **Purpose**: Store user information integrated with Keycloak
- **Key Fields**: `keycloak_id`, `email`, `user_type`, `metadata`
- **Types**: `system_admin`, `tenant_admin`, `regular_user`, `service_account`, `guest_user`

#### 2. Tenants (`tenants`)
- **Purpose**: Multi-tenant organization structure
- **Key Fields**: `slug`, `type`, `status`, `keycloak_group_id`
- **Types**: `enterprise`, `standard`, `starter`, `trial`
- **Status**: `active`, `suspended`, `archived`, `pending`

#### 3. User-Tenant Associations (`user_tenant_associations`)
- **Purpose**: Manage user membership in tenants with roles
- **Key Fields**: `user_id`, `tenant_id`, `role`, `status`
- **Roles**: `owner`, `admin`, `member`, `viewer`
- **Status**: `active`, `invited`, `suspended`
- **Constraints**: Unique `(user_id, tenant_id)` combination

#### 4. Sites (`sites`)
- **Purpose**: Physical locations within tenants
- **Key Fields**: `tenant_id`, `address`, `latitude`, `longitude`, `timezone`
- **Features**: Geolocation support, timezone-aware

#### 5. User-Site Assignments (`user_site_assignments`)
- **Purpose**: Assign users to specific sites
- **Key Fields**: `user_id`, `site_id`, `tenant_id`, `assigned_by`
- **Constraints**: Unique `(user_id, site_id)` combination

#### 6. Devices (`devices`)
- **Purpose**: IoT devices and equipment at sites
- **Key Fields**: `site_id`, `type`, `serial_number`, `status`
- **Types**: `sensor`, `controller`, `gateway`, `camera`, `actuator`, `meter`, `beacon`, `router`, `server`, `workstation`
- **Status**: `online`, `offline`, `maintenance`, `error`, `decommissioned`

#### 7. Audit Logs (`audit_logs`)
- **Purpose**: Track all system actions for compliance
- **Key Fields**: `action`, `resource_type`, `resource_id`, `details`
- **Actions**: `create`, `read`, `update`, `delete`, `login`, `logout`, etc.
- **Resources**: All entity types in the system

#### 8. Tasks (`tasks`)
- **Purpose**: Work items assigned to users
- **Key Fields**: `tenant_id`, `user_id`, `priority`, `due_date`
- **Priorities**: `low`, `medium`, `high`, `urgent`

#### 9. Tenant Invitations (`tenant_invitations`)
- **Purpose**: Manage user invitations to tenants
- **Key Fields**: `email`, `tenant_id`, `role`, `token`, `expires_at`

### Schema Features

- ✅ **Foreign Key Constraints**: Proper referential integrity
- ✅ **Performance Indexes**: Optimized for common query patterns
- ✅ **UUID Primary Keys**: Better for distributed systems
- ✅ **Enum Types**: Type-safe status and role management
- ✅ **JSONB Metadata**: Flexible schema for additional data
- ✅ **Timestamps**: Created/updated tracking on all entities
- ✅ **Cascade Deletes**: Proper cleanup on entity removal

## 🔄 Migration Management

### Available Commands

```bash
# Generate new migration from schema changes
pnpm db:generate

# Run all pending migrations
pnpm db:migrate:up

# Check migration status
pnpm db:migrate:status

# Validate current schema
pnpm db:migrate:validate

# Create checkpoint for rollback
pnpm db:migrate:checkpoint backup-name

# Rollback to specific migration (manual intervention required)
pnpm db:migrate:rollback migration-name
```

### Migration Workflow

1. **Make schema changes** in TypeScript files
2. **Generate migration**: `pnpm db:generate`
3. **Review generated SQL** in `src/db/migrations/`
4. **Test migration** on development database
5. **Apply migration**: `pnpm db:migrate:up`
6. **Validate schema**: `pnpm db:migrate:validate`

### Rollback Strategy

Due to the complexity of schema changes, rollbacks require manual intervention:

1. **Create checkpoint** before major changes
2. **Review rollback requirements** for each migration
3. **Prepare manual rollback scripts** for critical deployments
4. **Use database backups** for emergency recovery

## 🌱 Seed Data

### Sample Data Structure

The seed script creates a comprehensive development environment:

#### System Administrator
- **Email**: `admin@system.local`
- **Type**: `system_admin`
- **Purpose**: Manage all tenants and users

#### Sample Tenants
1. **Acme Corporation** (`acme-corp`)
   - Type: `enterprise`
   - Users: 3 (admin, manager, operator)
   - Sites: 2 (headquarters, warehouse)

2. **TechStart Inc** (`techstart`)
   - Type: `standard`
   - Users: 2 (admin, user)
   - Sites: 1 (office)

3. **Beta Solutions** (`beta-solutions`)
   - Type: `starter`
   - Users: 1 (admin)
   - Sites: 1 (lab)

4. **Demo Company** (`demo-company`)
   - Type: `trial`
   - Status: `pending`

#### Cross-Tenant User
- **Name**: Alex Thompson
- **Email**: `consultant@external.com`
- **Access**: Multiple tenants with different roles
- **Purpose**: Demonstrate cross-tenant permissions

#### Sample Devices
- HVAC controllers, security cameras, sensors
- Network gateways, servers, workstations
- Realistic metadata and status variations

### Seed Commands

```bash
# Full seed with sample data
pnpm db:seed

# Reset database with fresh data
pnpm db:reset

# Complete fresh start (drops and recreates everything)
pnpm db:fresh
```

## 🛠 Database Scripts

### Development Scripts

```bash
# Start development with live reload
pnpm dev

# Build for production
pnpm build

# Run type checking
pnpm typecheck
```

### Database Management

```bash
# Open Drizzle Studio (database browser)
pnpm db:studio

# Push schema changes without migration
pnpm db:push

# Check schema differences
pnpm db:check

# Drop all tables (destructive!)
pnpm db:drop
```

### Backup and Recovery

```bash
# Create database backup
pnpm db:backup

# Manual backup with custom name
pg_dump $DATABASE_URL > my_backup.sql

# Restore from backup
psql $DATABASE_URL < my_backup.sql
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Migration Conflicts
```bash
# Error: table already exists
# Solution: Check existing schema and resolve conflicts manually

# Check current tables
pnpm db:migrate:validate

# Review migration file before applying
cat src/db/migrations/latest_migration.sql
```

#### 2. Foreign Key Violations
```bash
# Error: violates foreign key constraint
# Solution: Ensure referenced records exist

# Check data integrity
pnpm db:migrate:validate

# Re-run seed if needed
pnpm db:seed
```

#### 3. Permission Errors
```bash
# Error: permission denied
# Solution: Check database user permissions

# Verify connection
psql $DATABASE_URL -c "SELECT current_user, current_database();"
```

#### 4. Schema Sync Issues
```bash
# Error: schema out of sync
# Solution: Regenerate migrations

# Drop and recreate (development only!)
pnpm db:fresh

# Or fix manually
pnpm db:generate --name fix-schema-sync
```

### Performance Monitoring

#### Index Usage
```sql
-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'public' 
ORDER BY tablename, attname;
```

#### Query Performance
```sql
-- Enable query logging in PostgreSQL
SET log_statement = 'all';
SET log_min_duration_statement = 1000; -- Log queries > 1s
```

### Database Maintenance

#### Regular Tasks
1. **Vacuum tables** for performance
2. **Analyze statistics** for query optimization
3. **Monitor disk usage** and growth
4. **Review audit logs** for cleanup opportunities
5. **Update table statistics** after bulk operations

#### Monitoring Queries
```sql
-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check active connections
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';
```

## 📚 Additional Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Multi-tenant Architecture Guide](./MULTITENANT.md)
- [API Schema Documentation](./src/db/schema/README.md)

## 🤝 Contributing

When making database changes:

1. **Update TypeScript schemas** first
2. **Generate and review migrations**
3. **Test on development environment**
4. **Update this documentation** if needed
5. **Add appropriate tests** for new functionality

---

**Note**: Always backup your database before running migrations in production! 