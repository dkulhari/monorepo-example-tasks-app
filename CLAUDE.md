# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack TypeScript monorepo for a **Multitenant IoT API** using pnpm workspaces with:
- **API**: Hono on Node.js with PostgreSQL database (Multitenant IoT API)
- **Web**: React with Vite and TanStack Router
- **Authentication**: Keycloak for user management and JWT tokens
- **Infrastructure**: Docker Compose for local development
- **Multi-tenancy**: Row-level isolation with tenant context middleware
- **IoT Management**: Tenants, users, sites, and devices with role-based access control

## Commands

### Development
```bash
# Install dependencies
pnpm i

# Start both API and web dev servers
pnpm dev

# Run from specific workspace
pnpm --filter api dev
pnpm --filter web dev
```

### Testing
```bash
# Run all tests
pnpm test

# Run specific app tests
pnpm --filter api test
pnpm --filter web test

# Run single test file
pnpm --filter api test src/routes/tenants/tenants.test.ts
```

### Linting & Type Checking
```bash
# Lint all workspaces
pnpm lint

# Fix lint issues
pnpm --filter api lint:fix

# Type check
pnpm --filter api typecheck
pnpm --filter web typecheck
```

### Database Operations
```bash
# Generate migration after schema changes
pnpm --filter api db:generate

# Apply migrations
pnpm --filter api db:migrate

# Push schema changes directly (development)
pnpm --filter api db:push

# Open Drizzle Studio
pnpm --filter api db:studio

# Seed database with sample data
pnpm --filter api seed

# Add user to tenant
pnpm --filter api seed add-user <tenant-slug> <user-id-or-username> [role]
```

### Build & Deploy
```bash
# Build all apps
pnpm build

# Start production servers
pnpm start
```

## Architecture

### API Structure (apps/api/)
- `src/routes/` - API endpoints using Hono router with OpenAPI documentation
  - `tenants/` - Tenant management (9 endpoints)
  - `users/` - User management (6 endpoints)
  - `sites/` - Site management (5 endpoints)
  - `devices/` - Device management (5 endpoints)
  - `README.md` - Complete API documentation
- `src/db/schema/` - Drizzle ORM schema definitions (PostgreSQL)
- `src/db/migrations/` - PostgreSQL migrations
- `src/middleware/` - Authentication, tenant, and error handling middleware
- `src/lib/` - Core utilities and configurations
- Uses Hono RPC for type-safe client generation
- OpenAPI documentation at `/api/doc` (25 endpoints total)
- Runs on Node.js with Express adapter

### Web Structure (apps/web/)
- `src/routes/` - File-based routing with TanStack Router
- `src/components/` - Reusable React components
- `src/lib/` - API client, queries, and utilities
- `src/route-tree.gen.ts` - Auto-generated route tree

### Database Schema

#### Multi-tenant Tables
- **tenants** - Organization/workspace entities:
  - `id` - UUID primary key
  - `slug` - Unique identifier for URL routing
  - `name`, `type`, `status`, `keycloakGroupId`, `settings`
  - Types: enterprise, standard, trial, demo
  - Status: active, suspended, inactive

- **user_tenant_associations** - User membership in tenants:
  - `tenantId` - References tenants table
  - `userId` - Keycloak user ID
  - `role` - owner, admin, member, viewer
  - `status` - active, invited, suspended
  
- **tenant_invitations** - Pending invitations to join tenants

#### IoT Management Tables
- **users** - System users with Keycloak integration:
  - `id` - UUID primary key
  - `keycloakId` - Keycloak user ID
  - `email`, `name`, `userType`, `metadata`
  - Types: system_admin, regular, service_account, guest

- **sites** - Physical locations within tenants:
  - `id` - UUID primary key
  - `tenantId` - References tenants table
  - `name`, `address`, `coordinates`, `timezone`, `status`, `metadata`
  - Status: active, inactive, maintenance

- **devices** - IoT devices deployed at sites:
  - `id` - UUID primary key
  - `siteId` - References sites table
  - `name`, `type`, `serialNumber`, `status`, `metadata`
  - Status: active, inactive, maintenance, offline

### Key Configuration Files
- `.env` - Environment variables for database and Keycloak
- `drizzle.config.ts` - PostgreSQL configuration
- `vite.config.ts` - Vite configuration with API proxy to port 4001
- `tsconfig.json` - TypeScript configuration (shared base)
- `docker-compose.yml` - Infrastructure services

## Development Workflow

1. **Adding API Endpoints**:
   - Create route definition with OpenAPI schema in `*.routes.ts`
   - Implement handler logic in `*.handlers.ts`
   - Export router from `*.index.ts`
   - Register in main router at `/routes/index.ts`
   - Update documentation in `/routes/README.md`
   - Types are automatically available in web app via Hono RPC

2. **Adding Database Tables**:
   - Define schema in `apps/api/src/db/schema/` using PostgreSQL syntax
   - Run `pnpm --filter api db:generate`
   - Apply with `pnpm --filter api db:push` or `pnpm --filter api db:migrate`

3. **Adding Web Routes**:
   - Create file in `apps/web/src/routes/`
   - Routes are file-based with `~` prefix
   - Dynamic segments use `$` prefix

## Multi-tenant IoT Architecture

- **Model**: Shared database with row-level isolation by `tenantId`
- **API Routes**: Pattern `/api/tenants/{tenantId}/resources` for tenant-scoped resources
- **Tenant Resolution**: Via path parameter (primary), subdomain (planned), or `x-tenant` header
- **Middleware**: `tenantMiddleware()` validates tenant access and sets context
- **Authorization**: Keycloak JWT + tenant membership + role-based permissions
- **Hierarchy**: Tenants → Users & Sites → Devices (with proper access control)

### Working with Tenants

1. **Creating Tenant-Aware Resources**:
   - Add `tenantId` to database schema for tenant isolation
   - Use `getTenant(c)` in route handlers to get current tenant context
   - Filter all queries by `tenantId` to ensure data isolation
   - For sites: link to tenant via `tenantId`
   - For devices: link to site via `siteId` (inherits tenant through site)

2. **Accessing Tenant Context**:
   ```typescript
   import { getTenant, getUserRole } from "../middleware/tenant";
   
   const tenant = getTenant(c);
   const userRole = getUserRole(c);
   ```

3. **Role-Based Access Control**:
   ```typescript
   import { requireRole } from "../middleware/tenant";
   
   // Roles: owner, admin, member, viewer
   .use(requireRole(["owner", "admin"]))  // For write operations
   .use(requireRole(["member"]))          // For read operations
   ```

4. **IoT Resource Hierarchy**:
   - **Tenants** contain **Sites** and **Users**
   - **Sites** contain **Devices** 
   - **Users** have roles within **Tenants**
   - All access is validated through tenant membership

## Environment Setup

1. Start Docker services: `docker-compose up -d`
2. Copy environment variables: `cd apps/api && cp .env.example .env`
3. Configure Keycloak realm and client as described in README

Key environment variables:
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=myappuser
DB_PASSWORD=myapppassword
DB_NAME=myappdb

# Keycloak
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=iot-app
KEYCLOAK_CLIENT_ID=iot-app-api
KEYCLOAK_CLIENT_SECRET=your-client-secret

# API
PORT=4001
```

## API Endpoints

The Multitenant IoT API provides 25 fully documented endpoints:

### Tenant Management (9 endpoints)

- `GET /api/tenants` - List user's tenants
- `POST /api/tenants` - Create new tenant
- `GET /api/tenants/{id}` - Get tenant details
- `PATCH /api/tenants/{id}` - Update tenant
- `DELETE /api/tenants/{id}` - Delete tenant
- `GET /api/tenants/{id}/users` - List tenant users
- `POST /api/tenants/{id}/invite` - Invite user to tenant
- `PATCH /api/tenants/{tenantId}/users/{userId}` - Update user role
- `DELETE /api/tenants/{tenantId}/users/{userId}` - Remove user from tenant

### User Management (6 endpoints)

- `GET /api/users` - List all users (system admin only)
- `POST /api/users` - Create new user (system admin only)
- `GET /api/users/{id}` - Get user details
- `PATCH /api/users/{id}` - Update user profile
- `DELETE /api/users/{id}` - Delete user (system admin only)
- `GET /api/users/me` - Get current user profile

### Site Management (5 endpoints)

- `GET /api/tenants/{tenantId}/sites` - List tenant sites
- `POST /api/tenants/{tenantId}/sites` - Create new site
- `GET /api/tenants/{tenantId}/sites/{id}` - Get site details
- `PATCH /api/tenants/{tenantId}/sites/{id}` - Update site
- `DELETE /api/tenants/{tenantId}/sites/{id}` - Delete site

### Device Management (5 endpoints)

- `GET /api/tenants/{tenantId}/sites/{siteId}/devices` - List site devices
- `POST /api/tenants/{tenantId}/sites/{siteId}/devices` - Register new device
- `GET /api/tenants/{tenantId}/sites/{siteId}/devices/{id}` - Get device details
- `PATCH /api/tenants/{tenantId}/sites/{siteId}/devices/{id}` - Update device
- `DELETE /api/tenants/{tenantId}/sites/{siteId}/devices/{id}` - Decommission device

**API Documentation**: Complete interactive documentation available at `http://localhost:4001/api/doc`
**Route Documentation**: Detailed documentation in `apps/api/src/routes/README.md`

## Important Notes

- **Multitenant IoT API** runs on Node.js server (port 4001 by default)
- Web app proxies `/api` requests to Node.js server during development
- PostgreSQL database managed by Drizzle ORM with multi-tenant row-level security
- Keycloak handles all authentication and user management
- All endpoints have comprehensive OpenAPI documentation with request/response schemas
- Role-based access control: owner, admin, member, viewer
- Uses @antfu/eslint-config for consistent code style
- All apps use TypeScript with strict mode enabled
- Docker Compose provides all infrastructure services
