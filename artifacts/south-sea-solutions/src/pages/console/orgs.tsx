import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Building2, Loader2, Plus, LogIn, ChevronRight, Trash2, Pencil, Save, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPlatformOrgs,
  getGetPlatformOrgsQueryKey,
  getGetPlatformOverviewQueryKey,
  useCreatePlatformOrg,
  useUpdatePlatformOrg,
  useDeletePlatformOrg,
  type PlatformOrg,
} from "@workspace/api-client-react";
import { ConsoleLayout } from "@/portal/ConsoleLayout";
import { useEnterOrg } from "@/portal/auth-hooks";
import { StatusPill } from "@/portal/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function CreateOrgForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const create = useCreatePlatformOrg({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPlatformOrgsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetPlatformOverviewQueryKey() });
        onDone();
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !region.trim()) return;
    create.mutate({ data: { name: name.trim(), region: region.trim() } });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border bg-card p-5">
      <h2 className="font-display text-base font-semibold">New organization</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="org-name">Name</Label>
          <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Transport" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="org-region">Region</Label>
          <Input id="org-region" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Gaborone, Botswana" required />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button type="submit" disabled={create.isPending} className="gap-1.5">
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function OrgRow({ org }: { org: PlatformOrg }) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const enterOrg = useEnterOrg();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(org.name);
  const [region, setRegion] = useState(org.region);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetPlatformOrgsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetPlatformOverviewQueryKey() });
  }

  const update = useUpdatePlatformOrg({ mutation: { onSuccess: invalidate } });
  const del = useDeletePlatformOrg({ mutation: { onSuccess: invalidate } });

  function toggleActive() {
    update.mutate({ id: org.id, data: { active: !org.active } });
  }

  function startEdit() {
    setName(org.name);
    setRegion(org.region);
    setEditing(true);
  }

  function saveEdit() {
    if (!name.trim() || !region.trim()) return;
    update.mutate(
      { id: org.id, data: { name: name.trim(), region: region.trim() } },
      { onSuccess: () => setEditing(false) },
    );
  }

  function handleDelete() {
    if (
      !window.confirm(
        `Delete ${org.name}? This permanently removes the org and all of its drivers, vehicles, users and records.`,
      )
    ) {
      return;
    }
    del.mutate({ id: org.id });
  }

  function handleEnter() {
    enterOrg.mutate({ data: { orgId: org.id } }, { onSuccess: () => setLocation("/portal/command") });
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-3 px-5 py-4">
        <div className="flex min-w-0 flex-1 flex-wrap gap-3">
          <div className="min-w-[12rem] flex-1 space-y-1">
            <Label htmlFor={`edit-name-${org.id}`} className="text-xs">
              Name
            </Label>
            <Input
              id={`edit-name-${org.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="min-w-[12rem] flex-1 space-y-1">
            <Label htmlFor={`edit-region-${org.id}`} className="text-xs">
              Region
            </Label>
            <Input
              id={`edit-region-${org.id}`}
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="h-8"
            />
          </div>
        </div>
        <Button size="sm" onClick={saveEdit} disabled={update.isPending} className="gap-1.5">
          {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={update.isPending} className="gap-1.5">
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link href={`/console/orgs/${org.id}`} className="text-sm font-medium hover:text-primary">
            {org.name}
          </Link>
          {org.active ? <StatusPill tone="green">Active</StatusPill> : <StatusPill tone="neutral">Disabled</StatusPill>}
        </div>
        <div className="text-xs text-muted-foreground">{org.region}</div>
      </div>
      <Button variant="outline" size="sm" onClick={startEdit} className="gap-1.5">
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </Button>
      <Button variant="outline" size="sm" onClick={toggleActive} disabled={update.isPending}>
        {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : org.active ? "Disable" : "Enable"}
      </Button>
      <Button variant="outline" size="sm" onClick={handleEnter} disabled={enterOrg.isPending || !org.active} className="gap-1.5">
        {enterOrg.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        Enter
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={del.isPending}
        className="gap-1.5 text-[#a8392e] hover:text-[#a8392e]"
      >
        {del.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </Button>
      <Link href={`/console/orgs/${org.id}`} className="text-muted-foreground transition-colors hover:text-foreground">
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default function ConsoleOrgsPage() {
  const [creating, setCreating] = useState(false);
  const { data, isLoading } = useGetPlatformOrgs({
    query: { queryKey: getGetPlatformOrgsQueryKey() },
  });

  return (
    <ConsoleLayout>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Organizations</h1>
          <p className="text-sm text-muted-foreground">Create, enable, enter or remove organizations.</p>
        </div>
        {!creating ? (
          <Button onClick={() => setCreating(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            New org
          </Button>
        ) : null}
      </div>

      {creating ? (
        <div className="mb-6">
          <CreateOrgForm onDone={() => setCreating(false)} />
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : data && data.length > 0 ? (
        <div className="rounded-2xl border bg-card">
          <div className="divide-y">
            {data.map((org) => (
              <OrgRow key={org.id} org={org} />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card px-5 py-16 text-center text-sm text-muted-foreground">
          <Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
          No organizations yet.
        </div>
      )}
    </ConsoleLayout>
  );
}
