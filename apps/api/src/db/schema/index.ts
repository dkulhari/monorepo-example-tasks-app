/* eslint-disable ts/no-redeclare */
import type { z } from "zod";

import { boolean, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  name: text("name").notNull(),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const selectTasksSchema = createSelectSchema(tasks);
export type selectTasksSchema = z.infer<typeof selectTasksSchema>;

export const insertTasksSchema = createInsertSchema(
  tasks,
  {
    name: schema => schema.min(1).max(500),
  },
).required({
  done: true,
}).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});
export type insertTasksSchema = z.infer<typeof insertTasksSchema>;

export const patchTasksSchema = insertTasksSchema.partial();
export type patchTasksSchema = z.infer<typeof patchTasksSchema>;
