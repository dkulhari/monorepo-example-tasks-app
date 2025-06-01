import { AnyPgColumn, PgTableWithColumns, TableConfig, pgTable } from "drizzle-orm/pg-core";
import { timestamp, uuid } from "drizzle-orm/pg-core";

// Define types for our common columns
export type WithId = {
  id: ReturnType<typeof uuid>;
};

export type WithTimestamps = {
  createdAt: ReturnType<typeof timestamp>;
  updatedAt: ReturnType<typeof timestamp>;
};

// Factory function to create tables with common fields
export function createTableWithDefaults<T extends Record<string, AnyPgColumn>>(
  name: string,
  columns: T,
  includeId = true,
  includeTimestamps = true
): PgTableWithColumns<TableConfig<
  T & (typeof includeId extends true ? WithId : {}) & (typeof includeTimestamps extends true ? WithTimestamps : {})
>> {
  const tableColumns: any = { ...columns };

  if (includeId) {
    tableColumns.id = uuid("id").primaryKey().defaultRandom();
  }

  if (includeTimestamps) {
    tableColumns.createdAt = timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow();
    tableColumns.updatedAt = timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date());
  }

  return pgTable(name, tableColumns) as any;
}