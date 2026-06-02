import { useGetAnalyticsReport } from "@workspace/api-client-react";
import { Metric } from "@/portal/ui";
import { Loading, Panel, BarList, EmptyRow } from "./shared";

// A dependency-free dual-series mini chart: distance (bars) with the event count
// annotated. Keeps the analytics view self-contained.
function WeekChart({ series }: { series: { label: string; distanceKm: number; fuelLitres: number; events: number }[] }) {
  const max = Math.max(1, ...series.map((s) => s.distanceKm));
  return (
    <div className="px-5 py-5">
      <div className="flex items-end justify-between gap-2" style={{ height: 160 }}>
        {series.map((s) => (
          <div key={s.label} className="flex flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] tabular-nums text-muted-foreground">{s.distanceKm}</span>
            <div
              className="w-full rounded-t-md bg-[#0f6e60]"
              style={{ height: `${(s.distanceKm / max) * 120}px`, minHeight: 2 }}
              title={`${s.distanceKm} km, ${s.fuelLitres} L, ${s.events} events`}
            />
            <span className="text-[10px] text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Estimated daily distance (km). Distance and fuel are derived from logged drive time at a contractual corridor average.
      </p>
    </div>
  );
}

export function AnalyticsTab() {
  const { data, isLoading } = useGetAnalyticsReport();
  if (isLoading) return <Loading />;
  if (!data) return <EmptyRow>No analytics available.</EmptyRow>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Distance" value={`${data.totalDistanceKm.toLocaleString()} km`} hint="Last 7 days" tone="teal" />
        <Metric label="Fuel used" value={`${data.totalFuelLitres.toLocaleString()} L`} hint="Estimated" tone="blue" />
        <Metric label="Efficiency" value={`${data.avgEfficiencyL100km} L/100km`} hint="Fleet average" tone={data.avgEfficiencyL100km <= 35 ? "green" : "amber"} />
        <Metric label="CO2" value={`${data.co2Tonnes} t`} hint="Estimated tailpipe" tone="neutral" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Idle share" value={`${data.idlePct}%`} hint="Of activity" tone={data.idlePct >= 20 ? "amber" : "green"} />
        <Metric label="Utilization" value={`${data.utilizationPct}%`} hint="Vehicles active" tone="teal" />
      </div>

      <Panel title="Weekly activity" description="Distance, fuel and event trend across the last 7 days.">
        <WeekChart series={data.series} />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Safety by driver" description="Current safety score.">
          <BarList items={data.safetyByDriver} tone="green" />
        </Panel>
        <Panel title="Distance by vehicle" description="Estimated, last 7 days.">
          <BarList items={data.distanceByVehicle} unit="km" tone="blue" />
        </Panel>
        <Panel title="Incidents by type" description="Open and recorded.">
          <BarList items={data.incidentsByType} tone="amber" />
        </Panel>
      </div>
    </div>
  );
}
