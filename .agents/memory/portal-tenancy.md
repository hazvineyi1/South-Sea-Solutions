---
name: Drivewise portal multi-tenancy and access rules
description: The non-negotiable security invariants for the Drivewise operator/driver portal.
---

The Drivewise portal lives inside the South Sea Solutions app (Express API + React Vite),
multi-tenant by `orgId`. These invariants must hold for every new endpoint and view.

Rules:
- Every data read must be scoped by `req.user.orgId`. Never trust an id from the client to
  span tenants.
- Operator-only endpoints must use `requireRole("OWNER", "OPERATOR")`. This includes
  read-only setup endpoints (e.g. `/setup/org`, `/setup/rule-profile`); a code review caught
  a driver-accessible `/setup/org` because it only had `requireAuth`.
- A DRIVER may read only their own driver record: enforce `user.driverId === :id` AND
  `driver.orgId === user.orgId`.
- Every successful driver-record read must insert an `audit_logs` row before responding.
- Alert acknowledgements persist in `alert_acks` and are re-applied when rebuilding alerts.

**Why:** the product is a compliance/risk tool for separate transport operators; a
cross-tenant leak or a driver seeing operator data is a hard failure of the spec.

**How to apply:** when adding any route or portal view, start from the orgId filter and the
role guard, not as an afterthought.
