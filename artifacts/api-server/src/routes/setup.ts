import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, ruleProfilesTable, orgsTable, alertRulesTable, alertRuleKinds, type AlertRuleKind } from "@workspace/db";
import {
  GetRuleProfileResponse,
  UpdateRuleProfileBody,
  UpdateRuleProfileResponse,
  GetOrgProfileResponse,
  GetAlertRulesResponse,
  UpdateAlertRuleParams,
  UpdateAlertRuleBody,
  UpdateAlertRuleResponse,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

// Sensible factory defaults for each alert kind, surfaced even before an owner
// has persisted any custom rule. Threshold units are documented in the schema.
const ALERT_RULE_DEFAULTS: Record<AlertRuleKind, { threshold: number | null; severity: string }> = {
  SPEEDING: { threshold: 90, severity: "MEDIUM" },
  LOW_FUEL: { threshold: 15, severity: "MEDIUM" },
  EXCESS_IDLE: { threshold: 30, severity: "LOW" },
  GEOFENCE_BREACH: { threshold: null, severity: "HIGH" },
  HARSH_DRIVING: { threshold: null, severity: "MEDIUM" },
  ENGINE_FAULT: { threshold: null, severity: "HIGH" },
  MAINTENANCE_DUE: { threshold: 14, severity: "MEDIUM" },
  CERT_EXPIRY: { threshold: 60, severity: "MEDIUM" },
  HOS_LIMIT: { threshold: null, severity: "HIGH" },
};

function alertRuleItem(
  kind: AlertRuleKind,
  row: typeof alertRulesTable.$inferSelect | undefined,
) {
  const def = ALERT_RULE_DEFAULTS[kind];
  return {
    kind,
    enabled: row?.enabled ?? true,
    threshold: row ? row.threshold : def.threshold,
    severity: row?.severity ?? def.severity,
    notifyEmail: row?.notifyEmail ?? true,
    notifySms: row?.notifySms ?? false,
    notifyPush: row?.notifyPush ?? true,
  };
}

const router: IRouter = Router();

function pickRule(rules: (typeof ruleProfilesTable.$inferSelect)[]) {
  return rules.find((r) => r.isDefault) ?? rules[0];
}

router.get("/setup/rule-profile", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const rules = await db.select().from(ruleProfilesTable).where(eq(ruleProfilesTable.orgId, req.auth!.orgId!));
  const rule = pickRule(rules);
  if (!rule) {
    res.status(404).json({ error: "Rule profile not found" });
    return;
  }
  res.json(GetRuleProfileResponse.parse(rule));
});

router.patch("/setup/rule-profile", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const parsed = UpdateRuleProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const rules = await db.select().from(ruleProfilesTable).where(eq(ruleProfilesTable.orgId, req.auth!.orgId!));
  const rule = pickRule(rules);
  if (!rule) {
    res.status(404).json({ error: "Rule profile not found" });
    return;
  }

  const [updated] = await db
    .update(ruleProfilesTable)
    .set(parsed.data)
    .where(eq(ruleProfilesTable.id, rule.id))
    .returning();
  res.json(UpdateRuleProfileResponse.parse(updated));
});

router.get("/setup/org", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const [org] = await db.select().from(orgsTable).where(eq(orgsTable.id, req.auth!.orgId!));
  if (!org) {
    res.status(404).json({ error: "Org not found" });
    return;
  }
  res.json(GetOrgProfileResponse.parse({ id: org.id, name: org.name, region: org.region }));
});

router.get("/setup/alert-rules", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const rows = await db.select().from(alertRulesTable).where(eq(alertRulesTable.orgId, req.auth!.orgId!));
  const byKind = new Map(rows.map((r) => [r.kind, r]));
  const items = alertRuleKinds.map((kind) => alertRuleItem(kind, byKind.get(kind)));
  res.json(GetAlertRulesResponse.parse(items));
});

router.patch("/setup/alert-rules/:kind", requireAuth, requireRole("OWNER"), async (req, res): Promise<void> => {
  const params = UpdateAlertRuleParams.safeParse(req.params);
  const body = UpdateAlertRuleBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const kind = params.data.kind as AlertRuleKind;
  if (!alertRuleKinds.includes(kind)) {
    res.status(400).json({ error: "Unknown alert kind" });
    return;
  }
  const orgId = req.auth!.orgId!;
  const [existing] = await db
    .select()
    .from(alertRulesTable)
    .where(and(eq(alertRulesTable.orgId, orgId), eq(alertRulesTable.kind, kind)));

  let row: typeof alertRulesTable.$inferSelect;
  if (existing) {
    [row] = await db.update(alertRulesTable).set(body.data).where(eq(alertRulesTable.id, existing.id)).returning();
  } else {
    const def = ALERT_RULE_DEFAULTS[kind];
    [row] = await db
      .insert(alertRulesTable)
      .values({
        orgId,
        kind,
        threshold: body.data.threshold ?? def.threshold,
        severity: body.data.severity ?? def.severity,
        enabled: body.data.enabled ?? true,
        notifyEmail: body.data.notifyEmail ?? true,
        notifySms: body.data.notifySms ?? false,
        notifyPush: body.data.notifyPush ?? true,
      })
      .returning();
  }
  res.json(UpdateAlertRuleResponse.parse(alertRuleItem(kind, row)));
});

export default router;
