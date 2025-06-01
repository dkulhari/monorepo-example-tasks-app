# Drizzle-Zod Spread Operator Issue

## The Problem

When using spread operators in Drizzle table definitions with `drizzle-zod`, TypeScript cannot properly infer the column types. This results in the error:

```
Argument of type 'PgTableWithColumns<...>' is not assignable to parameter of type 'Table<TableConfig<Column<any, object, object>>>'.
The types of '_.config.columns' are incompatible between these types.
```

## Example of the Issue

```typescript
// common.ts
export const id = {
  id: uuid("id").primaryKey().defaultRandom(),
};

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
};

// tenants.ts
const tenants = pgTable("tenants", {
  ...id,  // Spread operator causes type inference issues
  name: varchar("name", { length: 255 }).notNull(),
  ...timestamps,  // Spread operator causes type inference issues
});

// This will fail with type error:
const insertTenantsSchema = createInsertSchema(tenants);
```

## Why This Happens

The TypeScript compiler loses type information when using spread operators with Drizzle's table builder API. The `createInsertSchema` and `createSelectSchema` functions from `drizzle-zod` expect a specific type structure that gets disrupted by the spread operation.

## Solutions

### Option 1: Define Tables Without Spread Operators (Recommended)

Instead of using spread operators, define columns directly:

```typescript
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// This will work:
export const insertTenantsSchema = createInsertSchema(tenants);
export const selectTenantsSchema = createSelectSchema(tenants);
```

### Option 2: Use a Helper Function

Create a helper function that returns the column definitions:

```typescript
function withTimestamps() {
  return {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  };
}

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  ...withTimestamps(),  // Function call preserves types better
});
```

### Option 3: Manual Zod Schema Definition

If you must use spread operators, define Zod schemas manually:

```typescript
import { z } from "zod";

export const insertTenantsSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100),
  // ... other fields
});

export const selectTenantsSchema = insertTenantsSchema.extend({
  id: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
```

## Current Status

This is a known limitation with the current versions of drizzle-zod when using spread operators. The Drizzle team is aware of this issue, but until it's fixed, one of the above workarounds must be used.