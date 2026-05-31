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
  trainingModulesTable,
  trainingCompletionsTable,
  trainingSeedModules,
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
  await db.delete(trainingCompletionsTable);
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
  await db.delete(trainingModulesTable);
  await db.delete(orgsTable);
}

interface DriverSpec {
  name: string;
  employeeNo: string;
  reg: string;
  cert: "CERTIFIED" | "IN_PROGRESS" | "LAPSED";
  certDays: number | null;
  safety: number;
  onTime: number;
  driveMins: number;
  speed: number;
  fuelPct: number;
  place: string;
  incident: null | { type: string; detail: string; severity: "LOW" | "MEDIUM" | "HIGH"; risk: number };
  courseStatus: readonly ["DONE" | "IN_PROGRESS" | "TODO", "DONE" | "IN_PROGRESS" | "TODO", "DONE" | "IN_PROGRESS" | "TODO", "DONE" | "IN_PROGRESS" | "TODO"];
  docExpiryDays: number;
}

interface OrgSpec {
  name: string;
  region: string;
  depot: string;
  licencePrefix: string;
  ownerEmail: string;
  ownerName: string;
  driverEmail: string;
  drivers: DriverSpec[];
}

// Seeds one organization with its fleet, drivers, telemetry, owner and a single
// driver login (linked to the first driver). Returns the linked driver user id.
async function seedOrg(spec: OrgSpec): Promise<string | null> {
  const [org] = await db
    .insert(orgsTable)
    .values({ name: spec.name, region: spec.region })
    .returning();

  await db
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
    .values({ orgId: org.id, name: "Long haul corridor", depot: spec.depot })
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

  let driverUserId: string | null = null;

  for (let i = 0; i < spec.drivers.length; i++) {
    const ds = spec.drivers[i];

    const [vehicle] = await db
      .insert(vehiclesTable)
      .values({ fleetId: fleet.id, reg: ds.reg, active: true })
      .returning();

    const [driver] = await db
      .insert(driversTable)
      .values({
        orgId: org.id,
        name: ds.name,
        employeeNo: ds.employeeNo,
        dob: "1988-05-14",
        phone: "+267 71 000 00" + i,
        languages: ["en", "tn"],
        homeDepot: spec.depot,
        emergencyContact: "Next of kin on file",
        licenceNo: spec.licencePrefix + (100000 + i),
        licenceClass: "EC",
        prdp: true,
        currentVehicleId: vehicle.id,
        safetyScore: ds.safety,
        onTimePct: ds.onTime,
      })
      .returning();

    if (ds.driveMins > 0) {
      await db.insert(dutyEventsTable).values([
        { driverId: driver.id, status: "OFF", startedAt: minsAgo(ds.driveMins + 600), endedAt: minsAgo(ds.driveMins + 60), source: "PHONE" },
        { driverId: driver.id, status: "DRIVING", startedAt: minsAgo(ds.driveMins), endedAt: null, source: "PHONE" },
      ]);
    } else {
      await db.insert(dutyEventsTable).values([
        { driverId: driver.id, status: "OFF", startedAt: minsAgo(720), endedAt: null, source: "PHONE" },
      ]);
    }

    await db.insert(dailyLogsTable).values([
      { driverId: driver.id, date: daysFromNow(-1), driveMins: 480, dutyMins: 540, restMins: 660, certified: true, certifiedAt: minsAgo(1500) },
      { driverId: driver.id, date: daysFromNow(-2), driveMins: 510, dutyMins: 560, restMins: 640, certified: true, certifiedAt: minsAgo(2940) },
    ]);

    await db.insert(tripPingsTable).values({
      driverId: driver.id,
      vehicleId: vehicle.id,
      lat: -24.6 - i * 0.1,
      lng: 25.9 + i * 0.1,
      speedKph: ds.speed,
      placeLabel: ds.place,
      recordedAt: minsAgo(4),
    });

    await db.insert(fuelReportsTable).values({
      driverId: driver.id,
      vehicleId: vehicle.id,
      odometerKm: 184000 + i * 1200,
      fuelPct: ds.fuelPct,
      litres: null,
      recordedAt: minsAgo(30),
    });

    if (ds.incident) {
      await db.insert(incidentsTable).values({
        driverId: driver.id,
        type: ds.incident.type,
        detail: ds.incident.detail,
        severity: ds.incident.severity,
        status: "OPEN",
        riskPoints: ds.incident.risk,
        occurredAt: minsAgo(50),
      });
    }

    await db.insert(documentsTable).values([
      { driverId: driver.id, type: "LICENCE", label: "Driving licence (class EC)", expiresOn: daysFromNow(ds.docExpiryDays) },
      { driverId: driver.id, type: "PRDP", label: "Professional driving permit", expiresOn: daysFromNow(ds.docExpiryDays + 90) },
      { driverId: driver.id, type: "MEDICAL_CERT", label: "Medical certificate validity", expiresOn: daysFromNow(ds.docExpiryDays + 30) },
    ]);

    await db.insert(courseCompletionsTable).values(
      courses.map((course, idx) => ({
        driverId: driver.id,
        courseId: course.id,
        status: ds.courseStatus[idx],
        score: ds.courseStatus[idx] === "DONE" ? 70 + ((i + idx) % 25) : null,
        completedOn: ds.courseStatus[idx] === "DONE" ? daysFromNow(-30 - idx * 10) : null,
      })),
    );

    await db.insert(certificationsTable).values({
      driverId: driver.id,
      status: ds.cert,
      issuedOn: ds.certDays != null ? daysFromNow(ds.certDays - 365) : null,
      expiresOn: ds.certDays != null ? daysFromNow(ds.certDays) : null,
    });

    if (i === 0) {
      const [du] = await db
        .insert(usersTable)
        .values({
          orgId: org.id,
          email: spec.driverEmail,
          passwordHash: await hashPassword("Drivewise2026"),
          role: "DRIVER",
          name: ds.name,
          locale: "en",
          driverId: driver.id,
        })
        .returning();
      driverUserId = du.id;
    }
  }

  await db.insert(usersTable).values({
    orgId: org.id,
    email: spec.ownerEmail,
    passwordHash: await hashPassword("Drivewise2026"),
    role: "OWNER",
    name: spec.ownerName,
    locale: "en",
  });

  return driverUserId;
}

const kalahariDrivers: DriverSpec[] = [
  { name: "Thabo Molefe", employeeNo: "KH-001", reg: "B 123 ABC", cert: "CERTIFIED", certDays: 210, safety: 92, onTime: 96, driveMins: 252, speed: 84, fuelPct: 64, place: "A1 north, Mahalapye", incident: null, courseStatus: ["DONE", "DONE", "DONE", "IN_PROGRESS"], docExpiryDays: 240 },
  { name: "Naledi Kgosi", employeeNo: "KH-002", reg: "B 456 DEF", cert: "CERTIFIED", certDays: 150, safety: 88, onTime: 91, driveMins: 120, speed: 78, fuelPct: 12, place: "A1 south, Lobatse", incident: null, courseStatus: ["DONE", "DONE", "IN_PROGRESS", "TODO"], docExpiryDays: 40 },
  { name: "Kabelo Seretse", employeeNo: "KH-003", reg: "B 789 GHI", cert: "IN_PROGRESS", certDays: null, safety: 74, onTime: 83, driveMins: 95, speed: 69, fuelPct: 55, place: "Off corridor near Kanye", incident: { type: "ROUTE_DEVIATION", detail: "Vehicle left the agreed A1 corridor near Kanye.", severity: "MEDIUM", risk: 8 }, courseStatus: ["DONE", "IN_PROGRESS", "TODO", "TODO"], docExpiryDays: 300 },
  { name: "Lorato Pule", employeeNo: "KH-004", reg: "B 234 JKL", cert: "CERTIFIED", certDays: 95, safety: 90, onTime: 94, driveMins: 40, speed: 0, fuelPct: 48, place: "Pioneer border post queue", incident: { type: "PROLONGED_IDLE", detail: "Stationary for over 90 minutes at the border queue.", severity: "LOW", risk: 3 }, courseStatus: ["DONE", "DONE", "DONE", "DONE"], docExpiryDays: 420 },
  { name: "Mpho Tau", employeeNo: "KH-005", reg: "B 567 MNO", cert: "LAPSED", certDays: -20, safety: 68, onTime: 79, driveMins: 0, speed: 0, fuelPct: 80, place: "Gaborone depot", incident: null, courseStatus: ["DONE", "TODO", "TODO", "TODO"], docExpiryDays: -10 },
  { name: "Tshepo Dube", employeeNo: "KH-006", reg: "B 890 PQR", cert: "CERTIFIED", certDays: 320, safety: 95, onTime: 98, driveMins: 180, speed: 90, fuelPct: 71, place: "Martin's Drift, cross-border", incident: null, courseStatus: ["DONE", "DONE", "DONE", "DONE"], docExpiryDays: 500 },
];

const okavangoDrivers: DriverSpec[] = [
  { name: "Gaone Modise", employeeNo: "OF-001", reg: "B 111 OKA", cert: "CERTIFIED", certDays: 180, safety: 89, onTime: 93, driveMins: 200, speed: 81, fuelPct: 58, place: "A3 west, Maun", incident: null, courseStatus: ["DONE", "DONE", "DONE", "DONE"], docExpiryDays: 260 },
  { name: "Boitumelo Rampa", employeeNo: "OF-002", reg: "B 222 OKA", cert: "IN_PROGRESS", certDays: null, safety: 77, onTime: 85, driveMins: 60, speed: 66, fuelPct: 18, place: "Sehithwa junction", incident: null, courseStatus: ["DONE", "IN_PROGRESS", "TODO", "TODO"], docExpiryDays: 35 },
  { name: "Onalenna Phiri", employeeNo: "OF-003", reg: "B 333 OKA", cert: "CERTIFIED", certDays: 280, safety: 93, onTime: 97, driveMins: 0, speed: 0, fuelPct: 74, place: "Maun depot", incident: null, courseStatus: ["DONE", "DONE", "DONE", "IN_PROGRESS"], docExpiryDays: 360 },
];

async function main(): Promise<void> {
  await clearAll();

  // Platform-wide training modules.
  const modules = await db
    .insert(trainingModulesTable)
    .values(
      trainingSeedModules.map((m, idx) => ({
        slug: m.slug,
        title: m.title,
        summary: m.summary,
        category: m.category,
        icon: m.icon,
        minutes: m.minutes,
        ordinal: idx,
        sections: m.sections,
      })),
    )
    .returning();

  // Superadmin platform operator, belonging to no org.
  await db.insert(usersTable).values({
    orgId: null,
    email: "super@drivewise.test",
    passwordHash: await hashPassword("Drivewise2026"),
    role: "SUPERADMIN",
    name: "Platform Operator",
    locale: "en",
  });

  const kalahariDriverUserId = await seedOrg({
    name: "Kalahari Haulage",
    region: "Gaborone, Botswana",
    depot: "Gaborone depot",
    licencePrefix: "BW-DL-",
    ownerEmail: "owner@drivewise.test",
    ownerName: "Keabetswe Owner",
    driverEmail: "driver@drivewise.test",
    drivers: kalahariDrivers,
  });

  await seedOrg({
    name: "Okavango Freight",
    region: "Maun, Botswana",
    depot: "Maun depot",
    licencePrefix: "BW-DM-",
    ownerEmail: "owner2@drivewise.test",
    ownerName: "Tebogo Owner",
    driverEmail: "driver2@drivewise.test",
    drivers: okavangoDrivers,
  });

  // Give the Kalahari demo driver a few completed modules so progress is visible
  // both in the training center and on their driver record.
  if (kalahariDriverUserId) {
    const completed = modules.slice(0, 3);
    await db.insert(trainingCompletionsTable).values(
      completed.map((m) => ({ userId: kalahariDriverUserId, moduleId: m.id })),
    );
  }

  // eslint-disable-next-line no-console
  console.log("Seed complete. Orgs: Kalahari Haulage, Okavango Freight. Modules:", modules.length);
  await pool.end();
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  await pool.end();
  process.exit(1);
});
