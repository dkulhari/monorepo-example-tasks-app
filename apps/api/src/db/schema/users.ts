import { index, json, pgEnum, pgTable, uuid, varchar } from "drizzle-orm/pg-core";

import { id, timestamps, userTypeEnum } from "./common";

// Create enum
export const userTypeEnumPg = pgEnum("user_type", userTypeEnum);

// Users table
export const users = pgTable("users", {
  ...id,
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
  ...timestamps,
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
