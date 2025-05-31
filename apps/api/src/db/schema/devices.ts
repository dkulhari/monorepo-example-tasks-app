import { relations } from "drizzle-orm";
import { index, json, pgEnum, pgTable, unique, uuid, varchar } from "drizzle-orm/pg-core";

import { deviceStatusEnum, id, timestamps } from "./common";
import { sites } from "./sites";

// Create enum
export const deviceStatusEnumPg = pgEnum("device_status", deviceStatusEnum);

// Devices table
export const devices = pgTable("devices", {
  ...id,
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  serialNumber: varchar("serial_number", { length: 255 }).notNull(),
  metadata: json("metadata").$type<{
    manufacturer?: string;
    model?: string;
    firmwareVersion?: string;
    hardwareVersion?: string;
    installationDate?: string;
    lastMaintenanceDate?: string;
    nextMaintenanceDate?: string;
    configuration?: Record<string, any>;
    capabilities?: string[];
    location?: {
      building?: string;
      floor?: string;
      room?: string;
      coordinates?: {
        x: number;
        y: number;
        z?: number;
      };
    };
    connectivity?: {
      ipAddress?: string;
      macAddress?: string;
      protocol?: string;
      port?: number;
    };
    customFields?: Record<string, any>;
  }>().default({}),
  status: deviceStatusEnumPg("status").notNull().default("active"),
  ...timestamps,
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
