import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "green" | "amber" | "red" | "blue" | "neutral" | "teal";

const TONES: Record<Tone, string> = {
  green: "bg-[#e4f2ea] text-[#2f7d5b] border-[#bfe0cd]",
  amber: "bg-[#f8eed6] text-[#9a6712] border-[#ecd9a8]",
  red: "bg-[#f6e0dd] text-[#a8392e] border-[#e8c0ba]",
  blue: "bg-[#e0edf8] text-[#2c6ea3] border-[#bcd6ec]",
  teal: "bg-[#e3efe9] text-[#0f6e60] border-[#c6ddd3]",
  neutral: "bg-[#efece3] text-[#5c6b66] border-[#e1dccf]",
};

export function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

export function statusTone(status: string): Tone {
  switch (status) {
    case "OK":
    case "VALID":
    case "CERTIFIED":
    case "DONE":
      return "green";
    case "WARNING":
    case "EXPIRING":
    case "IN_PROGRESS":
    case "IDLING":
      return "amber";
    case "EXCEEDED":
    case "EXPIRED":
    case "LAPSED":
    case "SUSPENDED":
      return "red";
    case "MOVING":
      return "blue";
    default:
      return "neutral";
  }
}

export function severityTone(severity: string): Tone {
  switch (severity) {
    case "HIGH":
      return "red";
    case "MEDIUM":
      return "amber";
    default:
      return "blue";
  }
}

export function Metric({
  label,
  value,
  hint,
  tone = "teal",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-display text-3xl font-bold leading-none text-foreground">{value}</span>
      </div>
      {hint ? <div className="mt-1.5"><StatusPill tone={tone}>{hint}</StatusPill></div> : null}
    </div>
  );
}

export function FuelBar({ pct }: { pct: number }) {
  const tone = pct <= 15 ? "#bf463a" : pct <= 30 ? "#c4861f" : "#0f6e60";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-[#e8e3d8]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: tone }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}
