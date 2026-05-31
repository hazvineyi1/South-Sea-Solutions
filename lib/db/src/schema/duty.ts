import { pgTable, uuid, text, integer, date, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { driversTable } from "./driver";

export const dutyStatuses = ["OFF", "REST", "DRIVING", "ONDUTY"] as const;
export type DutyStatus = (typeof dutyStatuses)[number];

export const dutyEventsTable = pgTable("duty_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id")
    .notNull()
    .references(() => driversTable.id),
  status: text("status").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  source: text("source").notNull().default("PHONE"),
});

export const insertDutyEventSchema = createInsertSchema(dutyEventsTable).omit({ id: true });
export type InsertDutyEvent = z.infer<typeof insertDutyEventSchema>;
export type DutyEvent = typeof dutyEventsTable.$inferSelect;

export const dailyLogsTable = pgTable("daily_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id")
    .notNull()
    .references(() => driversTable.id),
  date: date("date").notNull(),
  driveMins: integer("drive_mins").notNull().default(0),
  dutyMins: integer("duty_mins").notNull().default(0),
  restMins: integer("rest_mins").notNull().default(0),
  certifiedAt: timestamp("certified_at", { withTimezone: true }),
  certified: boolean("certified").notNull().default(false),
});

export const insertDailyLogSchema = createInsertSchema(dailyLogsTable).omit({ id: true });
export type InsertDailyLog = z.infer<typeof insertDailyLogSchema>;
export type DailyLog = typeof dailyLogsTable.$inferSelect;
