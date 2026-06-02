import { AlertTriangle, Activity, Wrench, MapPin, Truck, Bell, TrendingUp, TrendingDown } from "lucide-react";
import { useGetTelematicsOverview } from "@workspace/api-client-react";
import { Metric } from "@/portal/ui";
import { Loading, Panel, ScoreDial, Pill, EmptyRow } from "./shared";

const AREA_ICON: Record<string, typeof Activity> = {
  "Vehicle health": Activity,
  Maintenance: Wrench,
  "Driver behaviour": Truck,
  Compliance: MapPin,
  Alerts: Bell,
};

export function OverviewTab() {
  const { data, isLoading } = useGetTelematicsOverview();
  if (isLoading) return <Loading />;
  if (!data) return <EmptyRow>No intelligence available yet.</EmptyRow>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <ScoreDial label="Fleet health" score={data.healthScore} />
        <ScoreDial label="Safety" score={data.safetyScore} />
        <ScoreDial label="Efficiency" score={data.efficiencyScore} />
        <ScoreDial label="Compliance" score={data.complianceScore} />
        <ScoreDial label="Utilization" score={data.utilizationPct} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Metric label="Open alerts" value={data.openAlerts} hint="Need a decision" tone={data.openAlerts > 0 ? "amber" : "green"} />
        <Metric label="Active faults" value={data.activeFaults} hint="Engine diagnostics" tone={data.activeFaults > 0 ? "red" : "green"} />
        <Metric label="Services due" value={data.dueServices} hint="Overdue or soon" tone={data.dueServices > 0 ? "amber" : "green"} />
        <Metric label="No-go zones" value={data.geofenceBreaches} hint="Armed geofences" tone="blue" />
        <Metric label="Open jobs" value={data.openJobs} hint="In dispatch" tone="teal" />
      </div>

      <Panel
        title="Intelligence feed"
        description="Ranked, cross-domain signals from telemetry, diagnostics, behaviour and compliance."
      >
        {data.insights.length === 0 ? (
          <EmptyRow>All clear. No signals need your attention right now.</EmptyRow>
        ) : (
          <div className="divide-y">
            {data.insights.map((i) => {
              const Icon = AREA_ICON[i.area] ?? AlertTriangle;
              return (
                <div key={i.id} className="flex items-start gap-4 px-5 py-4">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={i.severity === "HIGH" ? "red" : i.severity === "MEDIUM" ? "amber" : "blue"}>
                        {i.severity}
                      </Pill>
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">{i.area}</span>
                    </div>
                    <div className="mt-1 font-medium">{i.title}</div>
                    <div className="text-sm text-muted-foreground">{i.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel title="Scorecards" description="Each pillar with its trend versus the prior period.">
        <div className="divide-y">
          {data.scorecards.map((s) => (
            <div key={s.label} className="flex items-center gap-4 px-5 py-3">
              <span className="w-32 text-sm font-medium">{s.label}</span>
              <span className="font-display text-xl font-bold tabular-nums">{s.score}</span>
              <span className="text-xs text-muted-foreground">{s.unit}</span>
              <span
                className={`ml-auto inline-flex items-center gap-1 text-sm tabular-nums ${
                  s.delta >= 0 ? "text-[#2f7d5b]" : "text-[#a8392e]"
                }`}
              >
                {s.delta >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {s.delta >= 0 ? "+" : ""}
                {s.delta}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
