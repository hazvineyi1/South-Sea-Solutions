import { pgTable, uuid, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { orgsTable } from "./org";

export const fleetsTable = pgTable("fleets", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => orgsTable.id),
  name: text("name").notNull(),
  depot: text("depot").notNull(),
});

export const insertFleetSchema = createInsertSchema(fleetsTable).omit({ id: true });
export type InsertFleet = z.infer<typeof insertFleetSchema>;
export type Fleet = typeof fleetsTable.$inferSelect;

export const vehiclesTable = pgTable("vehicles", {
  id: uuid("id").primaryKey().defaultRandom(),
  fleetId: uuid("fleet_id")
    .notNull()
    .references(() => fleetsTable.id),
  reg: text("reg").notNull(),
  active: boolean("active").notNull().default(true),
});

export const insertVehicleSchema = createInsertSchema(vehiclesTable).omit({ id: true });
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehiclesTable.$inferSelect;
