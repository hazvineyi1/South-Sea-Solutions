import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import { db, sessionsTable, usersTable, type User, type Session } from "@workspace/db";

const scrypt = promisify(scryptCb);

const SESSION_COOKIE = "ssp_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const hashBuf = Buffer.from(hash, "hex");
  if (hashBuf.length !== derived.length) return false;
  return timingSafeEqual(hashBuf, derived);
}

export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const [session] = await db
    .insert(sessionsTable)
    .values({ userId, expiresAt })
    .returning();
  return session.id;
}

export async function getSessionWithUser(
  sessionId: string,
): Promise<{ session: Session; user: User } | null> {
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId));
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
    return null;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  if (!user) return null;
  return { session, user };
}

export async function getUserBySession(sessionId: string): Promise<User | null> {
  const result = await getSessionWithUser(sessionId);
  return result?.user ?? null;
}

export async function setActingOrg(sessionId: string, orgId: string | null): Promise<void> {
  await db.update(sessionsTable).set({ actingOrgId: orgId }).where(eq(sessionsTable.id, sessionId));
}

export async function destroySession(sessionId: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
}

export { SESSION_COOKIE, SESSION_TTL_MS };
