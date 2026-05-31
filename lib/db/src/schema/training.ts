import { pgTable, uuid, text, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { orgsTable } from "./org";
import { driversTable } from "./driver";

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
