# South Sea Solutions

A login-gated, multi-tenant portal hub built on the South Sea Solutions marketing site. The first portal is Drivewise, a driver-risk and certification platform for commercial transport operators in Botswana.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/south-sea-solutions run dev` — run the web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — seed the Drivewise demo org, users, and drivers
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
- API routes: `artifacts/api-server/src/routes/*.ts` (auth, fleet, drivers, alerts, setup)
- Auth + org-scoping helpers: `artifacts/api-server/src/lib/auth.ts`, `lib/portal.ts`
- Hours-of-service engine: `artifacts/api-server/src/lib/hosEngine.ts`
- Auth middleware: `artifacts/api-server/src/middlewares/requireAuth.ts` (`requireAuth`, `requireRole`)
- Portal frontend: `artifacts/south-sea-solutions/src/portal/*` (auth context, guards, layout, ui) and `src/pages/portal/*` (login, command, driver-record, driver-home)
- Training center: `src/pages/portal/trainingContent.ts` (static module content data, grouped by category, no audience concept), `training.tsx` (index, category grouping), `training-module.tsx` (detail with sections/steps/callouts + prev/next). Routes `/portal/training` and `/portal/training/:slug`, guarded OWNER only; header "Training" link shown to OWNER only.
- Drivewise theme: scoped `.drivewise` class in `src/index.css`

## Architecture decisions

- Single gateway login at `/login`; role-based redirect to the right portal view (OWNER sees the full-telemetry command center, DRIVER sees own record + own truck telemetry).
- Two roles only: OWNER and DRIVER (OPERATOR was removed entirely). OWNER gets the full command center (live fleet telemetry, alerts, certification, rule setup). DRIVER sees only their own record plus live telemetry for their own truck.
- All owner-only endpoints (`/fleet/*`, `/alerts*`, `/setup/*`) are guarded with `requireRole("OWNER")`. `/portal/command` and the training routes are route-guarded OWNER only.
- The driver record endpoint (`/drivers/:id`) uses an explicit allowlist: OWNER may read any driver in-org, DRIVER may read only their own record. Any other role is denied (defense against stale roles).
- DRIVER telemetry: `DriverRecord.telemetry` (speedKph, odometerKm, lat, lng, lastPingAt) is built in `buildDriverRecord`; `fuelPct` and `placeLabel` stay top-level (shared with the owner view). The driver-home "Your truck" panel renders these for the driver's own vehicle only.
- Multi-tenant: every data read is scoped by `req.user.orgId`. The driver record route additionally enforces DRIVER self-only access and an org match.
- Every successful driver-record read writes an `audit_logs` row.
- Frontend and API share an origin via the reverse proxy, so the httpOnly session cookie flows automatically; the client uses relative `/api` URLs.
- Drivewise design tokens (cream/teal, Sora/Inter) are scoped to portal routes via a `.drivewise` wrapper class, kept separate from the dark marketing theme.

## Product

- Owners log in to a command center: full fleet telemetry (live speed, fuel, position, odometer, last ping plus fleet aggregates), certification and compliance, acknowledge alerts, and edit the hours-of-service rule profile.
- Owners open any driver record in their org: overview, hours (continuous/daily/weekly clocks), safety incidents, training/certification, and documents.
- Drivers log in and see only their own record, plus a "Your truck" panel with live telemetry (speed, fuel, odometer, location, last ping) for their assigned vehicle.

## User preferences

- HARD RULE: NO em dashes anywhere (UI copy, comments, code). Use colons, commas, or parentheses instead.

## Gotchas

- Generated query hooks are `export function useGetXxx` (not `const`). When passing partial `query` options you MUST also pass `queryKey` (use the matching `getGetXxxQueryKey()`).
- `requireRole("OWNER")` must guard every owner-only endpoint (fleet, alerts, setup), including read-only setup endpoints, or drivers can reach them. The `/drivers/:id` route uses an explicit OWNER-or-self allowlist rather than `requireRole`.
- Always run `pnpm --filter @workspace/api-spec run codegen` after changing the OpenAPI spec.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
