import { pgTable, uuid, text, integer, doublePrecision, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { orgsTable } from "./org";
import { driversTable } from "./driver";
import { vehiclesTable } from "./fleet";

// A geofence is a named circular region an owner cares about: a depot, a
// customer site, a permitted corridor, a border post, or a no-go zone. Breaches
// (entering a no-go zone, or leaving a corridor) drive alerts.
export const geofenceKinds = ["DEPOT", "CORRIDOR", "BORDER", "CUSTOMER", "NOGO"] as const;
export type GeofenceKind = (typeof geofenceKinds)[number];

export const geofencesTable = pgTable("geofences", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => orgsTable.id),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("CUSTOMER"),
  centerLat: doublePrecision("center_lat").notNull(),
  centerLng: doublePrecision("center_lng").notNull(),
  radiusM: integer("radius_m").notNull().default(2000),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGeofenceSchema = createInsertSchema(geofencesTable).omit({ id: true, createdAt: true });
export type InsertGeofence = z.infer<typeof insertGeofenceSchema>;
export type Geofence = typeof geofencesTable.$inferSelect;

// A recorded crossing of a geofence boundary by a vehicle/driver.
export const geofenceEventTypes = ["ENTER", "EXIT"] as const;
export type GeofenceEventType = (typeof geofenceEventTypes)[number];

export const geofenceEventsTable = pgTable("geofence_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  geofenceId: uuid("geofence_id")
    .notNull()
    .references(() => geofencesTable.id),
  driverId: uuid("driver_id")
    .notNull()
    .references(() => driversTable.id),
  vehicleId: uuid("vehicle_id")
    .notNull()
    .references(() => vehiclesTable.id),
  type: text("type").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
});

export const insertGeofenceEventSchema = createInsertSchema(geofenceEventsTable).omit({ id: true });
export type InsertGeofenceEvent = z.infer<typeof insertGeofenceEventSchema>;
export type GeofenceEvent = typeof geofenceEventsTable.$inferSelect;
