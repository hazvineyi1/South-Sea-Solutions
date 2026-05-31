import { useLocation } from "wouter";
import { Truck, ChevronRight, Loader2, Users } from "lucide-react";
import { useGetFleetSummary, useGetVehicleRows } from "@workspace/api-client-react";
import { PortalLayout } from "@/portal/PortalLayout";
import { Metric, StatusPill, statusTone } from "@/portal/ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertsTab, SetupTab } from "./shared-tabs";

function RosterTab() {
  const [, setLocation] = useLocation();
  const { data: summary } = useGetFleetSummary();
  const { data: vehicles, isLoading } = useGetVehicleRows();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric
          label="Drivers on roster"
          value={summary?.activeVehicles ?? "--"}
          hint="Assigned vehicles"
          tone="teal"
        />
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
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-display text-lg font-semibold">Driver roster</h2>
          <p className="text-sm text-muted-foreground">
            Compliance and certification status. Tap a row to open the driver record.
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
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary/40 disabled:cursor-default disabled:opacity-70 disabled:hover:bg-transparent"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                  <Users className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{v.driverName}</span>
                    {v.crossBorder ? <StatusPill tone="blue">Cross-border</StatusPill> : null}
                    {v.needsAttention ? <StatusPill tone="amber">Attention</StatusPill> : null}
                  </div>
                  <div className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                    <Truck className="h-3.5 w-3.5" />
                    {v.reg}
                  </div>
                </div>
                <div className="hidden items-center gap-6 sm:flex">
                  <StatusPill tone={statusTone(v.certification)}>{v.certification}</StatusPill>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FleetPage() {
  return (
    <PortalLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">Operations</h1>
        <p className="text-sm text-muted-foreground">
          Driver compliance, certification and hours-of-service. Operator workspace.
        </p>
      </div>

      <Tabs defaultValue="roster">
        <TabsList>
          <TabsTrigger value="roster">Roster</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="setup">Setup</TabsTrigger>
        </TabsList>
        <TabsContent value="roster" className="mt-6">
          <RosterTab />
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
