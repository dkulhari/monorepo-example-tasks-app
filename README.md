# Hono + React / Vite + PostgreSQL + Keycloak + pnpm workspaces monorepo

A monorepo setup using pnpm workspaces with a Hono API and React / Vite client using PostgreSQL database and Keycloak authentication.

Features:

- Run tasks in parallel across apps / packages with pnpm
- Hono API [proxied with vite](./apps/web/vite.config.ts) during development
- Hono [RPC client](packages/api-client/src/index.ts) built during development for faster inference
- Shared Zod validators with drizzle-zod
- Shared eslint config
- Shared tsconfig

Tech Stack:

- api
  - hono
  - hono openapi
  - keycloak (JWT authentication)
  - stoker
  - drizzle (PostgreSQL)
  - drizzle-zod
- web
  - react
  - vite
  - react-hook-form
  - tanstack router
  - keycloak-js
- infrastructure
  - PostgreSQL (via Docker)
  - Keycloak (via Docker)
  - MinIO (S3-compatible storage)
  - Permify (authorization service)
- dev tooling
  - typescript
  - eslint with `@antfu/eslint-config`

Tour:

- Base [tsconfig.json](./tsconfig.json) with default settings lives in the root
- Shared packages live in [/packages] directory
  - Base [eslint.config.js](./packages/eslint-config/eslint.config.js) with default settings
- Applications live in [/apps] directory
  - Use any cli to create new apps in here
  - If cloning a git repo in here be sure to delete the `.git` folder so it is not treated as a submodule

> All pnpm commands are run from the root of the repo.

## Local Setup

### Prerequisites

- Node.js 18+
- pnpm
- Docker and Docker Compose

### Start Docker services

```sh
docker-compose up -d
```

This will start:
- PostgreSQL on port 5432 (myappdb/myappuser/myapppassword)
- Keycloak on port 8080 (admin/admin)
- MinIO on ports 9000/9001 (adminuser/adminuser)
- Permify on ports 3476/3478

### Install dependencies

```sh
pnpm i
```

### Configure environment variables

```sh
cd apps/api
cp .env.example .env
```

The default values in `.env` match the Docker services.

### Run database migrations

```sh
cd apps/api
pnpm db:push
```

### Configure Keycloak

1. Access Keycloak at http://localhost:8080
2. Login with admin/admin
3. Create a realm named "contrack"
4. Create a client named "contrackapi" with:
   - Client Protocol: openid-connect
   - Client authentication: OFF (makes it a public client)
   - Authorization: OFF
   - Standard flow: ON
   - Direct access grants: ON (optional)
   - Valid Redirect URIs: http://localhost:5173/*
   - Valid post logout redirect URIs: http://localhost:5173/*
   - Web Origins: http://localhost:5173

### Start Apps

```sh
pnpm run dev
```

Visit [http://localhost:5173](http://localhost:5173)

All requests to `/api` will be proxied to the hono server running on [http://localhost:3001](http://localhost:3001)

## Architecture Changes

### From Cloudflare to Docker

This application has been migrated from Cloudflare Workers/D1 to use:
- **PostgreSQL** instead of D1 for the database
- **Node.js server** instead of Cloudflare Workers
- **Keycloak** instead of Auth.js for authentication
- **Docker Compose** for local development infrastructure

### Authentication Flow

1. User clicks "Sign In" in the web app
2. Redirected to Keycloak login page
3. After successful authentication, redirected back with token
4. Token is automatically included in API requests
5. API validates token with Keycloak and associates data with user

## Production Deployment

For production deployment, you'll need:
- A PostgreSQL database
- A Keycloak instance
- Node.js hosting for the API
- Static hosting for the web app

### Build

```sh
pnpm run build
```

## Tasks

### Lint

```sh
pnpm run lint
```

### Test

```sh
pnpm run test
```

### Build

```sh
pnpm run build
```
