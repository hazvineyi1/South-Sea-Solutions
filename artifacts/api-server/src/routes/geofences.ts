import { Router, type IRouter } from "express";
import { and, eq, inArray, desc } from "drizzle-orm";
import {
  db,
  geofencesTable,
  geofenceEventsTable,
  driversTable,
  vehiclesTable,
} from "@workspace/db";
import {
  GetGeofencesResponse,
  CreateGeofenceBody,
  CreateGeofenceResponse,
  UpdateGeofenceParams,
  UpdateGeofenceBody,
  UpdateGeofenceResponse,
  DeleteGeofenceParams,
  GetGeofenceEventsResponse,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

const router: IRouter = Router();

function toItem(g: typeof geofencesTable.$inferSelect) {
  return {
    id: g.id,
    name: g.name,
    kind: g.kind,
    centerLat: g.centerLat,
    centerLng: g.centerLng,
    radiusM: g.radiusM,
    active: g.active,
  };
}

router.get("/geofences", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(geofencesTable)
    .where(eq(geofencesTable.orgId, req.auth!.orgId!))
    .orderBy(geofencesTable.name);
  res.json(GetGeofencesResponse.parse(rows.map(toItem)));
});

router.post("/geofences", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const parsed = CreateGeofenceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [created] = await db
    .insert(geofencesTable)
    .values({ ...parsed.data, active: parsed.data.active ?? true, orgId: req.auth!.orgId! })
    .returning();
  res.json(CreateGeofenceResponse.parse(toItem(created)));
});

// Geofence events route must precede the "/:id" routes so "events" is not
// captured as an id.
router.get("/geofences/events", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const orgId = req.auth!.orgId!;
  const fences = await db.select().from(geofencesTable).where(eq(geofencesTable.orgId, orgId));
  if (!fences.length) {
    res.json(GetGeofenceEventsResponse.parse([]));
    return;
  }
  const fenceById = new Map(fences.map((f) => [f.id, f]));
  const events = await db
    .select()
    .from(geofenceEventsTable)
    .where(inArray(geofenceEventsTable.geofenceId, [...fenceById.keys()]))
    .orderBy(desc(geofenceEventsTable.recordedAt))
    .limit(50);

  const driverIds = [...new Set(events.map((e) => e.driverId))];
  const vehicleIds = [...new Set(events.map((e) => e.vehicleId))];
  const drivers = driverIds.length ? await db.select().from(driversTable).where(inArray(driversTable.id, driverIds)) : [];
  const vehicles = vehicleIds.length ? await db.select().from(vehiclesTable).where(inArray(vehiclesTable.id, vehicleIds)) : [];
  const driverName = new Map(drivers.map((d) => [d.id, d.name]));
  const vehicleReg = new Map(vehicles.map((v) => [v.id, v.reg]));

  const items = events.map((e) => {
    const fence = fenceById.get(e.geofenceId)!;
    return {
      id: e.id,
      geofenceName: fence.name,
      geofenceKind: fence.kind,
      driverId: e.driverId,
      driverName: driverName.get(e.driverId) ?? "Driver",
      vehicleReg: vehicleReg.get(e.vehicleId) ?? "--",
      type: e.type,
      recordedAt: e.recordedAt.toISOString(),
    };
  });
  res.json(GetGeofenceEventsResponse.parse(items));
});

router.patch("/geofences/:id", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const params = UpdateGeofenceParams.safeParse(req.params);
  const body = UpdateGeofenceBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const [existing] = await db
    .select()
    .from(geofencesTable)
    .where(and(eq(geofencesTable.id, params.data.id), eq(geofencesTable.orgId, req.auth!.orgId!)));
  if (!existing) {
    res.status(404).json({ error: "Geofence not found" });
    return;
  }
  const [updated] = await db
    .update(geofencesTable)
    .set(body.data)
    .where(eq(geofencesTable.id, existing.id))
    .returning();
  res.json(UpdateGeofenceResponse.parse(toItem(updated)));
});

router.delete("/geofences/:id", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const params = DeleteGeofenceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const [existing] = await db
    .select()
    .from(geofencesTable)
    .where(and(eq(geofencesTable.id, params.data.id), eq(geofencesTable.orgId, req.auth!.orgId!)));
  if (existing) {
    await db.delete(geofenceEventsTable).where(eq(geofenceEventsTable.geofenceId, existing.id));
    await db.delete(geofencesTable).where(eq(geofencesTable.id, existing.id));
  }
  res.sendStatus(204);
});

export default router;
