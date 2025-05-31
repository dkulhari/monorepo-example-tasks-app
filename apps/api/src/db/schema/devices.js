import { pgTable, uuid, varchar, pgEnum, json, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { id, timestamps, deviceStatusEnum } from "./common";
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
    metadata: json("metadata").$type().default({}),
    status: deviceStatusEnumPg("status").notNull().default("active"),
    ...timestamps,
}, (table) => ({
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
