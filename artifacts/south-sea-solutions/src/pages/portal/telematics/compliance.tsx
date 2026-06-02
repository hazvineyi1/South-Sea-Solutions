import { useGetComplianceHos } from "@workspace/api-client-react";
import { statusTone } from "@/portal/ui";
import { Loading, Panel, Pill, EmptyRow } from "./shared";

function hhmm(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function Clock({ label, used, limit, status }: { label: string; used: number; limit: number; status: string }) {
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const color = status === "EXCEEDED" ? "#bf463a" : status === "WARNING" ? "#c4861f" : "#0f6e60";
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">
          {hhmm(used)} / {hhmm(limit)}
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#e8e3d8]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export function ComplianceTab() {
  const { data, isLoading } = useGetComplianceHos();
  if (isLoading) return <Loading />;

  return (
    <Panel
      title="Hours-of-service compliance (ELD)"
      description="Electronic logging: continuous, daily and weekly driving clocks against the contractual rule, with log certification status."
    >
      {!data || data.length === 0 ? (
        <EmptyRow>No drivers to show.</EmptyRow>
      ) : (
        <div className="divide-y">
          {data.map((d) => (
            <div key={d.driverId} className="space-y-3 px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{d.driverName}</span>
                <Pill tone={statusTone(d.status)}>{d.status}</Pill>
                <span className="ml-auto text-xs text-muted-foreground">
                  {d.certifiedDays} log{d.certifiedDays === 1 ? "" : "s"} certified
                  {d.uncertifiedDays > 0 ? `, ${d.uncertifiedDays} pending` : ""}
                </span>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
                <Clock label="Continuous" used={d.hours.continuous.usedMins} limit={d.hours.continuous.limitMins} status={d.hours.continuous.status} />
                <Clock label="Daily" used={d.hours.daily.usedMins} limit={d.hours.daily.limitMins} status={d.hours.daily.status} />
                <Clock label="Weekly" used={d.hours.weekly.usedMins} limit={d.hours.weekly.limitMins} status={d.hours.weekly.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
