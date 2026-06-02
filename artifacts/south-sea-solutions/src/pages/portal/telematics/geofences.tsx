import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus, Trash2, Loader2 } from "lucide-react";
import {
  useGetGeofences,
  getGetGeofencesQueryKey,
  useCreateGeofence,
  useDeleteGeofence,
  useGetGeofenceEvents,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loading, Panel, Pill, EmptyRow, humanize, relativeTime } from "./shared";

const KINDS = ["DEPOT", "CORRIDOR", "BORDER", "CUSTOMER", "NOGO"] as const;

function kindTone(kind: string) {
  return kind === "NOGO" ? "red" : kind === "BORDER" ? "blue" : kind === "CORRIDOR" ? "teal" : "neutral";
}

function CreateGeofence() {
  const queryClient = useQueryClient();
  const create = useCreateGeofence();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", kind: "CUSTOMER", centerLat: "-24.65", centerLng: "25.91", radiusM: "2000" });

  function submit() {
    create.mutate(
      {
        data: {
          name: form.name,
          kind: form.kind as (typeof KINDS)[number],
          centerLat: Number(form.centerLat),
          centerLng: Number(form.centerLng),
          radiusM: Number(form.radiusM),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetGeofencesQueryKey() });
          setOpen(false);
          setForm({ name: "", kind: "CUSTOMER", centerLat: "-24.65", centerLng: "25.91", radiusM: "2000" });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> New geofence
        </Button>
      </DialogTrigger>
      <DialogContent className="aftrak sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New geofence</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="gf-name">Name</Label>
            <Input id="gf-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Gaborone depot" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {humanize(k)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="gf-lat">Latitude</Label>
              <Input id="gf-lat" value={form.centerLat} onChange={(e) => setForm({ ...form, centerLat: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="gf-lng">Longitude</Label>
              <Input id="gf-lng" value={form.centerLng} onChange={(e) => setForm({ ...form, centerLng: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="gf-r">Radius m</Label>
              <Input id="gf-r" value={form.radiusM} onChange={(e) => setForm({ ...form, radiusM: e.target.value })} />
            </div>
          </div>
          <Button onClick={submit} disabled={create.isPending || !form.name} className="w-full">
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create geofence"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function GeofencesTab() {
  const queryClient = useQueryClient();
  const { data: fences, isLoading } = useGetGeofences();
  const { data: events } = useGetGeofenceEvents();
  const del = useDeleteGeofence();

  function remove(id: string) {
    del.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetGeofencesQueryKey() }) });
  }

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <Panel title="Geofences" description="Depots, corridors, borders and no-go zones. Breaches feed alerts." action={<CreateGeofence />}>
        {!fences || fences.length === 0 ? (
          <EmptyRow>No geofences yet. Create one to monitor corridors and no-go zones.</EmptyRow>
        ) : (
          <div className="divide-y">
            {fences.map((g) => (
              <div key={g.id} className="flex items-center gap-4 px-5 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                  <MapPin className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{g.name}</span>
                    <Pill tone={kindTone(g.kind)}>{humanize(g.kind)}</Pill>
                    {!g.active ? <Pill tone="neutral">Disabled</Pill> : null}
                  </div>
                  <div className="text-xs tabular-nums text-muted-foreground">
                    {g.centerLat.toFixed(4)}, {g.centerLng.toFixed(4)} · radius {g.radiusM.toLocaleString()} m
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => remove(g.id)} disabled={del.isPending} className="text-muted-foreground">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Recent crossings" description="Latest geofence enter and exit events across the fleet.">
        {!events || events.length === 0 ? (
          <EmptyRow>No crossings recorded.</EmptyRow>
        ) : (
          <div className="divide-y">
            {events.map((e) => (
              <div key={e.id} className="flex items-center gap-4 px-5 py-3">
                <Pill tone={e.type === "ENTER" ? "blue" : "neutral"}>{e.type}</Pill>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{e.geofenceName}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {e.driverName} ({e.vehicleReg})
                  </div>
                </div>
                <Pill tone={kindTone(e.geofenceKind)}>{humanize(e.geofenceKind)}</Pill>
                <span className="hidden text-xs text-muted-foreground sm:block">{relativeTime(e.recordedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
