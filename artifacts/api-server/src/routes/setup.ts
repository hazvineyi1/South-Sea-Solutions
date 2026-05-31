import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, ruleProfilesTable, orgsTable } from "@workspace/db";
import {
  GetRuleProfileResponse,
  UpdateRuleProfileBody,
  UpdateRuleProfileResponse,
  GetOrgProfileResponse,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/requireAuth";

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

export default router;
