# Multi-Tenant Database Schema

This directory contains the complete database setup for a multi-tenant platform using Drizzle ORM and PostgreSQL.

## Schema Overview

### Core Tables

1. **tenants** - Organizations/workspaces

   - Supports different tenant types (enterprise, standard, trial, demo)
   - Status tracking (active, suspended, inactive)
   - Keycloak group integration
   - Flexible JSON settings for features and branding

2. **users** - Platform users

   - Keycloak ID integration
   - User types (system_admin, regular, service_account, guest)
   - Self-referential created_by for audit trail
   - Extensible metadata for preferences and profile data

3. **user_tenant_associations** - Many-to-many user-tenant relationships

   - Role-based access (owner, admin, member, viewer)
   - Status tracking (active, invited, suspended)
   - Invitation workflow support
   - Activity tracking with last_active_at

4. **sites** - Physical or logical locations within tenants

   - Hierarchical structure under tenants
   - Geographic data with coordinates
   - Timezone support
   - Flexible metadata for operating hours and contact info

5. **user_site_assignments** - User access to specific sites

   - Many-to-many relationship
   - Tracks who assigned access

6. **devices** - Equipment/assets at sites

   - Unique serial numbers
   - Status tracking
   - Rich metadata for specs and configuration

7. **audit_logs** - Comprehensive activity logging

   - Tracks all system actions
   - Before/after change data
   - IP and user agent tracking
   - Flexible details JSON field

8. **tenant_invitations** - Pending user invitations
   - Token-based acceptance
   - Expiration tracking
   - Role pre-assignment

## Features

### Performance Optimizations

- **Comprehensive Indexes**: All foreign keys, status fields, and commonly queried columns
- **Composite Indexes**: For multi-column queries (e.g., tenant + status)
- **GIN Indexes**: For efficient JSONB queries on metadata fields
- **Unique Constraints**: Prevent duplicate associations

### Data Integrity

- **Foreign Key Constraints**: Maintain referential integrity
- **Check Constraints**: Validate data (e.g., accepted_at > invited_at)
- **Unique Constraints**: Enforce business rules
- **Cascade Deletes**: Clean up related data automatically

### Automatic Features

- **Updated Timestamps**: Trigger-based updated_at columns
- **UUID Primary Keys**: Using gen_random_uuid()
- **Default Values**: Sensible defaults for all columns

## Usage

### Running Migrations

```bash
# Apply all pending migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down

# Check migration status
npm run migrate:status

# Create new migration
npm run migrate:create "add_new_feature"
```

### Seeding Data

```bash
# Run the multi-tenant seed
npm run seed:multi-tenant
```

This creates:

- 1 System admin user
- 3 Sample tenants (Enterprise, Standard, Trial)
- 5 Users including cross-tenant users
- 3 Sites with different configurations
- 4 Devices of various types
- Sample audit logs
- 2 Pending invitations

### Drizzle Kit Commands

```bash
# Generate migration from schema changes
npm run db:generate

# Push schema directly to database (development)
npm run db:push

# Open Drizzle Studio for data browsing
npm run db:studio
```

## Migration Files

- `0003_multi_tenant_schema.sql` - Complete schema creation
- `0003_multi_tenant_schema_rollback.sql` - Rollback script

## Key Design Decisions

1. **Soft Deletes**: Uses status fields instead of deletion for audit trail
2. **JSON Metadata**: Flexible fields for extensibility without schema changes
3. **UTC Timestamps**: All timestamps use TIMESTAMPTZ for consistency
4. **Enum Types**: PostgreSQL enums for type safety and performance
5. **Audit Everything**: Comprehensive audit_logs table for compliance

## Cross-Tenant Users

The schema supports users belonging to multiple tenants with different roles:

- A user can be an owner in one tenant and a member in another
- Each association is tracked separately with its own status
- Site assignments are tenant-scoped for security

## Security Considerations

- Row-level security should be implemented at the application layer
- Keycloak handles authentication
- Permify handles authorization
- Audit logs track all access and changes

## Example Queries

```typescript
// Get all active users for a tenant
const tenantUsers = await db
  .select()
  .from(userTenantAssociations)
  .innerJoin(users, eq(users.id, userTenantAssociations.userId))
  .where(and(
    eq(userTenantAssociations.tenantId, tenantId),
    eq(userTenantAssociations.status, "active")
  ));

// Get user's accessible sites
const userSites = await db
  .select()
  .from(userSiteAssignments)
  .innerJoin(sites, eq(sites.id, userSiteAssignments.siteId))
  .where(eq(userSiteAssignments.userId, userId));
```
