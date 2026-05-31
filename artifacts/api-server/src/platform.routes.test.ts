import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  pool,
  orgsTable,
  usersTable,
  sessionsTable,
  driversTable,
  fleetsTable,
  vehiclesTable,
  ruleProfilesTable,
  auditLogsTable,
  alertAcksTable,
  trainingModulesTable,
  trainingCompletionsTable,
} from "@workspace/db";
import app from "./app";
import { hashPassword } from "./lib/auth";

// These tests run against the real Postgres pointed at by DATABASE_URL. Every
// row created here is namespaced with a unique run tag so the suite never
// collides with seed data and can clean up exactly what it created.
const RUN_TAG = `test-${randomUUID().slice(0, 8)}`;
const PASSWORD = "Testpassword2026";

function tagEmail(local: string): string {
  return `${local}.${RUN_TAG}@platform.test`;
}

interface SeededUser {
  id: string;
  email: string;
}

// Tracks ids created across the whole suite so afterAll can remove them in a
// foreign-key-safe order, regardless of which test created them.
const created = {
  orgIds: new Set<string>(),
  userIds: new Set<string>(),
  driverIds: new Set<string>(),
  fleetIds: new Set<string>(),
  vehicleIds: new Set<string>(),
  moduleIds: new Set<string>(),
};

async function makeOrg(name: string): Promise<string> {
  const [org] = await db
    .insert(orgsTable)
    .values({ name: `${name} ${RUN_TAG}`, region: "Test Region" })
    .returning();
  created.orgIds.add(org.id);
  return org.id;
}

async function makeUser(opts: {
  local: string;
  role: string;
  orgId: string | null;
  name?: string;
  driverId?: string | null;
}): Promise<SeededUser> {
  const email = tagEmail(opts.local);
  const [user] = await db
    .insert(usersTable)
    .values({
      orgId: opts.orgId,
      email,
      passwordHash: await hashPassword(PASSWORD),
      role: opts.role,
      name: opts.name ?? opts.local,
      driverId: opts.driverId ?? null,
    })
    .returning();
  created.userIds.add(user.id);
  return { id: user.id, email };
}

// Logs a user in through the real HTTP login route and returns a supertest
// agent that carries the session cookie on every subsequent request.
async function agentFor(email: string): Promise<request.Agent> {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ email, password: PASSWORD });
  expect(res.status).toBe(200);
  return agent;
}

let superEmail: string;
let ownerEmail: string;
let driverEmail: string;
let primaryOrgId: string;

beforeAll(async () => {
  primaryOrgId = await makeOrg("Primary Co");
  superEmail = (await makeUser({ local: "super", role: "SUPERADMIN", orgId: null })).email;
  ownerEmail = (await makeUser({ local: "owner", role: "OWNER", orgId: primaryOrgId })).email;
  driverEmail = (await makeUser({ local: "driver", role: "DRIVER", orgId: primaryOrgId })).email;
});

afterAll(async () => {
  // Remove everything this run created, children before parents.
  const userIds = [...created.userIds];
  const driverIds = [...created.driverIds];
  const fleetIds = [...created.fleetIds];
  const orgIds = [...created.orgIds];
  const moduleIds = [...created.moduleIds];

  if (userIds.length > 0) {
    await db.update(sessionsTable).set({ actingOrgId: null }).where(inArray(sessionsTable.actingOrgId, orgIds.length ? orgIds : ["00000000-0000-0000-0000-000000000000"]));
    await db.delete(trainingCompletionsTable).where(inArray(trainingCompletionsTable.userId, userIds));
    await db.delete(sessionsTable).where(inArray(sessionsTable.userId, userIds));
  }
  if (orgIds.length > 0) {
    await db.delete(auditLogsTable).where(inArray(auditLogsTable.orgId, orgIds));
    await db.delete(alertAcksTable).where(inArray(alertAcksTable.orgId, orgIds));
    await db.delete(ruleProfilesTable).where(inArray(ruleProfilesTable.orgId, orgIds));
  }
  if (userIds.length > 0) {
    await db.delete(usersTable).where(inArray(usersTable.id, userIds));
  }
  if (driverIds.length > 0) {
    await db.delete(driversTable).where(inArray(driversTable.id, driverIds));
  }
  if (fleetIds.length > 0) {
    await db.delete(vehiclesTable).where(inArray(vehiclesTable.fleetId, fleetIds));
    await db.delete(fleetsTable).where(inArray(fleetsTable.id, fleetIds));
  }
  if (moduleIds.length > 0) {
    await db.delete(trainingCompletionsTable).where(inArray(trainingCompletionsTable.moduleId, moduleIds));
    await db.delete(trainingModulesTable).where(inArray(trainingModulesTable.id, moduleIds));
  }
  if (orgIds.length > 0) {
    await db.delete(orgsTable).where(inArray(orgsTable.id, orgIds));
  }
  await pool.end();
});

describe("requireSuperadmin guards /platform/*", () => {
  // A representative read and write endpoint on the platform surface.
  const endpoints: Array<{ method: "get" | "post"; path: string; body?: unknown }> = [
    { method: "get", path: "/api/platform/overview" },
    { method: "get", path: "/api/platform/orgs" },
    { method: "get", path: "/api/platform/training/modules" },
    { method: "post", path: "/api/platform/orgs", body: { name: "X", region: "Y" } },
  ];

  it("rejects unauthenticated requests with 401", async () => {
    for (const ep of endpoints) {
      const res = await request(app)[ep.method](ep.path).send(ep.body ?? {});
      expect(res.status, `${ep.method} ${ep.path}`).toBe(401);
    }
  });

  it("rejects an OWNER with 403", async () => {
    const owner = await agentFor(ownerEmail);
    for (const ep of endpoints) {
      const res = await owner[ep.method](ep.path).send(ep.body ?? {});
      expect(res.status, `${ep.method} ${ep.path}`).toBe(403);
    }
  });

  it("rejects a DRIVER with 403", async () => {
    const driver = await agentFor(driverEmail);
    for (const ep of endpoints) {
      const res = await driver[ep.method](ep.path).send(ep.body ?? {});
      expect(res.status, `${ep.method} ${ep.path}`).toBe(403);
    }
  });

  it("allows a real SUPERADMIN", async () => {
    const sa = await agentFor(superEmail);
    const res = await sa.get("/api/platform/overview");
    expect(res.status).toBe(200);
    expect(res.body.totals.orgs).toBeGreaterThanOrEqual(1);
  });
});

describe("impersonation: effective role vs real role", () => {
  it("an OWNER cannot reach platform endpoints (no console with an owner role)", async () => {
    const owner = await agentFor(ownerEmail);
    const res = await owner.post("/api/platform/enter-org").send({ orgId: primaryOrgId });
    expect(res.status).toBe(403);
  });

  it("a SUPERADMIN entering an org gets the org's effective OWNER role", async () => {
    const sa = await agentFor(superEmail);

    const enter = await sa.post("/api/platform/enter-org").send({ orgId: primaryOrgId });
    expect(enter.status).toBe(200);
    expect(enter.body.role).toBe("OWNER");
    expect(enter.body.realRole).toBe("SUPERADMIN");
    expect(enter.body.impersonating).toBe(true);
    expect(enter.body.orgId).toBe(primaryOrgId);

    // /auth/me reflects the effective identity while impersonating.
    const me = await sa.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.role).toBe("OWNER");
    expect(me.body.realRole).toBe("SUPERADMIN");
    expect(me.body.impersonating).toBe(true);
    expect(me.body.orgId).toBe(primaryOrgId);

    // The effective OWNER role unlocks owner-guarded endpoints (requireRole
    // checks the effective role).
    const owned = await sa.get("/api/setup/org");
    expect(owned.status).toBe(200);

    // While impersonating, the cross-org console is NOT reachable: the
    // impersonated org's effective OWNER role must never be the thing that
    // unlocks console management. The admin has to exit first.
    const blockedConsole: Array<{ method: "get" | "post" | "delete"; path: string; body?: unknown }> = [
      { method: "get", path: "/api/platform/overview" },
      { method: "get", path: "/api/platform/orgs" },
      { method: "post", path: "/api/platform/orgs", body: { name: "X", region: "Y" } },
      { method: "get", path: "/api/platform/training/modules" },
      { method: "post", path: "/api/platform/training/reorder", body: { ids: [] } },
    ];
    for (const ep of blockedConsole) {
      const res = await sa[ep.method](ep.path).send(ep.body ?? {});
      expect(res.status, `impersonating ${ep.method} ${ep.path}`).toBe(403);
    }

    const exit = await sa.post("/api/platform/exit-org").send({});
    expect(exit.status).toBe(200);
    expect(exit.body.role).toBe("SUPERADMIN");
    expect(exit.body.impersonating).toBe(false);

    // After exiting, the effective owner-only access is gone again and the
    // console is reachable once more.
    const ownedAfter = await sa.get("/api/setup/org");
    expect(ownedAfter.status).toBe(403);
    const overviewAfter = await sa.get("/api/platform/overview");
    expect(overviewAfter.status).toBe(200);
  });

  it("records an ENTER_ORG audit row against the platform actor", async () => {
    const sa = await agentFor(superEmail);
    const orgId = await makeOrg("Audit Co");

    await sa.post("/api/platform/enter-org").send({ orgId });
    await sa.post("/api/platform/exit-org").send({});

    const rows = await db
      .select()
      .from(auditLogsTable)
      .where(and(eq(auditLogsTable.orgId, orgId), eq(auditLogsTable.action, "ENTER_ORG")));
    expect(rows.length).toBe(1);
    expect(rows[0].subjectId).toBe(orgId);
  });
});

describe("org cascade delete", () => {
  it("removes the org and all of its child rows in one transaction", async () => {
    const orgId = await makeOrg("Cascade Co");

    const [rule] = await db
      .insert(ruleProfilesTable)
      .values({ orgId, name: "Rule", contMins: 270, dailyMins: 540, weeklyMins: 3360, dailyRestMins: 660, breakMins: 45, isDefault: true })
      .returning();
    expect(rule).toBeTruthy();

    const [fleet] = await db
      .insert(fleetsTable)
      .values({ orgId, name: "Fleet", depot: "Depot" })
      .returning();
    created.fleetIds.add(fleet.id);
    const [vehicle] = await db
      .insert(vehiclesTable)
      .values({ fleetId: fleet.id, reg: "TEST 001" })
      .returning();
    created.vehicleIds.add(vehicle.id);

    const [driver] = await db
      .insert(driversTable)
      .values({ orgId, name: "Cascade Driver", employeeNo: `EMP-${RUN_TAG}` })
      .returning();
    created.driverIds.add(driver.id);

    const orgUser = await makeUser({ local: "cascade-user", role: "OWNER", orgId });

    await db.insert(auditLogsTable).values({
      orgId,
      actorUserId: orgUser.id,
      action: "TEST",
      subjectType: "org",
      subjectId: orgId,
    });
    await db.insert(alertAcksTable).values({ orgId, alertKey: "k1", acknowledgedBy: orgUser.id });

    // Delete through the platform endpoint as a real superadmin.
    const sa = await agentFor(superEmail);
    const res = await sa.delete(`/api/platform/orgs/${orgId}`);
    expect(res.status).toBe(204);

    // Nothing belonging to the org should remain.
    expect((await db.select().from(orgsTable).where(eq(orgsTable.id, orgId))).length).toBe(0);
    expect((await db.select().from(usersTable).where(eq(usersTable.orgId, orgId))).length).toBe(0);
    expect((await db.select().from(driversTable).where(eq(driversTable.orgId, orgId))).length).toBe(0);
    expect((await db.select().from(fleetsTable).where(eq(fleetsTable.orgId, orgId))).length).toBe(0);
    expect((await db.select().from(vehiclesTable).where(eq(vehiclesTable.fleetId, fleet.id))).length).toBe(0);
    expect((await db.select().from(ruleProfilesTable).where(eq(ruleProfilesTable.orgId, orgId))).length).toBe(0);
    expect((await db.select().from(auditLogsTable).where(eq(auditLogsTable.orgId, orgId))).length).toBe(0);
    expect((await db.select().from(alertAcksTable).where(eq(alertAcksTable.orgId, orgId))).length).toBe(0);

    // Already cleaned up by the endpoint; drop from tracking so afterAll skips them.
    created.orgIds.delete(orgId);
    created.userIds.delete(orgUser.id);
    created.driverIds.delete(driver.id);
    created.fleetIds.delete(fleet.id);
    created.vehicleIds.delete(vehicle.id);
  });

  it("clears a superadmin's acting org when that org is deleted", async () => {
    const orgId = await makeOrg("Impersonated Co");

    // One session impersonates the org; a separate console session (not
    // impersonating) deletes it. Deleting must clear the acting org on every
    // session still pointed at it.
    const acting = await agentFor(superEmail);
    const console_ = await agentFor(superEmail);

    const enter = await acting.post("/api/platform/enter-org").send({ orgId });
    expect(enter.status).toBe(200);

    const del = await console_.delete(`/api/platform/orgs/${orgId}`);
    expect(del.status).toBe(204);

    // The impersonating session's acting org must be cleared, so its next
    // request is no longer impersonating a now-deleted org.
    const me = await acting.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.impersonating).toBe(false);

    created.orgIds.delete(orgId);
  });
});

describe("training module reorder", () => {
  async function makeModule(slug: string, title: string, ordinal: number): Promise<string> {
    const [m] = await db
      .insert(trainingModulesTable)
      .values({ slug: `${slug}-${RUN_TAG}`, title, summary: "s", category: "c", ordinal })
      .returning();
    created.moduleIds.add(m.id);
    return m.id;
  }

  it("rewrites ordinals to match the submitted id order", async () => {
    const a = await makeModule("mod-a", "A", 0);
    const b = await makeModule("mod-b", "B", 1);
    const c = await makeModule("mod-c", "C", 2);

    const sa = await agentFor(superEmail);
    // Submit reversed order.
    const res = await sa.post("/api/platform/training/reorder").send({ ids: [c, b, a] });
    expect(res.status).toBe(204);

    const rows = await db
      .select()
      .from(trainingModulesTable)
      .where(inArray(trainingModulesTable.id, [a, b, c]));
    const byId = new Map(rows.map((r) => [r.id, r.ordinal]));
    expect(byId.get(c)).toBe(0);
    expect(byId.get(b)).toBe(1);
    expect(byId.get(a)).toBe(2);
  });

  it("rejects a reorder from a non-superadmin", async () => {
    const owner = await agentFor(ownerEmail);
    const res = await owner.post("/api/platform/training/reorder").send({ ids: [] });
    expect(res.status).toBe(403);
  });
});
