import { index, json, pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { userTypeEnum } from "./common";

// Create enum
export const userTypeEnumPg = pgEnum("user_type", userTypeEnum);

// Users table - defined without spread operators to work with drizzle-zod
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  keycloakId: varchar("keycloak_id", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  createdBy: uuid("created_by"),
  userType: userTypeEnumPg("user_type").notNull().default("regular"),
  metadata: json("metadata").$type<{
    phone?: string;
    avatar?: string;
    preferences?: {
      language?: string;
      timezone?: string;
      dateFormat?: string;
      notifications?: {
        email?: boolean;
        sms?: boolean;
        inApp?: boolean;
      };
    };
    lastLoginAt?: string;
    lastLoginIp?: string;
    mfaEnabled?: boolean;
    mfaMethod?: "totp" | "sms" | "email";
  }>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, table => ({
  // Indexes for performance
  keycloakIdIdx: index("users_keycloak_id_idx").on(table.keycloakId),
  emailIdx: index("users_email_idx").on(table.email),
  userTypeIdx: index("users_user_type_idx").on(table.userType),
  createdByIdx: index("users_created_by_idx").on(table.createdBy),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Zod schemas using drizzle-zod
export const insertUsersSchema = createInsertSchema(users);
export const selectUsersSchema = createSelectSchema(users);
export const patchUsersSchema = insertUsersSchema.partial();
