import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, orgsTable } from "@workspace/db";
import { LoginBody, LoginResponse, GetMeResponse } from "@workspace/api-zod";
import {
  verifyPassword,
  createSession,
  destroySession,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from "../lib/auth";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const isProduction = process.env.NODE_ENV === "production";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction,
    path: "/",
    maxAge: SESSION_TTL_MS,
  };
}

async function buildAuthUser(ctx: {
  userId: string;
  role: string;
  realRole: string;
  orgId: string | null;
  driverId: string | null;
  impersonating: boolean;
}) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, ctx.userId));
  if (!user) return null;
  let orgName = "";
  if (ctx.orgId) {
    const [org] = await db.select().from(orgsTable).where(eq(orgsTable.id, ctx.orgId));
    orgName = org?.name ?? "";
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: ctx.role,
    realRole: ctx.realRole,
    orgId: ctx.orgId,
    orgName,
    driverId: ctx.driverId,
    impersonating: ctx.impersonating,
  };
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    req.log.warn({ email }, "Login attempt for unknown email");
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (!user.active) {
    req.log.warn({ userId: user.id }, "Login attempt for deactivated user");
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    req.log.warn({ userId: user.id }, "Login attempt with bad password");
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const sessionId = await createSession(user.id);
  res.cookie(SESSION_COOKIE, sessionId, cookieOptions());

  const authUser = await buildAuthUser({
    userId: user.id,
    role: user.role,
    realRole: user.role,
    orgId: user.orgId,
    driverId: user.driverId,
    impersonating: false,
  });
  res.json(LoginResponse.parse(authUser));
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const sessionId = req.cookies?.[SESSION_COOKIE];
  if (sessionId && typeof sessionId === "string") {
    await destroySession(sessionId);
  }
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.sendStatus(204);
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const auth = req.auth!;
  const authUser = await buildAuthUser({
    userId: auth.userId,
    role: auth.role,
    realRole: auth.realRole,
    orgId: auth.orgId,
    driverId: auth.driverId,
    impersonating: auth.impersonating,
  });
  res.json(GetMeResponse.parse(authUser));
});

export default router;
