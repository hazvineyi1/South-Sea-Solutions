import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Plus, Loader2, MessageSquare, ArrowRight } from "lucide-react";
import {
  useGetDispatchJobs,
  getGetDispatchJobsQueryKey,
  useCreateDispatchJob,
  useUpdateDispatchJob,
  useGetDispatchMessages,
  getGetDispatchMessagesQueryKey,
  useSendDispatchMessage,
  useGetVehicleRows,
  type DispatchJobItem,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loading, Panel, Pill, EmptyRow, humanize, relativeTime } from "./shared";

const STATUSES = ["DRAFT", "ASSIGNED", "EN_ROUTE", "DELIVERED", "CANCELLED"] as const;

function statusTone(s: string) {
  switch (s) {
    case "DELIVERED":
      return "green";
    case "EN_ROUTE":
      return "blue";
    case "ASSIGNED":
      return "teal";
    case "CANCELLED":
      return "red";
    default:
      return "neutral";
  }
}

function CreateJob() {
  const queryClient = useQueryClient();
  const create = useCreateDispatchJob();
  const { data: vehicles } = useGetVehicleRows();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ reference: "", origin: "", destination: "", driverId: "", vehicleId: "" });

  const drivers = (vehicles ?? []).filter((v) => v.driverId).map((v) => ({ id: v.driverId as string, name: v.driverName }));

  function submit() {
    create.mutate(
      {
        data: {
          reference: form.reference,
          origin: form.origin,
          destination: form.destination,
          driverId: form.driverId || undefined,
          vehicleId: form.vehicleId || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetDispatchJobsQueryKey() });
          setOpen(false);
          setForm({ reference: "", origin: "", destination: "", driverId: "", vehicleId: "" });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> New job
        </Button>
      </DialogTrigger>
      <DialogContent className="aftrak sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New dispatch job</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="dj-ref">Reference</Label>
            <Input id="dj-ref" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="LOAD-1042" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="dj-from">Origin</Label>
              <Input id="dj-from" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} placeholder="Gaborone" />
            </div>
            <div>
              <Label htmlFor="dj-to">Destination</Label>
              <Input id="dj-to" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="Francistown" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Driver</Label>
              <Select value={form.driverId} onValueChange={(v) => setForm({ ...form, driverId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vehicle</Label>
              <Select value={form.vehicleId} onValueChange={(v) => setForm({ ...form, vehicleId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
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
          </div>
          <Button onClick={submit} disabled={create.isPending || !form.reference || !form.origin || !form.destination} className="w-full">
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create job"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function JobThread({ job, onClose }: { job: DispatchJobItem; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: messages, isLoading } = useGetDispatchMessages(job.id, {
    query: { enabled: Boolean(job.id), queryKey: getGetDispatchMessagesQueryKey(job.id) },
  });
  const send = useSendDispatchMessage();
  const update = useUpdateDispatchJob();
  const [body, setBody] = useState("");

  function submit() {
    if (!body.trim()) return;
    send.mutate(
      { id: job.id, data: { body } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetDispatchMessagesQueryKey(job.id) });
          setBody("");
        },
      },
    );
  }

  function changeStatus(status: string) {
    update.mutate(
      { id: job.id, data: { status: status as (typeof STATUSES)[number] } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetDispatchJobsQueryKey() }) },
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="aftrak flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {job.reference}: {job.origin} to {job.destination}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{job.driverName ?? "Unassigned"}</span>
          <Select value={job.status} onValueChange={changeStatus}>
            <SelectTrigger className="ml-auto h-8 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {humanize(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-h-40 flex-1 space-y-2 overflow-y-auto rounded-xl border bg-secondary/20 p-3">
          {isLoading ? (
            <Loading />
          ) : !messages || messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.direction === "TO_DRIVER" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    m.direction === "TO_DRIVER" ? "bg-primary text-primary-foreground" : "bg-card"
                  }`}
                >
                  <div>{m.body}</div>
                  <div className={`mt-0.5 text-[10px] ${m.direction === "TO_DRIVER" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {relativeTime(m.sentAt)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {job.driverId ? (
          <div className="flex items-center gap-2">
            <Input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Message the driver"
            />
            <Button onClick={submit} disabled={send.isPending || !body.trim()} size="icon">
              {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground">Assign a driver to start messaging.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function DispatchTab() {
  const { data: jobs, isLoading } = useGetDispatchJobs();
  const [active, setActive] = useState<DispatchJobItem | null>(null);
  if (isLoading) return <Loading />;

  return (
    <>
      <Panel title="Dispatch board" description="Loads, assignments and driver messaging." action={<CreateJob />}>
        {!jobs || jobs.length === 0 ? (
          <EmptyRow>No jobs yet. Create a job to assign a load.</EmptyRow>
        ) : (
          <div className="divide-y">
            {jobs.map((j) => (
              <button
                key={j.id}
                onClick={() => setActive(j)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary/40"
              >
                <div className="w-24 shrink-0">
                  <div className="font-medium">{j.reference}</div>
                  <Pill tone={statusTone(j.status)}>{humanize(j.status)}</Pill>
                </div>
                <div className="hidden min-w-0 flex-1 items-center gap-2 text-sm text-muted-foreground sm:flex">
                  <span className="truncate">{j.origin}</span>
                  <ArrowRight className="h-4 w-4 shrink-0" />
                  <span className="truncate">{j.destination}</span>
                </div>
                <div className="min-w-0 flex-1 text-sm sm:flex-none sm:text-right">
                  <div className="truncate">{j.driverName ?? "Unassigned"}</div>
                  <div className="text-xs text-muted-foreground">{j.vehicleReg ?? "No vehicle"}</div>
                </div>
                <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
                  <MessageSquare className="h-4 w-4" />
                  {j.unreadMessages > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#bf463a] text-[10px] font-semibold text-white">
                      {j.unreadMessages}
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        )}
      </Panel>
      {active ? <JobThread job={active} onClose={() => setActive(null)} /> : null}
    </>
  );
}
