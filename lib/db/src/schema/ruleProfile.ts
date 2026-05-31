import { pgTable, uuid, text, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { orgsTable } from "./org";

export const ruleProfilesTable = pgTable("rule_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => orgsTable.id),
  name: text("name").notNull(),
  contMins: integer("cont_mins").notNull().default(270),
  dailyMins: integer("daily_mins").notNull().default(540),
  weeklyMins: integer("weekly_mins").notNull().default(3360),
  dailyRestMins: integer("daily_rest_mins").notNull().default(660),
  breakMins: integer("break_mins").notNull().default(45),
  isDefault: boolean("is_default").notNull().default(false),
});

export const insertRuleProfileSchema = createInsertSchema(ruleProfilesTable).omit({ id: true });
export type InsertRuleProfile = z.infer<typeof insertRuleProfileSchema>;
export type RuleProfile = typeof ruleProfilesTable.$inferSelect;
