import {
  type AnyPgColumn,
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod";

// User type enum
export const userTypeEnum = pgEnum("user_type", [
  "system_admin",
  "tenant_admin",
  "regular_user",
  "service_account",
  "guest_user",
]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  keycloakId: varchar("keycloak_id", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  createdBy: uuid("created_by").references((): AnyPgColumn => users.id),
  userType: userTypeEnum("user_type").notNull().default("regular_user"),
  metadata: jsonb("metadata"), // Store additional user metadata
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, table => [
  index("users_keycloak_id_idx").on(table.keycloakId),
  index("users_email_idx").on(table.email),
  index("users_user_type_idx").on(table.userType),
  index("users_created_by_idx").on(table.createdBy),
]);

// Zod schemas
export const selectUserSchema = z.object({
  id: z.string(),
  keycloakId: z.string(),
  email: z.string().email(),
  name: z.string(),
  createdBy: z.string().nullable(),
  userType: z.enum(["system_admin", "tenant_admin", "regular_user", "service_account", "guest_user"]),
  metadata: z.record(z.any()).nullable(),
  isActive: z.boolean(),
  lastLoginAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertUserSchema = z.object({
  keycloakId: z.string().min(1).max(255),
  email: z.string().email().max(255),
  name: z.string().min(1).max(255),
  createdBy: z.string().uuid().optional(),
  userType: z.enum(["system_admin", "tenant_admin", "regular_user", "service_account", "guest_user"]).optional(),
  metadata: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

export const patchUserSchema = insertUserSchema.partial();

// Type exports
export type User = z.infer<typeof selectUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type PatchUser = z.infer<typeof patchUserSchema>;
export type UserType = User["userType"];
