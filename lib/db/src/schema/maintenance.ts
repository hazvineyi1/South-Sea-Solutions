import { pgTable, uuid, text, integer, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vehiclesTable } from "./fleet";

// A recurring service plan for a vehicle: due either every intervalKm of travel
// or every intervalDays, whichever comes first, measured from the last service.
export const maintenancePlansTable = pgTable("maintenance_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  vehicleId: uuid("vehicle_id")
    .notNull()
    .references(() => vehiclesTable.id),
  name: text("name").notNull(),
  intervalKm: integer("interval_km"),
  intervalDays: integer("interval_days"),
  lastServiceKm: integer("last_service_km"),
  lastServiceOn: date("last_service_on"),
});

export const insertMaintenancePlanSchema = createInsertSchema(maintenancePlansTable).omit({ id: true });
export type InsertMaintenancePlan = z.infer<typeof insertMaintenancePlanSchema>;
export type MaintenancePlan = typeof maintenancePlansTable.$inferSelect;

// A unit of shop work against a vehicle: scheduled service, a fault repair, or
// an inspection. Owners create and progress these through to completion.
export const workOrderStatuses = ["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"] as const;
export type WorkOrderStatus = (typeof workOrderStatuses)[number];

export const workOrdersTable = pgTable("work_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  vehicleId: uuid("vehicle_id")
    .notNull()
    .references(() => vehiclesTable.id),
  title: text("title").notNull(),
  detail: text("detail"),
  status: text("status").notNull().default("OPEN"),
  priority: text("priority").notNull().default("MEDIUM"),
  dueOn: date("due_on"),
  dueKm: integer("due_km"),
  costEstimate: integer("cost_estimate"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedOn: date("completed_on"),
});

export const insertWorkOrderSchema = createInsertSchema(workOrdersTable).omit({ id: true, createdAt: true });
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;
export type WorkOrder = typeof workOrdersTable.$inferSelect;
