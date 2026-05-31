import { Link, useLocation } from "wouter";
import { Building2, Users, Truck, Car, BellRing, GraduationCap, Loader2, LogIn, ChevronRight } from "lucide-react";
import {
  useGetPlatformOverview,
  getGetPlatformOverviewQueryKey,
  type PlatformOrgStat,
} from "@workspace/api-client-react";
import { ConsoleLayout } from "@/portal/ConsoleLayout";
import { useEnterOrg } from "@/portal/auth-hooks";
import { StatusPill } from "@/portal/ui";
import { Button } from "@/components/ui/button";

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-2 font-display text-3xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

function OrgRow({ org }: { org: PlatformOrgStat }) {
  const enterOrg = useEnterOrg();
  const [, setLocation] = useLocation();

  function handleEnter() {
    enterOrg.mutate(
      { data: { orgId: org.id } },
      { onSuccess: () => setLocation("/portal/command") },
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link href={`/console/orgs/${org.id}`} className="text-sm font-medium hover:text-primary">
            {org.name}
          </Link>
          {org.active ? (
            <StatusPill tone="green">Active</StatusPill>
          ) : (
            <StatusPill tone="neutral">Disabled</StatusPill>
          )}
        </div>
        <div className="text-xs text-muted-foreground">{org.region}</div>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {org.users}
        </span>
        <span className="inline-flex items-center gap-1">
          <Truck className="h-3.5 w-3.5" />
          {org.drivers}
        </span>
        <span className="inline-flex items-center gap-1">
          <Car className="h-3.5 w-3.5" />
          {org.vehicles}
        </span>
        <span className="inline-flex items-center gap-1">
          <BellRing className="h-3.5 w-3.5" />
          {org.openAlerts}
        </span>
        <span className="inline-flex items-center gap-1">
          <GraduationCap className="h-3.5 w-3.5" />
          {org.trainingCompletionRate}%
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleEnter}
        disabled={enterOrg.isPending || !org.active}
        className="gap-1.5"
      >
        {enterOrg.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        Enter
      </Button>
      <Link
        href={`/console/orgs/${org.id}`}
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default function ConsoleOverviewPage() {
  const { data, isLoading } = useGetPlatformOverview({
    query: { queryKey: getGetPlatformOverviewQueryKey() },
  });

  return (
    <ConsoleLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">Platform overview</h1>
        <p className="text-sm text-muted-foreground">
          Every organization on Drivewise, with live counts and one-click access.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <StatCard icon={<Building2 className="h-4 w-4" />} label="Orgs" value={data.totals.orgs} />
            <StatCard icon={<Users className="h-4 w-4" />} label="Users" value={data.totals.users} />
            <StatCard icon={<Truck className="h-4 w-4" />} label="Drivers" value={data.totals.drivers} />
            <StatCard icon={<Car className="h-4 w-4" />} label="Vehicles" value={data.totals.vehicles} />
            <StatCard icon={<BellRing className="h-4 w-4" />} label="Open alerts" value={data.totals.openAlerts} />
            <StatCard icon={<GraduationCap className="h-4 w-4" />} label="Training done" value={`${data.totals.trainingCompletionRate}%`} />
          </div>

          <div className="mt-8 rounded-2xl border bg-card">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="font-display text-base font-semibold">Organizations</h2>
              <Link href="/console/orgs" className="text-sm font-medium text-primary hover:underline">
                Manage
              </Link>
            </div>
            <div className="divide-y">
              {data.orgs.map((org) => (
                <OrgRow key={org.id} org={org} />
              ))}
            </div>
          </div>
        </>
      ) : null}
    </ConsoleLayout>
  );
}
