# API Routes Documentation

This directory contains all the API route definitions for the Multitenant IoT API. The API follows RESTful conventions with multi-tenant architecture and role-based access control.

## Architecture Overview

- **Framework**: Hono with OpenAPI support
- **Authentication**: Keycloak JWT tokens
- **Multi-tenancy**: Row-level isolation with tenant context middleware
- **Documentation**: Auto-generated OpenAPI/Swagger docs at `/api/doc`

## Base URL

- **Development**: `http://localhost:4001/api`
- **Documentation**: `http://localhost:4001/api/doc`

## Authentication

All protected endpoints require a JWT token from Keycloak:

```bash
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### Index

- `GET /api` - API health check and basic information

---

## Tenant Management

Multi-tenant organization management with role-based access control.

### Core Tenant Operations

| Method   | Endpoint            | Summary             | Access Level           |
| -------- | ------------------- | ------------------- | ---------------------- |
| `GET`    | `/api/tenants`      | List user's tenants | Any authenticated user |
| `POST`   | `/api/tenants`      | Create a new tenant | Any authenticated user |
| `GET`    | `/api/tenants/{id}` | Get tenant details  | Tenant members         |
| `PATCH`  | `/api/tenants/{id}` | Update tenant       | Owners & Admins        |
| `DELETE` | `/api/tenants/{id}` | Delete tenant       | Owners only            |

### Tenant User Management

| Method   | Endpoint                                 | Summary                 | Access Level    |
| -------- | ---------------------------------------- | ----------------------- | --------------- |
| `GET`    | `/api/tenants/{id}/users`                | List tenant users       | Owners & Admins |
| `POST`   | `/api/tenants/{id}/invite`               | Invite user to tenant   | Owners & Admins |
| `PATCH`  | `/api/tenants/{tenantId}/users/{userId}` | Update user role        | Owners & Admins |
| `DELETE` | `/api/tenants/{tenantId}/users/{userId}` | Remove user from tenant | Owners & Admins |

#### Tenant Roles

- **Owner**: Full access, can delete tenant, manage all users
- **Admin**: Manage users, sites, and devices (except tenant deletion)
- **Member**: View and basic operations
- **Viewer**: Read-only access

#### Tenant Types

- **Enterprise**: Full-featured tenant for large organizations
- **Standard**: Standard tenant for regular use
- **Trial**: Limited-time trial tenant
- **Demo**: Demonstration tenant with restricted features

#### Tenant Status

- **Active**: Fully operational tenant
- **Suspended**: Temporarily disabled tenant
- **Inactive**: Disabled tenant

---

## User Management

System-wide user management with role-based access control.

### User Operations

| Method   | Endpoint          | Summary                  | Access Level           |
| -------- | ----------------- | ------------------------ | ---------------------- |
| `GET`    | `/api/users`      | List all users           | System admins only     |
| `POST`   | `/api/users`      | Create a new user        | System admins only     |
| `GET`    | `/api/users/{id}` | Get user details         | Self or system admins  |
| `PATCH`  | `/api/users/{id}` | Update user profile      | Self or system admins  |
| `DELETE` | `/api/users/{id}` | Delete user              | System admins only     |
| `GET`    | `/api/users/me`   | Get current user profile | Any authenticated user |

#### User Types

- **system_admin**: Full system access, can manage all users and tenants
- **regular**: Standard user with tenant-based access
- **service_account**: Automated service accounts
- **guest**: Limited access guest users

---

## Site Management

Physical location management within tenants.

### Site Operations

| Method   | Endpoint                             | Summary                 | Access Level    |
| -------- | ------------------------------------ | ----------------------- | --------------- |
| `GET`    | `/api/tenants/{tenantId}/sites`      | List tenant sites       | Tenant members  |
| `POST`   | `/api/tenants/{tenantId}/sites`      | Create a new site       | Owners & Admins |
| `GET`    | `/api/tenants/{tenantId}/sites/{id}` | Get site details        | Tenant members  |
| `PATCH`  | `/api/tenants/{tenantId}/sites/{id}` | Update site information | Owners & Admins |
| `DELETE` | `/api/tenants/{tenantId}/sites/{id}` | Delete site             | Owners & Admins |

#### Site Properties

- **Name**: Human-readable site identifier
- **Address**: Physical address (optional)
- **Coordinates**: Latitude/longitude for mapping (optional)
- **Timezone**: Site timezone for scheduling
- **Status**: active, inactive, maintenance
- **Metadata**: Custom site configuration

#### Site Status

- **Active**: Operational site with active devices
- **Inactive**: Disabled site
- **Maintenance**: Site under maintenance

---

## Device Management

Physical device management within sites.

### Device Operations

| Method   | Endpoint                                              | Summary                     | Access Level    |
| -------- | ----------------------------------------------------- | --------------------------- | --------------- |
| `GET`    | `/api/tenants/{tenantId}/sites/{siteId}/devices`      | List site devices           | Tenant members  |
| `POST`   | `/api/tenants/{tenantId}/sites/{siteId}/devices`      | Register new device         | Owners & Admins |
| `GET`    | `/api/tenants/{tenantId}/sites/{siteId}/devices/{id}` | Get device details          | Tenant members  |
| `PATCH`  | `/api/tenants/{tenantId}/sites/{siteId}/devices/{id}` | Update device configuration | Owners & Admins |
| `DELETE` | `/api/tenants/{tenantId}/sites/{siteId}/devices/{id}` | Decommission device         | Owners & Admins |

#### Device Properties

- **Name**: Human-readable device identifier
- **Type**: Device category or model
- **Serial Number**: Unique device identifier (must be unique within tenant)
- **Status**: active, inactive, maintenance, offline
- **Metadata**: Custom device configuration and telemetry

#### Device Status

- **Active**: Operational device
- **Inactive**: Disabled device
- **Maintenance**: Device under maintenance
- **Offline**: Device not responding

---

## Error Handling

### Standard HTTP Status Codes

| Code  | Description          | When Used                         |
| ----- | -------------------- | --------------------------------- |
| `200` | OK                   | Successful GET/PATCH operations   |
| `201` | Created              | Successful POST operations        |
| `204` | No Content           | Successful DELETE operations      |
| `400` | Bad Request          | Invalid request data              |
| `401` | Unauthorized         | Missing or invalid authentication |
| `403` | Forbidden            | Insufficient permissions          |
| `404` | Not Found            | Resource not found                |
| `409` | Conflict             | Resource already exists           |
| `422` | Unprocessable Entity | Validation errors                 |

### Error Response Format

```json
{
  "message": "Error description",
  "error": {
    "issues": [
      {
        "code": "validation_error",
        "path": ["field_name"],
        "message": "Field-specific error message"
      }
    ],
    "name": "ValidationError"
  },
  "success": false
}
```

---

## Multi-Tenant Architecture

### Tenant Isolation

- **Row-level Security**: All data is filtered by `tenantId`
- **API Routes**: Follow pattern `/api/tenants/{tenantId}/resources`
- **Middleware**: Automatic tenant validation and context injection

### Tenant Resolution

The API supports multiple methods for tenant identification:

1. **Path Parameter**: `/api/tenants/{tenantId}/...` (primary)
2. **Subdomain**: `tenant-slug.domain.com` (planned)
3. **Header**: `X-Tenant: tenant-id` (fallback)

### Access Control

- Users must have explicit membership in a tenant
- Role-based permissions within each tenant
- System admins have cross-tenant access

---

## Development Guidelines

### Adding New Endpoints

1. **Create Route Definition**: Define OpenAPI schema in `*.routes.ts`
2. **Implement Handler**: Business logic in `*.handlers.ts`
3. **Register Router**: Export from `*.index.ts`
4. **Update Main Router**: Add to `/routes/index.ts`
5. **Update Documentation**: Add to this README

### Route File Structure

```text
routes/
├── README.md                    # This file
├── index.ts                     # Main router registration
├── index.route.ts               # Health check endpoint
├── tenants/
│   ├── tenants.routes.ts        # OpenAPI route definitions
│   ├── tenants.handlers.ts      # Business logic handlers
│   └── tenants.index.ts         # Router setup
├── users/
│   ├── users.routes.ts
│   ├── users.handlers.ts
│   └── users.index.ts
├── sites/
│   ├── sites.routes.ts
│   ├── sites.handlers.ts
│   └── sites.index.ts
└── devices/
    ├── devices.routes.ts
    ├── devices.handlers.ts
    └── devices.index.ts
```

### Naming Conventions

- **Routes**: Use kebab-case for paths (`/api/tenant-users`)
- **Handlers**: Use camelCase for function names (`getUserTenants`)
- **Parameters**: Use camelCase for route parameters (`{tenantId}`)
- **Files**: Use kebab-case for filenames (`tenant-users.routes.ts`)

### Security Best Practices

1. **Always authenticate**: Use `requireUser()` middleware
2. **Validate tenant access**: Use `getTenant()` and validate ownership
3. **Check permissions**: Use `requireRole()` for role-based access
4. **Validate input**: Use Zod schemas for all request data
5. **Sanitize output**: Never expose sensitive internal data

---

## Testing

### Manual Testing

```bash
# Health check
curl http://localhost:4001/api

# Get user's tenants (requires auth)
curl -H "Authorization: Bearer <token>" \
     http://localhost:4001/api/tenants

# Create new tenant
curl -X POST \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Org","slug":"test-org"}' \
     http://localhost:4001/api/tenants
```

### API Documentation

Visit `http://localhost:4001/api/doc` for interactive API documentation with:

- Complete endpoint reference
- Request/response schemas
- Authentication requirements
- Example requests and responses

---

## Migration and Versioning

### Current Version: v1.0.0

- Initial release with full multi-tenant support
- Complete CRUD operations for tenants, users, sites, and devices
- Role-based access control
- OpenAPI documentation

### Breaking Changes

When making breaking changes:

1. Increment major version
2. Update this documentation
3. Provide migration guide
4. Maintain backward compatibility when possible

---

## Related Documentation

- [Main Project README](../../../README.md)
- [Database Schema](../db/schema/README.md)
- [Authentication Setup](../../../KEYCLOAK_SETTINGS.md)
- [Multi-tenant Guide](../../../MULTITENANT.md)
- [API Client Usage](../../../packages/api-client/README.md)

---

_Last Updated: January 31, 2025_
_Total Endpoints: 25 (1 health + 9 tenants + 6 users + 5 sites + 5 devices)_
