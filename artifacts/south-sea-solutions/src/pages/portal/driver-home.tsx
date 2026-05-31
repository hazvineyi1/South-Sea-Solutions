import { Loader2, Truck, Gauge, MapPin, Route, Radio } from "lucide-react";
import {
  useGetDriverRecord,
  getGetDriverRecordQueryKey,
  type DriverRecord,
} from "@workspace/api-client-react";
import { useAuth } from "@/portal/auth-hooks";
import { PortalLayout } from "@/portal/PortalLayout";
import { StatusPill, statusTone, FuelBar } from "@/portal/ui";
import { DriverRecordView } from "./driver-record";

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "No signal";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "No signal";
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs}h ago`;
}

function TelemetryTile({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-secondary/50 p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-display text-xl font-bold">{children}</div>
    </div>
  );
}

function YourTruck({ record }: { record: DriverRecord }) {
  const t = record.telemetry;
  return (
    <div className="rounded-3xl border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Truck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight">Your truck</h2>
            <p className="text-sm text-muted-foreground">{record.currentVehicleReg ?? "No vehicle assigned"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={statusTone(record.status)}>{record.status}</StatusPill>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Radio className="h-3.5 w-3.5" />
            {timeAgo(t.lastPingAt)}
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <TelemetryTile icon={<Gauge className="h-3.5 w-3.5" />} label="Speed">
          {t.speedKph} <span className="text-sm font-medium text-muted-foreground">km/h</span>
        </TelemetryTile>
        <div className="rounded-2xl bg-secondary/50 p-4">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            Fuel
          </div>
          <div className="mt-3">
            {typeof record.fuelPct === "number" ? <FuelBar pct={record.fuelPct} /> : <span className="text-sm text-muted-foreground">No data</span>}
          </div>
        </div>
        <TelemetryTile icon={<Route className="h-3.5 w-3.5" />} label="Odometer">
          {typeof t.odometerKm === "number" ? t.odometerKm.toLocaleString() : "--"}{" "}
          <span className="text-sm font-medium text-muted-foreground">km</span>
        </TelemetryTile>
        <TelemetryTile icon={<MapPin className="h-3.5 w-3.5" />} label="Location">
          <span className="text-base">{record.placeLabel ?? "Unknown"}</span>
        </TelemetryTile>
      </div>
    </div>
  );
}

export default function DriverHomePage() {
  const { user } = useAuth();
  const driverId = user?.driverId ?? "";
  const { data, isLoading, isError } = useGetDriverRecord(driverId, {
    query: {
      queryKey: getGetDriverRecordQueryKey(driverId),
      enabled: Boolean(driverId),
      retry: false,
    },
  });

  return (
    <PortalLayout>
      {!driverId ? (
        <div className="rounded-2xl border bg-card px-5 py-16 text-center text-sm text-muted-foreground">
          Your account is not linked to a driver profile yet.
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : isError || !data ? (
        <div className="rounded-2xl border bg-card px-5 py-16 text-center text-sm text-muted-foreground">
          Your record could not be loaded.
        </div>
      ) : (
        <div className="space-y-6">
          <YourTruck record={data} />
          <DriverRecordView record={data} />
        </div>
      )}
    </PortalLayout>
  );
}
