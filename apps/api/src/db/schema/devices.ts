import { 
  boolean, 
  pgTable, 
  pgEnum,
  timestamp, 
  uuid, 
  varchar,
  jsonb,
  index
} from "drizzle-orm/pg-core";
import { z } from "zod";
import { sites } from "./sites";

// Device type and status enums
export const deviceTypeEnum = pgEnum("device_type", [
  "sensor",
  "controller",
  "gateway",
  "camera",
  "actuator",
  "meter",
  "beacon",
  "router",
  "server",
  "workstation"
]);

export const deviceStatusEnum = pgEnum("device_status", [
  "online",
  "offline",
  "maintenance",
  "error",
  "decommissioned"
]);

// Devices table
export const devices = pgTable("devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  type: deviceTypeEnum("type").notNull(),
  serialNumber: varchar("serial_number", { length: 255 }).unique(),
  model: varchar("model", { length: 255 }),
  manufacturer: varchar("manufacturer", { length: 255 }),
  firmwareVersion: varchar("firmware_version", { length: 100 }),
  metadata: jsonb("metadata"), // Store additional device metadata (config, specs, etc.)
  status: deviceStatusEnum("status").notNull().default("offline"),
  lastSeenAt: timestamp("last_seen_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("devices_site_id_idx").on(table.siteId),
  index("devices_name_idx").on(table.name),
  index("devices_type_idx").on(table.type),
  index("devices_status_idx").on(table.status),
  index("devices_serial_number_idx").on(table.serialNumber),
  index("devices_last_seen_at_idx").on(table.lastSeenAt),
]);

// Zod schemas
export const selectDeviceSchema = z.object({
  id: z.string(),
  siteId: z.string(),
  name: z.string(),
  type: z.enum(["sensor", "controller", "gateway", "camera", "actuator", "meter", "beacon", "router", "server", "workstation"]),
  serialNumber: z.string().nullable(),
  model: z.string().nullable(),
  manufacturer: z.string().nullable(),
  firmwareVersion: z.string().nullable(),
  metadata: z.record(z.any()).nullable(),
  status: z.enum(["online", "offline", "maintenance", "error", "decommissioned"]),
  lastSeenAt: z.date().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertDeviceSchema = z.object({
  siteId: z.string().uuid(),
  name: z.string().min(1).max(255),
  type: z.enum(["sensor", "controller", "gateway", "camera", "actuator", "meter", "beacon", "router", "server", "workstation"]),
  serialNumber: z.string().max(255).optional(),
  model: z.string().max(255).optional(),
  manufacturer: z.string().max(255).optional(),
  firmwareVersion: z.string().max(100).optional(),
  metadata: z.record(z.any()).optional(),
  status: z.enum(["online", "offline", "maintenance", "error", "decommissioned"]).optional(),
  isActive: z.boolean().optional(),
});

export const patchDeviceSchema = insertDeviceSchema.partial();

// Type exports
export type Device = z.infer<typeof selectDeviceSchema>;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type PatchDevice = z.infer<typeof patchDeviceSchema>;
export type DeviceType = Device["type"];
export type DeviceStatus = Device["status"]; 