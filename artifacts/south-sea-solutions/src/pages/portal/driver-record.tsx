import { Link, useParams } from "wouter";
import {
  ArrowLeft,
  Phone,
  MapPin,
  IdCard,
  ShieldCheck,
  Clock,
  GraduationCap,
  FileText,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  useGetDriverRecord,
  getGetDriverRecordQueryKey,
  type DriverRecord,
  type Clock as HosClock,
} from "@workspace/api-client-react";
import { PortalLayout } from "@/portal/PortalLayout";
import { StatusPill, statusTone } from "@/portal/ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function mins(n: number): string {
  const h = Math.floor(n / 60);
  const m = n % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function ClockCard({ label, clock }: { label: string; clock: HosClock }) {
  const pct = Math.min(100, Math.round((clock.usedMins / clock.limitMins) * 100));
  const barColor =
    clock.status === "EXCEEDED" ? "#bf463a" : clock.status === "WARNING" ? "#c4861f" : "#0f6e60";
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <StatusPill tone={statusTone(clock.status)}>{clock.status}</StatusPill>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#e8e3d8]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{mins(clock.usedMins)} used</span>
        <span>{mins(clock.remainingMins)} left</span>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

export function DriverRecordView({ record }: { record: DriverRecord }) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary font-display text-xl font-bold text-secondary-foreground">
              {record.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">{record.name}</h1>
              <p className="text-sm text-muted-foreground">
                {record.employeeNo} · {record.homeDepot}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={statusTone(record.status)}>{record.status}</StatusPill>
            <StatusPill tone={statusTone(record.certification.status)}>
              {record.certification.status}
            </StatusPill>
            <StatusPill tone={statusTone(record.hours.status)}>Hours {record.hours.status}</StatusPill>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl bg-secondary/50 p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Safety score</div>
            <div className="font-display text-2xl font-bold">{record.safetyScore}</div>
          </div>
          <div className="rounded-xl bg-secondary/50 p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">On time</div>
            <div className="font-display text-2xl font-bold">{record.onTimePct}%</div>
          </div>
          <div className="rounded-xl bg-secondary/50 p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Vehicle</div>
            <div className="font-display text-lg font-bold">{record.currentVehicleReg ?? "--"}</div>
          </div>
          <div className="rounded-xl bg-secondary/50 p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Fuel</div>
            <div className="font-display text-2xl font-bold">{record.fuelPct ?? "--"}%</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <IdCard className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="hours" className="gap-1.5">
            <Clock className="h-4 w-4" /> Hours
          </TabsTrigger>
          <TabsTrigger value="safety" className="gap-1.5">
            <ShieldCheck className="h-4 w-4" /> Safety
          </TabsTrigger>
          <TabsTrigger value="training" className="gap-1.5">
            <GraduationCap className="h-4 w-4" /> Training
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5">
            <FileText className="h-4 w-4" /> Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="font-display text-base font-semibold">Contact</h3>
              <div className="mt-2 divide-y">
                <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={record.phone ?? "Not on file"} />
                <InfoRow icon={<MapPin className="h-4 w-4" />} label="Location" value={record.placeLabel ?? "Unknown"} />
                <InfoRow icon={<ShieldCheck className="h-4 w-4" />} label="Emergency contact" value={record.emergencyContact ?? "Not on file"} />
              </div>
            </div>
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="font-display text-base font-semibold">Licence</h3>
              <div className="mt-2 divide-y">
                <InfoRow icon={<IdCard className="h-4 w-4" />} label="Licence number" value={record.licenceNo ?? "Not on file"} />
                <InfoRow icon={<IdCard className="h-4 w-4" />} label="Class" value={record.licenceClass ?? "n/a"} />
                <InfoRow
                  icon={<ShieldCheck className="h-4 w-4" />}
                  label="Professional permit"
                  value={record.prdp ? "Held" : "Not held"}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="hours" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <ClockCard label="Continuous" clock={record.hours.continuous} />
            <ClockCard label="Daily" clock={record.hours.daily} />
            <ClockCard label="Weekly" clock={record.hours.weekly} />
          </div>
        </TabsContent>

        <TabsContent value="safety" className="mt-6">
          <div className="rounded-2xl border bg-card">
            <div className="border-b px-5 py-4">
              <h3 className="font-display text-base font-semibold">Incidents</h3>
            </div>
            {record.incidents.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                No incidents on record.
              </div>
            ) : (
              <div className="divide-y">
                {record.incidents.map((i) => (
                  <div key={i.id} className="flex items-center gap-3 px-5 py-4">
                    <AlertTriangle className="h-5 w-5 text-[#9a6712]" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{i.type}</span>
                        <StatusPill tone={statusTone(i.severity)}>{i.severity}</StatusPill>
                      </div>
                      <div className="text-sm text-muted-foreground">{i.detail ?? "No further detail."}</div>
                    </div>
                    <span className="text-xs text-muted-foreground">{i.occurredAt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="training" className="mt-6">
          <div className="rounded-2xl border bg-card">
            <div className="border-b px-5 py-4">
              <h3 className="font-display text-base font-semibold">Drivewise courses</h3>
            </div>
            <div className="divide-y">
              {record.courses.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-5 py-4">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{c.title}</div>
                    {c.completedOn ? (
                      <div className="text-xs text-muted-foreground">
                        Completed {c.completedOn}
                        {typeof c.score === "number" ? ` · scored ${c.score}%` : ""}
                      </div>
                    ) : null}
                  </div>
                  <StatusPill tone={statusTone(c.status)}>{c.status.replace(/_/g, " ")}</StatusPill>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <div className="rounded-2xl border bg-card">
            <div className="border-b px-5 py-4">
              <h3 className="font-display text-base font-semibold">Documents and validity</h3>
            </div>
            <div className="divide-y">
              {record.documents.map((d) => (
                <div key={d.id} className="flex items-center gap-3 px-5 py-4">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{d.label}</div>
                    <div className="text-xs text-muted-foreground">Expires {d.expiresOn ?? "n/a"}</div>
                  </div>
                  <StatusPill tone={statusTone(d.state)}>{d.state}</StatusPill>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function DriverRecordPage() {
  const params = useParams();
  const id = params.id ?? "";
  const { data, isLoading, isError } = useGetDriverRecord(id, {
    query: { queryKey: getGetDriverRecordQueryKey(id), enabled: Boolean(id), retry: false },
  });

  return (
    <PortalLayout>
      <Link href="/portal" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to portal
      </Link>
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : isError || !data ? (
        <div className="rounded-2xl border bg-card px-5 py-16 text-center text-sm text-muted-foreground">
          This driver record could not be loaded.
        </div>
      ) : (
        <DriverRecordView record={data} />
      )}
    </PortalLayout>
  );
}
