import { index, pgTable, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { tenants } from "./tenants-new";
// Reuse role enum
import { roleEnumPg } from "./user-tenant-associations";
import { users } from "./users";

// Tenant Invitations table - defined without spread operators to work with drizzle-zod
export const tenantInvitations = pgTable("tenant_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  role: roleEnumPg("role").notNull().default("member"),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, table => ({
  // Unique constraint - one active invitation per email per tenant
  emailTenantUnique: unique("invitations_email_tenant_unique").on(table.email, table.tenantId),
  // Indexes for performance
  emailIdx: index("invitations_email_idx").on(table.email),
  tenantIdIdx: index("invitations_tenant_id_idx").on(table.tenantId),
  tokenIdx: index("invitations_token_idx").on(table.token),
  expiresAtIdx: index("invitations_expires_at_idx").on(table.expiresAt),
  acceptedIdx: index("invitations_accepted_idx").on(table.acceptedAt),
  // Composite indexes
  tenantAcceptedIdx: index("invitations_tenant_accepted_idx").on(table.tenantId, table.acceptedAt),
}));

// Type exports
export type TenantInvitation = typeof tenantInvitations.$inferSelect;
export type NewTenantInvitation = typeof tenantInvitations.$inferInsert;

// Zod schemas using drizzle-zod
export const insertTenantInvitationsSchema = createInsertSchema(tenantInvitations);
export const selectTenantInvitationsSchema = createSelectSchema(tenantInvitations);
export const patchTenantInvitationsSchema = insertTenantInvitationsSchema.partial();
