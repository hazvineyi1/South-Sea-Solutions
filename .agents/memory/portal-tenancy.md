---
name: Aftrak portal multi-tenancy and access rules
description: The non-negotiable security invariants for the Aftrak portal (owner/driver/superadmin).
---

The Aftrak portal lives inside the South Sea Solutions app (Express API + React Vite),
multi-tenant by `orgId`. These invariants must hold for every new endpoint and view.

Roles: OWNER and DRIVER are org-scoped (have an `orgId`). SUPERADMIN is platform-level
(`orgId` is null) and uses the console. OPERATOR no longer exists.

Effective vs real identity (impersonation):
- `attachUser` computes `req.auth` with both the real identity and the effective one. A
  SUPERADMIN can "enter" an org (acting org stored on the session); while impersonating, the
  effective role/org are the target org's, and `impersonating` is true.
- `requireRole(...)` checks the EFFECTIVE role (so an impersonating superadmin passes owner
  guards). `requireSuperadmin` checks the REAL role (so impersonation can never grant console
  access). Platform/console endpoints use `requireSuperadmin`.

Rules:
- Every data read must be scoped by the effective `orgId`. Never trust an id from the client
  to span tenants.
- Owner-only endpoints must use `requireRole("OWNER")`. This includes read-only setup
  endpoints (e.g. `/setup/org`, `/setup/rule-profile`); a code review once caught a
  driver-accessible `/setup/org` that only had `requireAuth`.
- A DRIVER may read only their own driver record: enforce `user.driverId === :id` AND
  `driver.orgId === user.orgId`.
- Every successful driver-record read must insert an `audit_logs` row before responding.
- Alert acknowledgements persist in `alert_acks` and are re-applied when rebuilding alerts.
- Training is open to ALL authenticated roles; completions persist per-user in
  `training_completions` and surface on the driver record.

Gotcha (newly-created orgs have no rule profile):
- An org created via the console has no drivers and no rule profile. Any code that builds
  alerts / HOS for an org (e.g. the platform overview's open-alert count) must tolerate a
  missing rule. `ruleToInput(undefined)` falls back to a default HOS rule rather than
  dereferencing `rule.contMins` (which 500'd the overview).

**Why:** the product is a compliance/risk tool for separate transport operators; a
cross-tenant leak, a driver seeing owner data, or impersonation leaking console access is a
hard failure of the spec.

**How to apply:** when adding any route or portal view, start from the effective-orgId filter
and the role guard, not as an afterthought; and never assume an org has drivers or a rule.
