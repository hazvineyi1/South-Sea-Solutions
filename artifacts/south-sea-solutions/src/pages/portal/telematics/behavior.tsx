import { useGetBehaviorOverview } from "@workspace/api-client-react";
import { Metric } from "@/portal/ui";
import { Loading, Panel, Pill, EmptyRow, ScoreBar, BarList, eventTone, humanize, relativeTime } from "./shared";

export function BehaviorTab() {
  const { data, isLoading } = useGetBehaviorOverview();
  if (isLoading) return <Loading />;
  if (!data) return <EmptyRow>No behaviour data yet.</EmptyRow>;

  const byType = data.byType.map((t) => ({ label: humanize(t.type), value: t.count }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Fleet safety score" value={data.fleetScore} hint="Last 30 days" tone={data.fleetScore >= 85 ? "green" : "amber"} />
        <Metric label="Events" value={data.totalEvents} hint="Detected (30 days)" tone={data.totalEvents > 0 ? "amber" : "green"} />
        <Metric label="Drivers" value={data.drivers.length} hint="Monitored" tone="teal" />
        <Metric
          label="Top performer"
          value={data.drivers[0]?.behaviorScore ?? "--"}
          hint={data.drivers[0]?.driverName ?? "No data"}
          tone="green"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Safety leaderboard" description="Behaviour score per driver, best first.">
          {data.drivers.length === 0 ? (
            <EmptyRow>No drivers monitored.</EmptyRow>
          ) : (
            <div className="divide-y">
              {data.drivers.map((d) => (
                <div key={d.driverId} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-36 shrink-0 truncate text-sm font-medium">{d.driverName}</div>
                  <div className="flex-1">
                    <ScoreBar score={d.behaviorScore} />
                  </div>
                  <div className="hidden w-44 justify-end gap-1.5 text-xs text-muted-foreground sm:flex">
                    {d.harshEvents > 0 ? <Pill tone="amber">{d.harshEvents} harsh</Pill> : null}
                    {d.speedingEvents > 0 ? <Pill tone="red">{d.speedingEvents} speed</Pill> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Events by type" description="What is driving the score, last 30 days.">
          <BarList items={byType} tone="amber" />
        </Panel>
      </div>

      <Panel title="Recent events" description="Latest harsh-driving, speeding and distraction detections.">
        {data.recent.length === 0 ? (
          <EmptyRow>No recent events.</EmptyRow>
        ) : (
          <div className="divide-y">
            {data.recent.map((e) => (
              <div key={e.id} className="flex items-center gap-4 px-5 py-3">
                <Pill tone={eventTone(e.severity)}>{e.severity}</Pill>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{humanize(e.type)}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {e.driverName} ({e.vehicleReg}){e.placeLabel ? ` near ${e.placeLabel}` : ""}
                  </div>
                </div>
                {e.value != null ? <span className="text-sm tabular-nums text-muted-foreground">{e.value}</span> : null}
                <span className="hidden text-xs text-muted-foreground sm:block">{relativeTime(e.recordedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
