import { pgTable, uuid, varchar, timestamp, boolean, unique, index } from "drizzle-orm/pg-core";
import { id, timestamps } from "./common";
import { tenants } from "./tenants-new";
import { users } from "./users";

// Reuse role enum
import { roleEnumPg } from "./user-tenant-associations";

// Tenant Invitations table
export const tenantInvitations = pgTable("tenant_invitations", {
  ...id,
  email: varchar("email", { length: 255 }).notNull(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  role: roleEnumPg("role").notNull().default("member"),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  accepted: boolean("accepted").notNull().default(false),
  ...timestamps,
}, (table) => ({
  // Unique constraint - one active invitation per email per tenant
  emailTenantUnique: unique("invitations_email_tenant_unique").on(table.email, table.tenantId),
  // Indexes for performance
  emailIdx: index("invitations_email_idx").on(table.email),
  tenantIdIdx: index("invitations_tenant_id_idx").on(table.tenantId),
  tokenIdx: index("invitations_token_idx").on(table.token),
  expiresAtIdx: index("invitations_expires_at_idx").on(table.expiresAt),
  acceptedIdx: index("invitations_accepted_idx").on(table.accepted),
  // Composite indexes
  tenantAcceptedIdx: index("invitations_tenant_accepted_idx").on(table.tenantId, table.accepted),
}));

// Type exports
export type TenantInvitation = typeof tenantInvitations.$inferSelect;
export type NewTenantInvitation = typeof tenantInvitations.$inferInsert;