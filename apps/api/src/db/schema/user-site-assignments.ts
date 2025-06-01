import { relations } from "drizzle-orm";
import { index, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { sites } from "./sites";
import { tenants } from "./tenants-new";
import { roleEnumPg } from "./user-tenant-associations";
import { users } from "./users";

// User-Site Assignments table (many-to-many) - defined without spread operators to work with drizzle-zod
export const userSiteAssignments = pgTable("user_site_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: roleEnumPg("role").notNull().default("member"),
  assignedBy: uuid("assigned_by").references(() => users.id),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, table => ({
  // Composite primary key
  pk: primaryKey({ columns: [table.userId, table.siteId] }),
  // Indexes for performance
  userIdIdx: index("user_site_user_id_idx").on(table.userId),
  siteIdIdx: index("user_site_site_id_idx").on(table.siteId),
  // Composite indexes for common queries
  userSiteIdx: index("user_site_user_site_idx").on(table.userId, table.siteId),
  roleIdx: index("user_site_role_idx").on(table.role),
}));

// Relations
export const userSiteAssignmentsRelations = relations(userSiteAssignments, ({ one }) => ({
  user: one(users, {
    fields: [userSiteAssignments.userId],
    references: [users.id],
  }),
  site: one(sites, {
    fields: [userSiteAssignments.siteId],
    references: [sites.id],
  }),
  assignedByUser: one(users, {
    fields: [userSiteAssignments.assignedBy],
    references: [users.id],
  }),
}));

// Type exports
export type UserSiteAssignment = typeof userSiteAssignments.$inferSelect;
export type NewUserSiteAssignment = typeof userSiteAssignments.$inferInsert;

// Zod schemas using drizzle-zod
export const insertUserSiteAssignmentsSchema = createInsertSchema(userSiteAssignments);
export const selectUserSiteAssignmentsSchema = createSelectSchema(userSiteAssignments);
export const patchUserSiteAssignmentsSchema = insertUserSiteAssignmentsSchema.partial();
