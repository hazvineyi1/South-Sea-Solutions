import { pgTable, uuid, text, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { driversTable } from "./driver";
import { vehiclesTable } from "./fleet";

export const tripPingsTable = pgTable("trip_pings", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id")
    .notNull()
    .references(() => driversTable.id),
  vehicleId: uuid("vehicle_id")
    .notNull()
    .references(() => vehiclesTable.id),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  speedKph: integer("speed_kph").notNull(),
  placeLabel: text("place_label"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
});

export const insertTripPingSchema = createInsertSchema(tripPingsTable).omit({ id: true });
export type InsertTripPing = z.infer<typeof insertTripPingSchema>;
export type TripPing = typeof tripPingsTable.$inferSelect;

export const fuelReportsTable = pgTable("fuel_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id")
    .notNull()
    .references(() => driversTable.id),
  vehicleId: uuid("vehicle_id")
    .notNull()
    .references(() => vehiclesTable.id),
  odometerKm: integer("odometer_km").notNull(),
  fuelPct: integer("fuel_pct").notNull(),
  litres: integer("litres"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
});

export const insertFuelReportSchema = createInsertSchema(fuelReportsTable).omit({ id: true });
export type InsertFuelReport = z.infer<typeof insertFuelReportSchema>;
export type FuelReport = typeof fuelReportsTable.$inferSelect;
