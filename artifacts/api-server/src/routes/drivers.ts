import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, driversTable, auditLogsTable } from "@workspace/db";
import { GetDriverRecordParams, GetDriverRecordResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { loadFleetContext, buildDriverRecord } from "../lib/portal";

const router: IRouter = Router();

router.get("/drivers/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetDriverRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const driverId = params.data.id;
  const user = req.user!;

  // Explicit allowlist: owners may read any driver in their org; drivers may
  // read only their own record. Any other role is denied.
  const allowed =
    user.role === "OWNER" || (user.role === "DRIVER" && user.driverId === driverId);
  if (!allowed) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, driverId));
  if (!driver || driver.orgId !== user.orgId) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }

  // Every read of a driver record is audited.
  await db.insert(auditLogsTable).values({
    orgId: user.orgId,
    actorUserId: user.id,
    action: "READ_DRIVER",
    subjectType: "driver",
    subjectId: driverId,
  });

  const ctx = await loadFleetContext(user.orgId);
  res.json(GetDriverRecordResponse.parse(buildDriverRecord(ctx, driver)));
});

export default router;
