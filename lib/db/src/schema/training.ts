import { pgTable, uuid, text, integer, date, jsonb, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { orgsTable } from "./org";
import { driversTable } from "./driver";
import { usersTable } from "./auth";

// A section of a training module's content. Stored as JSON so the superadmin can
// author rich modules (steps, bullets, tips, warnings) without schema changes.
export interface TrainingModuleSection {
  heading: string;
  body?: string | null;
  steps?: string[];
  bullets?: string[];
  tip?: string | null;
  warning?: string | null;
}

// Platform-wide training modules, managed by the superadmin and visible to every
// logged-in user across all organizations.
export const trainingModulesTable = pgTable("training_modules", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  category: text("category").notNull(),
  icon: text("icon").notNull().default("GraduationCap"),
  minutes: integer("minutes").notNull().default(5),
  ordinal: integer("ordinal").notNull().default(0),
  sections: jsonb("sections").$type<TrainingModuleSection[]>().notNull().default([]),
});

export const insertTrainingModuleSchema = createInsertSchema(trainingModulesTable).omit({ id: true });
export type InsertTrainingModule = z.infer<typeof insertTrainingModuleSchema>;
export type TrainingModule = typeof trainingModulesTable.$inferSelect;

// Per-user record that a given training module has been completed.
export const trainingCompletionsTable = pgTable(
  "training_completions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => trainingModulesTable.id),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.moduleId)],
);

export const insertTrainingCompletionSchema = createInsertSchema(trainingCompletionsTable).omit({ id: true });
export type InsertTrainingCompletion = z.infer<typeof insertTrainingCompletionSchema>;
export type TrainingCompletion = typeof trainingCompletionsTable.$inferSelect;

export const coursesTable = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => orgsTable.id),
  title: text("title").notNull(),
  ordinal: integer("ordinal").notNull().default(0),
});

export const insertCourseSchema = createInsertSchema(coursesTable).omit({ id: true });
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof coursesTable.$inferSelect;

export const courseCompletionStatuses = ["DONE", "IN_PROGRESS", "TODO"] as const;
export type CourseCompletionStatus = (typeof courseCompletionStatuses)[number];

export const courseCompletionsTable = pgTable("course_completions", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id")
    .notNull()
    .references(() => driversTable.id),
  courseId: uuid("course_id")
    .notNull()
    .references(() => coursesTable.id),
  status: text("status").notNull().default("TODO"),
  score: integer("score"),
  completedOn: date("completed_on"),
});

export const insertCourseCompletionSchema = createInsertSchema(courseCompletionsTable).omit({ id: true });
export type InsertCourseCompletion = z.infer<typeof insertCourseCompletionSchema>;
export type CourseCompletion = typeof courseCompletionsTable.$inferSelect;

export const certificationStatuses = ["CERTIFIED", "IN_PROGRESS", "LAPSED"] as const;
export type CertificationStatus = (typeof certificationStatuses)[number];

export const certificationsTable = pgTable("certifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id")
    .notNull()
    .references(() => driversTable.id),
  status: text("status").notNull().default("IN_PROGRESS"),
  issuedOn: date("issued_on"),
  expiresOn: date("expires_on"),
});

export const insertCertificationSchema = createInsertSchema(certificationsTable).omit({ id: true });
export type InsertCertification = z.infer<typeof insertCertificationSchema>;
export type Certification = typeof certificationsTable.$inferSelect;
