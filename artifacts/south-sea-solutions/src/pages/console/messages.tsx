import { Mail, Loader2, Trash2, MailOpen, Building2, Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPlatformMessages,
  getGetPlatformMessagesQueryKey,
  useUpdatePlatformMessage,
  useDeletePlatformMessage,
  type ContactMessage,
} from "@workspace/api-client-react";
import { ConsoleLayout } from "@/portal/ConsoleLayout";
import { StatusPill } from "@/portal/ui";
import { Button } from "@/components/ui/button";

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

function MessageCard({ message }: { message: ContactMessage }) {
  const queryClient = useQueryClient();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetPlatformMessagesQueryKey() });
  }

  const update = useUpdatePlatformMessage({ mutation: { onSuccess: invalidate } });
  const del = useDeletePlatformMessage({ mutation: { onSuccess: invalidate } });

  function toggleRead() {
    update.mutate({ id: message.id, data: { read: !message.read } });
  }

  function handleDelete() {
    if (!window.confirm(`Delete the inquiry from ${message.name}? This cannot be undone.`)) {
      return;
    }
    del.mutate({ id: message.id });
  }

  return (
    <div className={`px-5 py-4 ${message.read ? "" : "bg-primary/5"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{message.name}</span>
            {message.read ? (
              <StatusPill tone="neutral">Read</StatusPill>
            ) : (
              <StatusPill tone="green">New</StatusPill>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <a href={`mailto:${message.email}`} className="hover:text-primary">
              {message.email}
            </a>
            {message.organization ? (
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {message.organization}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(message.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleRead} disabled={update.isPending} className="gap-1.5">
            {update.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : message.read ? (
              <Mail className="h-4 w-4" />
            ) : (
              <MailOpen className="h-4 w-4" />
            )}
            {message.read ? "Mark unread" : "Mark read"}
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
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{message.message}</p>
    </div>
  );
}

export default function ConsoleMessagesPage() {
  const { data, isLoading } = useGetPlatformMessages({
    query: { queryKey: getGetPlatformMessagesQueryKey() },
  });

  const unread = data?.filter((m) => !m.read).length ?? 0;

  return (
    <ConsoleLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground">
          Contact inquiries submitted from the South Sea Solutions website.
          {unread > 0 ? ` ${unread} unread.` : ""}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : data && data.length > 0 ? (
        <div className="rounded-2xl border bg-card">
          <div className="divide-y">
            {data.map((message) => (
              <MessageCard key={message.id} message={message} />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card px-5 py-16 text-center text-sm text-muted-foreground">
          <Mail className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
          No inquiries yet.
        </div>
      )}
    </ConsoleLayout>
  );
}
