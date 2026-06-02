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
  vehicleHealthTable,
  faultCodesTable,
  behaviorEventsTable,
  maintenancePlansTable,
  workOrdersTable,
  geofencesTable,
  geofenceEventsTable,
  dispatchJobsTable,
  dispatchMessagesTable,
  alertRulesTable,
  apiKeysTable,
  webhooksTable,
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
  await db.delete(dispatchMessagesTable);
  await db.delete(dispatchJobsTable);
  await db.delete(geofenceEventsTable);
  await db.delete(geofencesTable);
  await db.delete(behaviorEventsTable);
  await db.delete(faultCodesTable);
  await db.delete(vehicleHealthTable);
  await db.delete(workOrdersTable);
  await db.delete(maintenancePlansTable);
  await db.delete(alertRulesTable);
  await db.delete(apiKeysTable);
  await db.delete(webhooksTable);
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
  const created: { driver: typeof driversTable.$inferSelect; vehicle: typeof vehiclesTable.$inferSelect }[] = [];

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

    // Seven days of certified daily logs so the analytics view has a real trend.
    await db.insert(dailyLogsTable).values(
      Array.from({ length: 7 }, (_, d) => {
        const day = d + 1;
        const driveMins = ds.driveMins > 0 ? 360 + ((i + day) % 5) * 45 : 0;
        return {
          driverId: driver.id,
          date: daysFromNow(-day),
          driveMins,
          dutyMins: driveMins + 60,
          restMins: 660,
          certified: day > 1,
          certifiedAt: day > 1 ? minsAgo(day * 1440) : null,
        };
      }),
    );

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

    // --- Telematics: engine health, diagnostics, behaviour, maintenance ---
    const odo = 184000 + i * 1200;
    const unhealthy = ds.cert === "LAPSED" || ds.safety < 75;

    await db.insert(vehicleHealthTable).values({
      vehicleId: vehicle.id,
      engineTempC: unhealthy ? 108 : 84 + (i % 8),
      coolantTempC: unhealthy ? 101 : 80 + (i % 6),
      oilPressureKpa: 360 + (i % 5) * 12,
      oilLifePct: unhealthy ? 12 : 45 + (i % 5) * 9,
      batteryV: unhealthy ? 12.0 : 12.6 + (i % 4) * 0.3,
      tirePressureKpa: 720 + (i % 5) * 8,
      engineHours: 3200 + i * 540,
      defLevelPct: unhealthy ? 8 : 35 + (i % 6) * 9,
      milOn: unhealthy,
      recordedAt: minsAgo(6),
    });

    if (unhealthy) {
      await db.insert(faultCodesTable).values({
        vehicleId: vehicle.id,
        code: "P0420",
        description: "Catalyst system efficiency below threshold",
        system: "EMISSIONS",
        severity: "MEDIUM",
        active: true,
        occurredAt: minsAgo(120),
      });
    }
    if (ds.cert === "LAPSED") {
      await db.insert(faultCodesTable).values({
        vehicleId: vehicle.id,
        code: "P0301",
        description: "Cylinder 1 misfire detected",
        system: "ENGINE",
        severity: "HIGH",
        active: true,
        occurredAt: minsAgo(200),
      });
    }

    const evCount = Math.max(0, Math.round((100 - ds.safety) / 9));
    const evTypes = [
      "HARSH_BRAKE",
      "SPEEDING",
      "HARSH_ACCEL",
      "EXCESS_IDLE",
      "HARSH_CORNER",
      "PHONE_USE",
      "OVER_REV",
      "NO_SEATBELT",
    ] as const;
    for (let e = 0; e < evCount; e++) {
      const t = evTypes[(i + e) % evTypes.length];
      await db.insert(behaviorEventsTable).values({
        driverId: driver.id,
        vehicleId: vehicle.id,
        type: t,
        severity: e % 3 === 0 ? "HIGH" : e % 3 === 1 ? "MEDIUM" : "LOW",
        value: t === "SPEEDING" ? 12 + e : t === "EXCESS_IDLE" ? 35 + e : Math.round((0.4 + e * 0.05) * 100) / 100,
        lat: -24.6 - i * 0.1,
        lng: 25.9 + i * 0.1,
        placeLabel: ds.place,
        recordedAt: minsAgo((e + 1) * 600 + i * 30),
      });
    }

    await db.insert(maintenancePlansTable).values([
      {
        vehicleId: vehicle.id,
        name: "Engine service (15,000 km)",
        intervalKm: 15000,
        intervalDays: null,
        lastServiceKm: i % 3 === 0 ? odo - 15500 : odo - 13800,
        lastServiceOn: null,
      },
      {
        vehicleId: vehicle.id,
        name: "Safety inspection (90 days)",
        intervalKm: null,
        intervalDays: 90,
        lastServiceKm: null,
        lastServiceOn: daysFromNow(i % 4 === 0 ? -95 : -80),
      },
    ]);

    if (unhealthy) {
      await db.insert(workOrdersTable).values({
        vehicleId: vehicle.id,
        title: ds.cert === "LAPSED" ? "Investigate cylinder misfire" : "Emissions diagnostics",
        detail: "Raised automatically from an active diagnostic trouble code.",
        status: "OPEN",
        priority: "HIGH",
        dueOn: daysFromNow(3),
        dueKm: null,
        costEstimate: 4500 + i * 200,
        completedOn: null,
      });
    }

    created.push({ driver, vehicle });

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

  // --- Org-level telematics: geofences, dispatch, alert rules, integrations ---
  const fences = await db
    .insert(geofencesTable)
    .values([
      { orgId: org.id, name: spec.depot, kind: "DEPOT", centerLat: -24.65, centerLng: 25.91, radiusM: 1500 },
      { orgId: org.id, name: "A1 corridor", kind: "CORRIDOR", centerLat: -23.2, centerLng: 26.7, radiusM: 8000 },
      { orgId: org.id, name: "Border post", kind: "BORDER", centerLat: -22.0, centerLng: 27.9, radiusM: 1200 },
      { orgId: org.id, name: "Restricted reserve", kind: "NOGO", centerLat: -20.5, centerLng: 24.4, radiusM: 5000 },
    ])
    .returning();

  if (created.length) {
    await db.insert(geofenceEventsTable).values([
      { geofenceId: fences[0].id, driverId: created[0].driver.id, vehicleId: created[0].vehicle.id, type: "EXIT", recordedAt: minsAgo(220) },
      { geofenceId: fences[1].id, driverId: created[0].driver.id, vehicleId: created[0].vehicle.id, type: "ENTER", recordedAt: minsAgo(210) },
    ]);

    const [job1] = await db
      .insert(dispatchJobsTable)
      .values({
        orgId: org.id,
        reference: "LOAD-1001",
        origin: spec.depot,
        destination: "Francistown",
        driverId: created[0].driver.id,
        vehicleId: created[0].vehicle.id,
        status: "EN_ROUTE",
        priority: "HIGH",
        cargo: "Mining consumables",
        weightKg: 28000,
        distanceKm: 433,
        scheduledFor: minsAgo(-120),
      })
      .returning();
    await db.insert(dispatchMessagesTable).values([
      { orgId: org.id, jobId: job1.id, driverId: created[0].driver.id, fromUserId: null, direction: "TO_DRIVER", body: "Confirm ETA at the depot gate.", sentAt: minsAgo(120), readAt: minsAgo(110) },
      { orgId: org.id, jobId: job1.id, driverId: created[0].driver.id, fromUserId: null, direction: "FROM_DRIVER", body: "On the A1, ETA roughly 2 hours.", sentAt: minsAgo(60), readAt: null },
    ]);

    if (created.length > 1) {
      await db.insert(geofenceEventsTable).values({ geofenceId: fences[2].id, driverId: created[1].driver.id, vehicleId: created[1].vehicle.id, type: "ENTER", recordedAt: minsAgo(90) });
      await db.insert(dispatchJobsTable).values({
        orgId: org.id,
        reference: "LOAD-1002",
        origin: "Gaborone",
        destination: "Maun",
        driverId: created[1].driver.id,
        vehicleId: created[1].vehicle.id,
        status: "ASSIGNED",
        priority: "MEDIUM",
        cargo: "Retail distribution",
        weightKg: 18000,
        distanceKm: 930,
        scheduledFor: minsAgo(-600),
      });
    }

    await db.insert(dispatchJobsTable).values({
      orgId: org.id,
      reference: "LOAD-1003",
      origin: spec.depot,
      destination: "Lobatse",
      status: "DRAFT",
      priority: "LOW",
      cargo: "Empty return",
      distanceKm: 68,
    });
  }

  await db.insert(alertRulesTable).values([
    { orgId: org.id, kind: "SPEEDING", enabled: true, threshold: 85, severity: "HIGH", notifyEmail: true, notifySms: true, notifyPush: true },
    { orgId: org.id, kind: "EXCESS_IDLE", enabled: true, threshold: 20, severity: "MEDIUM", notifyEmail: true, notifySms: false, notifyPush: true },
    { orgId: org.id, kind: "GEOFENCE_BREACH", enabled: true, threshold: null, severity: "HIGH", notifyEmail: true, notifySms: true, notifyPush: true },
  ]);

  await db.insert(apiKeysTable).values({
    orgId: org.id,
    name: "Device gateway",
    prefix: "aftrak_demo01",
    keyHash: "seed-not-a-real-usable-key",
    scopes: ["ingest"],
  });
  await db.insert(webhooksTable).values({
    orgId: org.id,
    url: "https://example.com/hooks/aftrak",
    events: ["alert.raised", "geofence.breach"],
    secret: "whsec_seed_demo",
    active: true,
  });

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
