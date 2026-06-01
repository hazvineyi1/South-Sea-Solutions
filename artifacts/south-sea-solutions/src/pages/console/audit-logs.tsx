import { ScrollText, Loader2, KeyRound, LogIn, FileText, Activity } from "lucide-react";
import {
  useGetPlatformAuditLogs,
  getGetPlatformAuditLogsQueryKey,
  type AuditLogEntry,
} from "@workspace/api-client-react";
import { ConsoleLayout } from "@/portal/ConsoleLayout";
import { StatusPill } from "@/portal/ui";

// How many entries to request. The endpoint caps at 200.
const LIMIT = 100;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Maps a raw action code to a human label, a pill tone, and an icon.
function describeAction(action: string): {
  label: string;
  tone: "red" | "blue" | "teal" | "neutral";
  Icon: typeof Activity;
} {
  switch (action) {
    case "RESET_PASSWORD":
      return { label: "Password reset", tone: "red", Icon: KeyRound };
    case "ENTER_ORG":
      return { label: "Entered org", tone: "blue", Icon: LogIn };
    case "READ_DRIVER":
      return { label: "Read driver record", tone: "teal", Icon: FileText };
    default:
      return { label: action, tone: "neutral", Icon: Activity };
  }
}

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const { label, tone, Icon } = describeAction(entry.action);
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={tone}>
            <Icon className="h-3.5 w-3.5" />
            {label}
          </StatusPill>
          <span className="text-sm text-muted-foreground">
            {entry.subjectType}
            <span className="text-foreground/40"> : </span>
            <span className="font-mono text-xs">{entry.subjectId}</span>
          </span>
        </div>
        <div className="mt-1.5 text-sm">
          <span className="font-medium">{entry.actorEmail ?? "Unknown actor"}</span>
          <span className="text-muted-foreground"> in </span>
          <span className="font-medium">{entry.orgName ?? "Unknown org"}</span>
        </div>
      </div>
      <span className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(entry.at)}</span>
    </div>
  );
}

export default function ConsoleAuditLogsPage() {
  const { data, isLoading } = useGetPlatformAuditLogs(
    { limit: LIMIT },
    { query: { queryKey: getGetPlatformAuditLogsQueryKey({ limit: LIMIT }) } },
  );

  return (
    <ConsoleLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          Sensitive platform actions (password resets, org impersonation, driver-record reads) across every
          organization, newest first.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : data && data.length > 0 ? (
        <div className="rounded-2xl border bg-card">
          <div className="divide-y">
            {data.map((entry) => (
              <AuditRow key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card px-5 py-16 text-center text-sm text-muted-foreground">
          <ScrollText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
          No audit activity yet.
        </div>
      )}
    </ConsoleLayout>
  );
}
