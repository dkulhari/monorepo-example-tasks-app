import { relations } from "drizzle-orm";
import { index, json, pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { auditActionEnum, resourceTypeEnum } from "./common";
import { tenants } from "./tenants-new";
import { users } from "./users";

// Create enums
export const auditActionEnumPg = pgEnum("audit_action", auditActionEnum);
export const resourceTypeEnumPg = pgEnum("resource_type", resourceTypeEnum);

// Audit Logs table - defined without spread operators to work with drizzle-zod
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: auditActionEnumPg("action").notNull(),
  resourceType: resourceTypeEnumPg("resource_type").notNull(),
  resourceId: varchar("resource_id", { length: 255 }),
  metadata: json("metadata").$type<{
    ipAddress?: string;
    userAgent?: string;
    changes?: Record<string, {
      from: unknown;
      to: unknown;
    }>;
    reason?: string;
    affectedUsers?: string[];
    duration?: number;
  }>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => ({
  // Indexes for performance
  tenantIdIdx: index("audit_logs_tenant_id_idx").on(table.tenantId),
  userIdIdx: index("audit_logs_user_id_idx").on(table.userId),
  actionIdx: index("audit_logs_action_idx").on(table.action),
  resourceTypeIdx: index("audit_logs_resource_type_idx").on(table.resourceType),
  resourceIdIdx: index("audit_logs_resource_id_idx").on(table.resourceId),
  timestampIdx: index("audit_logs_timestamp_idx").on(table.createdAt),
  // Composite indexes for common queries
  tenantTimestampIdx: index("audit_logs_tenant_timestamp_idx").on(table.tenantId, table.createdAt),
  userTimestampIdx: index("audit_logs_user_timestamp_idx").on(table.userId, table.createdAt),
  resourceIdx: index("audit_logs_resource_idx").on(table.resourceType, table.resourceId),
  tenantActionIdx: index("audit_logs_tenant_action_idx").on(table.tenantId, table.action),
}));

// Relations
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [auditLogs.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Type exports
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

// Zod schemas using drizzle-zod
export const insertAuditLogsSchema = createInsertSchema(auditLogs);
export const selectAuditLogsSchema = createSelectSchema(auditLogs);
export const patchAuditLogsSchema = insertAuditLogsSchema.partial();
