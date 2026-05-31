---
name: Role-based data redaction
description: When a role must not see certain fields, redact them server-side, not just in the UI.
---

# Role-based data redaction

Rule: when a portal role is not supposed to see certain data (e.g. OPERATOR must not see live telemetry: speed, fuel, position, odometer, last ping, fleet telemetry aggregates), strip those fields in the API route by role, not only by hiding them in the frontend.

**Why:** Two roles can share the same endpoint. Hiding fields only in the client is cosmetic: anyone with that role can read them straight off the network response. A code review flagged this as a broken authorization boundary.

**How to apply:** In the route handler, branch on `req.user.role` and return a redacted projection for the lower-privilege role (see `redactVehicleRowsForOperator` / `redactFleetSummaryForOperator` in `portal.ts`). Make the redactable fields optional in the OpenAPI schema so the same response type validates with them omitted, then re-run codegen.
