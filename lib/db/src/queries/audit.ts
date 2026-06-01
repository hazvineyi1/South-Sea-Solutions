import { desc, eq } from "drizzle-orm";
import { db } from "../index";
import { auditLogsTable, orgsTable, usersTable } from "../schema";

// The default page size when a caller does not specify a limit.
export const DEFAULT_AUDIT_LOG_LIMIT = 50;

export interface RecentAuditLog {
  id: string;
  orgId: string;
  // The org name and actor email are joined in where available: an actor row
  // may have been deleted (the audit row outlives it), so both can be null.
  orgName: string | null;
  actorUserId: string;
  actorEmail: string | null;
  action: string;
  subjectType: string;
  subjectId: string;
  at: Date;
}

// Returns the most recent audit-log rows newest first, joining the org name and
// the actor email when those rows still exist.
export async function getRecentAuditLogs(
  limit: number = DEFAULT_AUDIT_LOG_LIMIT,
): Promise<RecentAuditLog[]> {
  return db
    .select({
      id: auditLogsTable.id,
      orgId: auditLogsTable.orgId,
      orgName: orgsTable.name,
      actorUserId: auditLogsTable.actorUserId,
      actorEmail: usersTable.email,
      action: auditLogsTable.action,
      subjectType: auditLogsTable.subjectType,
      subjectId: auditLogsTable.subjectId,
      at: auditLogsTable.at,
    })
    .from(auditLogsTable)
    .leftJoin(orgsTable, eq(auditLogsTable.orgId, orgsTable.id))
    .leftJoin(usersTable, eq(auditLogsTable.actorUserId, usersTable.id))
    .orderBy(desc(auditLogsTable.at))
    .limit(limit);
}
