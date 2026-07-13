/**
 * One table.
 *
 * This barrel used to re-export twenty: orgs, users, sessions, fleets, vehicles,
 * drivers, certifications, duty events, telemetry, incidents, training modules,
 * audit logs. That was Aftrak, and Aftrak is gone. The public website needs to
 * record an inquiry and nothing else, so it defines an inquiry and nothing else.
 *
 * Leaving the rest behind would have been the easy choice, since unused table
 * definitions cost nothing at runtime. It is also how a schema becomes a museum:
 * the next person to read this would have had no way to tell which of the twenty
 * tables the product still depends on.
 */
export * from "./contact";
