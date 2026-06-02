import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, Webhook, Plus, Trash2, Loader2, Copy, Check, Terminal } from "lucide-react";
import {
  useGetApiKeys,
  getGetApiKeysQueryKey,
  useCreateApiKey,
  useRevokeApiKey,
  useGetWebhooks,
  getGetWebhooksQueryKey,
  useCreateWebhook,
  useDeleteWebhook,
  type ApiKeyCreated,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loading, Panel, Pill, EmptyRow, relativeTime } from "./shared";

const WEBHOOK_EVENTS = ["alert.raised", "geofence.breach", "fault.detected", "maintenance.due", "job.delivered", "behavior.event"];

function NewKeyDialog({ onCreated }: { onCreated: (k: ApiKeyCreated) => void }) {
  const queryClient = useQueryClient();
  const create = useCreateApiKey();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  function submit() {
    create.mutate(
      { data: { name } },
      {
        onSuccess: (k) => {
          queryClient.invalidateQueries({ queryKey: getGetApiKeysQueryKey() });
          onCreated(k);
          setOpen(false);
          setName("");
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> New key
        </Button>
      </DialogTrigger>
      <DialogContent className="aftrak sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New API key</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="ak-name">Label</Label>
            <Input id="ak-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Device gateway" />
          </div>
          <Button onClick={submit} disabled={create.isPending || !name} className="w-full">
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create key"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewWebhookDialog() {
  const queryClient = useQueryClient();
  const create = useCreateWebhook();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["alert.raised"]);

  function toggle(ev: string) {
    setEvents((prev) => (prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]));
  }

  function submit() {
    create.mutate(
      { data: { url, events } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetWebhooksQueryKey() });
          setOpen(false);
          setUrl("");
          setEvents(["alert.raised"]);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> New webhook
        </Button>
      </DialogTrigger>
      <DialogContent className="aftrak sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New webhook</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="wh-url">Endpoint URL</Label>
            <Input id="wh-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/hooks/aftrak" />
          </div>
          <div>
            <Label>Events</Label>
            <div className="mt-1 space-y-2">
              {WEBHOOK_EVENTS.map((ev) => (
                <label key={ev} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={events.includes(ev)} onCheckedChange={() => toggle(ev)} />
                  <span className="font-mono text-xs">{ev}</span>
                </label>
              ))}
            </div>
          </div>
          <Button onClick={submit} disabled={create.isPending || !url || events.length === 0} className="w-full">
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create webhook"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function KeyRevealDialog({ created, onClose }: { created: ApiKeyCreated; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard?.writeText(created.key);
    setCopied(true);
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="aftrak sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy your API key</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This is the only time the full key is shown. Store it somewhere safe.
        </p>
        <div className="flex items-center gap-2 rounded-xl border bg-secondary/30 p-3">
          <code className="min-w-0 flex-1 truncate font-mono text-sm">{created.key}</code>
          <Button size="icon" variant="ghost" onClick={copy}>
            {copied ? <Check className="h-4 w-4 text-[#2f7d5b]" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function IntegrationsTab() {
  const queryClient = useQueryClient();
  const { data: keys, isLoading } = useGetApiKeys();
  const { data: webhooks } = useGetWebhooks();
  const revoke = useRevokeApiKey();
  const delWebhook = useDeleteWebhook();
  const [revealed, setRevealed] = useState<ApiKeyCreated | null>(null);

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <Panel
        title="API keys"
        description="Authenticate device gateways and external systems to the ingest API."
        action={<NewKeyDialog onCreated={setRevealed} />}
      >
        {!keys || keys.length === 0 ? (
          <EmptyRow>No API keys. Create one to connect a device gateway.</EmptyRow>
        ) : (
          <div className="divide-y">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center gap-4 px-5 py-3">
                <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{k.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">{k.prefix}...</div>
                </div>
                <span className="hidden text-xs text-muted-foreground sm:block">
                  {k.lastUsedAt ? `Used ${relativeTime(k.lastUsedAt)}` : "Never used"}
                </span>
                {k.revoked ? (
                  <Pill tone="red">Revoked</Pill>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revoke.mutate({ id: k.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetApiKeysQueryKey() }) })}
                    disabled={revoke.isPending}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Webhooks" description="Receive signed event callbacks when things happen in your fleet." action={<NewWebhookDialog />}>
        {!webhooks || webhooks.length === 0 ? (
          <EmptyRow>No webhooks configured.</EmptyRow>
        ) : (
          <div className="divide-y">
            {webhooks.map((w) => (
              <div key={w.id} className="flex items-center gap-4 px-5 py-3">
                <Webhook className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{w.url}</div>
                  <div className="truncate font-mono text-xs text-muted-foreground">{w.events.join(", ")}</div>
                </div>
                {w.active ? <Pill tone="green">Active</Pill> : <Pill tone="neutral">Paused</Pill>}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => delWebhook.mutate({ id: w.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetWebhooksQueryKey() }) })}
                  disabled={delWebhook.isPending}
                  className="text-muted-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Device ingest" description="Push telemetry from any device gateway with a single authenticated endpoint.">
        <div className="space-y-3 px-5 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Terminal className="h-4 w-4" /> POST batches of pings to the ingest API:
          </div>
          <pre className="overflow-x-auto rounded-xl border bg-[#11201d] p-4 text-xs leading-relaxed text-[#d6e7e1]">
{`curl -X POST https://your-host/api/ingest/telemetry \\
  -H "x-api-key: aftrak_..." \\
  -H "content-type: application/json" \\
  -d '{
    "pings": [
      { "vehicleReg": "B 123 ABC", "lat": -24.65, "lng": 25.91,
        "speedKph": 82, "placeLabel": "A1 north",
        "recordedAt": "2026-06-02T09:00:00Z" }
    ]
  }'`}
          </pre>
        </div>
      </Panel>

      {revealed ? <KeyRevealDialog created={revealed} onClose={() => setRevealed(null)} /> : null}
    </div>
  );
}
