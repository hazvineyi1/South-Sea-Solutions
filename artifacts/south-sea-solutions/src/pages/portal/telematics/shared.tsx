import { type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { StatusPill } from "@/portal/ui";

type Tone = "green" | "amber" | "red" | "blue" | "neutral" | "teal";

// Maps a 0-100 score to a tone band used across the telematics views.
export function scoreTone(score: number): Tone {
  if (score >= 85) return "green";
  if (score >= 70) return "amber";
  return "red";
}

export function dueTone(state: string): Tone {
  switch (state) {
    case "OVERDUE":
      return "red";
    case "DUE_SOON":
      return "amber";
    default:
      return "green";
  }
}

export function eventTone(severity: string): Tone {
  return severity === "HIGH" ? "red" : severity === "MEDIUM" ? "amber" : "blue";
}

export function humanize(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "No data";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} d ago`;
}

// A horizontal score meter with a label and the numeric value.
export function ScoreBar({ score }: { score: number }) {
  const tone = scoreTone(score);
  const color = tone === "green" ? "#0f6e60" : tone === "amber" ? "#c4861f" : "#bf463a";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#e8e3d8]">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums">{score}</span>
    </div>
  );
}

export function ScoreDial({ score, label }: { score: number; label: string }) {
  const tone = scoreTone(score);
  const color = tone === "green" ? "#0f6e60" : tone === "amber" ? "#c4861f" : "#bf463a";
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-3 flex items-end gap-2">
        <span className="font-display text-4xl font-bold leading-none" style={{ color }}>
          {score}
        </span>
        <span className="mb-1 text-sm text-muted-foreground">/ 100</span>
      </div>
      <div className="mt-3">
        <ScoreBar score={score} />
      </div>
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return <div className="px-5 py-10 text-center text-sm text-muted-foreground">{children}</div>;
}

// A simple, dependency-free horizontal bar list for analytics breakdowns.
export function BarList({
  items,
  unit,
  tone = "teal",
}: {
  items: { label: string; value: number }[];
  unit?: string;
  tone?: Tone;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const color =
    tone === "green" ? "#0f6e60" : tone === "blue" ? "#2c6ea3" : tone === "amber" ? "#c4861f" : "#0f6e60";
  if (!items.length) return <EmptyRow>No data for this period.</EmptyRow>;
  return (
    <div className="space-y-3 px-5 py-4">
      {items.map((i) => (
        <div key={i.label} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate">{i.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {i.value.toLocaleString()}
              {unit ? ` ${unit}` : ""}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#e8e3d8]">
            <div className="h-full rounded-full" style={{ width: `${(i.value / max) * 100}%`, backgroundColor: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <StatusPill tone={tone}>{children}</StatusPill>;
}
