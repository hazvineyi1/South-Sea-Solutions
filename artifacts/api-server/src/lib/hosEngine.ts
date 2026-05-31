// Aftrak fatigue and hours engine.
//
// IMPORTANT: the limits used here come from a configurable RuleProfile that
// represents a contractual standard agreed with clients and insurers. They are
// NOT Botswana statute. Botswana has no statutory driving-hours limit. Treat
// these as internal, contractual fatigue controls only.

export type DutyStatus = "OFF" | "REST" | "DRIVING" | "ONDUTY";

export interface DutyEventInput {
  status: DutyStatus;
  startedAt: Date;
  endedAt: Date | null;
}

export interface RuleProfileInput {
  contMins: number;
  dailyMins: number;
  weeklyMins: number;
  dailyRestMins: number;
  breakMins: number;
}

export type ClockStatus = "OK" | "WARNING" | "EXCEEDED";

export interface Clock {
  usedMins: number;
  limitMins: number;
  remainingMins: number;
  status: ClockStatus;
}

export interface HosResult {
  continuous: Clock;
  daily: Clock;
  weekly: Clock;
  status: ClockStatus;
}

const WARNING_RATIO = 0.9;

function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

function clockStatus(used: number, limit: number): ClockStatus {
  if (limit <= 0) return "OK";
  if (used >= limit) return "EXCEEDED";
  if (used >= limit * WARNING_RATIO) return "WARNING";
  return "OK";
}

function worst(a: ClockStatus, b: ClockStatus): ClockStatus {
  const rank: Record<ClockStatus, number> = { OK: 0, WARNING: 1, EXCEEDED: 2 };
  return rank[a] >= rank[b] ? a : b;
}

function buildClock(used: number, limit: number): Clock {
  return {
    usedMins: used,
    limitMins: limit,
    remainingMins: Math.max(0, limit - used),
    status: clockStatus(used, limit),
  };
}

// Returns the effective [start, end] window of an event, bounded by `now`.
function bounds(event: DutyEventInput, now: Date): [Date, Date] {
  const end = event.endedAt ?? now;
  return [event.startedAt, end > now ? now : end];
}

/**
 * Compute fatigue and hours clocks for a driver.
 *
 * - continuous: driving minutes since the last qualifying break. A break
 *   qualifies when status is REST or OFF for at least breakMins.
 * - daily: driving minutes within the last 24 hours.
 * - weekly: driving minutes within the last 7 days.
 */
export function computeHos(
  events: DutyEventInput[],
  profile: RuleProfileInput,
  now: Date = new Date(),
): HosResult {
  const sorted = [...events].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

  let continuousDriving = 0;
  let dailyDriving = 0;
  let weeklyDriving = 0;

  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  for (const event of sorted) {
    const [start, end] = bounds(event, now);
    if (end <= start) continue;
    const duration = minutesBetween(start, end);

    if (event.status === "DRIVING") {
      continuousDriving += duration;

      const dailyStart = start > dayAgo ? start : dayAgo;
      if (end > dailyStart) dailyDriving += minutesBetween(dailyStart, end);

      const weeklyStart = start > weekAgo ? start : weekAgo;
      if (end > weeklyStart) weeklyDriving += minutesBetween(weeklyStart, end);
    } else if (event.status === "REST" || event.status === "OFF") {
      if (duration >= profile.breakMins) {
        continuousDriving = 0;
      }
    }
    // ONDUTY (not driving) neither adds driving time nor resets continuous.
  }

  const continuous = buildClock(continuousDriving, profile.contMins);
  const daily = buildClock(dailyDriving, profile.dailyMins);
  const weekly = buildClock(weeklyDriving, profile.weeklyMins);

  return {
    continuous,
    daily,
    weekly,
    status: worst(worst(continuous.status, daily.status), weekly.status),
  };
}
