import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { randomBytes } from "node:crypto";
import { and, eq, isNull, inArray } from "drizzle-orm";
import {
  db,
  apiKeysTable,
  webhooksTable,
  fleetsTable,
  vehiclesTable,
  driversTable,
  tripPingsTable,
} from "@workspace/db";
import {
  GetApiKeysResponse,
  CreateApiKeyBody,
  CreateApiKeyResponse,
  RevokeApiKeyParams,
  GetWebhooksResponse,
  CreateWebhookBody,
  CreateWebhookResponse,
  DeleteWebhookParams,
  IngestTelemetryBody,
  IngestTelemetryResponse,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/requireAuth";
import { generateApiKey, hashApiKey } from "../lib/apiKeys";

const router: IRouter = Router();

// ---- API keys ------------------------------------------------------------

function toKeyItem(k: typeof apiKeysTable.$inferSelect) {
  return {
    id: k.id,
    name: k.name,
    prefix: k.prefix,
    scopes: k.scopes,
    lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
    createdAt: k.createdAt.toISOString(),
    revoked: k.revokedAt != null,
  };
}

router.get("/integrations/api-keys", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const rows = await db.select().from(apiKeysTable).where(eq(apiKeysTable.orgId, req.auth!.orgId!));
  res.json(GetApiKeysResponse.parse(rows.map(toKeyItem)));
});

router.post("/integrations/api-keys", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const parsed = CreateApiKeyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const gen = generateApiKey();
  const [created] = await db
    .insert(apiKeysTable)
    .values({
      orgId: req.auth!.orgId!,
      name: parsed.data.name,
      prefix: gen.prefix,
      keyHash: gen.hash,
      scopes: parsed.data.scopes ?? ["ingest"],
    })
    .returning();
  res.json(
    CreateApiKeyResponse.parse({
      id: created.id,
      name: created.name,
      prefix: created.prefix,
      key: gen.plaintext,
      scopes: created.scopes,
      createdAt: created.createdAt.toISOString(),
    }),
  );
});

router.delete("/integrations/api-keys/:id", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const params = RevokeApiKeyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  await db
    .update(apiKeysTable)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeysTable.id, params.data.id), eq(apiKeysTable.orgId, req.auth!.orgId!)));
  res.sendStatus(204);
});

// ---- Webhooks ------------------------------------------------------------

function toWebhookItem(w: typeof webhooksTable.$inferSelect) {
  return {
    id: w.id,
    url: w.url,
    events: w.events,
    active: w.active,
    createdAt: w.createdAt.toISOString(),
    lastDeliveryAt: w.lastDeliveryAt ? w.lastDeliveryAt.toISOString() : null,
    lastStatus: w.lastStatus,
  };
}

router.get("/integrations/webhooks", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const rows = await db.select().from(webhooksTable).where(eq(webhooksTable.orgId, req.auth!.orgId!));
  res.json(GetWebhooksResponse.parse(rows.map(toWebhookItem)));
});

router.post("/integrations/webhooks", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const parsed = CreateWebhookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [created] = await db
    .insert(webhooksTable)
    .values({
      orgId: req.auth!.orgId!,
      url: parsed.data.url,
      events: parsed.data.events,
      secret: `whsec_${randomBytes(20).toString("base64url")}`,
    })
    .returning();
  res.json(CreateWebhookResponse.parse(toWebhookItem(created)));
});

router.delete("/integrations/webhooks/:id", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const params = DeleteWebhookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  await db
    .delete(webhooksTable)
    .where(and(eq(webhooksTable.id, params.data.id), eq(webhooksTable.orgId, req.auth!.orgId!)));
  res.sendStatus(204);
});

// ---- Device ingest (API-key authenticated) -------------------------------

// Resolves the org from an `x-api-key` header. Unlike the rest of the API this
// path is used by external device gateways, so it does not rely on a session.
async function requireApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.header("x-api-key");
  if (!header) {
    res.status(401).json({ error: "Missing API key" });
    return;
  }
  const [key] = await db
    .select()
    .from(apiKeysTable)
    .where(and(eq(apiKeysTable.keyHash, hashApiKey(header)), isNull(apiKeysTable.revokedAt)));
  if (!key) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }
  await db.update(apiKeysTable).set({ lastUsedAt: new Date() }).where(eq(apiKeysTable.id, key.id));
  req.ingestOrgId = key.orgId;
  next();
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      ingestOrgId?: string;
    }
  }
}

router.post("/ingest/telemetry", requireApiKey, async (req, res): Promise<void> => {
  const parsed = IngestTelemetryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const orgId = req.ingestOrgId!;

  // Build a reg -> {vehicleId, driverId} index for this org so a device can
  // report by registration plate without knowing internal ids.
  const fleets = await db.select().from(fleetsTable).where(eq(fleetsTable.orgId, orgId));
  const fleetIds = fleets.map((f) => f.id);
  const vehicles = fleetIds.length
    ? await db.select().from(vehiclesTable).where(inArray(vehiclesTable.fleetId, fleetIds))
    : [];
  const drivers = await db.select().from(driversTable).where(eq(driversTable.orgId, orgId));
  const driverByVehicle = new Map<string, string>();
  for (const d of drivers) if (d.currentVehicleId) driverByVehicle.set(d.currentVehicleId, d.id);
  const vehicleByReg = new Map(vehicles.map((v) => [v.reg, v.id]));

  let accepted = 0;
  let rejected = 0;
  const toInsert: (typeof tripPingsTable.$inferInsert)[] = [];
  for (const p of parsed.data.pings) {
    const vehicleId = vehicleByReg.get(p.vehicleReg);
    const driverId = vehicleId ? driverByVehicle.get(vehicleId) : undefined;
    if (!vehicleId || !driverId) {
      rejected += 1;
      continue;
    }
    toInsert.push({
      vehicleId,
      driverId,
      lat: p.lat,
      lng: p.lng,
      speedKph: p.speedKph,
      placeLabel: p.placeLabel ?? null,
      recordedAt: new Date(p.recordedAt),
    });
    accepted += 1;
  }
  if (toInsert.length) await db.insert(tripPingsTable).values(toInsert);
  res.json(IngestTelemetryResponse.parse({ accepted, rejected }));
});

export default router;
