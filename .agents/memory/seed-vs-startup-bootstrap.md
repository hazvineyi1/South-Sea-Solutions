---
name: Default content needs a startup bootstrap, not just a dev seed
description: Why DB-backed default/reference content must be loaded idempotently at server startup, not only via the manual dev seed script.
---

Default/reference data that the app needs in every environment (e.g. the training
modules in `training_modules`) must NOT live only in the manual dev seed script.
The seed is dev-only, so a freshly published production database starts empty and
the feature looks broken (training center showed 0 modules in prod while dev had 11).

**Rule:** keep the canonical default content in a shared lib (`lib/db/src/trainingContent.ts`),
and load it with an idempotent `ensureXxx(db)` bootstrap that the API server calls
on startup.

**How to apply:**
- Insert-if-missing by a natural key (slug), and use `onConflictDoNothing({ target })`
  so concurrent multi-instance starts don't throw on the unique key.
- Never UPDATE existing rows: superadmin/console edits and reordered ordinals must survive.
- `await` the bootstrap BEFORE `app.listen(...)` so the server never serves an empty
  feature on a cold prod DB. Keep it non-fatal (try/catch + log) so a bootstrap
  failure doesn't block startup.
- The dev seed (`scripts/src/seed.ts`) stays as the full reset path and imports the
  same shared content, so seed and bootstrap can't drift.

**Why:** prod is provisioned without running the dev seed, so any content that only
exists in the seed is silently missing after publish.
