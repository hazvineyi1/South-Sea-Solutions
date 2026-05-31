import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import {
  db,
  pool,
  orgsTable,
  usersTable,
  sessionsTable,
  fleetsTable,
  vehiclesTable,
  driversTable,
  ruleProfilesTable,
  dutyEventsTable,
  dailyLogsTable,
  tripPingsTable,
  fuelReportsTable,
  incidentsTable,
  documentsTable,
  coursesTable,
  courseCompletionsTable,
  certificationsTable,
  auditLogsTable,
  alertAcksTable,
} from "@workspace/db";

const scrypt = promisify(scryptCb);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function minsAgo(mins: number): Date {
  return new Date(Date.now() - mins * 60000);
}

async function clearAll(): Promise<void> {
  // Delete in dependency order (children first).
  await db.delete(alertAcksTable);
  await db.delete(auditLogsTable);
  await db.delete(courseCompletionsTable);
  await db.delete(certificationsTable);
  await db.delete(documentsTable);
  await db.delete(incidentsTable);
  await db.delete(fuelReportsTable);
  await db.delete(tripPingsTable);
  await db.delete(dailyLogsTable);
  await db.delete(dutyEventsTable);
  await db.delete(coursesTable);
  await db.delete(sessionsTable);
  await db.delete(usersTable);
  await db.delete(driversTable);
  await db.delete(vehiclesTable);
  await db.delete(fleetsTable);
  await db.delete(ruleProfilesTable);
  await db.delete(orgsTable);
}

async function main(): Promise<void> {
  await clearAll();

  const [org] = await db
    .insert(orgsTable)
    .values({ name: "Kalahari Haulage", region: "Gaborone, Botswana" })
    .returning();

  const [rule] = await db
    .insert(ruleProfilesTable)
    .values({
      orgId: org.id,
      name: "Mine and insurer contractual standard",
      contMins: 270,
      dailyMins: 540,
      weeklyMins: 3360,
      dailyRestMins: 660,
      breakMins: 45,
      isDefault: true,
    })
    .returning();

  const [fleet] = await db
    .insert(fleetsTable)
    .values({ orgId: org.id, name: "Long haul corridor", depot: "Gaborone depot" })
    .returning();

  const courses = await db
    .insert(coursesTable)
    .values([
      { orgId: org.id, title: "Fatigue and hours management", ordinal: 1 },
      { orgId: org.id, title: "Defensive and eco driving", ordinal: 2 },
      { orgId: org.id, title: "Cross-border compliance", ordinal: 3 },
      { orgId: org.id, title: "Dangerous goods awareness", ordinal: 4 },
    ])
    .returning();

  const driverSpecs = [
    {
      name: "Thabo Molefe",
      employeeNo: "KH-001",
      reg: "B 123 ABC",
      cert: "CERTIFIED" as const,
      certDays: 210,
      safety: 92,
      onTime: 96,
      // Near continuous limit: long ongoing drive.
      driveMins: 252,
      speed: 84,
      fuelPct: 64,
      place: "A1 north, Mahalapye",
      incident: null as null | { type: string; detail: string; severity: "LOW" | "MEDIUM" | "HIGH"; risk: number },
      courseStatus: ["DONE", "DONE", "DONE", "IN_PROGRESS"] as const,
      docExpiryDays: 240,
    },
    {
      name: "Naledi Kgosi",
      employeeNo: "KH-002",
      reg: "B 456 DEF",
      cert: "CERTIFIED" as const,
      certDays: 150,
      safety: 88,
      onTime: 91,
      driveMins: 120,
      speed: 78,
      fuelPct: 12, // low fuel alert
      place: "A1 south, Lobatse",
      incident: null,
      courseStatus: ["DONE", "DONE", "IN_PROGRESS", "TODO"] as const,
      docExpiryDays: 40, // document due soon
    },
    {
      name: "Kabelo Seretse",
      employeeNo: "KH-003",
      reg: "B 789 GHI",
      cert: "IN_PROGRESS" as const,
      certDays: null,
      safety: 74,
      onTime: 83,
      driveMins: 95,
      speed: 69,
      fuelPct: 55,
      place: "Off corridor near Kanye",
      incident: { type: "ROUTE_DEVIATION", detail: "Vehicle left the agreed A1 corridor near Kanye.", severity: "MEDIUM" as const, risk: 8 },
      courseStatus: ["DONE", "IN_PROGRESS", "TODO", "TODO"] as const,
      docExpiryDays: 300,
    },
    {
      name: "Lorato Pule",
      employeeNo: "KH-004",
      reg: "B 234 JKL",
      cert: "CERTIFIED" as const,
      certDays: 95,
      safety: 90,
      onTime: 94,
      driveMins: 40,
      speed: 0, // idling
      fuelPct: 48,
      place: "Pioneer border post queue",
      incident: { type: "PROLONGED_IDLE", detail: "Stationary for over 90 minutes at the border queue.", severity: "LOW" as const, risk: 3 },
      courseStatus: ["DONE", "DONE", "DONE", "DONE"] as const,
      docExpiryDays: 420,
    },
    {
      name: "Mpho Tau",
      employeeNo: "KH-005",
      reg: "B 567 MNO",
      cert: "LAPSED" as const,
      certDays: -20, // expired 20 days ago
      safety: 68,
      onTime: 79,
      driveMins: 0,
      speed: 0,
      fuelPct: 80,
      place: "Gaborone depot",
      incident: null,
      courseStatus: ["DONE", "TODO", "TODO", "TODO"] as const,
      docExpiryDays: -10, // licence expired
    },
    {
      name: "Tshepo Dube",
      employeeNo: "KH-006",
      reg: "B 890 PQR",
      cert: "CERTIFIED" as const,
      certDays: 320,
      safety: 95,
      onTime: 98,
      driveMins: 180,
      speed: 90,
      fuelPct: 71,
      place: "Martin's Drift, cross-border",
      incident: null,
      courseStatus: ["DONE", "DONE", "DONE", "DONE"] as const,
      docExpiryDays: 500,
    },
  ];

  let driverUserId: string | null = null;

  for (let i = 0; i < driverSpecs.length; i++) {
    const spec = driverSpecs[i];

    const [vehicle] = await db
      .insert(vehiclesTable)
      .values({ fleetId: fleet.id, reg: spec.reg, active: true })
      .returning();

    const [driver] = await db
      .insert(driversTable)
      .values({
        orgId: org.id,
        name: spec.name,
        employeeNo: spec.employeeNo,
        dob: "1988-05-14",
        phone: "+267 71 000 00" + i,
        languages: ["en", "tn"],
        homeDepot: "Gaborone depot",
        emergencyContact: "Next of kin on file",
        licenceNo: "BW-DL-" + (100000 + i),
        licenceClass: "EC",
        prdp: true,
        currentVehicleId: vehicle.id,
        safetyScore: spec.safety,
        onTimePct: spec.onTime,
      })
      .returning();

    // Duty events: a qualifying break, then an ongoing drive of driveMins.
    if (spec.driveMins > 0) {
      await db.insert(dutyEventsTable).values([
        { driverId: driver.id, status: "OFF", startedAt: minsAgo(spec.driveMins + 600), endedAt: minsAgo(spec.driveMins + 60), source: "PHONE" },
        { driverId: driver.id, status: "DRIVING", startedAt: minsAgo(spec.driveMins), endedAt: null, source: "PHONE" },
      ]);
    } else {
      await db.insert(dutyEventsTable).values([
        { driverId: driver.id, status: "OFF", startedAt: minsAgo(720), endedAt: null, source: "PHONE" },
      ]);
    }

    // Recent daily logs.
    await db.insert(dailyLogsTable).values([
      { driverId: driver.id, date: daysFromNow(-1), driveMins: 480, dutyMins: 540, restMins: 660, certified: true, certifiedAt: minsAgo(1500) },
      { driverId: driver.id, date: daysFromNow(-2), driveMins: 510, dutyMins: 560, restMins: 640, certified: true, certifiedAt: minsAgo(2940) },
    ]);

    // Latest trip ping (determines moving vs idling).
    await db.insert(tripPingsTable).values({
      driverId: driver.id,
      vehicleId: vehicle.id,
      lat: -24.6 - i * 0.1,
      lng: 25.9 + i * 0.1,
      speedKph: spec.speed,
      placeLabel: spec.place,
      recordedAt: minsAgo(4),
    });

    // Latest driver-reported fuel.
    await db.insert(fuelReportsTable).values({
      driverId: driver.id,
      vehicleId: vehicle.id,
      odometerKm: 184000 + i * 1200,
      fuelPct: spec.fuelPct,
      litres: null,
      recordedAt: minsAgo(30),
    });

    if (spec.incident) {
      await db.insert(incidentsTable).values({
        driverId: driver.id,
        type: spec.incident.type,
        detail: spec.incident.detail,
        severity: spec.incident.severity,
        status: "OPEN",
        riskPoints: spec.incident.risk,
        occurredAt: minsAgo(50),
      });
    }

    // Documents: licence with per-driver expiry, plus a PrDP.
    await db.insert(documentsTable).values([
      { driverId: driver.id, type: "LICENCE", label: "Driving licence (class EC)", expiresOn: daysFromNow(spec.docExpiryDays) },
      { driverId: driver.id, type: "PRDP", label: "Professional driving permit", expiresOn: daysFromNow(spec.docExpiryDays + 90) },
      { driverId: driver.id, type: "MEDICAL_CERT", label: "Medical certificate validity", expiresOn: daysFromNow(spec.docExpiryDays + 30) },
    ]);

    // Course completions.
    await db.insert(courseCompletionsTable).values(
      courses.map((course, idx) => ({
        driverId: driver.id,
        courseId: course.id,
        status: spec.courseStatus[idx],
        score: spec.courseStatus[idx] === "DONE" ? 70 + ((i + idx) % 25) : null,
        completedOn: spec.courseStatus[idx] === "DONE" ? daysFromNow(-30 - idx * 10) : null,
      })),
    );

    // Certification.
    await db.insert(certificationsTable).values({
      driverId: driver.id,
      status: spec.cert,
      issuedOn: spec.certDays != null ? daysFromNow(spec.certDays - 365) : null,
      expiresOn: spec.certDays != null ? daysFromNow(spec.certDays) : null,
    });

    if (i === 0) {
      const [du] = await db
        .insert(usersTable)
        .values({
          orgId: org.id,
          email: "driver@drivewise.test",
          passwordHash: await hashPassword("Drivewise2026"),
          role: "DRIVER",
          name: spec.name,
          locale: "en",
          driverId: driver.id,
        })
        .returning();
      driverUserId = du.id;
    }
  }

  await db.insert(usersTable).values([
    {
      orgId: org.id,
      email: "owner@drivewise.test",
      passwordHash: await hashPassword("Drivewise2026"),
      role: "OWNER",
      name: "Keabetswe Owner",
      locale: "en",
    },
  ]);

  void driverUserId;
  void rule;

  // eslint-disable-next-line no-console
  console.log("Seed complete. Org:", org.name);
  await pool.end();
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  await pool.end();
  process.exit(1);
});
