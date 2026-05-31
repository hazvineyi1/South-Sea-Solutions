import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, driversTable, auditLogsTable } from "@workspace/db";
import { GetDriverRecordParams, GetDriverRecordResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { loadFleetContext, buildDriverRecord } from "../lib/portal";
import { buildTrainingProgress } from "../lib/training";

const router: IRouter = Router();

router.get("/drivers/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetDriverRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const driverId = params.data.id;
  const auth = req.auth!;

  // Explicit allowlist on the effective role: owners (including a superadmin
  // impersonating an org) may read any driver in their org; drivers may read
  // only their own record. Any other role is denied.
  const allowed =
    auth.role === "OWNER" || (auth.role === "DRIVER" && auth.driverId === driverId);
  if (!allowed || !auth.orgId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const orgId = auth.orgId;

  const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, driverId));
  if (!driver || driver.orgId !== orgId) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }

  // Every read of a driver record is audited against the real platform actor.
  await db.insert(auditLogsTable).values({
    orgId,
    actorUserId: auth.userId,
    action: "READ_DRIVER",
    subjectType: "driver",
    subjectId: driverId,
  });

  const ctx = await loadFleetContext(orgId);
  const progress = await buildTrainingProgress(driverId);
  res.json(GetDriverRecordResponse.parse({ ...buildDriverRecord(ctx, driver), trainingProgress: progress }));
});

export default router;
