import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Truck, AlertTriangle, Settings, ChevronRight, Loader2, Check } from "lucide-react";
import {
  useGetFleetSummary,
  useGetVehicleRows,
  getGetVehicleRowsQueryKey,
  useGetAlerts,
  getGetAlertsQueryKey,
  useGetRuleProfile,
  getGetRuleProfileQueryKey,
  useAcknowledgeAlert,
  useUpdateRuleProfile,
} from "@workspace/api-client-react";
import { PortalLayout } from "@/portal/PortalLayout";
import { Metric, StatusPill, FuelBar, statusTone, severityTone } from "@/portal/ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function FleetTab() {
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
          <h2 className="font-display text-lg font-semibold">Live fleet</h2>
          <p className="text-sm text-muted-foreground">Tap a vehicle to open the driver record.</p>
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
                  <Truck className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{v.reg}</span>
                    {v.crossBorder ? <StatusPill tone="blue">Cross-border</StatusPill> : null}
                    {v.needsAttention ? <StatusPill tone="amber">Attention</StatusPill> : null}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    {v.driverName} · {v.placeLabel}
                  </div>
                </div>
                <div className="hidden items-center gap-6 sm:flex">
                  <StatusPill tone={statusTone(v.status)}>{v.status}</StatusPill>
                  <StatusPill tone={statusTone(v.certification)}>{v.certification}</StatusPill>
                  <FuelBar pct={v.fuelPct} />
                  <span className="w-16 text-right text-sm tabular-nums text-muted-foreground">
                    {v.speedKph} km/h
                  </span>
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

function AlertsTab() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: alerts, isLoading } = useGetAlerts();
  const ack = useAcknowledgeAlert();

  function handleAck(key: string) {
    ack.mutate(
      { data: { key } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAlertsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetVehicleRowsQueryKey() });
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const open = alerts?.filter((a) => !a.acknowledged) ?? [];
  const done = alerts?.filter((a) => a.acknowledged) ?? [];

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-display text-lg font-semibold">Open alerts</h2>
          <p className="text-sm text-muted-foreground">
            {open.length} item{open.length === 1 ? "" : "s"} need a decision.
          </p>
        </div>
        {open.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            No open alerts. The fleet is clear.
          </div>
        ) : (
          <div className="divide-y">
            {open.map((a) => (
              <div key={a.key} className="flex items-center gap-4 px-5 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                  <AlertTriangle className="h-5 w-5 text-[#9a6712]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <StatusPill tone={severityTone(a.severity)}>{a.severity}</StatusPill>
                    <span className="text-xs text-muted-foreground">{a.kind.replace(/_/g, " ")}</span>
                  </div>
                  <div className="mt-1 text-sm">
                    <button
                      onClick={() => a.driverId && setLocation(`/portal/drivers/${a.driverId}`)}
                      className="font-medium text-primary hover:underline"
                    >
                      {a.driverName}
                    </button>{" "}
                    <span className="text-muted-foreground">{a.message}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAck(a.key)}
                  disabled={ack.isPending}
                  className="gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  Acknowledge
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {done.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="border-b px-5 py-4">
            <h2 className="font-display text-lg font-semibold">Acknowledged</h2>
          </div>
          <div className="divide-y">
            {done.map((a) => (
              <div key={a.key} className="flex items-center gap-3 px-5 py-3 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-[#2f7d5b]" />
                <span className="font-medium text-foreground">{a.driverName}</span>
                <span>{a.message}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SetupTab() {
  const queryClient = useQueryClient();
  const { data: rule, isLoading } = useGetRuleProfile();
  const update = useUpdateRuleProfile();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<Record<string, number>>({});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }
  if (!rule) {
    return <div className="py-10 text-center text-sm text-muted-foreground">No rule profile found.</div>;
  }

  const fields: { key: keyof typeof rule; label: string; suffix: string }[] = [
    { key: "contMins", label: "Max continuous driving", suffix: "minutes" },
    { key: "dailyMins", label: "Max daily driving", suffix: "minutes" },
    { key: "weeklyMins", label: "Max weekly driving", suffix: "minutes" },
    { key: "breakMins", label: "Minimum break", suffix: "minutes" },
    { key: "dailyRestMins", label: "Minimum daily rest", suffix: "minutes" },
  ];

  function valueFor(key: string, fallback: number): number {
    return form[key] ?? fallback;
  }

  function handleSave() {
    setSaved(false);
    const payload: Record<string, number> = {};
    for (const f of fields) {
      const v = form[f.key as string];
      if (typeof v === "number" && !Number.isNaN(v)) payload[f.key as string] = v;
    }
    update.mutate(
      { data: payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetRuleProfileQueryKey() });
          setSaved(true);
          setForm({});
        },
      },
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl border bg-card p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
            <Settings className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold">{rule.name}</h2>
            <p className="text-sm text-muted-foreground">
              Hours-of-service limits applied across your fleet.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {fields.map((f) => {
            const current = rule[f.key];
            const numeric = typeof current === "number" ? current : 0;
            return (
              <div key={f.key as string} className="flex items-center justify-between gap-4">
                <Label htmlFor={f.key as string} className="text-sm">
                  {f.label}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={f.key as string}
                    type="number"
                    className="w-28"
                    value={valueFor(f.key as string, numeric)}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, [f.key as string]: Number(e.target.value) }))
                    }
                  />
                  <span className="w-16 text-sm text-muted-foreground">{f.suffix}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </Button>
          {saved ? <span className="text-sm text-[#2f7d5b]">Saved.</span> : null}
        </div>
      </div>
    </div>
  );
}

export default function FleetPage() {
  return (
    <PortalLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">Fleet operations</h1>
        <p className="text-sm text-muted-foreground">
          Live status, certification and hours-of-service compliance.
        </p>
      </div>

      <Tabs defaultValue="fleet">
        <TabsList>
          <TabsTrigger value="fleet">Fleet</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="setup">Setup</TabsTrigger>
        </TabsList>
        <TabsContent value="fleet" className="mt-6">
          <FleetTab />
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
