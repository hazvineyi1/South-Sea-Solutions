import { pgTable, uuid, text, integer, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { driversTable } from "./driver";

export const incidentSeverities = ["LOW", "MEDIUM", "HIGH"] as const;
export type IncidentSeverity = (typeof incidentSeverities)[number];

export const incidentStatuses = ["OPEN", "RESOLVED"] as const;
export type IncidentStatus = (typeof incidentStatuses)[number];

export const incidentsTable = pgTable("incidents", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id")
    .notNull()
    .references(() => driversTable.id),
  type: text("type").notNull(),
  detail: text("detail"),
  severity: text("severity").notNull(),
  status: text("status").notNull().default("OPEN"),
  riskPoints: integer("risk_points").notNull().default(0),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
});

export const insertIncidentSchema = createInsertSchema(incidentsTable).omit({ id: true });
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidentsTable.$inferSelect;

export const documentTypes = ["LICENCE", "PRDP", "MEDICAL_CERT", "DEFENSIVE_DRIVING", "OTHER"] as const;
export type DocumentType = (typeof documentTypes)[number];

export const documentsTable = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id")
    .notNull()
    .references(() => driversTable.id),
  type: text("type").notNull(),
  label: text("label").notNull(),
  expiresOn: date("expires_on"),
});

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({ id: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documentsTable.$inferSelect;
