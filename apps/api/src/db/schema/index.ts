/* eslint-disable ts/no-redeclare */
import { boolean, index, pgTable, serial, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { z } from "zod";

// Import all schema tables
import { tenants } from "./tenants";
import { users } from "./users";

// Updated tasks table to reference new users table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  done: boolean("done").notNull().default(false),
  priority: varchar("priority", { length: 20 }).notNull().default("medium"), // low, medium, high, urgent
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, table => [
  index("tasks_tenant_id_idx").on(table.tenantId),
  index("tasks_user_id_idx").on(table.userId),
  index("tasks_priority_idx").on(table.priority),
  index("tasks_due_date_idx").on(table.dueDate),
  index("tasks_done_idx").on(table.done),
]);

// Manual Zod schemas to avoid drizzle-zod compatibility issues
export const selectTasksSchema = z.object({
  id: z.number(),
  tenantId: z.string(),
  userId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  done: z.boolean(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  dueDate: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type selectTasksSchema = z.infer<typeof selectTasksSchema>;

export const insertTasksSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(500),
  description: z.string().optional(),
  done: z.boolean().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueDate: z.date().optional(),
});
export type insertTasksSchema = z.infer<typeof insertTasksSchema>;

export const patchTasksSchema = insertTasksSchema.partial();
export type patchTasksSchema = z.infer<typeof patchTasksSchema>;

export * from "./audit-logs";
export * from "./devices";
export * from "./sites";
export * from "./tenants";
// Export all schemas
export * from "./users";
