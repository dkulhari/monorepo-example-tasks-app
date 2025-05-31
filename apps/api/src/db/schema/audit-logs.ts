import { 
  boolean, 
  pgTable, 
  pgEnum,
  text, 
  timestamp, 
  uuid, 
  varchar,
  jsonb,
  index,
  inet
} from "drizzle-orm/pg-core";
import { z } from "zod";
import { users } from "./users";
import { tenants } from "./tenants";

// Audit action enum
export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "read", 
  "update",
  "delete",
  "login",
  "logout",
  "invite",
  "accept_invitation",
  "reject_invitation",
  "assign",
  "unassign",
  "activate",
  "deactivate",
  "suspend",
  "restore",
  "export",
  "import",
  "configure",
  "deploy",
  "execute"
]);

// Resource type enum  
export const resourceTypeEnum = pgEnum("resource_type", [
  "user",
  "tenant",
  "site", 
  "device",
  "task",
  "invitation",
  "association",
  "assignment",
  "configuration",
  "system"
]);

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "set null" }), // Can be null for system-level actions
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }), // Can be null for system actions
  action: auditActionEnum("action").notNull(),
  resourceType: resourceTypeEnum("resource_type").notNull(),
  resourceId: varchar("resource_id", { length: 255 }), // ID of the affected resource
  details: jsonb("details"), // Additional context about the action
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id", { length: 255 }),
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => [
  // Performance indexes for common queries
  index("audit_logs_tenant_id_idx").on(table.tenantId),
  index("audit_logs_user_id_idx").on(table.userId),
  index("audit_logs_action_idx").on(table.action),
  index("audit_logs_resource_type_idx").on(table.resourceType),
  index("audit_logs_resource_id_idx").on(table.resourceId),
  index("audit_logs_timestamp_idx").on(table.timestamp),
  index("audit_logs_success_idx").on(table.success),
  // Composite indexes for common query patterns
  index("audit_logs_tenant_timestamp_idx").on(table.tenantId, table.timestamp),
  index("audit_logs_user_timestamp_idx").on(table.userId, table.timestamp),
  index("audit_logs_resource_timestamp_idx").on(table.resourceType, table.resourceId, table.timestamp),
]);

// Zod schemas
export const selectAuditLogSchema = z.object({
  id: z.string(),
  tenantId: z.string().nullable(),
  userId: z.string().nullable(),
  action: z.enum([
    "create", "read", "update", "delete", "login", "logout", "invite", 
    "accept_invitation", "reject_invitation", "assign", "unassign", 
    "activate", "deactivate", "suspend", "restore", "export", "import", 
    "configure", "deploy", "execute"
  ]),
  resourceType: z.enum([
    "user", "tenant", "site", "device", "task", "invitation", 
    "association", "assignment", "configuration", "system"
  ]),
  resourceId: z.string().nullable(),
  details: z.record(z.any()).nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  sessionId: z.string().nullable(),
  success: z.boolean(),
  errorMessage: z.string().nullable(),
  timestamp: z.date(),
});

export const insertAuditLogSchema = z.object({
  tenantId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  action: z.enum([
    "create", "read", "update", "delete", "login", "logout", "invite", 
    "accept_invitation", "reject_invitation", "assign", "unassign", 
    "activate", "deactivate", "suspend", "restore", "export", "import", 
    "configure", "deploy", "execute"
  ]),
  resourceType: z.enum([
    "user", "tenant", "site", "device", "task", "invitation", 
    "association", "assignment", "configuration", "system"
  ]),
  resourceId: z.string().max(255).optional(),
  details: z.record(z.any()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  sessionId: z.string().max(255).optional(),
  success: z.boolean().optional(),
  errorMessage: z.string().optional(),
});

// Type exports
export type AuditLog = z.infer<typeof selectAuditLogSchema>;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditAction = AuditLog["action"];
export type ResourceType = AuditLog["resourceType"]; 