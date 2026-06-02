import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Check, Mail, MessageSquare, Bell } from "lucide-react";
import {
  useGetAlertRules,
  getGetAlertRulesQueryKey,
  useUpdateAlertRule,
  type AlertRule,
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loading, Panel, EmptyRow, humanize } from "./shared";

const THRESHOLD_UNIT: Record<string, string> = {
  SPEEDING: "km/h",
  LOW_FUEL: "%",
  EXCESS_IDLE: "min",
  CERT_EXPIRY: "days",
  MAINTENANCE_DUE: "days",
};

function RuleRow({ rule }: { rule: AlertRule }) {
  const queryClient = useQueryClient();
  const update = useUpdateAlertRule();
  const [draft, setDraft] = useState<AlertRule>(rule);
  const [saved, setSaved] = useState(false);

  function save(patch: Partial<AlertRule>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    setSaved(false);
    update.mutate(
      {
        kind: rule.kind,
        data: {
          enabled: next.enabled,
          threshold: next.threshold,
          severity: next.severity as "LOW" | "MEDIUM" | "HIGH",
          notifyEmail: next.notifyEmail,
          notifySms: next.notifySms,
          notifyPush: next.notifyPush,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAlertRulesQueryKey() });
          setSaved(true);
        },
      },
    );
  }

  const unit = THRESHOLD_UNIT[rule.kind];

  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-4">
      <Switch checked={draft.enabled} onCheckedChange={(v) => save({ enabled: v })} />
      <div className="w-44 min-w-0">
        <div className="truncate text-sm font-medium">{humanize(rule.kind)}</div>
        <div className="text-xs text-muted-foreground">{rule.kind.toLowerCase().replace(/_/g, " ")}</div>
      </div>

      {draft.threshold !== null && unit ? (
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            className="h-8 w-20"
            value={draft.threshold ?? 0}
            onChange={(e) => setDraft({ ...draft, threshold: Number(e.target.value) })}
            onBlur={() => save({ threshold: draft.threshold })}
            disabled={!draft.enabled}
          />
          <span className="w-12 text-xs text-muted-foreground">{unit}</span>
        </div>
      ) : (
        <div className="w-[136px]" />
      )}

      <Select value={draft.severity} onValueChange={(v) => save({ severity: v })}>
        <SelectTrigger className="h-8 w-28" disabled={!draft.enabled}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {["LOW", "MEDIUM", "HIGH"].map((s) => (
            <SelectItem key={s} value={s}>
              {humanize(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="ml-auto flex items-center gap-3">
        <ChannelToggle icon={Mail} active={draft.notifyEmail} disabled={!draft.enabled} onClick={() => save({ notifyEmail: !draft.notifyEmail })} label="Email" />
        <ChannelToggle icon={MessageSquare} active={draft.notifySms} disabled={!draft.enabled} onClick={() => save({ notifySms: !draft.notifySms })} label="SMS" />
        <ChannelToggle icon={Bell} active={draft.notifyPush} disabled={!draft.enabled} onClick={() => save({ notifyPush: !draft.notifyPush })} label="Push" />
        <span className="w-5">
          {update.isPending ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : saved ? <Check className="h-4 w-4 text-[#2f7d5b]" /> : null}
        </span>
      </div>
    </div>
  );
}

function ChannelToggle({
  icon: Icon,
  active,
  disabled,
  onClick,
  label,
}: {
  icon: typeof Mail;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:opacity-40 ${
        active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary/50"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function AlertRulesTab() {
  const { data, isLoading } = useGetAlertRules();
  if (isLoading) return <Loading />;

  return (
    <Panel
      title="Alert rules"
      description="Choose which conditions raise an alert, tune the thresholds, set severity and pick notification channels."
    >
      {!data || data.length === 0 ? (
        <EmptyRow>No alert rules.</EmptyRow>
      ) : (
        <div className="divide-y">
          {data.map((r) => (
            <RuleRow key={r.kind} rule={r} />
          ))}
        </div>
      )}
    </Panel>
  );
}
