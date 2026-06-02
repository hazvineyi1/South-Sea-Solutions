import { pgTable, uuid, text, integer, boolean, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { orgsTable } from "./org";

// A per-org, per-kind alert configuration. Owners toggle which conditions raise
// an alert, tune the numeric threshold, set the severity, and choose which
// notification channels fire. One row per (org, kind).
export const alertRuleKinds = [
  "SPEEDING",
  "LOW_FUEL",
  "EXCESS_IDLE",
  "GEOFENCE_BREACH",
  "HARSH_DRIVING",
  "ENGINE_FAULT",
  "MAINTENANCE_DUE",
  "CERT_EXPIRY",
  "HOS_LIMIT",
] as const;
export type AlertRuleKind = (typeof alertRuleKinds)[number];

export const alertRulesTable = pgTable(
  "alert_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgsTable.id),
    kind: text("kind").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    // Interpreted per kind: km/h for SPEEDING, percent for LOW_FUEL, minutes for
    // EXCESS_IDLE, days for CERT_EXPIRY/MAINTENANCE_DUE. Null where not relevant.
    threshold: integer("threshold"),
    severity: text("severity").notNull().default("MEDIUM"),
    notifyEmail: boolean("notify_email").notNull().default(true),
    notifySms: boolean("notify_sms").notNull().default(false),
    notifyPush: boolean("notify_push").notNull().default(true),
  },
  (t) => [unique().on(t.orgId, t.kind)],
);

export const insertAlertRuleSchema = createInsertSchema(alertRulesTable).omit({ id: true });
export type InsertAlertRule = z.infer<typeof insertAlertRuleSchema>;
export type AlertRule = typeof alertRulesTable.$inferSelect;
