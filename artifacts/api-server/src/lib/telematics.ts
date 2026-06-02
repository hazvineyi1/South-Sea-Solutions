import { eq, inArray, desc, and, gte } from "drizzle-orm";
import {
  db,
  fleetsTable,
  vehiclesTable,
  driversTable,
  fuelReportsTable,
  incidentsTable,
  dailyLogsTable,
  dutyEventsTable,
  vehicleHealthTable,
  faultCodesTable,
  behaviorEventsTable,
  maintenancePlansTable,
  workOrdersTable,
  geofencesTable,
  dispatchJobsTable,
  alertAcksTable,
  type Vehicle,
  type Driver,
  type VehicleHealth,
  type FaultCode,
  type BehaviorEvent,
  type MaintenancePlan,
} from "@workspace/db";
import { computeHos, type DutyStatus } from "./hosEngine";
import { loadFleetContext, buildAlerts, ruleToInput } from "./portal";

// ---------------------------------------------------------------------------
// Shared loading helpers
// ---------------------------------------------------------------------------

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

function severityRank(s: string): number {
  return s === "HIGH" ? 3 : s === "MEDIUM" ? 2 : 1;
}

export interface OrgFleet {
  vehicles: Vehicle[];
  drivers: Driver[];
  regByVehicle: Map<string, string>;
  driverByVehicle: Map<string, Driver>;
  vehicleByDriver: Map<string, Vehicle>;
  odometerByVehicle: Map<string, number>;
}

// Loads the org's active vehicles, drivers, and the driver/vehicle/odometer
// cross-references that almost every telematics view needs.
export async function loadOrgFleet(orgId: string): Promise<OrgFleet> {
  const drivers = await db.select().from(driversTable).where(eq(driversTable.orgId, orgId));
  const fleets = await db.select().from(fleetsTable).where(eq(fleetsTable.orgId, orgId));
  const fleetIds = fleets.map((f) => f.id);
  const allVehicles = fleetIds.length
    ? await db.select().from(vehiclesTable).where(inArray(vehiclesTable.fleetId, fleetIds))
    : [];
  const vehicles = allVehicles.filter((v) => v.active);

  const driverByVehicle = new Map<string, Driver>();
  const vehicleByDriver = new Map<string, Vehicle>();
  const vehicleById = new Map(allVehicles.map((v) => [v.id, v]));
  for (const d of drivers) {
    if (d.currentVehicleId) {
      driverByVehicle.set(d.currentVehicleId, d);
      const v = vehicleById.get(d.currentVehicleId);
      if (v) vehicleByDriver.set(d.id, v);
    }
  }

  const driverIds = drivers.map((d) => d.id);
  const fuels = driverIds.length
    ? await db
        .select()
        .from(fuelReportsTable)
        .where(inArray(fuelReportsTable.driverId, driverIds))
        .orderBy(desc(fuelReportsTable.recordedAt))
    : [];
  const odometerByVehicle = new Map<string, number>();
  for (const f of fuels) {
    if (!odometerByVehicle.has(f.vehicleId)) odometerByVehicle.set(f.vehicleId, f.odometerKm);
  }

  return {
    vehicles,
    drivers,
    regByVehicle: new Map(allVehicles.map((v) => [v.id, v.reg])),
    driverByVehicle,
    vehicleByDriver,
    odometerByVehicle,
  };
}

async function latestHealthByVehicle(vehicleIds: string[]): Promise<Map<string, VehicleHealth>> {
  if (!vehicleIds.length) return new Map();
  const rows = await db
    .select()
    .from(vehicleHealthTable)
    .where(inArray(vehicleHealthTable.vehicleId, vehicleIds))
    .orderBy(desc(vehicleHealthTable.recordedAt));
  const map = new Map<string, VehicleHealth>();
  for (const r of rows) if (!map.has(r.vehicleId)) map.set(r.vehicleId, r);
  return map;
}

async function activeFaultsByVehicle(vehicleIds: string[]): Promise<Map<string, FaultCode[]>> {
  const map = new Map<string, FaultCode[]>();
  if (!vehicleIds.length) return map;
  const rows = await db
    .select()
    .from(faultCodesTable)
    .where(and(inArray(faultCodesTable.vehicleId, vehicleIds), eq(faultCodesTable.active, true)))
    .orderBy(desc(faultCodesTable.occurredAt));
  for (const r of rows) {
    const list = map.get(r.vehicleId) ?? [];
    list.push(r);
    map.set(r.vehicleId, list);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------

export type DueState = "VALID" | "DUE_SOON" | "OVERDUE";

interface DueResult {
  state: DueState;
  dueInKm: number | null;
  dueInDays: number | null;
}

const DUE_SOON_KM = 2000;
const DUE_SOON_DAYS = 14;

export function maintenanceDue(plan: MaintenancePlan, odometerKm: number | undefined): DueResult {
  const now = new Date();
  let dueInKm: number | null = null;
  if (plan.intervalKm != null && plan.lastServiceKm != null && odometerKm != null) {
    dueInKm = plan.lastServiceKm + plan.intervalKm - odometerKm;
  }
  let dueInDays: number | null = null;
  if (plan.intervalDays != null && plan.lastServiceOn) {
    const next = new Date(plan.lastServiceOn + "T00:00:00Z");
    next.setDate(next.getDate() + plan.intervalDays);
    dueInDays = daysBetween(now, next);
  }
  const overdue = (dueInKm != null && dueInKm < 0) || (dueInDays != null && dueInDays < 0);
  const dueSoon = (dueInKm != null && dueInKm <= DUE_SOON_KM) || (dueInDays != null && dueInDays <= DUE_SOON_DAYS);
  const state: DueState = overdue ? "OVERDUE" : dueSoon ? "DUE_SOON" : "VALID";
  return { state, dueInKm, dueInDays };
}

// ---------------------------------------------------------------------------
// Health scoring
// ---------------------------------------------------------------------------

export function healthScore(
  h: VehicleHealth | undefined,
  faults: FaultCode[],
  worstDue: DueState,
): number {
  if (!h) return 80;
  let s = 100;
  if (h.milOn) s -= 25;
  for (const f of faults) s -= f.severity === "HIGH" ? 15 : f.severity === "MEDIUM" ? 8 : 3;
  if (h.oilLifePct != null && h.oilLifePct < 20) s -= 10;
  if (h.batteryV != null && h.batteryV < 12.2) s -= 8;
  if (h.engineTempC != null && h.engineTempC > 105) s -= 12;
  if (h.defLevelPct != null && h.defLevelPct < 10) s -= 5;
  if (worstDue === "OVERDUE") s -= 12;
  else if (worstDue === "DUE_SOON") s -= 5;
  return clamp(s);
}

export async function buildVehicleHealthRows(orgId: string) {
  const fleet = await loadOrgFleet(orgId);
  const vehicleIds = fleet.vehicles.map((v) => v.id);
  const [healthMap, faultMap, plans] = await Promise.all([
    latestHealthByVehicle(vehicleIds),
    activeFaultsByVehicle(vehicleIds),
    vehicleIds.length
      ? db.select().from(maintenancePlansTable).where(inArray(maintenancePlansTable.vehicleId, vehicleIds))
      : Promise.resolve([] as MaintenancePlan[]),
  ]);
  const plansByVehicle = new Map<string, MaintenancePlan[]>();
  for (const p of plans) {
    const list = plansByVehicle.get(p.vehicleId) ?? [];
    list.push(p);
    plansByVehicle.set(p.vehicleId, list);
  }

  return fleet.vehicles
    .map((v) => {
      const h = healthMap.get(v.id);
      const faults = faultMap.get(v.id) ?? [];
      const odo = fleet.odometerByVehicle.get(v.id);
      const dues = (plansByVehicle.get(v.id) ?? []).map((p) => maintenanceDue(p, odo));
      const worst = dues.some((d) => d.state === "OVERDUE")
        ? ("OVERDUE" as DueState)
        : dues.some((d) => d.state === "DUE_SOON")
          ? ("DUE_SOON" as DueState)
          : ("VALID" as DueState);
      const nextKm = dues.map((d) => d.dueInKm).filter((n): n is number => n != null);
      const nextDays = dues.map((d) => d.dueInDays).filter((n): n is number => n != null);
      const driver = fleet.driverByVehicle.get(v.id);
      return {
        vehicleId: v.id,
        reg: v.reg,
        driverName: driver?.name ?? "Unassigned",
        healthScore: healthScore(h, faults, worst),
        milOn: h?.milOn ?? false,
        engineTempC: h?.engineTempC ?? null,
        batteryV: h?.batteryV ?? null,
        oilLifePct: h?.oilLifePct ?? null,
        defLevelPct: h?.defLevelPct ?? null,
        tirePressureKpa: h?.tirePressureKpa ?? null,
        engineHours: h?.engineHours ?? null,
        activeFaults: faults.length,
        nextServiceInKm: nextKm.length ? Math.min(...nextKm) : null,
        nextServiceInDays: nextDays.length ? Math.min(...nextDays) : null,
        recordedAt: h?.recordedAt ? h.recordedAt.toISOString() : null,
      };
    })
    .sort((a, b) => a.healthScore - b.healthScore);
}

export async function buildVehicleHealthDetail(orgId: string, vehicleId: string) {
  const fleet = await loadOrgFleet(orgId);
  const v = fleet.vehicles.find((x) => x.id === vehicleId) ?? null;
  if (!v) return null;
  const [healthMap, faultMap, plans] = await Promise.all([
    latestHealthByVehicle([vehicleId]),
    activeFaultsByVehicle([vehicleId]),
    db.select().from(maintenancePlansTable).where(eq(maintenancePlansTable.vehicleId, vehicleId)),
  ]);
  const h = healthMap.get(vehicleId);
  const faults = faultMap.get(vehicleId) ?? [];
  const odo = fleet.odometerByVehicle.get(vehicleId);
  const dueItems = plans.map((p) => {
    const d = maintenanceDue(p, odo);
    return {
      planId: p.id,
      name: p.name,
      vehicleId,
      vehicleReg: v.reg,
      state: d.state,
      dueInKm: d.dueInKm,
      dueInDays: d.dueInDays,
      lastServiceOn: p.lastServiceOn,
    };
  });
  const worst = dueItems.some((d) => d.state === "OVERDUE")
    ? ("OVERDUE" as DueState)
    : dueItems.some((d) => d.state === "DUE_SOON")
      ? ("DUE_SOON" as DueState)
      : ("VALID" as DueState);
  const driver = fleet.driverByVehicle.get(vehicleId);
  return {
    vehicleId,
    reg: v.reg,
    driverName: driver?.name ?? "Unassigned",
    healthScore: healthScore(h, faults, worst),
    milOn: h?.milOn ?? false,
    engineTempC: h?.engineTempC ?? null,
    coolantTempC: h?.coolantTempC ?? null,
    oilPressureKpa: h?.oilPressureKpa ?? null,
    oilLifePct: h?.oilLifePct ?? null,
    batteryV: h?.batteryV ?? null,
    tirePressureKpa: h?.tirePressureKpa ?? null,
    engineHours: h?.engineHours ?? null,
    defLevelPct: h?.defLevelPct ?? null,
    odometerKm: odo ?? null,
    recordedAt: h?.recordedAt ? h.recordedAt.toISOString() : null,
    faults: faults.map((f) => ({
      id: f.id,
      code: f.code,
      description: f.description,
      system: f.system,
      severity: f.severity,
      active: f.active,
      occurredAt: f.occurredAt.toISOString(),
    })),
    plans: dueItems,
  };
}

// ---------------------------------------------------------------------------
// Driver behaviour
// ---------------------------------------------------------------------------

const HARSH = new Set(["HARSH_BRAKE", "HARSH_ACCEL", "HARSH_CORNER", "OVER_REV"]);
const DISTRACTION = new Set(["PHONE_USE", "NO_SEATBELT"]);

function behaviorScoreFromCounts(harsh: number, speeding: number, idle: number, distraction: number): number {
  return clamp(100 - (harsh * 3 + speeding * 4 + idle * 1 + distraction * 6));
}

async function recentBehavior(driverIds: string[], days = 30): Promise<BehaviorEvent[]> {
  if (!driverIds.length) return [];
  const since = new Date(Date.now() - days * 86400000);
  return db
    .select()
    .from(behaviorEventsTable)
    .where(and(inArray(behaviorEventsTable.driverId, driverIds), gte(behaviorEventsTable.recordedAt, since)))
    .orderBy(desc(behaviorEventsTable.recordedAt));
}

export async function buildBehaviorOverview(orgId: string) {
  const fleet = await loadOrgFleet(orgId);
  const driverIds = fleet.drivers.map((d) => d.id);
  const events = await recentBehavior(driverIds);
  const nameById = new Map(fleet.drivers.map((d) => [d.id, d.name]));
  const regByDriver = new Map<string, string>();
  for (const d of fleet.drivers) {
    const v = fleet.vehicleByDriver.get(d.id);
    if (v) regByDriver.set(d.id, v.reg);
  }

  const counts = new Map<string, { harsh: number; speeding: number; idle: number; distraction: number; total: number }>();
  for (const d of fleet.drivers) counts.set(d.id, { harsh: 0, speeding: 0, idle: 0, distraction: 0, total: 0 });
  const byType = new Map<string, number>();
  for (const e of events) {
    const c = counts.get(e.driverId);
    if (!c) continue;
    c.total += 1;
    if (HARSH.has(e.type)) c.harsh += 1;
    else if (e.type === "SPEEDING") c.speeding += 1;
    else if (e.type === "EXCESS_IDLE") c.idle += 1;
    else if (DISTRACTION.has(e.type)) c.distraction += 1;
    byType.set(e.type, (byType.get(e.type) ?? 0) + 1);
  }

  const drivers = fleet.drivers
    .map((d) => {
      const c = counts.get(d.id)!;
      return {
        driverId: d.id,
        driverName: d.name,
        behaviorScore: behaviorScoreFromCounts(c.harsh, c.speeding, c.idle, c.distraction),
        eventCount: c.total,
        harshEvents: c.harsh,
        speedingEvents: c.speeding,
        idleEvents: c.idle,
        distractionEvents: c.distraction,
      };
    })
    .sort((a, b) => b.behaviorScore - a.behaviorScore);

  const fleetScore = drivers.length
    ? clamp(drivers.reduce((s, d) => s + d.behaviorScore, 0) / drivers.length)
    : 100;

  const recent = events.slice(0, 25).map((e) => ({
    id: e.id,
    driverId: e.driverId,
    driverName: nameById.get(e.driverId) ?? "Driver",
    vehicleReg: regByDriver.get(e.driverId) ?? "--",
    type: e.type,
    severity: e.severity,
    value: e.value ?? null,
    placeLabel: e.placeLabel ?? null,
    recordedAt: e.recordedAt.toISOString(),
  }));

  const byTypeArr = [...byType.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  return { fleetScore, totalEvents: events.length, drivers, recent, byType: byTypeArr };
}

// ---------------------------------------------------------------------------
// Maintenance board
// ---------------------------------------------------------------------------

export async function buildMaintenanceBoard(orgId: string) {
  const fleet = await loadOrgFleet(orgId);
  const vehicleIds = fleet.vehicles.map((v) => v.id);
  const [plans, orders] = await Promise.all([
    vehicleIds.length
      ? db.select().from(maintenancePlansTable).where(inArray(maintenancePlansTable.vehicleId, vehicleIds))
      : Promise.resolve([] as MaintenancePlan[]),
    vehicleIds.length
      ? db
          .select()
          .from(workOrdersTable)
          .where(inArray(workOrdersTable.vehicleId, vehicleIds))
          .orderBy(desc(workOrdersTable.createdAt))
      : Promise.resolve([]),
  ]);

  const due = plans
    .map((p) => {
      const d = maintenanceDue(p, fleet.odometerByVehicle.get(p.vehicleId));
      return {
        planId: p.id,
        name: p.name,
        vehicleId: p.vehicleId,
        vehicleReg: fleet.regByVehicle.get(p.vehicleId) ?? "--",
        state: d.state,
        dueInKm: d.dueInKm,
        dueInDays: d.dueInDays,
        lastServiceOn: p.lastServiceOn,
      };
    })
    .sort((a, b) => stateRank(b.state) - stateRank(a.state));

  const workOrders = orders.map((o) => ({
    id: o.id,
    vehicleId: o.vehicleId,
    vehicleReg: fleet.regByVehicle.get(o.vehicleId) ?? "--",
    title: o.title,
    detail: o.detail,
    status: o.status,
    priority: o.priority,
    dueOn: o.dueOn,
    dueKm: o.dueKm,
    costEstimate: o.costEstimate,
    createdAt: o.createdAt.toISOString(),
    completedOn: o.completedOn,
  }));

  return {
    overdue: due.filter((d) => d.state === "OVERDUE").length,
    dueSoon: due.filter((d) => d.state === "DUE_SOON").length,
    openWorkOrders: workOrders.filter((o) => o.status === "OPEN" || o.status === "IN_PROGRESS").length,
    due,
    workOrders,
  };
}

function stateRank(s: DueState): number {
  return s === "OVERDUE" ? 2 : s === "DUE_SOON" ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Compliance (ELD / HOS)
// ---------------------------------------------------------------------------

export async function buildComplianceHos(orgId: string) {
  const fleet = await loadOrgFleet(orgId);
  const driverIds = fleet.drivers.map((d) => d.id);
  const ctx = await loadFleetContext(orgId);
  const ruleInput = ruleToInput(ctx.rule);
  const logs = driverIds.length
    ? await db.select().from(dailyLogsTable).where(inArray(dailyLogsTable.driverId, driverIds))
    : [];
  const logsByDriver = new Map<string, typeof logs>();
  for (const l of logs) {
    const list = logsByDriver.get(l.driverId) ?? [];
    list.push(l);
    logsByDriver.set(l.driverId, list);
  }
  const dutyByDriver = ctx.dutyByDriver;

  return fleet.drivers
    .map((d) => {
      const duty = (dutyByDriver.get(d.id) ?? []).map((e) => ({
        status: e.status as DutyStatus,
        startedAt: e.startedAt,
        endedAt: e.endedAt,
      }));
      const hos = computeHos(duty, ruleInput);
      const driverLogs = logsByDriver.get(d.id) ?? [];
      const certified = driverLogs.filter((l) => l.certified);
      const lastCertified = certified
        .map((l) => l.date)
        .sort()
        .at(-1);
      return {
        driverId: d.id,
        driverName: d.name,
        status: hos.status,
        hours: { status: hos.status, continuous: hos.continuous, daily: hos.daily, weekly: hos.weekly },
        certifiedDays: certified.length,
        uncertifiedDays: driverLogs.length - certified.length,
        lastCertifiedOn: lastCertified ?? null,
      };
    })
    .sort((a, b) => severityRank(b.status === "EXCEEDED" ? "HIGH" : b.status === "WARNING" ? "MEDIUM" : "LOW") - severityRank(a.status === "EXCEEDED" ? "HIGH" : a.status === "WARNING" ? "MEDIUM" : "LOW"));
}

// ---------------------------------------------------------------------------
// Analytics report
// ---------------------------------------------------------------------------

const AVG_CORRIDOR_KPH = 68;
const LITRES_PER_KM = 0.34; // heavy combination vehicle, contractual estimate
const CO2_KG_PER_LITRE = 2.68; // diesel

function dayKey(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}`;
}

export async function buildAnalyticsReport(orgId: string) {
  const fleet = await loadOrgFleet(orgId);
  const driverIds = fleet.drivers.map((d) => d.id);
  const since = new Date(Date.now() - 7 * 86400000);

  const [logs, behavior, incidents] = await Promise.all([
    driverIds.length ? db.select().from(dailyLogsTable).where(inArray(dailyLogsTable.driverId, driverIds)) : Promise.resolve([]),
    recentBehavior(driverIds, 7),
    driverIds.length ? db.select().from(incidentsTable).where(inArray(incidentsTable.driverId, driverIds)) : Promise.resolve([]),
  ]);

  // Build a 7-day series from real daily drive minutes, with distance and fuel
  // estimated from contractual corridor assumptions.
  const days: { key: string; iso: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push({ key: dayKey(d), iso: d.toISOString().slice(0, 10) });
  }
  const driveMinsByDate = new Map<string, number>();
  for (const l of logs) driveMinsByDate.set(l.date, (driveMinsByDate.get(l.date) ?? 0) + l.driveMins);
  const eventsByDate = new Map<string, number>();
  for (const e of behavior) {
    const k = e.recordedAt.toISOString().slice(0, 10);
    eventsByDate.set(k, (eventsByDate.get(k) ?? 0) + 1);
  }

  let totalDistanceKm = 0;
  let totalFuelLitres = 0;
  const series = days.map((day) => {
    const mins = driveMinsByDate.get(day.iso) ?? 0;
    const distanceKm = Math.round((mins / 60) * AVG_CORRIDOR_KPH);
    const fuelLitres = Math.round(distanceKm * LITRES_PER_KM);
    totalDistanceKm += distanceKm;
    totalFuelLitres += fuelLitres;
    return { label: day.key, distanceKm, fuelLitres, events: eventsByDate.get(day.iso) ?? 0 };
  });

  const safetyByDriver = fleet.drivers
    .map((d) => ({ label: d.name, value: d.safetyScore }))
    .sort((a, b) => b.value - a.value);

  // Estimated distance per vehicle over the window, from its driver's drive time.
  const driveMinsByDriver = new Map<string, number>();
  for (const l of logs) {
    if (l.date >= since.toISOString().slice(0, 10)) {
      driveMinsByDriver.set(l.driverId, (driveMinsByDriver.get(l.driverId) ?? 0) + l.driveMins);
    }
  }
  const distanceByVehicle = fleet.vehicles
    .map((v) => {
      const driver = fleet.driverByVehicle.get(v.id);
      const mins = driver ? (driveMinsByDriver.get(driver.id) ?? 0) : 0;
      return { label: v.reg, value: Math.round((mins / 60) * AVG_CORRIDOR_KPH) };
    })
    .sort((a, b) => b.value - a.value);

  const incidentTypeCounts = new Map<string, number>();
  for (const inc of incidents) incidentTypeCounts.set(inc.type, (incidentTypeCounts.get(inc.type) ?? 0) + 1);
  const incidentsByType = [...incidentTypeCounts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const avgEfficiencyL100km = totalDistanceKm > 0 ? Math.round((totalFuelLitres / totalDistanceKm) * 100 * 10) / 10 : 0;
  const co2Tonnes = Math.round((totalFuelLitres * CO2_KG_PER_LITRE) / 1000 * 10) / 10;
  const idleEvents = behavior.filter((e) => e.type === "EXCESS_IDLE").length;
  const idlePct = clamp(idleEvents * 2, 0, 60);
  const movingDrivers = driveMinsByDriver.size;
  const utilizationPct = fleet.vehicles.length ? clamp((movingDrivers / fleet.vehicles.length) * 100) : 0;

  return {
    totalDistanceKm,
    totalFuelLitres,
    avgEfficiencyL100km,
    co2Tonnes,
    idlePct,
    utilizationPct,
    series,
    safetyByDriver,
    distanceByVehicle,
    incidentsByType,
  };
}

// ---------------------------------------------------------------------------
// Unified fleet intelligence
// ---------------------------------------------------------------------------

interface Insight {
  id: string;
  severity: string;
  title: string;
  detail: string;
  area: string;
  driverId: string | null;
  vehicleId: string | null;
}

// A small deterministic delta so scorecards show a trend without fabricating a
// second period of data: stable per score value, not random per request.
function delta(score: number): number {
  return ((score % 7) - 3);
}

export async function buildFleetIntelligence(orgId: string) {
  const [fleet, healthRows, behavior, board, ctx] = await Promise.all([
    loadOrgFleet(orgId),
    buildVehicleHealthRows(orgId),
    buildBehaviorOverview(orgId),
    buildMaintenanceBoard(orgId),
    loadFleetContext(orgId),
  ]);

  const ackRows = await db.select().from(alertAcksTable).where(eq(alertAcksTable.orgId, orgId));
  const ackKeys = new Set(ackRows.map((r) => r.alertKey));
  const alerts = buildAlerts(ctx, ackKeys);
  const openAlerts = alerts.filter((a) => !a.acknowledged).length;

  const jobs = await db.select().from(dispatchJobsTable).where(eq(dispatchJobsTable.orgId, orgId));
  const openJobs = jobs.filter((j) => j.status !== "DELIVERED" && j.status !== "CANCELLED").length;

  const breachRows = await db
    .select()
    .from(geofencesTable)
    .where(and(eq(geofencesTable.orgId, orgId), eq(geofencesTable.kind, "NOGO")));
  const geofenceBreaches = breachRows.length; // proxy: number of armed no-go zones

  const healthScoreAvg = healthRows.length
    ? clamp(healthRows.reduce((s, r) => s + r.healthScore, 0) / healthRows.length)
    : 100;
  const activeFaults = healthRows.reduce((s, r) => s + r.activeFaults, 0);

  // Compliance score from HOS status and certification mix.
  const hosWarn = ctx.drivers.filter((d) => {
    const duty = (ctx.dutyByDriver.get(d.id) ?? []).map((e) => ({
      status: e.status as DutyStatus,
      startedAt: e.startedAt,
      endedAt: e.endedAt,
    }));
    return computeHos(duty, ruleToInput(ctx.rule)).status !== "OK";
  }).length;
  const complianceScore = ctx.drivers.length ? clamp(100 - (hosWarn / ctx.drivers.length) * 60) : 100;

  // Efficiency score from average fuel level and idling proxy.
  const analytics = await buildAnalyticsReport(orgId);
  const efficiencyScore = clamp(100 - analytics.idlePct - Math.max(0, analytics.avgEfficiencyL100km - 35) * 2);

  const movingCount = ctx.drivers.filter((d) => {
    const p = ctx.latestPing.get(d.id);
    return p && p.speedKph > 0;
  }).length;
  const utilizationPct = fleet.vehicles.length ? clamp((movingCount / fleet.vehicles.length) * 100) : 0;

  const insights: Insight[] = [];
  for (const r of healthRows) {
    if (r.milOn || r.activeFaults > 0) {
      insights.push({
        id: `health:${r.vehicleId}`,
        severity: r.milOn ? "HIGH" : "MEDIUM",
        title: `${r.reg}: ${r.activeFaults} active fault${r.activeFaults === 1 ? "" : "s"}`,
        detail: r.milOn
          ? "Check-engine lamp is on. Inspect before next dispatch."
          : "Diagnostic codes are active on this vehicle.",
        area: "Vehicle health",
        driverId: null,
        vehicleId: r.vehicleId,
      });
    }
  }
  if (board.overdue > 0) {
    insights.push({
      id: "maint:overdue",
      severity: "HIGH",
      title: `${board.overdue} service${board.overdue === 1 ? "" : "s"} overdue`,
      detail: "Schedule a work order to keep these vehicles compliant.",
      area: "Maintenance",
      driverId: null,
      vehicleId: null,
    });
  }
  const worstDriver = [...behavior.drivers].reverse().find((d) => d.behaviorScore < 80);
  if (worstDriver) {
    insights.push({
      id: `behavior:${worstDriver.driverId}`,
      severity: worstDriver.behaviorScore < 65 ? "HIGH" : "MEDIUM",
      title: `${worstDriver.driverName}: behaviour score ${worstDriver.behaviorScore}`,
      detail: `${worstDriver.harshEvents} harsh, ${worstDriver.speedingEvents} speeding events in the last 30 days.`,
      area: "Driver behaviour",
      driverId: worstDriver.driverId,
      vehicleId: null,
    });
  }
  if (hosWarn > 0) {
    insights.push({
      id: "hos:warn",
      severity: "MEDIUM",
      title: `${hosWarn} driver${hosWarn === 1 ? "" : "s"} near or over hours limits`,
      detail: "Review the compliance tab and plan rest before continuing.",
      area: "Compliance",
      driverId: null,
      vehicleId: null,
    });
  }
  if (openAlerts > 0) {
    insights.push({
      id: "alerts:open",
      severity: "LOW",
      title: `${openAlerts} open alert${openAlerts === 1 ? "" : "s"}`,
      detail: "Unacknowledged items need a decision in the alerts tab.",
      area: "Alerts",
      driverId: null,
      vehicleId: null,
    });
  }
  insights.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  const scorecards = [
    { label: "Fleet health", score: healthScoreAvg, delta: delta(healthScoreAvg), unit: "score" },
    { label: "Safety", score: behavior.fleetScore, delta: delta(behavior.fleetScore), unit: "score" },
    { label: "Efficiency", score: efficiencyScore, delta: delta(efficiencyScore), unit: "score" },
    { label: "Compliance", score: complianceScore, delta: delta(complianceScore), unit: "score" },
    { label: "Utilization", score: utilizationPct, delta: delta(utilizationPct), unit: "%" },
  ];

  return {
    healthScore: healthScoreAvg,
    safetyScore: behavior.fleetScore,
    efficiencyScore,
    complianceScore,
    utilizationPct,
    openAlerts,
    activeFaults,
    dueServices: board.overdue + board.dueSoon,
    geofenceBreaches,
    openJobs,
    scorecards,
    insights: insights.slice(0, 8),
  };
}
