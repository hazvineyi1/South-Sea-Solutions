import { pgTable, uuid, text, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { orgsTable } from "./org";
import { driversTable } from "./driver";
import { vehiclesTable } from "./fleet";
import { usersTable } from "./auth";

// A dispatch job (load) moving from an origin to a destination, optionally
// assigned to a driver and vehicle. The status reflects its place in the
// fulfilment flow.
export const dispatchStatuses = ["DRAFT", "ASSIGNED", "EN_ROUTE", "DELIVERED", "CANCELLED"] as const;
export type DispatchStatus = (typeof dispatchStatuses)[number];

export const dispatchJobsTable = pgTable("dispatch_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => orgsTable.id),
  reference: text("reference").notNull(),
  driverId: uuid("driver_id").references(() => driversTable.id),
  vehicleId: uuid("vehicle_id").references(() => vehiclesTable.id),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  originLat: doublePrecision("origin_lat"),
  originLng: doublePrecision("origin_lng"),
  destLat: doublePrecision("dest_lat"),
  destLng: doublePrecision("dest_lng"),
  status: text("status").notNull().default("DRAFT"),
  priority: text("priority").notNull().default("MEDIUM"),
  cargo: text("cargo"),
  weightKg: integer("weight_kg"),
  distanceKm: integer("distance_km"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDispatchJobSchema = createInsertSchema(dispatchJobsTable).omit({ id: true, createdAt: true });
export type InsertDispatchJob = z.infer<typeof insertDispatchJobSchema>;
export type DispatchJob = typeof dispatchJobsTable.$inferSelect;

// A two-way message between the dispatch desk and a driver, optionally tied to a
// job. Direction is from the desk's point of view.
export const messageDirections = ["TO_DRIVER", "FROM_DRIVER"] as const;
export type MessageDirection = (typeof messageDirections)[number];

export const dispatchMessagesTable = pgTable("dispatch_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => orgsTable.id),
  jobId: uuid("job_id").references(() => dispatchJobsTable.id),
  driverId: uuid("driver_id")
    .notNull()
    .references(() => driversTable.id),
  fromUserId: uuid("from_user_id").references(() => usersTable.id),
  direction: text("direction").notNull(),
  body: text("body").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
});

export const insertDispatchMessageSchema = createInsertSchema(dispatchMessagesTable).omit({ id: true, sentAt: true });
export type InsertDispatchMessage = z.infer<typeof insertDispatchMessageSchema>;
export type DispatchMessage = typeof dispatchMessagesTable.$inferSelect;
