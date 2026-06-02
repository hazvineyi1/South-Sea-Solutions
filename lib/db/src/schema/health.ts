import { pgTable, uuid, text, integer, doublePrecision, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vehiclesTable } from "./fleet";

// A snapshot of engine and vehicle health telemetry, as a device would report it
// off the CAN bus / OBD-II. The latest snapshot per vehicle drives the health
// score and the diagnostics view.
export const vehicleHealthTable = pgTable("vehicle_health", {
  id: uuid("id").primaryKey().defaultRandom(),
  vehicleId: uuid("vehicle_id")
    .notNull()
    .references(() => vehiclesTable.id),
  engineTempC: integer("engine_temp_c"),
  coolantTempC: integer("coolant_temp_c"),
  oilPressureKpa: integer("oil_pressure_kpa"),
  oilLifePct: integer("oil_life_pct"),
  batteryV: doublePrecision("battery_v"),
  tirePressureKpa: integer("tire_pressure_kpa"),
  engineHours: integer("engine_hours"),
  defLevelPct: integer("def_level_pct"),
  // Malfunction Indicator Lamp (check-engine light) state from the ECU.
  milOn: boolean("mil_on").notNull().default(false),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
});

export const insertVehicleHealthSchema = createInsertSchema(vehicleHealthTable).omit({ id: true });
export type InsertVehicleHealth = z.infer<typeof insertVehicleHealthSchema>;
export type VehicleHealth = typeof vehicleHealthTable.$inferSelect;

// A diagnostic trouble code raised by the vehicle ECU (OBD-II DTC or J1939
// SPN/FMI), grouped by the system it relates to.
export const faultSystems = ["ENGINE", "BRAKES", "EMISSIONS", "ELECTRICAL", "TRANSMISSION", "TYRES", "OTHER"] as const;
export type FaultSystem = (typeof faultSystems)[number];

export const faultCodesTable = pgTable("fault_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  vehicleId: uuid("vehicle_id")
    .notNull()
    .references(() => vehiclesTable.id),
  code: text("code").notNull(),
  description: text("description").notNull(),
  system: text("system").notNull().default("OTHER"),
  severity: text("severity").notNull().default("LOW"),
  active: boolean("active").notNull().default(true),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  clearedAt: timestamp("cleared_at", { withTimezone: true }),
});

export const insertFaultCodeSchema = createInsertSchema(faultCodesTable).omit({ id: true });
export type InsertFaultCode = z.infer<typeof insertFaultCodeSchema>;
export type FaultCode = typeof faultCodesTable.$inferSelect;
