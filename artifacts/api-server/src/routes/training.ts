import { Router, type IRouter } from "express";
import { and, eq, asc } from "drizzle-orm";
import { db, trainingModulesTable, trainingCompletionsTable } from "@workspace/db";
import {
  GetTrainingModulesResponse,
  GetTrainingModuleParams,
  GetTrainingModuleResponse,
  CompleteTrainingModuleParams,
  UncompleteTrainingModuleParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { completionMapForUser } from "../lib/training";

const router: IRouter = Router();

// Training is available to every authenticated user (owner, driver, superadmin).
router.get("/training/modules", requireAuth, async (req, res): Promise<void> => {
  const userId = req.auth!.userId;
  const modules = await db
    .select()
    .from(trainingModulesTable)
    .orderBy(asc(trainingModulesTable.ordinal), asc(trainingModulesTable.title));
  const completions = await completionMapForUser(userId);

  const items = modules.map((m) => {
    const completedAt = completions.get(m.id) ?? null;
    return {
      id: m.id,
      slug: m.slug,
      title: m.title,
      summary: m.summary,
      category: m.category,
      icon: m.icon,
      minutes: m.minutes,
      ordinal: m.ordinal,
      completed: completedAt !== null,
      completedAt: completedAt ? completedAt.toISOString() : null,
    };
  });

  res.json(
    GetTrainingModulesResponse.parse({
      completed: items.filter((i) => i.completed).length,
      total: items.length,
      modules: items,
    }),
  );
});

router.get("/training/modules/:slug", requireAuth, async (req, res): Promise<void> => {
  const params = GetTrainingModuleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = req.auth!.userId;
  const [module] = await db
    .select()
    .from(trainingModulesTable)
    .where(eq(trainingModulesTable.slug, params.data.slug));
  if (!module) {
    res.status(404).json({ error: "Training module not found" });
    return;
  }
  const [completion] = await db
    .select()
    .from(trainingCompletionsTable)
    .where(
      and(
        eq(trainingCompletionsTable.userId, userId),
        eq(trainingCompletionsTable.moduleId, module.id),
      ),
    );

  res.json(
    GetTrainingModuleResponse.parse({
      id: module.id,
      slug: module.slug,
      title: module.title,
      summary: module.summary,
      category: module.category,
      icon: module.icon,
      minutes: module.minutes,
      ordinal: module.ordinal,
      sections: module.sections,
      completed: completion !== undefined,
      completedAt: completion ? completion.completedAt.toISOString() : null,
    }),
  );
});

router.post("/training/modules/:id/complete", requireAuth, async (req, res): Promise<void> => {
  const params = CompleteTrainingModuleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = req.auth!.userId;
  const [module] = await db
    .select()
    .from(trainingModulesTable)
    .where(eq(trainingModulesTable.id, params.data.id));
  if (!module) {
    res.status(404).json({ error: "Training module not found" });
    return;
  }
  await db
    .insert(trainingCompletionsTable)
    .values({ userId, moduleId: module.id })
    .onConflictDoNothing();
  res.sendStatus(204);
});

router.delete("/training/modules/:id/complete", requireAuth, async (req, res): Promise<void> => {
  const params = UncompleteTrainingModuleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = req.auth!.userId;
  await db
    .delete(trainingCompletionsTable)
    .where(
      and(
        eq(trainingCompletionsTable.userId, userId),
        eq(trainingCompletionsTable.moduleId, params.data.id),
      ),
    );
  res.sendStatus(204);
});

export default router;
