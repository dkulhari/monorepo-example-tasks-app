# Database Seeding System

This document explains how to seed the database with initial development data, including connecting tenant users to Keycloak users.

## Overview

The seeding system provides a complete solution for setting up development data that demonstrates the multi-tenant task system. It creates sample tenants, connects them to real Keycloak users, and populates them with sample tasks.

## Quick Start

### 1. Ensure Prerequisites

Make sure you have:
- PostgreSQL running with the `contradb` database
- Keycloak running with users created
- Environment variables configured (see below)

### 2. Get Keycloak User IDs

```bash
# From the root directory
cd apps/api
pnpm tsx src/db/seed/get-keycloak-users.ts
```

This will output the user mapping you need for the next step.

### 3. Update User Mapping

Edit `apps/api/src/db/seed/index.ts` and update the `KEYCLOAK_USERS` constant with the actual user IDs from step 2:

```typescript
const KEYCLOAK_USERS = {
  testuser: "51a1090a-15d7-44bc-afc8-9b1350a4773b", // testuser@example.com
  admin: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", // admin@example.com
  // Add more users as needed
};
```

### 4. Run the Seeding

```bash
# From the root directory
pnpm seed seed

# Or from the API directory
cd apps/api
pnpm seed seed
```

## Commands

All commands can be run from the root directory using `pnpm seed <command>` or from `apps/api` using `pnpm seed <command>`.

### Full Database Seeding

```bash
pnpm seed seed
```

**What it does:**
1. Clears existing data (tasks, tenant_users, tenants)
2. Creates 3 sample tenants with different plans
3. Connects Keycloak users to tenants with various roles
4. Creates sample tasks for each tenant

### Add User to Tenant

```bash
pnpm seed add-user <tenant-slug> <user-id-or-username> [role]
```

**Examples:**
```bash
# Add user as member (default)
pnpm seed add-user acme-corp testuser

# Add user as admin
pnpm seed add-user acme-corp testuser admin

# Add user as owner
pnpm seed add-user tech-startup admin-user-id owner
```

### Help

```bash
pnpm seed help
```

## Sample Data

### Tenants Created

1. **Acme Corporation** (`acme-corp`)
   - Plan: Enterprise
   - Domain: acme.example.com
   - Settings: Corporate theme, advanced features

2. **Tech Startup Inc** (`tech-startup`)
   - Plan: Pro
   - Settings: Modern theme, team collaboration

3. **Consulting Firm LLC** (`consulting-firm`)
   - Plan: Free
   - Settings: Minimal theme, basic features

### User Roles

By default, the `testuser` is assigned to all three tenants:
- **Owner** of Acme Corporation (full access)
- **Member** of Tech Startup Inc (basic access)
- **Admin** of Consulting Firm LLC (management access)

### Sample Tasks

Each tenant gets relevant sample tasks:

**Acme Corporation:**
- Review Q4 financial reports
- Prepare board presentation
- Update company policies

**Tech Startup Inc:**
- Deploy new feature to production
- Code review for authentication module
- Write API documentation

**Consulting Firm LLC:**
- Client meeting preparation
- Research industry trends

## Keycloak Integration

### How It Works

The seeding system connects your database to Keycloak by:

1. **User ID Mapping**: Maps usernames to Keycloak user IDs
2. **Tenant Relationships**: Creates `tenant_users` records linking users to tenants
3. **Role Assignment**: Assigns appropriate roles (owner, admin, member)

### Getting User IDs

The helper script fetches user IDs from Keycloak:

```bash
cd apps/api
pnpm tsx src/db/seed/get-keycloak-users.ts
```

**Requirements:**
- Keycloak running and accessible
- `KEYCLOAK_CLIENT_SECRET` in environment
- Client with admin permissions

### Manual User ID Lookup

If the helper script doesn't work:

1. Open Keycloak Admin Console
2. Go to your realm → Users
3. Click on a user
4. Copy the ID from the URL or user details

## Environment Variables

Required in your `.env` file:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/contradb

# Keycloak (for user ID fetching)
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=tasks-app
KEYCLOAK_CLIENT_ID=tasks-app-api
KEYCLOAK_CLIENT_SECRET=your-client-secret-here
```

## File Structure

```
apps/api/src/db/seed/
├── index.ts              # Main seeding logic
├── run.ts                # CLI script
├── get-keycloak-users.ts # Helper to fetch user IDs
└── README.md             # Detailed documentation
```

## Development Workflow

### Initial Setup

1. Set up database and Keycloak
2. Create users in Keycloak
3. Get user IDs and update seed script
4. Run full seeding

### Adding New Users

```bash
# Add existing Keycloak user to a tenant
pnpm seed add-user acme-corp new-user-id admin
```

### Resetting Data

```bash
# Clear and recreate all sample data
pnpm seed seed
```

### Adding New Tenants

Edit `apps/api/src/db/seed/index.ts` and add new tenant objects to the seeding logic.

## Troubleshooting

### Common Issues

**"Unknown user" Error**
- Update `KEYCLOAK_USERS` mapping with correct user IDs
- Use the helper script to get current user IDs

**Database Connection Error**
- Check PostgreSQL is running
- Verify `DATABASE_URL` in `.env`
- Ensure `contradb` database exists

**Keycloak User Fetching Error**
- Check Keycloak is running on correct URL
- Verify `KEYCLOAK_CLIENT_SECRET` is set
- Ensure client has admin permissions

**Permission Errors**
- Make sure the Keycloak client has `view-users` permission
- Check realm and client ID are correct

### Debug Mode

Add debug logging by modifying the seed script:

```typescript
console.log("Debug: Current user mapping:", KEYCLOAK_USERS);
```

## Security Notes

⚠️ **Important Security Considerations:**

- **Development Only**: Never run seeding in production
- **User IDs**: Must match your development Keycloak instance
- **Data Loss**: Seeding clears existing data
- **Secrets**: Keep `KEYCLOAK_CLIENT_SECRET` secure

## Testing the Setup

After seeding, verify the setup:

1. **Check Database**: Verify tenants, tenant_users, and tasks were created
2. **Test Login**: Log in with a seeded user
3. **Check Tenant Access**: Verify user can access assigned tenants
4. **Test Tasks**: Verify tasks are visible and editable

### Database Verification

```sql
-- Check tenants
SELECT * FROM tenants;

-- Check user-tenant relationships
SELECT * FROM tenant_users;

-- Check tasks
SELECT * FROM tasks;
```

### API Testing

```bash
# Get user's tenants (requires authentication)
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/tenants

# Get tenant tasks
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/tenants/acme-corp-id/tasks
```

This seeding system provides a complete foundation for developing and testing the multi-tenant task application with real Keycloak integration. 