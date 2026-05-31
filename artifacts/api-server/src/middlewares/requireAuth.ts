import { type Request, type Response, type NextFunction } from "express";
import { type User } from "@workspace/db";
import { getSessionWithUser, SESSION_COOKIE } from "../lib/auth";

// The effective authentication context for a request. For a SUPERADMIN who is
// impersonating an organization, the effective `role` becomes OWNER and `orgId`
// becomes the acting org, while `realRole` keeps the true platform identity for
// audit and the impersonation banner.
export interface AuthContext {
  userId: string;
  realRole: string;
  role: string;
  orgId: string | null;
  driverId: string | null;
  impersonating: boolean;
  actingOrgId: string | null;
  sessionId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
      auth?: AuthContext;
    }
  }
}

export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const sessionId = req.cookies?.[SESSION_COOKIE];
  if (sessionId && typeof sessionId === "string") {
    const result = await getSessionWithUser(sessionId);
    if (result && result.user.active) {
      const { user, session } = result;
      const actingOrgId = session.actingOrgId ?? null;
      const impersonating = user.role === "SUPERADMIN" && actingOrgId !== null;
      req.user = user;
      req.auth = {
        userId: user.id,
        realRole: user.role,
        role: impersonating ? "OWNER" : user.role,
        orgId: impersonating ? actingOrgId : user.orgId,
        driverId: user.driverId,
        impersonating,
        actingOrgId,
        sessionId,
      };
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

// Guards an endpoint by effective role. A SUPERADMIN impersonating an org passes
// an OWNER check; a DRIVER never reaches owner or platform endpoints.
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!roles.includes(req.auth.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

// Guards platform endpoints by the real platform identity, so impersonation does
// not change who may manage the platform.
export function requireSuperadmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (req.auth.realRole !== "SUPERADMIN") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
