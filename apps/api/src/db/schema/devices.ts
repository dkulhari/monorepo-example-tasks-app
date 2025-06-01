import { relations } from "drizzle-orm";
import { index, json, pgEnum, pgTable, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { deviceStatusEnum } from "./common";
import { sites } from "./sites";

// Create enum
export const deviceStatusEnumPg = pgEnum("device_status", deviceStatusEnum);

// Devices table - defined without spread operators to work with drizzle-zod
export const devices = pgTable("devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  manufacturer: varchar("manufacturer", { length: 100 }),
  model: varchar("model", { length: 100 }),
  serialNumber: varchar("serial_number", { length: 255 }),
  status: deviceStatusEnumPg("status").notNull().default("active"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  metadata: json("metadata").$type<{
    firmwareVersion?: string;
    hardwareVersion?: string;
    ipAddress?: string;
    macAddress?: string;
    configuration?: Record<string, any>;
    telemetry?: {
      temperature?: number;
      humidity?: number;
      batteryLevel?: number;
      signalStrength?: number;
      uptime?: number;
    };
    maintenanceSchedule?: {
      lastMaintenance?: string;
      nextMaintenance?: string;
      maintenanceInterval?: number;
    };
  }>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, table => ({
  // Unique constraint on serial number
  serialNumberUnique: unique("devices_serial_number_unique").on(table.serialNumber),
  // Indexes for performance
  siteIdIdx: index("devices_site_id_idx").on(table.siteId),
  statusIdx: index("devices_status_idx").on(table.status),
  typeIdx: index("devices_type_idx").on(table.type),
  serialNumberIdx: index("devices_serial_number_idx").on(table.serialNumber),
  // Composite indexes
  siteStatusIdx: index("devices_site_status_idx").on(table.siteId, table.status),
  siteTypeIdx: index("devices_site_type_idx").on(table.siteId, table.type),
}));

// Relations
export const devicesRelations = relations(devices, ({ one }) => ({
  site: one(sites, {
    fields: [devices.siteId],
    references: [sites.id],
  }),
}));

// Type exports
export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;

// Zod schemas using drizzle-zod
export const insertDevicesSchema = createInsertSchema(devices);
export const selectDevicesSchema = createSelectSchema(devices);
export const patchDevicesSchema = insertDevicesSchema.partial();
