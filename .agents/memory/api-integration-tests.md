---
name: API server integration tests
description: How backend tests are structured in @workspace/api-server.
---

`@workspace/api-server` has a vitest + supertest setup (`vitest.config.ts`, `pnpm --filter
@workspace/api-server run test`). Tests import the Express `app` directly and drive it over
HTTP with supertest agents (which carry the httpOnly session cookie after `/api/auth/login`).

**Why:** there is no separate test database. Tests run against the real Postgres pointed at
by `DATABASE_URL`, so they must not clobber seed data.

**How to apply:** namespace every created row with a unique run tag (random suffix on emails,
org names, slugs, employeeNo), track created ids, and delete them FK-safe in `afterAll`
(then `pool.end()`). `vitest.config.ts` sets `fileParallelism: false` because the suite
shares one pg pool and mutates real rows. Guard distinction: an impersonating superadmin gets
effective role OWNER (passes requireRole owner endpoints), but console management endpoints
use `requireConsole`, which blocks while impersonating, so during impersonation `/platform/*`
(except enter-org/exit-org) returns 403; the admin must exit first. To test the "delete clears
acting org" path with this rule, use two superadmin sessions: one impersonates the org, a
second (not impersonating) deletes it.
