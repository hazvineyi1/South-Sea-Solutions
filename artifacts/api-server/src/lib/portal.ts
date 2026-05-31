import { eq, inArray, desc } from "drizzle-orm";
import {
  db,
  driversTable,
  fleetsTable,
  vehiclesTable,
  ruleProfilesTable,
  tripPingsTable,
  fuelReportsTable,
  certificationsTable,
  documentsTable,
  incidentsTable,
  dutyEventsTable,
  coursesTable,
  courseCompletionsTable,
  type Driver,
  type Vehicle,
  type RuleProfile,
  type TripPing,
  type FuelReport,
  type Certification,
  type Document,
  type Incident,
  type DutyEvent,
  type Course,
  type CourseCompletion,
} from "@workspace/db";
import { computeHos, type DutyStatus, type RuleProfileInput } from "./hosEngine";

export interface FleetContext {
  drivers: Driver[];
  vehiclesById: Map<string, Vehicle>;
  rule: RuleProfile;
  latestPing: Map<string, TripPing>;
  latestFuel: Map<string, FuelReport>;
  certByDriver: Map<string, Certification>;
  docsByDriver: Map<string, Document[]>;
  openIncidentsByDriver: Map<string, Incident[]>;
  dutyByDriver: Map<string, DutyEvent[]>;
  courses: Course[];
  completionsByDriver: Map<string, CourseCompletion[]>;
}

const CROSS_BORDER = /border|drift/i;
const DUE_SOON_DAYS = 60;

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function firstPerDriver<T extends { driverId: string }>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    if (!map.has(row.driverId)) map.set(row.driverId, row);
  }
  return map;
}

function groupByDriver<T extends { driverId: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const list = map.get(row.driverId) ?? [];
    list.push(row);
    map.set(row.driverId, list);
  }
  return map;
}

export function ruleToInput(rule: RuleProfile): RuleProfileInput {
  return {
    contMins: rule.contMins,
    dailyMins: rule.dailyMins,
    weeklyMins: rule.weeklyMins,
    dailyRestMins: rule.dailyRestMins,
    breakMins: rule.breakMins,
  };
}

export type DateState = "VALID" | "DUE_SOON" | "EXPIRED";

export function dateState(expiresOn: string | null): DateState {
  if (!expiresOn) return "VALID";
  const exp = new Date(expiresOn + "T00:00:00Z").getTime();
  const now = Date.now();
  if (exp < now) return "EXPIRED";
  if (exp < now + DUE_SOON_DAYS * 86400000) return "DUE_SOON";
  return "VALID";
}

export async function loadFleetContext(orgId: string): Promise<FleetContext> {
  const drivers = await db.select().from(driversTable).where(eq(driversTable.orgId, orgId));
  const driverIds = drivers.map((d) => d.id);

  const fleets = await db.select().from(fleetsTable).where(eq(fleetsTable.orgId, orgId));
  const fleetIds = fleets.map((f) => f.id);
  const vehicles = fleetIds.length
    ? await db.select().from(vehiclesTable).where(inArray(vehiclesTable.fleetId, fleetIds))
    : [];

  const rules = await db.select().from(ruleProfilesTable).where(eq(ruleProfilesTable.orgId, orgId));
  const rule = rules.find((r) => r.isDefault) ?? rules[0];

  const empty = driverIds.length === 0;
  const pings = empty
    ? []
    : await db.select().from(tripPingsTable).where(inArray(tripPingsTable.driverId, driverIds)).orderBy(desc(tripPingsTable.recordedAt));
  const fuels = empty
    ? []
    : await db.select().from(fuelReportsTable).where(inArray(fuelReportsTable.driverId, driverIds)).orderBy(desc(fuelReportsTable.recordedAt));
  const certs = empty ? [] : await db.select().from(certificationsTable).where(inArray(certificationsTable.driverId, driverIds));
  const docs = empty ? [] : await db.select().from(documentsTable).where(inArray(documentsTable.driverId, driverIds));
  const incidents = empty ? [] : await db.select().from(incidentsTable).where(inArray(incidentsTable.driverId, driverIds));
  const duty = empty ? [] : await db.select().from(dutyEventsTable).where(inArray(dutyEventsTable.driverId, driverIds));
  const courses = await db.select().from(coursesTable).where(eq(coursesTable.orgId, orgId)).orderBy(coursesTable.ordinal);
  const completions = empty ? [] : await db.select().from(courseCompletionsTable).where(inArray(courseCompletionsTable.driverId, driverIds));

  const certByDriver = new Map<string, Certification>();
  for (const c of certs) certByDriver.set(c.driverId, c);

  return {
    drivers,
    vehiclesById: new Map(vehicles.map((v) => [v.id, v])),
    rule,
    latestPing: firstPerDriver(pings),
    latestFuel: firstPerDriver(fuels),
    certByDriver,
    docsByDriver: groupByDriver(docs),
    openIncidentsByDriver: groupByDriver(incidents.filter((i) => i.status === "OPEN")),
    dutyByDriver: groupByDriver(duty),
    courses,
    completionsByDriver: groupByDriver(completions),
  };
}

export interface AlertItem {
  key: string;
  kind: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  driverId: string;
  driverName: string;
  message: string;
  occurredAt: string | null;
  acknowledged: boolean;
}

const SEVERITY_RANK: Record<AlertItem["severity"], number> = { HIGH: 2, MEDIUM: 1, LOW: 0 };

export function buildAlerts(ctx: FleetContext, ackKeys: Set<string>): AlertItem[] {
  const ruleInput = ruleToInput(ctx.rule);
  const alerts: AlertItem[] = [];

  const push = (a: Omit<AlertItem, "acknowledged">) => {
    alerts.push({ ...a, acknowledged: ackKeys.has(a.key) });
  };

  for (const driver of ctx.drivers) {
    const duty = (ctx.dutyByDriver.get(driver.id) ?? []).map((e) => ({
      status: e.status as DutyStatus,
      startedAt: e.startedAt,
      endedAt: e.endedAt,
    }));
    const hos = computeHos(duty, ruleInput);
    if (hos.continuous.status === "EXCEEDED") {
      push({ key: `FATIGUE_WATCH:${driver.id}`, kind: "FATIGUE_WATCH", severity: "HIGH", driverId: driver.id, driverName: driver.name, message: "Continuous driving limit exceeded.", occurredAt: null });
    } else if (hos.continuous.status === "WARNING") {
      push({ key: `FATIGUE_WATCH:${driver.id}`, kind: "FATIGUE_WATCH", severity: "MEDIUM", driverId: driver.id, driverName: driver.name, message: "Continuous driving is near the contractual limit.", occurredAt: null });
    }

    const fuel = ctx.latestFuel.get(driver.id);
    if (fuel && fuel.fuelPct <= 15) {
      push({ key: `LOW_FUEL:${driver.id}`, kind: "LOW_FUEL", severity: "MEDIUM", driverId: driver.id, driverName: driver.name, message: `Driver-reported fuel at ${fuel.fuelPct} percent.`, occurredAt: null });
    }

    const cert = ctx.certByDriver.get(driver.id);
    if (cert) {
      if (cert.status === "LAPSED") {
        push({ key: `CERT_LAPSED:${driver.id}`, kind: "CERT_LAPSED", severity: "HIGH", driverId: driver.id, driverName: driver.name, message: "Drivewise certification has lapsed.", occurredAt: null });
      } else {
        const state = dateState(cert.expiresOn);
        if (state === "EXPIRED") {
          push({ key: `CERT_EXPIRED:${driver.id}`, kind: "CERT_EXPIRED", severity: "HIGH", driverId: driver.id, driverName: driver.name, message: "Drivewise certification has expired.", occurredAt: null });
        } else if (state === "DUE_SOON") {
          push({ key: `CERT_EXPIRING:${driver.id}`, kind: "CERT_EXPIRING", severity: "LOW", driverId: driver.id, driverName: driver.name, message: "Drivewise certification is due for renewal within 60 days.", occurredAt: null });
        }
      }
    }

    for (const doc of ctx.docsByDriver.get(driver.id) ?? []) {
      const state = dateState(doc.expiresOn);
      if (state === "EXPIRED") {
        push({ key: `DOC_EXPIRED:${doc.id}`, kind: "DOC_EXPIRED", severity: "HIGH", driverId: driver.id, driverName: driver.name, message: `${doc.label} has expired.`, occurredAt: null });
      } else if (state === "DUE_SOON") {
        push({ key: `DOC_EXPIRING:${doc.id}`, kind: "DOC_EXPIRING", severity: "LOW", driverId: driver.id, driverName: driver.name, message: `${doc.label} is due to expire within 60 days.`, occurredAt: null });
      }
    }

    for (const inc of ctx.openIncidentsByDriver.get(driver.id) ?? []) {
      push({ key: `INCIDENT:${inc.id}`, kind: inc.type, severity: inc.severity as AlertItem["severity"], driverId: driver.id, driverName: driver.name, message: inc.detail ?? inc.type, occurredAt: toIso(inc.occurredAt) });
    }
  }

  alerts.sort((a, b) => {
    if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1;
    return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
  });

  return alerts;
}

export function driversNeedingAttention(alerts: AlertItem[]): Set<string> {
  const set = new Set<string>();
  for (const a of alerts) {
    if (!a.acknowledged) set.add(a.driverId);
  }
  return set;
}

export interface VehicleRowOut {
  vehicleId: string;
  reg: string;
  driverId: string | null;
  driverName: string;
  status: string;
  certification: string;
  speedKph: number;
  fuelPct: number;
  crossBorder: boolean;
  needsAttention: boolean;
  placeLabel: string | null;
}

export function buildVehicleRows(ctx: FleetContext, needsAttention: Set<string>): VehicleRowOut[] {
  const rows: VehicleRowOut[] = [];
  const driverByVehicle = new Map<string, Driver>();
  for (const d of ctx.drivers) {
    if (d.currentVehicleId) driverByVehicle.set(d.currentVehicleId, d);
  }

  for (const vehicle of ctx.vehiclesById.values()) {
    if (!vehicle.active) continue;
    const driver = driverByVehicle.get(vehicle.id) ?? null;
    const ping = driver ? ctx.latestPing.get(driver.id) : undefined;
    const fuel = driver ? ctx.latestFuel.get(driver.id) : undefined;
    const cert = driver ? ctx.certByDriver.get(driver.id) : undefined;
    const speed = ping?.speedKph ?? 0;
    const place = ping?.placeLabel ?? null;
    rows.push({
      vehicleId: vehicle.id,
      reg: vehicle.reg,
      driverId: driver?.id ?? null,
      driverName: driver?.name ?? "Unassigned",
      status: speed > 0 ? "MOVING" : "IDLING",
      certification: cert?.status ?? "IN_PROGRESS",
      speedKph: speed,
      fuelPct: fuel?.fuelPct ?? 0,
      crossBorder: place ? CROSS_BORDER.test(place) : false,
      needsAttention: driver ? needsAttention.has(driver.id) : false,
      placeLabel: place,
    });
  }

  rows.sort((a, b) => a.reg.localeCompare(b.reg));
  return rows;
}

export function buildFleetSummary(ctx: FleetContext, rows: VehicleRowOut[]) {
  const certifiedDrivers = ctx.drivers.filter((d) => ctx.certByDriver.get(d.id)?.status === "CERTIFIED").length;
  const totalDrivers = ctx.drivers.length || 1;
  return {
    activeVehicles: rows.length,
    crossBorderCount: rows.filter((r) => r.crossBorder).length,
    needsAttentionCount: rows.filter((r) => r.needsAttention).length,
    fleetCertifiedPct: Math.round((100 * certifiedDrivers) / totalDrivers),
    movingCount: rows.filter((r) => r.status === "MOVING").length,
    idlingCount: rows.filter((r) => r.status === "IDLING").length,
  };
}

export function buildDriverRecord(ctx: FleetContext, driver: Driver) {
  const ruleInput = ruleToInput(ctx.rule);
  const duty = (ctx.dutyByDriver.get(driver.id) ?? []).map((e) => ({
    status: e.status as DutyStatus,
    startedAt: e.startedAt,
    endedAt: e.endedAt,
  }));
  const hos = computeHos(duty, ruleInput);
  const ping = ctx.latestPing.get(driver.id);
  const fuel = ctx.latestFuel.get(driver.id);
  const cert = ctx.certByDriver.get(driver.id);
  const vehicle = driver.currentVehicleId ? ctx.vehiclesById.get(driver.currentVehicleId) : undefined;

  const courseById = new Map(ctx.courses.map((c) => [c.id, c]));
  const completions = ctx.completionsByDriver.get(driver.id) ?? [];

  const certState = cert ? (cert.status === "LAPSED" ? "EXPIRED" : dateState(cert.expiresOn)) : "VALID";

  let status: string;
  if (!ping) status = "OFF";
  else status = ping.speedKph > 0 ? "MOVING" : "IDLING";

  return {
    id: driver.id,
    name: driver.name,
    employeeNo: driver.employeeNo,
    phone: driver.phone,
    homeDepot: driver.homeDepot,
    emergencyContact: driver.emergencyContact,
    licenceNo: driver.licenceNo,
    licenceClass: driver.licenceClass,
    prdp: driver.prdp,
    safetyScore: driver.safetyScore,
    onTimePct: driver.onTimePct,
    currentVehicleReg: vehicle?.reg ?? null,
    placeLabel: ping?.placeLabel ?? null,
    fuelPct: fuel?.fuelPct ?? null,
    status,
    certification: {
      status: cert?.status ?? "IN_PROGRESS",
      state: certState,
      issuedOn: cert?.issuedOn ?? null,
      expiresOn: cert?.expiresOn ?? null,
    },
    hours: {
      status: hos.status,
      continuous: hos.continuous,
      daily: hos.daily,
      weekly: hos.weekly,
    },
    incidents: (ctx.openIncidentsByDriver.get(driver.id) ?? []).map((i) => ({
      id: i.id,
      type: i.type,
      detail: i.detail,
      severity: i.severity,
      status: i.status,
      riskPoints: i.riskPoints,
      occurredAt: i.occurredAt.toISOString(),
    })),
    documents: (ctx.docsByDriver.get(driver.id) ?? []).map((d) => ({
      id: d.id,
      type: d.type,
      label: d.label,
      expiresOn: d.expiresOn,
      state: dateState(d.expiresOn),
    })),
    courses: completions.map((c) => ({
      id: c.id,
      title: courseById.get(c.courseId)?.title ?? "Course",
      status: c.status,
      score: c.score,
      completedOn: c.completedOn,
    })),
  };
}
