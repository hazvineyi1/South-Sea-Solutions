import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, alertAcksTable } from "@workspace/db";
import { GetFleetSummaryResponse, GetVehicleRowsResponse } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import {
  loadFleetContext,
  buildAlerts,
  driversNeedingAttention,
  buildVehicleRows,
  buildFleetSummary,
  redactVehicleRowsForOperator,
  redactFleetSummaryForOperator,
} from "../lib/portal";

const router: IRouter = Router();

async function ackKeysForOrg(orgId: string): Promise<Set<string>> {
  const rows = await db.select().from(alertAcksTable).where(eq(alertAcksTable.orgId, orgId));
  return new Set(rows.map((r) => r.alertKey));
}

router.get("/fleet/summary", requireAuth, requireRole("OWNER", "OPERATOR"), async (req, res): Promise<void> => {
  const orgId = req.user!.orgId;
  const ctx = await loadFleetContext(orgId);
  const ackKeys = await ackKeysForOrg(orgId);
  const alerts = buildAlerts(ctx, ackKeys);
  const needs = driversNeedingAttention(alerts);
  const rows = buildVehicleRows(ctx, needs);
  const summary = buildFleetSummary(ctx, rows);
  const payload = req.user!.role === "OWNER" ? summary : redactFleetSummaryForOperator(summary);
  res.json(GetFleetSummaryResponse.parse(payload));
});

router.get("/fleet/vehicles", requireAuth, requireRole("OWNER", "OPERATOR"), async (req, res): Promise<void> => {
  const orgId = req.user!.orgId;
  const ctx = await loadFleetContext(orgId);
  const ackKeys = await ackKeysForOrg(orgId);
  const alerts = buildAlerts(ctx, ackKeys);
  const needs = driversNeedingAttention(alerts);
  const rows = buildVehicleRows(ctx, needs);
  const payload = req.user!.role === "OWNER" ? rows : redactVehicleRowsForOperator(rows);
  res.json(GetVehicleRowsResponse.parse(payload));
});

export default router;
