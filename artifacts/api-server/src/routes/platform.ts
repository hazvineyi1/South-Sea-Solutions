import { Router, type IRouter } from "express";
import { eq, asc, desc, inArray } from "drizzle-orm";
import {
  db,
  orgsTable,
  usersTable,
  sessionsTable,
  driversTable,
  fleetsTable,
  vehiclesTable,
  ruleProfilesTable,
  tripPingsTable,
  fuelReportsTable,
  dutyEventsTable,
  dailyLogsTable,
  incidentsTable,
  documentsTable,
  coursesTable,
  courseCompletionsTable,
  certificationsTable,
  auditLogsTable,
  alertAcksTable,
  trainingModulesTable,
  trainingCompletionsTable,
} from "@workspace/db";
import {
  GetPlatformOverviewResponse,
  GetPlatformOrgsResponse,
  CreatePlatformOrgBody,
  CreatePlatformOrgResponse,
  UpdatePlatformOrgParams,
  UpdatePlatformOrgBody,
  UpdatePlatformOrgResponse,
  DeletePlatformOrgParams,
  GetPlatformOrgUsersParams,
  GetPlatformOrgUsersResponse,
  CreatePlatformOrgUserParams,
  CreatePlatformOrgUserBody,
  CreatePlatformOrgUserResponse,
  UpdatePlatformUserParams,
  UpdatePlatformUserBody,
  UpdatePlatformUserResponse,
  GetPlatformTrainingModulesResponse,
  CreatePlatformTrainingModuleBody,
  CreatePlatformTrainingModuleResponse,
  UpdatePlatformTrainingModuleParams,
  UpdatePlatformTrainingModuleBody,
  UpdatePlatformTrainingModuleResponse,
  DeletePlatformTrainingModuleParams,
  ReorderPlatformTrainingModulesBody,
  EnterOrgBody,
  EnterOrgResponse,
  ExitOrgResponse,
} from "@workspace/api-zod";
import { requireAuth, requireSuperadmin } from "../middlewares/requireAuth";
import { hashPassword, setActingOrg } from "../lib/auth";
import { loadFleetContext, buildAlerts } from "../lib/portal";

const router: IRouter = Router();

const guards = [requireAuth, requireSuperadmin] as const;

async function openAlertCountForOrg(orgId: string): Promise<number> {
  const ctx = await loadFleetContext(orgId);
  const ackRows = await db.select().from(alertAcksTable).where(eq(alertAcksTable.orgId, orgId));
  const ackKeys = new Set(ackRows.map((r) => r.alertKey));
  const alerts = buildAlerts(ctx, ackKeys);
  return alerts.filter((a) => !a.acknowledged).length;
}

router.get("/platform/overview", ...guards, async (_req, res): Promise<void> => {
  const orgs = await db.select().from(orgsTable).orderBy(asc(orgsTable.name));

  const perOrg = await Promise.all(
    orgs.map(async (org) => {
      const users = await db.select().from(usersTable).where(eq(usersTable.orgId, org.id));
      const drivers = await db.select().from(driversTable).where(eq(driversTable.orgId, org.id));
      const fleets = await db.select().from(fleetsTable).where(eq(fleetsTable.orgId, org.id));
      const fleetIds = fleets.map((f) => f.id);
      const vehicles =
        fleetIds.length > 0
          ? await db.select().from(vehiclesTable).where(inArray(vehiclesTable.fleetId, fleetIds))
          : [];
      const openAlerts = await openAlertCountForOrg(org.id);
      return {
        id: org.id,
        name: org.name,
        region: org.region,
        active: org.active,
        users: users.length,
        drivers: drivers.length,
        vehicles: vehicles.length,
        openAlerts,
      };
    }),
  );

  const totals = {
    orgs: orgs.length,
    users: perOrg.reduce((n, o) => n + o.users, 0),
    drivers: perOrg.reduce((n, o) => n + o.drivers, 0),
    vehicles: perOrg.reduce((n, o) => n + o.vehicles, 0),
    openAlerts: perOrg.reduce((n, o) => n + o.openAlerts, 0),
  };

  res.json(GetPlatformOverviewResponse.parse({ totals, orgs: perOrg }));
});

router.get("/platform/orgs", ...guards, async (_req, res): Promise<void> => {
  const orgs = await db.select().from(orgsTable).orderBy(asc(orgsTable.name));
  res.json(
    GetPlatformOrgsResponse.parse(
      orgs.map((o) => ({
        id: o.id,
        name: o.name,
        region: o.region,
        active: o.active,
        createdAt: o.createdAt.toISOString(),
      })),
    ),
  );
});

router.post("/platform/orgs", ...guards, async (req, res): Promise<void> => {
  const parsed = CreatePlatformOrgBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [org] = await db.insert(orgsTable).values(parsed.data).returning();
  res.json(
    CreatePlatformOrgResponse.parse({
      id: org.id,
      name: org.name,
      region: org.region,
      active: org.active,
      createdAt: org.createdAt.toISOString(),
    }),
  );
});

router.patch("/platform/orgs/:id", ...guards, async (req, res): Promise<void> => {
  const params = UpdatePlatformOrgParams.safeParse(req.params);
  const body = UpdatePlatformOrgBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const [org] = await db
    .update(orgsTable)
    .set(body.data)
    .where(eq(orgsTable.id, params.data.id))
    .returning();
  if (!org) {
    res.status(404).json({ error: "Org not found" });
    return;
  }
  res.json(
    UpdatePlatformOrgResponse.parse({
      id: org.id,
      name: org.name,
      region: org.region,
      active: org.active,
      createdAt: org.createdAt.toISOString(),
    }),
  );
});

router.delete("/platform/orgs/:id", ...guards, async (req, res): Promise<void> => {
  const params = DeletePlatformOrgParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const orgId = params.data.id;

  // Delete every child row in FK-safe order inside a single transaction.
  await db.transaction(async (tx) => {
    const drivers = await tx.select().from(driversTable).where(eq(driversTable.orgId, orgId));
    const driverIds = drivers.map((d) => d.id);
    const fleets = await tx.select().from(fleetsTable).where(eq(fleetsTable.orgId, orgId));
    const fleetIds = fleets.map((f) => f.id);
    const orgUsers = await tx.select().from(usersTable).where(eq(usersTable.orgId, orgId));
    const userIds = orgUsers.map((u) => u.id);
    const courses = await tx.select().from(coursesTable).where(eq(coursesTable.orgId, orgId));
    const courseIds = courses.map((c) => c.id);

    if (driverIds.length > 0) {
      await tx.delete(tripPingsTable).where(inArray(tripPingsTable.driverId, driverIds));
      await tx.delete(fuelReportsTable).where(inArray(fuelReportsTable.driverId, driverIds));
      await tx.delete(dutyEventsTable).where(inArray(dutyEventsTable.driverId, driverIds));
      await tx.delete(dailyLogsTable).where(inArray(dailyLogsTable.driverId, driverIds));
      await tx.delete(incidentsTable).where(inArray(incidentsTable.driverId, driverIds));
      await tx.delete(documentsTable).where(inArray(documentsTable.driverId, driverIds));
      await tx.delete(courseCompletionsTable).where(inArray(courseCompletionsTable.driverId, driverIds));
      await tx.delete(certificationsTable).where(inArray(certificationsTable.driverId, driverIds));
    }
    if (courseIds.length > 0) {
      await tx.delete(coursesTable).where(inArray(coursesTable.id, courseIds));
    }
    if (fleetIds.length > 0) {
      await tx.delete(vehiclesTable).where(inArray(vehiclesTable.fleetId, fleetIds));
    }
    await tx.delete(fleetsTable).where(eq(fleetsTable.orgId, orgId));
    await tx.delete(driversTable).where(eq(driversTable.orgId, orgId));
    await tx.delete(ruleProfilesTable).where(eq(ruleProfilesTable.orgId, orgId));
    await tx.delete(auditLogsTable).where(eq(auditLogsTable.orgId, orgId));
    await tx.delete(alertAcksTable).where(eq(alertAcksTable.orgId, orgId));
    if (userIds.length > 0) {
      await tx.delete(trainingCompletionsTable).where(inArray(trainingCompletionsTable.userId, userIds));
      await tx.delete(sessionsTable).where(inArray(sessionsTable.userId, userIds));
    }
    await tx.delete(usersTable).where(eq(usersTable.orgId, orgId));
    // Clear any superadmin session still impersonating this org.
    await tx.update(sessionsTable).set({ actingOrgId: null }).where(eq(sessionsTable.actingOrgId, orgId));
    await tx.delete(orgsTable).where(eq(orgsTable.id, orgId));
  });

  res.sendStatus(204);
});

router.get("/platform/orgs/:id/users", ...guards, async (req, res): Promise<void> => {
  const params = GetPlatformOrgUsersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.orgId, params.data.id))
    .orderBy(asc(usersTable.name));
  res.json(
    GetPlatformOrgUsersResponse.parse(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.active,
        driverId: u.driverId,
        createdAt: u.createdAt.toISOString(),
      })),
    ),
  );
});

router.post("/platform/orgs/:id/users", ...guards, async (req, res): Promise<void> => {
  const params = CreatePlatformOrgUserParams.safeParse(req.params);
  const body = CreatePlatformOrgUserBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const [org] = await db.select().from(orgsTable).where(eq(orgsTable.id, params.data.id));
  if (!org) {
    res.status(404).json({ error: "Org not found" });
    return;
  }
  const passwordHash = await hashPassword(body.data.password);
  const [user] = await db
    .insert(usersTable)
    .values({
      orgId: params.data.id,
      name: body.data.name,
      email: body.data.email,
      passwordHash,
      role: body.data.role,
      driverId: body.data.driverId ?? null,
    })
    .returning();
  res.json(
    CreatePlatformOrgUserResponse.parse({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      driverId: user.driverId,
      createdAt: user.createdAt.toISOString(),
    }),
  );
});

router.patch("/platform/users/:id", ...guards, async (req, res): Promise<void> => {
  const params = UpdatePlatformUserParams.safeParse(req.params);
  const body = UpdatePlatformUserBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const [user] = await db
    .update(usersTable)
    .set(body.data)
    .where(eq(usersTable.id, params.data.id))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(
    UpdatePlatformUserResponse.parse({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      driverId: user.driverId,
      createdAt: user.createdAt.toISOString(),
    }),
  );
});

function moduleDetail(m: typeof trainingModulesTable.$inferSelect) {
  return {
    id: m.id,
    slug: m.slug,
    title: m.title,
    summary: m.summary,
    category: m.category,
    icon: m.icon,
    minutes: m.minutes,
    ordinal: m.ordinal,
    sections: m.sections,
    completed: false,
    completedAt: null,
  };
}

router.get("/platform/training/modules", ...guards, async (_req, res): Promise<void> => {
  const modules = await db
    .select()
    .from(trainingModulesTable)
    .orderBy(asc(trainingModulesTable.ordinal), asc(trainingModulesTable.title));
  res.json(GetPlatformTrainingModulesResponse.parse(modules.map(moduleDetail)));
});

router.post("/platform/training/modules", ...guards, async (req, res): Promise<void> => {
  const body = CreatePlatformTrainingModuleBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [maxRow] = await db
    .select({ ordinal: trainingModulesTable.ordinal })
    .from(trainingModulesTable)
    .orderBy(desc(trainingModulesTable.ordinal));
  const nextOrdinal = maxRow ? maxRow.ordinal + 1 : 0;
  const [module] = await db
    .insert(trainingModulesTable)
    .values({
      slug: body.data.slug,
      title: body.data.title,
      summary: body.data.summary,
      category: body.data.category,
      icon: body.data.icon,
      minutes: body.data.minutes,
      ordinal: body.data.ordinal ?? nextOrdinal,
      sections: body.data.sections,
    })
    .returning();
  res.json(CreatePlatformTrainingModuleResponse.parse(moduleDetail(module)));
});

router.patch("/platform/training/modules/:id", ...guards, async (req, res): Promise<void> => {
  const params = UpdatePlatformTrainingModuleParams.safeParse(req.params);
  const body = UpdatePlatformTrainingModuleBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const [module] = await db
    .update(trainingModulesTable)
    .set({
      slug: body.data.slug,
      title: body.data.title,
      summary: body.data.summary,
      category: body.data.category,
      icon: body.data.icon,
      minutes: body.data.minutes,
      ...(body.data.ordinal !== undefined ? { ordinal: body.data.ordinal } : {}),
      sections: body.data.sections,
    })
    .where(eq(trainingModulesTable.id, params.data.id))
    .returning();
  if (!module) {
    res.status(404).json({ error: "Training module not found" });
    return;
  }
  res.json(UpdatePlatformTrainingModuleResponse.parse(moduleDetail(module)));
});

router.delete("/platform/training/modules/:id", ...guards, async (req, res): Promise<void> => {
  const params = DeletePlatformTrainingModuleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.transaction(async (tx) => {
    await tx
      .delete(trainingCompletionsTable)
      .where(eq(trainingCompletionsTable.moduleId, params.data.id));
    await tx.delete(trainingModulesTable).where(eq(trainingModulesTable.id, params.data.id));
  });
  res.sendStatus(204);
});

router.post("/platform/training/reorder", ...guards, async (req, res): Promise<void> => {
  const body = ReorderPlatformTrainingModulesBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  await db.transaction(async (tx) => {
    for (let i = 0; i < body.data.ids.length; i++) {
      await tx
        .update(trainingModulesTable)
        .set({ ordinal: i })
        .where(eq(trainingModulesTable.id, body.data.ids[i]));
    }
  });
  res.sendStatus(204);
});

router.post("/platform/enter-org", ...guards, async (req, res): Promise<void> => {
  const body = EnterOrgBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [org] = await db.select().from(orgsTable).where(eq(orgsTable.id, body.data.orgId));
  if (!org) {
    res.status(404).json({ error: "Org not found" });
    return;
  }
  await setActingOrg(req.auth!.sessionId, org.id);

  // Record the impersonation against the platform actor.
  await db.insert(auditLogsTable).values({
    orgId: org.id,
    actorUserId: req.auth!.userId,
    action: "ENTER_ORG",
    subjectType: "org",
    subjectId: org.id,
  });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.auth!.userId));
  res.json(
    EnterOrgResponse.parse({
      id: user.id,
      name: user.name,
      email: user.email,
      role: "OWNER",
      realRole: user.role,
      orgId: org.id,
      orgName: org.name,
      driverId: user.driverId,
      impersonating: true,
    }),
  );
});

router.post("/platform/exit-org", ...guards, async (req, res): Promise<void> => {
  await setActingOrg(req.auth!.sessionId, null);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.auth!.userId));
  res.json(
    ExitOrgResponse.parse({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      realRole: user.role,
      orgId: user.orgId,
      orgName: "",
      driverId: user.driverId,
      impersonating: false,
    }),
  );
});

export default router;
