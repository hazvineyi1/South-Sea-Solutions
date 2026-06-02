import { useState } from "react";
import { Activity, Thermometer, BatteryMedium, Gauge, Droplet, Wrench, AlertTriangle, ChevronRight } from "lucide-react";
import {
  useGetVehicleHealthRows,
  useGetVehicleHealthDetail,
  getGetVehicleHealthDetailQueryKey,
} from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loading, Panel, Pill, EmptyRow, ScoreBar, scoreTone, dueTone, relativeTime } from "./shared";

function reading(value: number | null | undefined, suffix: string): string {
  return value === null || value === undefined ? "--" : `${value}${suffix}`;
}

function HealthDetail({ vehicleId, onClose }: { vehicleId: string; onClose: () => void }) {
  const { data, isLoading } = useGetVehicleHealthDetail(vehicleId, {
    query: { enabled: Boolean(vehicleId), queryKey: getGetVehicleHealthDetailQueryKey(vehicleId) },
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="aftrak max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{data ? `${data.reg} diagnostics` : "Vehicle diagnostics"}</DialogTitle>
        </DialogHeader>
        {isLoading || !data ? (
          <Loading />
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Pill tone={scoreTone(data.healthScore)}>Health {data.healthScore}</Pill>
              {data.milOn ? <Pill tone="red">Check engine</Pill> : <Pill tone="green">No MIL</Pill>}
              <span className="text-xs text-muted-foreground">{relativeTime(data.recordedAt)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Reading icon={Thermometer} label="Engine temp" value={reading(data.engineTempC, " C")} />
              <Reading icon={Thermometer} label="Coolant" value={reading(data.coolantTempC, " C")} />
              <Reading icon={Gauge} label="Oil pressure" value={reading(data.oilPressureKpa, " kPa")} />
              <Reading icon={Droplet} label="Oil life" value={reading(data.oilLifePct, "%")} />
              <Reading icon={BatteryMedium} label="Battery" value={reading(data.batteryV, " V")} />
              <Reading icon={Gauge} label="Tyre pressure" value={reading(data.tirePressureKpa, " kPa")} />
              <Reading icon={Droplet} label="DEF level" value={reading(data.defLevelPct, "%")} />
              <Reading icon={Activity} label="Engine hours" value={reading(data.engineHours, " h")} />
              <Reading icon={Gauge} label="Odometer" value={data.odometerKm ? `${data.odometerKm.toLocaleString()} km` : "--"} />
            </div>

            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4" /> Fault codes
              </h3>
              {data.faults.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active diagnostic trouble codes.</p>
              ) : (
                <div className="divide-y rounded-xl border">
                  {data.faults.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="font-mono text-sm font-medium">{f.code}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{f.description}</div>
                        <div className="text-xs text-muted-foreground">{f.system}</div>
                      </div>
                      <Pill tone={f.severity === "HIGH" ? "red" : f.severity === "MEDIUM" ? "amber" : "blue"}>
                        {f.severity}
                      </Pill>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Wrench className="h-4 w-4" /> Maintenance
              </h3>
              {data.plans.length === 0 ? (
                <p className="text-sm text-muted-foreground">No service plans configured.</p>
              ) : (
                <div className="divide-y rounded-xl border">
                  {data.plans.map((p) => (
                    <div key={p.planId} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.dueInKm != null ? `${p.dueInKm.toLocaleString()} km` : ""}
                          {p.dueInKm != null && p.dueInDays != null ? " / " : ""}
                          {p.dueInDays != null ? `${p.dueInDays} days` : ""}
                        </div>
                      </div>
                      <Pill tone={dueTone(p.state)}>{p.state.replace("_", " ")}</Pill>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Reading({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-secondary/30 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 font-display text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export function HealthTab() {
  const { data, isLoading } = useGetVehicleHealthRows();
  const [selected, setSelected] = useState<string | null>(null);
  if (isLoading) return <Loading />;

  return (
    <>
      <Panel
        title="Engine health and diagnostics"
        description="Live ECU readings, fault codes and service status for every vehicle. Worst first."
      >
        {!data || data.length === 0 ? (
          <EmptyRow>No vehicle health telemetry yet.</EmptyRow>
        ) : (
          <div className="divide-y">
            {data.map((v) => (
              <button
                key={v.vehicleId}
                onClick={() => setSelected(v.vehicleId)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary/40"
              >
                <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary sm:flex">
                  <Activity className="h-5 w-5" />
                </span>
                <div className="w-28 shrink-0">
                  <div className="font-medium">{v.reg}</div>
                  <div className="truncate text-xs text-muted-foreground">{v.driverName}</div>
                </div>
                <div className="hidden w-40 sm:block">
                  <ScoreBar score={v.healthScore} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {v.milOn ? <Pill tone="red">Check engine</Pill> : null}
                  {v.activeFaults > 0 ? <Pill tone="amber">{v.activeFaults} fault{v.activeFaults === 1 ? "" : "s"}</Pill> : null}
                  {v.nextServiceInKm != null && v.nextServiceInKm < 0 ? <Pill tone="red">Service overdue</Pill> : null}
                </div>
                <div className="ml-auto hidden items-center gap-4 text-sm tabular-nums text-muted-foreground lg:flex">
                  <span className="flex items-center gap-1"><Thermometer className="h-4 w-4" />{reading(v.engineTempC, " C")}</span>
                  <span className="flex items-center gap-1"><BatteryMedium className="h-4 w-4" />{reading(v.batteryV, " V")}</span>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </Panel>
      {selected ? <HealthDetail vehicleId={selected} onClose={() => setSelected(null)} /> : null}
    </>
  );
}
