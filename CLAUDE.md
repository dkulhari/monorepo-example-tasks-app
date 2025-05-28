# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack TypeScript monorepo using pnpm workspaces with:
- **API**: Hono on Node.js with PostgreSQL database
- **Web**: React with Vite and TanStack Router
- **Authentication**: Keycloak for user management and JWT tokens
- **Infrastructure**: Docker Compose for local development
- **Multi-tenancy**: Row-level isolation with tenant context middleware

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
pnpm --filter api test src/routes/tasks/tasks.test.ts
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
- `src/routes/` - API endpoints using Hono router
- `src/db/schema/` - Drizzle ORM schema definitions (PostgreSQL)
- `src/db/migrations/` - PostgreSQL migrations
- `src/middleware/` - Authentication, tenant, and error handling middleware
- `src/lib/` - Core utilities and configurations
- Uses Hono RPC for type-safe client generation
- OpenAPI documentation at `/docs`
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
  - `name`, `domain`, `settings`, `plan`, `isActive`

- **tenant_users** - User membership in tenants:
  - `tenantId` - References tenants table
  - `userId` - Keycloak user ID
  - `role` - owner, admin, or member
  
- **tenant_invitations** - Pending invitations to join tenants

#### Application Tables  
- **tasks** - Tenant-scoped tasks:
  - `id` - Serial primary key
  - `tenantId` - References tenants table
  - `userId` - Keycloak user ID
  - `name`, `done`, `createdAt`, `updatedAt`

### Key Configuration Files
- `.env` - Environment variables for database and Keycloak
- `drizzle.config.ts` - PostgreSQL configuration
- `vite.config.ts` - Vite configuration with API proxy to port 3001
- `tsconfig.json` - TypeScript configuration (shared base)
- `docker-compose.yml` - Infrastructure services

## Development Workflow

1. **Adding API Endpoints**:
   - Create handler in `apps/api/src/routes/[resource]/`
   - Export router from index file
   - Types are automatically available in web app

2. **Adding Database Tables**:
   - Define schema in `apps/api/src/db/schema/` using PostgreSQL syntax
   - Run `pnpm --filter api db:generate`
   - Apply with `pnpm --filter api db:push` or `pnpm --filter api db:migrate`

3. **Adding Web Routes**:
   - Create file in `apps/web/src/routes/`
   - Routes are file-based with `~` prefix
   - Dynamic segments use `$` prefix

## Multi-tenant Architecture

- **Model**: Shared database with row-level isolation by `tenant_id`
- **API Routes**: Pattern `/api/tenants/{tenantId}/resources`
- **Tenant Resolution**: Via subdomain, path parameter, or `x-tenant` header
- **Middleware**: `tenantMiddleware()` validates tenant access and sets context
- **Authorization**: Keycloak JWT + tenant membership + role-based permissions

### Working with Tenants

1. **Creating Tenant-Aware Resources**:
   - Add `tenantId` to database schema
   - Use `getTenant(c)` in route handlers to get current tenant
   - Filter queries by `tenantId`

2. **Accessing Tenant Context**:
   ```typescript
   import { getTenant, getUserRole } from "../middleware/tenant";
   
   const tenant = getTenant(c);
   const userRole = getUserRole(c);
   ```

3. **Role-Based Access**:
   ```typescript
   import { requireRole } from "../middleware/tenant";
   
   .use(requireRole(["owner", "admin"]))
   ```

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
KEYCLOAK_REALM=tasks-app
KEYCLOAK_CLIENT_ID=tasks-app-api
KEYCLOAK_CLIENT_SECRET=your-client-secret

# API
PORT=3001
```

## Important Notes

- API runs on Node.js server (port 3001 by default)
- Web app proxies `/api` requests to Node.js server during development
- PostgreSQL database managed by Drizzle ORM
- Keycloak handles all authentication and user management
- Uses @antfu/eslint-config for consistent code style
- All apps use TypeScript with strict mode enabled
- Docker Compose provides all infrastructure services