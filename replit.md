# South Sea Solutions

A login-gated, multi-tenant portal hub built on the South Sea Solutions marketing site. The first portal is Aftrak, a driver-risk and certification platform for commercial transport operators in Botswana. A platform-level SUPERADMIN console sits above the orgs for cross-org administration and impersonation.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/south-sea-solutions run dev` — run the web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — seed the Aftrak demo org, users, and drivers
- Required env: `DATABASE_URL` (Postgres), `SESSION_SECRET` (cookie session signing)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, cookie-parser, httpOnly cookie sessions
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Frontend: React + Vite, wouter, TanStack Query, framer-motion, Tailwind v4
- Build: esbuild (CJS bundle)

## Where things live

- DB schema: `lib/db/src/schema/*.ts` (orgs, users, drivers, vehicles, courses, training, incidents, rule profiles, sessions, alert acks, audit logs)
- Seed: `lib/db/src/seed.ts`
- API contract (source of truth): `lib/api-spec` OpenAPI spec; generated hooks/types in `lib/api-client-react/src/generated`
- API routes: `artifacts/api-server/src/routes/*.ts` (auth, fleet, drivers, alerts, setup, training, platform)
- Auth + org-scoping helpers: `artifacts/api-server/src/lib/auth.ts`, `lib/portal.ts`
- Hours-of-service engine: `artifacts/api-server/src/lib/hosEngine.ts`
- Auth middleware: `artifacts/api-server/src/middlewares/requireAuth.ts` (`requireAuth`, `requireRole`, `requireSuperadmin`)
- Portal frontend: `artifacts/south-sea-solutions/src/portal/*` (auth context, guards, PortalLayout, ConsoleLayout, ui) and `src/pages/portal/*` (login, command, driver-record, driver-home)
- Training center (DB-backed, all roles): `src/pages/portal/training.tsx` (index, category grouping, progress count), `training-module.tsx` (detail with sections/steps/callouts + mark complete/uncomplete), `trainingIcons.ts` (icon-name to Lucide map + `TRAINING_ICON_NAMES`). Routes `/portal/training` and `/portal/training/:slug`, guarded for any authenticated role; header "Training" link shown to all roles. Module content lives in the DB (`training_modules`), not a static file. The canonical default modules live in `lib/db/src/trainingContent.ts` and are loaded automatically (idempotent, insert-if-missing by slug) at API server startup via `ensureTrainingModules(db)`, so a fresh or production database is populated without a manual seed; existing rows (including superadmin edits) are never overwritten.
- Superadmin console: `src/pages/console/*` (overview, orgs, org-detail, training, training-editor) under `/console*`, route-guarded by real SUPERADMIN role. Default training content: `lib/db/src/trainingContent.ts` (shared by the dev seed and the startup bootstrap).
- Aftrak theme: scoped `.aftrak` class in `src/index.css`
- Telematics DB schema: `lib/db/src/schema/{geofence,health,behavior,maintenance,dispatch,alertRule,integration}.ts` (geofences + crossing events, vehicle health snapshots + fault/DTC codes, driver behaviour events, maintenance plans + work orders, dispatch jobs + driver messages, per-org alert rules, API keys + webhooks).
- Telematics compute (health/behaviour scores, maintenance due, analytics, unified intelligence): `artifacts/api-server/src/lib/telematics.ts`; org-scoping helpers (vehicle/driver in org, reg map): `artifacts/api-server/src/lib/orgScope.ts`; API-key hashing: `artifacts/api-server/src/lib/apiKeys.ts`.
- Telematics API routes: `artifacts/api-server/src/routes/{telematics,geofences,behavior,maintenance,dispatch,analytics,compliance,integrations}.ts`; customizable alert rules are in `routes/setup.ts` (`/setup/alert-rules`).
- Command-center telematics tabs: `src/pages/portal/telematics/*` (overview, health, behavior, geofences, maintenance, dispatch, compliance, analytics, integrations, alert-rules, plus `shared.tsx` helpers), wired as tabs in `src/pages/portal/command.tsx`.

## Architecture decisions

- Single gateway login at `/login`; role-based redirect (OWNER to the command center, DRIVER to own record, SUPERADMIN to `/console`).
- Three roles: OWNER and DRIVER are org-scoped; SUPERADMIN is platform-level (`orgId` null) and runs the console. OPERATOR was removed entirely.
- Impersonation: `attachUser` computes `req.auth` with both the real and effective identity. A SUPERADMIN can "enter" an org (acting org on the session) and acts with that org's effective role/org; `impersonating` is true. `requireRole` checks the EFFECTIVE role; `requireSuperadmin` (used only by enter-org/exit-org) checks the REAL role so the impersonation controls stay reachable while impersonating; `requireConsole` requires a REAL superadmin who is NOT impersonating, so the impersonated org's effective OWNER role can never unlock console management and the admin must exit first. Enter/exit via `/platform/enter-org` and `/platform/exit-org`. A banner in PortalLayout shows the acting org with an "Exit to console" button.
- All owner-only endpoints (`/fleet/*`, `/alerts*`, `/setup/*`, and the telematics routes `/telematics/*`, `/geofences/*`, `/behavior`, `/maintenance/*`, `/dispatch/*`, `/analytics/*`, `/compliance/*`, `/integrations/*`) are guarded with `requireRole("OWNER")`. `/portal/command` is route-guarded OWNER only. Training routes are open to any authenticated role.
- Device ingest (`POST /ingest/telemetry`) is the one exception to session auth: it authenticates by an `x-api-key` header resolved to an org via a SHA-256 hash lookup in `api_keys` (plaintext shown only once at creation), so external device gateways can push pings without a session. Mutations that take a raw `vehicleId`/`driverId` (work orders, dispatch jobs) are org-scoped via `vehicleInOrg`/`driverInOrg` rather than trusting the id.
- The unified intelligence overview (`/telematics/overview`) composes cross-domain signals (health, behaviour, maintenance, HOS, alerts) into pillar scores plus a ranked insight feed; scorecard deltas are deterministic from the score (no fabricated history). Analytics distance/fuel are estimated from logged drive minutes at a documented contractual corridor average, not invented.
- Platform/console management endpoints (`/platform/*` except enter-org/exit-org) are guarded with `requireConsole` (real superadmin, not impersonating): cross-org overview, org CRUD (create, edit name/region, enable/disable, cascade delete in a txn), org user CRUD, training module CRUD + reorder. The impersonation controls `/platform/enter-org` and `/platform/exit-org` use `requireSuperadmin` so they remain reachable while impersonating. Platform user `role` is constrained to the `OWNER|DRIVER` enum in the OpenAPI contract (validated by the generated Zod schema server-side).
- Training is DB-backed (`training_modules`, ordered by `ordinal`) and open to all roles; completions persist per-user in `training_completions` and surface on the driver record (`DriverRecord.trainingProgress`).
- The driver record endpoint (`/drivers/:id`) uses an explicit allowlist: OWNER may read any driver in-org, DRIVER may read only their own record. Any other role is denied (defense against stale roles).
- DRIVER telemetry: `DriverRecord.telemetry` (speedKph, odometerKm, lat, lng, lastPingAt) is built in `buildDriverRecord`; `fuelPct` and `placeLabel` stay top-level (shared with the owner view). The driver-home "Your truck" panel renders these for the driver's own vehicle only.
- Multi-tenant: every data read is scoped by the effective `orgId`. The driver record route additionally enforces DRIVER self-only access and an org match.
- A console-created org has no drivers and no rule profile, so alert/HOS code must tolerate a missing rule: `ruleToInput(undefined)` falls back to a default HOS rule (otherwise the platform overview's open-alert count 500s).
- Every successful driver-record read writes an `audit_logs` row.
- Frontend and API share an origin via the reverse proxy, so the httpOnly session cookie flows automatically; the client uses relative `/api` URLs.
- Aftrak design tokens (cream/teal, Sora/Inter) are scoped to portal routes via a `.aftrak` wrapper class, kept separate from the dark marketing theme.

## Product

- Owners log in to a command center: full fleet telemetry (live speed, fuel, position, odometer, last ping plus fleet aggregates), certification and compliance, acknowledge alerts, and edit the hours-of-service rule profile.
- The command center is a comprehensive telematics workspace with tabs covering the ten capabilities: a fleet-intelligence Overview (health/safety/efficiency/compliance/utilization pillars plus a ranked insight feed), live Telemetry, engine Health and diagnostics (ECU readings, fault/DTC codes, health score, per-vehicle detail), driver Behaviour (safety leaderboard, events by type, recent harsh/speeding/distraction events), Geofences (depot/corridor/border/no-go CRUD plus crossing events), Maintenance (km/time service due plus work-order workflow), Dispatch (job board with assignment, status flow and two-way driver messaging), Compliance (ELD hours-of-service clocks plus log certification), Analytics (distance/fuel/efficiency/CO2 trends and breakdowns), customizable Alert rules (per-condition thresholds, severity and email/SMS/push channels), and Integrations (API keys, webhooks and a documented device-ingest endpoint).
- Owners open any driver record in their org: overview, hours (continuous/daily/weekly clocks), safety incidents, training/certification, training progress, and documents.
- Drivers log in and see only their own record, plus a "Your truck" panel with live telemetry (speed, fuel, odometer, location, last ping) for their assigned vehicle.
- Any logged-in user gets an interactive training area: browse modules by category, open a module, and mark it complete (completions persist and show on the driver record).
- Superadmins run the console: cross-org overview with totals and per-org counts, org CRUD (create/enable/disable/delete), per-org user management (create, role change, enable/disable), training content authoring (module CRUD + reorder), and one-click impersonation into any org with a banner and exit.

## User preferences

- HARD RULE: NO em dashes anywhere (UI copy, comments, code). Use colons, commas, or parentheses instead.

## Gotchas

- Generated query hooks are `export function useGetXxx` (not `const`). When passing partial `query` options you MUST also pass `queryKey` (use the matching `getGetXxxQueryKey()`).
- `requireRole("OWNER")` must guard every owner-only endpoint (fleet, alerts, setup), including read-only setup endpoints, or drivers can reach them. The `/drivers/:id` route uses an explicit OWNER-or-self allowlist rather than `requireRole`.
- Three guards: `requireRole` checks the EFFECTIVE role; `requireSuperadmin` checks the REAL role (used only for enter-org/exit-org so they stay usable while impersonating); `requireConsole` requires a REAL superadmin who is NOT impersonating. Console management endpoints must use `requireConsole` so an impersonating superadmin cannot reach the console (must exit first), and the impersonated org's effective OWNER role can never unlock it.
- Alert/HOS code must not assume an org has a rule profile: console-created orgs have none. Use `ruleToInput(undefined)` (default rule) rather than dereferencing `rule.*`.
- Always run `pnpm --filter @workspace/api-spec run codegen` after changing the OpenAPI spec.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
