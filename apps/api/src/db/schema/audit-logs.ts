import { relations } from "drizzle-orm";
import { index, inet, json, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { auditActionEnum, id, resourceTypeEnum } from "./common";
import { tenants } from "./tenants-new";
import { users } from "./users";

// Create enums
export const auditActionEnumPg = pgEnum("audit_action", auditActionEnum);
export const resourceTypeEnumPg = pgEnum("resource_type", resourceTypeEnum);

// Audit Logs table
export const auditLogs = pgTable("audit_logs", {
  ...id,
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: auditActionEnumPg("action").notNull(),
  resourceType: resourceTypeEnumPg("resource_type").notNull(),
  resourceId: varchar("resource_id", { length: 255 }).notNull(),
  details: json("details").$type<{
    before?: Record<string, any>;
    after?: Record<string, any>;
    metadata?: Record<string, any>;
    reason?: string;
    affectedUsers?: string[];
    affectedResources?: Array<{
      type: string;
      id: string;
    }>;
  }>().default({}),
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
}, table => ({
  // Indexes for performance
  tenantIdIdx: index("audit_logs_tenant_id_idx").on(table.tenantId),
  userIdIdx: index("audit_logs_user_id_idx").on(table.userId),
  actionIdx: index("audit_logs_action_idx").on(table.action),
  resourceTypeIdx: index("audit_logs_resource_type_idx").on(table.resourceType),
  resourceIdIdx: index("audit_logs_resource_id_idx").on(table.resourceId),
  timestampIdx: index("audit_logs_timestamp_idx").on(table.timestamp),
  // Composite indexes for common queries
  tenantTimestampIdx: index("audit_logs_tenant_timestamp_idx").on(table.tenantId, table.timestamp),
  userTimestampIdx: index("audit_logs_user_timestamp_idx").on(table.userId, table.timestamp),
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
