import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Wrench, Plus, Loader2, CalendarClock } from "lucide-react";
import {
  useGetMaintenanceBoard,
  getGetMaintenanceBoardQueryKey,
  useCreateWorkOrder,
  useUpdateWorkOrder,
  useGetVehicleRows,
} from "@workspace/api-client-react";
import { Metric } from "@/portal/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loading, Panel, Pill, EmptyRow, dueTone, humanize } from "./shared";

const NEXT_STATUS: Record<string, string> = { OPEN: "IN_PROGRESS", IN_PROGRESS: "DONE" };
const NEXT_LABEL: Record<string, string> = { OPEN: "Start", IN_PROGRESS: "Complete" };

function CreateWorkOrder() {
  const queryClient = useQueryClient();
  const create = useCreateWorkOrder();
  const { data: vehicles } = useGetVehicleRows();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ vehicleId: "", title: "", detail: "", priority: "MEDIUM" });

  function submit() {
    create.mutate(
      { data: { vehicleId: form.vehicleId, title: form.title, detail: form.detail || undefined, priority: form.priority as "LOW" | "MEDIUM" | "HIGH" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMaintenanceBoardQueryKey() });
          setOpen(false);
          setForm({ vehicleId: "", title: "", detail: "", priority: "MEDIUM" });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> New work order
        </Button>
      </DialogTrigger>
      <DialogContent className="aftrak sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New work order</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Vehicle</Label>
            <Select value={form.vehicleId} onValueChange={(v) => setForm({ ...form, vehicleId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles?.map((v) => (
                  <SelectItem key={v.vehicleId} value={v.vehicleId}>
                    {v.reg}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="wo-title">Title</Label>
            <Input id="wo-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Replace brake pads" />
          </div>
          <div>
            <Label htmlFor="wo-detail">Detail</Label>
            <Textarea id="wo-detail" value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["LOW", "MEDIUM", "HIGH"].map((p) => (
                  <SelectItem key={p} value={p}>
                    {humanize(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={submit} disabled={create.isPending || !form.vehicleId || !form.title} className="w-full">
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create work order"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MaintenanceTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetMaintenanceBoard();
  const update = useUpdateWorkOrder();

  function advance(id: string, status: string) {
    const next = NEXT_STATUS[status];
    if (!next) return;
    update.mutate(
      { id, data: { status: next as "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED" } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetMaintenanceBoardQueryKey() }) },
    );
  }

  if (isLoading) return <Loading />;
  if (!data) return <EmptyRow>No maintenance data.</EmptyRow>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Metric label="Overdue" value={data.overdue} hint="Past due" tone={data.overdue > 0 ? "red" : "green"} />
        <Metric label="Due soon" value={data.dueSoon} hint="Within window" tone={data.dueSoon > 0 ? "amber" : "green"} />
        <Metric label="Open work orders" value={data.openWorkOrders} hint="In the shop" tone="teal" />
      </div>

      <Panel title="Service due" description="Plans approaching or past their km or time interval.">
        {data.due.length === 0 ? (
          <EmptyRow>No service plans configured.</EmptyRow>
        ) : (
          <div className="divide-y">
            {data.due.map((d) => (
              <div key={d.planId} className="flex items-center gap-4 px-5 py-3">
                <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{d.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{d.vehicleReg}</div>
                </div>
                <div className="hidden text-xs tabular-nums text-muted-foreground sm:block">
                  {d.dueInKm != null ? `${d.dueInKm.toLocaleString()} km` : ""}
                  {d.dueInKm != null && d.dueInDays != null ? " / " : ""}
                  {d.dueInDays != null ? `${d.dueInDays} d` : ""}
                </div>
                <Pill tone={dueTone(d.state)}>{d.state.replace("_", " ")}</Pill>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Work orders" description="Track shop work from open to done." action={<CreateWorkOrder />}>
        {data.workOrders.length === 0 ? (
          <EmptyRow>No work orders. Create one to schedule repairs.</EmptyRow>
        ) : (
          <div className="divide-y">
            {data.workOrders.map((o) => (
              <div key={o.id} className="flex items-center gap-4 px-5 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary">
                  <Wrench className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{o.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {o.vehicleReg}
                    {o.costEstimate != null ? ` · est. P ${o.costEstimate.toLocaleString()}` : ""}
                  </div>
                </div>
                <Pill tone={o.priority === "HIGH" ? "red" : o.priority === "MEDIUM" ? "amber" : "neutral"}>{humanize(o.priority)}</Pill>
                <Pill tone={o.status === "DONE" ? "green" : o.status === "IN_PROGRESS" ? "amber" : "blue"}>{humanize(o.status)}</Pill>
                {NEXT_STATUS[o.status] ? (
                  <Button variant="outline" size="sm" onClick={() => advance(o.id, o.status)} disabled={update.isPending}>
                    {NEXT_LABEL[o.status]}
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
