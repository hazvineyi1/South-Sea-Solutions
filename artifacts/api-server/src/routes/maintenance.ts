import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, workOrdersTable } from "@workspace/db";
import {
  GetMaintenanceBoardResponse,
  CreateWorkOrderBody,
  CreateWorkOrderResponse,
  UpdateWorkOrderParams,
  UpdateWorkOrderBody,
  UpdateWorkOrderResponse,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { buildMaintenanceBoard } from "../lib/telematics";
import { vehicleInOrg } from "../lib/orgScope";

const router: IRouter = Router();

function toItem(o: typeof workOrdersTable.$inferSelect, reg: string) {
  return {
    id: o.id,
    vehicleId: o.vehicleId,
    vehicleReg: reg,
    title: o.title,
    detail: o.detail,
    status: o.status,
    priority: o.priority,
    dueOn: o.dueOn,
    dueKm: o.dueKm,
    costEstimate: o.costEstimate,
    createdAt: o.createdAt.toISOString(),
    completedOn: o.completedOn,
  };
}

router.get("/maintenance", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const board = await buildMaintenanceBoard(req.auth!.orgId!);
  res.json(GetMaintenanceBoardResponse.parse(board));
});

router.post("/maintenance/work-orders", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const parsed = CreateWorkOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const vehicle = await vehicleInOrg(parsed.data.vehicleId, req.auth!.orgId!);
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  const [created] = await db
    .insert(workOrdersTable)
    .values({
      vehicleId: vehicle.id,
      title: parsed.data.title,
      detail: parsed.data.detail ?? null,
      priority: parsed.data.priority ?? "MEDIUM",
      dueOn: parsed.data.dueOn ?? null,
      dueKm: parsed.data.dueKm ?? null,
      costEstimate: parsed.data.costEstimate ?? null,
    })
    .returning();
  res.json(CreateWorkOrderResponse.parse(toItem(created, vehicle.reg)));
});

router.patch("/maintenance/work-orders/:id", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const params = UpdateWorkOrderParams.safeParse(req.params);
  const body = UpdateWorkOrderBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const [existing] = await db.select().from(workOrdersTable).where(eq(workOrdersTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Work order not found" });
    return;
  }
  const vehicle = await vehicleInOrg(existing.vehicleId, req.auth!.orgId!);
  if (!vehicle) {
    res.status(404).json({ error: "Work order not found" });
    return;
  }
  const patch: Record<string, unknown> = { ...body.data };
  // Stamp completion date when an order is closed out.
  if (body.data.status === "DONE" && !existing.completedOn) {
    patch.completedOn = new Date().toISOString().slice(0, 10);
  }
  const [updated] = await db
    .update(workOrdersTable)
    .set(patch)
    .where(eq(workOrdersTable.id, existing.id))
    .returning();
  res.json(UpdateWorkOrderResponse.parse(toItem(updated, vehicle.reg)));
});

export default router;
