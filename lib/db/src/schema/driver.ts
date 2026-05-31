import { pgTable, uuid, text, integer, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { orgsTable } from "./org";

export const driversTable = pgTable("drivers", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => orgsTable.id),
  name: text("name").notNull(),
  employeeNo: text("employee_no").notNull(),
  dob: date("dob"),
  phone: text("phone"),
  languages: text("languages").array().notNull().default(["en"]),
  homeDepot: text("home_depot"),
  emergencyContact: text("emergency_contact"),
  licenceNo: text("licence_no"),
  licenceClass: text("licence_class"),
  prdp: boolean("prdp").notNull().default(false),
  currentVehicleId: uuid("current_vehicle_id"),
  safetyScore: integer("safety_score").notNull().default(100),
  onTimePct: integer("on_time_pct").notNull().default(100),
});

export const insertDriverSchema = createInsertSchema(driversTable).omit({ id: true });
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof driversTable.$inferSelect;
