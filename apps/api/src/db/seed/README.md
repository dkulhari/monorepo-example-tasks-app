# Database Seeding

This directory contains scripts for seeding the database with initial development data, including connecting tenant users to Keycloak users.

## Overview

The seeding system creates:

- **Tenants**: Sample organizations with different plans and settings
- **Tenant-User Relationships**: Connects Keycloak users to tenants with specific roles
- **Sample Tasks**: Creates tasks for each tenant to demonstrate the multi-tenant system

## Files

- `index.ts` - Main seeding logic and helper functions
- `run.ts` - CLI script for running seed commands
- `get-keycloak-users.ts` - Helper to fetch Keycloak user IDs
- `README.md` - This documentation

## Quick Start

### 1. Get Keycloak User IDs

First, you need to find the actual Keycloak user IDs to update the seed script:

```bash
# Make sure Keycloak is running and you have users created
cd apps/api
pnpm tsx src/db/seed/get-keycloak-users.ts
```

This will output a mapping like:

```typescript
const KEYCLOAK_USERS = {
  testuser: "51a1090a-15d7-44bc-afc8-9b1350a4773b", // testuser@example.com
  admin: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", // admin@example.com
};
```

### 2. Update the Seed Script

Copy the user mapping from step 1 and update the `KEYCLOAK_USERS` constant in `apps/api/src/db/seed/index.ts`.

### 3. Run the Seeding

```bash
cd apps/api
pnpm seed seed
```

## Commands

### Full Database Seeding

```bash
pnpm seed seed
```

This will:

1. Clear existing data (tasks, tenant_users, tenants)
2. Create 3 sample tenants
3. Connect your Keycloak users to tenants
4. Create sample tasks for each tenant

### Add User to Tenant

```bash
pnpm seed add-user <tenant-slug> <user-id-or-username> [role]
```

Examples:

```bash
# Add user as member (default role)
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

## Sample Data Created

### Tenants

1. **Acme Corporation** (`acme-corp`)
   - Plan: Enterprise
   - Domain: acme.example.com
   - Features: Advanced analytics, custom branding

2. **Tech Startup Inc** (`tech-startup`)
   - Plan: Pro
   - Features: Team collaboration

3. **Consulting Firm LLC** (`consulting-firm`)
   - Plan: Free
   - Minimal features

### User Roles

The default seeding assigns the `testuser` to all three tenants with different roles:

- **Owner** of Acme Corporation
- **Member** of Tech Startup Inc
- **Admin** of Consulting Firm LLC

### Sample Tasks

Each tenant gets sample tasks relevant to their business type:

- Acme Corp: Corporate tasks (financial reports, board presentations)
- Tech Startup: Development tasks (deployments, code reviews)
- Consulting Firm: Client-focused tasks (meetings, research)

## Keycloak Integration

### User ID Mapping

The seed script uses a `KEYCLOAK_USERS` mapping to connect usernames to Keycloak user IDs:

```typescript
const KEYCLOAK_USERS = {
  testuser: "51a1090a-15d7-44bc-afc8-9b1350a4773b",
  admin: "admin-user-id-here",
  // Add more users as needed
};
```

### Getting User IDs

Use the helper script to fetch actual user IDs from your Keycloak instance:

```bash
pnpm tsx src/db/seed/get-keycloak-users.ts
```

**Requirements:**

- Keycloak must be running
- `KEYCLOAK_CLIENT_SECRET` must be set in your `.env` file
- The client must have admin permissions to read users

### Manual User ID Lookup

If the helper script doesn't work, you can manually find user IDs:

1. Go to Keycloak Admin Console
2. Navigate to your realm → Users
3. Click on a user
4. Copy the ID from the URL or user details

## Environment Variables

Make sure these are set in your `.env` file:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/contradb

# Keycloak (for user ID fetching)
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=tasks-app
KEYCLOAK_CLIENT_ID=tasks-app-api
KEYCLOAK_CLIENT_SECRET=your-client-secret
```

## Troubleshooting

### "Unknown user" Error

If you get an error like "Unknown user: testuser", it means:

1. The username isn't in the `KEYCLOAK_USERS` mapping
2. Update the mapping with the correct Keycloak user ID

### Database Connection Error

Make sure:

1. PostgreSQL is running
2. Database exists (`contradb`)
3. `DATABASE_URL` is correct in `.env`

### Keycloak User Fetching Error

Make sure:

1. Keycloak is running on the correct URL
2. `KEYCLOAK_CLIENT_SECRET` is set
3. The client has admin permissions
4. Realm and client ID are correct

## Development Workflow

1. **Initial Setup**: Run full seeding after setting up the database
2. **Add New Users**: Use `add-user` command when new developers join
3. **Reset Data**: Run full seeding again to reset to clean state
4. **Update Users**: Modify the `KEYCLOAK_USERS` mapping as needed

## Security Notes

- The seed script is for **development only**
- Never run seeding in production
- User IDs in the seed script should match your development Keycloak instance
- The script clears existing data - use with caution
