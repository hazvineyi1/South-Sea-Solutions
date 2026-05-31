import { useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Loader2, Plus, UserPlus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPlatformOrgs,
  getGetPlatformOrgsQueryKey,
  useGetPlatformOrgUsers,
  getGetPlatformOrgUsersQueryKey,
  useCreatePlatformOrgUser,
  useUpdatePlatformUser,
  type PlatformUser,
  type PlatformUserInputRole,
} from "@workspace/api-client-react";
import { ConsoleLayout } from "@/portal/ConsoleLayout";
import { StatusPill } from "@/portal/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROLES = ["OWNER", "DRIVER"] as const;

function CreateUserForm({ orgId, onDone }: { orgId: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<PlatformUserInputRole>("DRIVER");

  const create = useCreatePlatformOrgUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPlatformOrgUsersQueryKey(orgId) });
        onDone();
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;
    create.mutate({
      id: orgId,
      data: { name: name.trim(), email: email.trim(), password, role },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border bg-card p-5">
      <h2 className="font-display text-base font-semibold">New user</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="u-name">Name</Label>
          <Input id="u-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="u-email">Email</Label>
          <Input id="u-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="u-password">Temporary password</Label>
          <Input id="u-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="u-role">Role</Label>
          <select
            id="u-role"
            value={role}
            onChange={(e) => setRole(e.target.value as PlatformUserInputRole)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button type="submit" disabled={create.isPending} className="gap-1.5">
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Add user
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function UserRow({ orgId, user }: { orgId: string; user: PlatformUser }) {
  const queryClient = useQueryClient();
  const update = useUpdatePlatformUser({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetPlatformOrgUsersQueryKey(orgId) }),
    },
  });

  function toggleActive() {
    update.mutate({ id: user.id, data: { active: !user.active } });
  }

  function changeRole(role: PlatformUserInputRole) {
    if (role === user.role) return;
    update.mutate({ id: user.id, data: { role } });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{user.name}</span>
          {user.active ? <StatusPill tone="green">Active</StatusPill> : <StatusPill tone="neutral">Disabled</StatusPill>}
        </div>
        <div className="text-xs text-muted-foreground">{user.email}</div>
      </div>
      <select
        value={user.role}
        onChange={(e) => changeRole(e.target.value as PlatformUserInputRole)}
        disabled={update.isPending}
        className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <Button variant="outline" size="sm" onClick={toggleActive} disabled={update.isPending}>
        {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : user.active ? "Disable" : "Enable"}
      </Button>
    </div>
  );
}

export default function ConsoleOrgDetailPage() {
  const params = useParams();
  const orgId = params.id ?? "";
  const [creating, setCreating] = useState(false);

  const { data: orgs } = useGetPlatformOrgs({ query: { queryKey: getGetPlatformOrgsQueryKey() } });
  const org = orgs?.find((o) => o.id === orgId);

  const { data: users, isLoading } = useGetPlatformOrgUsers(orgId, {
    query: { queryKey: getGetPlatformOrgUsersQueryKey(orgId), enabled: orgId.length > 0 },
  });

  return (
    <ConsoleLayout>
      <Link
        href="/console/orgs"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to organizations
      </Link>

      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{org?.name ?? "Organization"}</h1>
          <p className="text-sm text-muted-foreground">{org?.region ?? "Manage users for this organization."}</p>
        </div>
        {!creating ? (
          <Button onClick={() => setCreating(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            New user
          </Button>
        ) : null}
      </div>

      {creating ? (
        <div className="mb-6">
          <CreateUserForm orgId={orgId} onDone={() => setCreating(false)} />
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : users && users.length > 0 ? (
        <div className="rounded-2xl border bg-card">
          <div className="divide-y">
            {users.map((u) => (
              <UserRow key={u.id} orgId={orgId} user={u} />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card px-5 py-16 text-center text-sm text-muted-foreground">
          No users in this organization yet.
        </div>
      )}
    </ConsoleLayout>
  );
}
