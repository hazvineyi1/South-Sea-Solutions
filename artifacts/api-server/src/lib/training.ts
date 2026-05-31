import { eq, inArray, asc } from "drizzle-orm";
import {
  db,
  usersTable,
  trainingModulesTable,
  trainingCompletionsTable,
} from "@workspace/db";

// Builds the training progress block for a driver record. A driver is linked to
// a user via users.driverId; if there is no such user, progress is empty.
export async function buildTrainingProgress(driverId: string): Promise<{
  completed: number;
  total: number;
  modules: { slug: string; title: string; category: string; completed: boolean; completedAt: string | null }[];
}> {
  const modules = await db
    .select()
    .from(trainingModulesTable)
    .orderBy(asc(trainingModulesTable.ordinal), asc(trainingModulesTable.title));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.driverId, driverId));

  const completedAtByModule = new Map<string, Date>();
  if (user) {
    const completions = await db
      .select()
      .from(trainingCompletionsTable)
      .where(eq(trainingCompletionsTable.userId, user.id));
    for (const c of completions) {
      completedAtByModule.set(c.moduleId, c.completedAt);
    }
  }

  const items = modules.map((m) => {
    const completedAt = completedAtByModule.get(m.id) ?? null;
    return {
      slug: m.slug,
      title: m.title,
      category: m.category,
      completed: completedAt !== null,
      completedAt: completedAt ? completedAt.toISOString() : null,
    };
  });

  return {
    completed: items.filter((i) => i.completed).length,
    total: items.length,
    modules: items,
  };
}

// Returns a map of moduleId to completedAt for the given user.
export async function completionMapForUser(userId: string): Promise<Map<string, Date>> {
  const rows = await db
    .select()
    .from(trainingCompletionsTable)
    .where(eq(trainingCompletionsTable.userId, userId));
  const map = new Map<string, Date>();
  for (const r of rows) map.set(r.moduleId, r.completedAt);
  return map;
}

export { inArray };
