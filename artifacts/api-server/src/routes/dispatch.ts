import { Router, type IRouter } from "express";
import { and, eq, inArray, asc } from "drizzle-orm";
import { db, dispatchJobsTable, dispatchMessagesTable, driversTable } from "@workspace/db";
import {
  GetDispatchJobsResponse,
  CreateDispatchJobBody,
  CreateDispatchJobResponse,
  UpdateDispatchJobParams,
  UpdateDispatchJobBody,
  UpdateDispatchJobResponse,
  GetDispatchMessagesParams,
  GetDispatchMessagesResponse,
  SendDispatchMessageParams,
  SendDispatchMessageBody,
  SendDispatchMessageResponse,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { vehicleInOrg, driverInOrg, orgVehicleRegs } from "../lib/orgScope";

const router: IRouter = Router();

type Job = typeof dispatchJobsTable.$inferSelect;
type Message = typeof dispatchMessagesTable.$inferSelect;

function toJobItem(
  j: Job,
  driverName: string | null,
  vehicleReg: string | null,
  unread: number,
) {
  return {
    id: j.id,
    reference: j.reference,
    driverId: j.driverId,
    driverName,
    vehicleId: j.vehicleId,
    vehicleReg,
    origin: j.origin,
    destination: j.destination,
    status: j.status,
    priority: j.priority,
    cargo: j.cargo,
    weightKg: j.weightKg,
    distanceKm: j.distanceKm,
    scheduledFor: j.scheduledFor ? j.scheduledFor.toISOString() : null,
    deliveredAt: j.deliveredAt ? j.deliveredAt.toISOString() : null,
    createdAt: j.createdAt.toISOString(),
    unreadMessages: unread,
  };
}

function toMessageItem(m: Message) {
  return {
    id: m.id,
    direction: m.direction,
    body: m.body,
    sentAt: m.sentAt.toISOString(),
    readAt: m.readAt ? m.readAt.toISOString() : null,
  };
}

router.get("/dispatch/jobs", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const orgId = req.auth!.orgId!;
  const jobs = await db.select().from(dispatchJobsTable).where(eq(dispatchJobsTable.orgId, orgId));
  const regs = await orgVehicleRegs(orgId);
  const drivers = await db.select().from(driversTable).where(eq(driversTable.orgId, orgId));
  const driverName = new Map(drivers.map((d) => [d.id, d.name]));

  const jobIds = jobs.map((j) => j.id);
  const messages = jobIds.length
    ? await db.select().from(dispatchMessagesTable).where(inArray(dispatchMessagesTable.jobId, jobIds))
    : [];
  const unreadByJob = new Map<string, number>();
  for (const m of messages) {
    if (m.jobId && m.direction === "FROM_DRIVER" && !m.readAt) {
      unreadByJob.set(m.jobId, (unreadByJob.get(m.jobId) ?? 0) + 1);
    }
  }

  const items = jobs
    .map((j) =>
      toJobItem(
        j,
        j.driverId ? (driverName.get(j.driverId) ?? null) : null,
        j.vehicleId ? (regs.get(j.vehicleId) ?? null) : null,
        unreadByJob.get(j.id) ?? 0,
      ),
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  res.json(GetDispatchJobsResponse.parse(items));
});

router.post("/dispatch/jobs", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const parsed = CreateDispatchJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const orgId = req.auth!.orgId!;
  const data = parsed.data;

  if (data.driverId && !(await driverInOrg(data.driverId, orgId))) {
    res.status(400).json({ error: "Driver not in organization" });
    return;
  }
  if (data.vehicleId && !(await vehicleInOrg(data.vehicleId, orgId))) {
    res.status(400).json({ error: "Vehicle not in organization" });
    return;
  }

  const [created] = await db
    .insert(dispatchJobsTable)
    .values({
      orgId,
      reference: data.reference,
      origin: data.origin,
      destination: data.destination,
      driverId: data.driverId ?? null,
      vehicleId: data.vehicleId ?? null,
      priority: data.priority ?? "MEDIUM",
      cargo: data.cargo ?? null,
      weightKg: data.weightKg ?? null,
      distanceKm: data.distanceKm ?? null,
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
      status: data.driverId ? "ASSIGNED" : "DRAFT",
    })
    .returning();

  const regs = await orgVehicleRegs(orgId);
  const driver = created.driverId ? await driverInOrg(created.driverId, orgId) : null;
  res.json(
    CreateDispatchJobResponse.parse(
      toJobItem(created, driver?.name ?? null, created.vehicleId ? (regs.get(created.vehicleId) ?? null) : null, 0),
    ),
  );
});

router.patch("/dispatch/jobs/:id", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const params = UpdateDispatchJobParams.safeParse(req.params);
  const body = UpdateDispatchJobBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const orgId = req.auth!.orgId!;
  const [existing] = await db
    .select()
    .from(dispatchJobsTable)
    .where(and(eq(dispatchJobsTable.id, params.data.id), eq(dispatchJobsTable.orgId, orgId)));
  if (!existing) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  const data = body.data;
  if (data.driverId && !(await driverInOrg(data.driverId, orgId))) {
    res.status(400).json({ error: "Driver not in organization" });
    return;
  }
  if (data.vehicleId && !(await vehicleInOrg(data.vehicleId, orgId))) {
    res.status(400).json({ error: "Vehicle not in organization" });
    return;
  }

  const patch: Record<string, unknown> = { ...data };
  if (data.scheduledFor !== undefined) patch.scheduledFor = data.scheduledFor ? new Date(data.scheduledFor) : null;
  if (data.status === "DELIVERED" && !existing.deliveredAt) patch.deliveredAt = new Date();

  const [updated] = await db
    .update(dispatchJobsTable)
    .set(patch)
    .where(eq(dispatchJobsTable.id, existing.id))
    .returning();

  const regs = await orgVehicleRegs(orgId);
  const driver = updated.driverId ? await driverInOrg(updated.driverId, orgId) : null;
  res.json(
    UpdateDispatchJobResponse.parse(
      toJobItem(updated, driver?.name ?? null, updated.vehicleId ? (regs.get(updated.vehicleId) ?? null) : null, 0),
    ),
  );
});

router.get("/dispatch/jobs/:id/messages", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const params = GetDispatchMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const orgId = req.auth!.orgId!;
  const [job] = await db
    .select()
    .from(dispatchJobsTable)
    .where(and(eq(dispatchJobsTable.id, params.data.id), eq(dispatchJobsTable.orgId, orgId)));
  if (!job) {
    res.json(GetDispatchMessagesResponse.parse([]));
    return;
  }
  const messages = await db
    .select()
    .from(dispatchMessagesTable)
    .where(eq(dispatchMessagesTable.jobId, job.id))
    .orderBy(asc(dispatchMessagesTable.sentAt));
  // Mark inbound messages as read now that the desk has opened the thread.
  await db
    .update(dispatchMessagesTable)
    .set({ readAt: new Date() })
    .where(and(eq(dispatchMessagesTable.jobId, job.id), eq(dispatchMessagesTable.direction, "FROM_DRIVER")));
  res.json(GetDispatchMessagesResponse.parse(messages.map(toMessageItem)));
});

router.post("/dispatch/jobs/:id/messages", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const params = SendDispatchMessageParams.safeParse(req.params);
  const body = SendDispatchMessageBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const orgId = req.auth!.orgId!;
  const [job] = await db
    .select()
    .from(dispatchJobsTable)
    .where(and(eq(dispatchJobsTable.id, params.data.id), eq(dispatchJobsTable.orgId, orgId)));
  if (!job || !job.driverId) {
    res.status(404).json({ error: "Job has no assigned driver" });
    return;
  }
  const [created] = await db
    .insert(dispatchMessagesTable)
    .values({
      orgId,
      jobId: job.id,
      driverId: job.driverId,
      fromUserId: req.auth!.userId,
      direction: "TO_DRIVER",
      body: body.data.body,
    })
    .returning();
  res.json(SendDispatchMessageResponse.parse(toMessageItem(created)));
});

export default router;
