/* eslint-disable ts/no-redeclare */
import { boolean, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { z } from "zod";

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  name: text("name").notNull(),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

// Manual Zod schemas to avoid drizzle-zod compatibility issues
export const selectTasksSchema = z.object({
  id: z.number(),
  userId: z.string(),
  name: z.string(),
  done: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type selectTasksSchema = z.infer<typeof selectTasksSchema>;

export const insertTasksSchema = z.object({
  name: z.string().min(1).max(500),
  done: z.boolean(),
});
export type insertTasksSchema = z.infer<typeof insertTasksSchema>;

export const patchTasksSchema = insertTasksSchema.partial();
export type patchTasksSchema = z.infer<typeof patchTasksSchema>;

// Export tenant tables
export * from "./tenants";
