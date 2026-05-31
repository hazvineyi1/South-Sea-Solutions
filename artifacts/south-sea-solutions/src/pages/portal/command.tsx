import { useLocation } from "wouter";
import { Truck, ChevronRight, Loader2, Gauge, Fuel, MapPin, Route } from "lucide-react";
import { useGetFleetSummary, useGetVehicleRows } from "@workspace/api-client-react";
import { PortalLayout } from "@/portal/PortalLayout";
import { Metric, StatusPill, FuelBar, statusTone } from "@/portal/ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertsTab, SetupTab } from "./shared-tabs";

function lastSeen(iso: string | null | undefined): string {
  if (!iso) return "No signal";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} d ago`;
}

function coords(lat: number | null | undefined, lng: number | null | undefined): string | null {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return null;
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function TelemetryTab() {
  const [, setLocation] = useLocation();
  const { data: summary } = useGetFleetSummary();
  const { data: vehicles, isLoading } = useGetVehicleRows();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric
          label="Active vehicles"
          value={summary?.activeVehicles ?? "--"}
          hint={`${summary?.movingCount ?? 0} moving, ${summary?.idlingCount ?? 0} idling`}
          tone="teal"
        />
        <Metric
          label="Average speed"
          value={`${summary?.avgSpeedKph ?? 0} km/h`}
          hint="Vehicles in motion"
          tone="blue"
        />
        <Metric
          label="Fleet fuel"
          value={`${summary?.avgFuelPct ?? 0}%`}
          hint="Average across fleet"
          tone={(summary?.avgFuelPct ?? 0) <= 30 ? "amber" : "green"}
        />
        <Metric
          label="Fleet distance"
          value={`${(summary?.totalOdometerKm ?? 0).toLocaleString()} km`}
          hint="Total odometer"
          tone="neutral"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric
          label="Fleet certified"
          value={`${summary?.fleetCertifiedPct ?? 0}%`}
          hint="Drivewise standard"
          tone={(summary?.fleetCertifiedPct ?? 0) >= 80 ? "green" : "amber"}
        />
        <Metric
          label="Needs attention"
          value={summary?.needsAttentionCount ?? 0}
          hint="Open items"
          tone={(summary?.needsAttentionCount ?? 0) > 0 ? "amber" : "green"}
        />
        <Metric
          label="Cross-border"
          value={summary?.crossBorderCount ?? 0}
          hint="On corridor"
          tone="blue"
        />
        <Metric
          label="Idling now"
          value={summary?.idlingCount ?? 0}
          hint="Stationary vehicles"
          tone="neutral"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-display text-lg font-semibold">Live telemetry</h2>
          <p className="text-sm text-muted-foreground">
            Real-time speed, fuel and position for every vehicle. Tap a row to open the driver record.
          </p>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="divide-y">
            {vehicles?.map((v) => (
              <button
                key={v.vehicleId}
                onClick={() => {
                  if (v.driverId) setLocation(`/portal/drivers/${v.driverId}`);
                }}
                disabled={!v.driverId}
                className="flex w-full flex-col gap-3 px-5 py-4 text-left transition-colors hover:bg-secondary/40 disabled:cursor-default disabled:opacity-70 disabled:hover:bg-transparent sm:flex-row sm:items-center sm:gap-4"
              >
                <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground sm:flex">
                  <Truck className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{v.reg}</span>
                    <StatusPill tone={statusTone(v.status)}>{v.status}</StatusPill>
                    <StatusPill tone={statusTone(v.certification)}>{v.certification}</StatusPill>
                    {v.crossBorder ? <StatusPill tone="blue">Cross-border</StatusPill> : null}
                    {v.needsAttention ? <StatusPill tone="amber">Attention</StatusPill> : null}
                  </div>
                  <div className="mt-1 truncate text-sm text-muted-foreground">{v.driverName}</div>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:flex sm:items-center sm:gap-6">
                  <div className="flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground">
                    <Gauge className="h-4 w-4 shrink-0" />
                    {v.speedKph ?? 0} km/h
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Fuel className="h-4 w-4 shrink-0" />
                    <FuelBar pct={v.fuelPct ?? 0} />
                  </div>
                  <div className="flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground">
                    <Route className="h-4 w-4 shrink-0" />
                    {typeof v.odometerKm === "number" ? `${v.odometerKm.toLocaleString()} km` : "--"}
                  </div>
                  <div className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {v.placeLabel ?? coords(v.lat, v.lng) ?? "Unknown"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground sm:w-24 sm:text-right">
                    {lastSeen(v.lastPingAt)}
                  </div>
                </div>
                <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommandPage() {
  return (
    <PortalLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">Command center</h1>
        <p className="text-sm text-muted-foreground">
          Full fleet telemetry, certification and compliance. Owner workspace.
        </p>
      </div>

      <Tabs defaultValue="telemetry">
        <TabsList>
          <TabsTrigger value="telemetry">Telemetry</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="setup">Setup</TabsTrigger>
        </TabsList>
        <TabsContent value="telemetry" className="mt-6">
          <TelemetryTab />
        </TabsContent>
        <TabsContent value="alerts" className="mt-6">
          <AlertsTab />
        </TabsContent>
        <TabsContent value="setup" className="mt-6">
          <SetupTab />
        </TabsContent>
      </Tabs>
    </PortalLayout>
  );
}
