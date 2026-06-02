import { pgTable, uuid, text, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { driversTable } from "./driver";
import { vehiclesTable } from "./fleet";

// A discrete driver-behaviour event detected by the device (accelerometer,
// speed-vs-limit, distraction sensing). These feed the behaviour score and the
// safety leaderboard.
export const behaviorEventTypes = [
  "HARSH_BRAKE",
  "HARSH_ACCEL",
  "HARSH_CORNER",
  "SPEEDING",
  "OVER_REV",
  "EXCESS_IDLE",
  "PHONE_USE",
  "NO_SEATBELT",
] as const;
export type BehaviorEventType = (typeof behaviorEventTypes)[number];

export const behaviorEventsTable = pgTable("behavior_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id")
    .notNull()
    .references(() => driversTable.id),
  vehicleId: uuid("vehicle_id")
    .notNull()
    .references(() => vehiclesTable.id),
  type: text("type").notNull(),
  severity: text("severity").notNull().default("LOW"),
  // Magnitude of the event: g-force for harsh events, km/h over the limit for
  // speeding, minutes for excess idle. Interpreted per type.
  value: doublePrecision("value"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  placeLabel: text("place_label"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
});

export const insertBehaviorEventSchema = createInsertSchema(behaviorEventsTable).omit({ id: true });
export type InsertBehaviorEvent = z.infer<typeof insertBehaviorEventSchema>;
export type BehaviorEvent = typeof behaviorEventsTable.$inferSelect;
