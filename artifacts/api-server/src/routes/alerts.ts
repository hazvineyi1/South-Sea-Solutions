import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, alertAcksTable } from "@workspace/db";
import { GetAlertsResponse, AcknowledgeAlertBody } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { loadFleetContext, buildAlerts } from "../lib/portal";

const router: IRouter = Router();

router.get("/alerts", requireAuth, requireRole("OWNER", "OPERATOR"), async (req, res): Promise<void> => {
  const orgId = req.user!.orgId;
  const ctx = await loadFleetContext(orgId);
  const ackRows = await db.select().from(alertAcksTable).where(eq(alertAcksTable.orgId, orgId));
  const ackKeys = new Set(ackRows.map((r) => r.alertKey));
  res.json(GetAlertsResponse.parse(buildAlerts(ctx, ackKeys)));
});

router.post("/alerts/acknowledge", requireAuth, requireRole("OWNER", "OPERATOR"), async (req, res): Promise<void> => {
  const parsed = AcknowledgeAlertBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const orgId = req.user!.orgId;
  const key = parsed.data.key;

  const [existing] = await db
    .select()
    .from(alertAcksTable)
    .where(and(eq(alertAcksTable.orgId, orgId), eq(alertAcksTable.alertKey, key)));

  if (!existing) {
    await db.insert(alertAcksTable).values({ orgId, alertKey: key, acknowledgedBy: req.user!.id });
  }
  res.sendStatus(204);
});

export default router;
