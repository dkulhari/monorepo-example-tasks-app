# Hybrid Database + Permify Approach

This document explains our hybrid approach to authorization where we maintain relationships in both the PostgreSQL database and Permify.

## Architecture Overview

### Database (PostgreSQL)

- **Purpose**: Application data storage and queries
- **Role**: Source of truth for all relationships
- **Usage**: Listing, filtering, reporting, UI display

### Permify

- **Purpose**: Authorization decisions only
- **Role**: Permission evaluation engine
- **Usage**: Access control checks via middleware

## Why Hybrid?

### Benefits

1. **Query Performance**: Database JOINs for efficient listing operations
2. **Data Integrity**: Foreign key constraints and transactions
3. **Rich Queries**: Complex filtering, sorting, and aggregations
4. **Fallback**: If Permify is down, data remains accessible
5. **Future ABAC**: Easy to add attributes for attribute-based access control

### Trade-offs

- Dual maintenance (mitigated by sync service)
- Slight complexity increase

## Implementation

### Data Flow

```
User Action → Database Transaction → Permify Sync (async)
                    ↓
              Source of Truth
```

### Sync Pattern

```typescript
// Example: Creating a tenant
await db.transaction(async (tx) => {
  // 1. Database operation (source of truth)
  const [tenant] = await tx.insert(tenants).values({...}).returning();

  // 2. Sync to Permify (non-blocking)
  await dataSync.syncTenantCreation(tenant.id, userId);
});
```

### Error Handling

- Database operations never fail due to Permify errors
- Failed syncs are logged but don't block user actions
- Retry mechanism with exponential backoff
- Migration script to sync existing data

## Relationships Synced

### 1. User → Tenant

```typescript
{
  entity: { type: "tenant", id: tenantId },
  relation: "owner" | "admin" | "member",
  subject: { type: "user", id: userId }
}
```

### 2. Site → Tenant

```typescript
{
  entity: { type: "site", id: siteId },
  relation: "parent",
  subject: { type: "tenant", id: tenantId }
}
```

### 3. Device → Site

```typescript
{
  entity: { type: "device", id: deviceId },
  relation: "site",
  subject: { type: "site", id: siteId }
}
```

### 4. User → System (for system admins)

```typescript
{
  entity: { type: "system", id: "main" },
  relation: "admin",
  subject: { type: "user", id: userId }
}
```

## Operations

### Initial Setup

1. Configure Permify endpoint in `.env`
2. Start API server (auto-initializes Permify schema)
3. Run migration script for existing data:
   ```bash
   pnpm tsx src/db/seed/sync-to-permify.ts
   ```

### Adding New Relationships

1. Define relationship in database schema
2. Update Permify schema if needed
3. Add sync call in handler after database operation
4. Update migration script for bulk sync

### Monitoring

- Check sync errors in application logs
- Use Permify dashboard for relationship inspection
- Database remains authoritative source

## Future Enhancements

### ABAC Support

The hybrid approach is designed to support ABAC:

```typescript
// Future: Sync attributes to Permify
await permifyService.writeAttributes([
  {
    entity: { type: "user", id: userId },
    attribute: "department",
    value: "engineering"
  },
  {
    entity: { type: "site", id: siteId },
    attribute: "criticality",
    value: "high"
  }
]);
```

### Event-Driven Sync

- Use database triggers or CDC for real-time sync
- Message queue for reliable delivery
- Bulk sync for better performance

## Troubleshooting

### Sync Issues

1. Check application logs for sync errors
2. Run migration script to re-sync
3. Verify Permify is accessible
4. Check Permify API key permissions

### Permission Denials

1. Verify relationship exists in database
2. Check if synced to Permify
3. Review Permify schema for permission rules
4. Use Permify check API to debug

### Performance

1. Monitor sync retry queue size
2. Batch sync operations when possible
3. Use Permify cache for frequent checks
4. Consider read replicas for queries
