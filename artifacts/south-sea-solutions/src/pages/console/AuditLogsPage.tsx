import { ScrollText, Loader2 } from "lucide-react";
import {
  useGetPlatformAuditLogs,
  getGetPlatformAuditLogsQueryKey,
  type AuditLogEntry,
} from "@workspace/api-client-react";
import { ConsoleLayout } from "@/portal/ConsoleLayout";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

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

// Builds the detail cell from the structured fields. We have a subject type and
// id rather than a free-form detail blob, so present them as a small JSON object
// (the spec calls for JSON-stringified detail when there is no plain string).
function detailText(entry: AuditLogEntry): string {
  return JSON.stringify({ subjectType: entry.subjectType, subjectId: entry.subjectId });
}

export default function AuditLogsPage() {
  const { data, isLoading } = useGetPlatformAuditLogs(
    { limit: LIMIT },
    { query: { queryKey: getGetPlatformAuditLogsQueryKey({ limit: LIMIT }) } },
  );

  return (
    <ConsoleLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">Audit Logs</h1>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(entry.at)}
                  </TableCell>
                  <TableCell className="font-medium">{entry.actorEmail ?? "Unknown actor"}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs">{entry.action}</span>
                  </TableCell>
                  <TableCell>{entry.orgName ?? "Unknown org"}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {detailText(entry)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
