import { useState } from "react";
import { Link } from "wouter";
import { GraduationCap, Clock, ChevronRight } from "lucide-react";
import { PortalLayout } from "@/portal/PortalLayout";
import { StatusPill } from "@/portal/ui";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  trainingModules,
  TRAINING_CATEGORIES,
  audienceLabel,
  type Audience,
  type TrainingModule,
} from "./trainingContent";

type Filter = "ALL_ROLES" | "ADMIN" | "OPERATOR";

function matchesFilter(module: TrainingModule, filter: Filter): boolean {
  if (filter === "ALL_ROLES") return true;
  if (filter === "ADMIN") return module.audience === "ADMIN" || module.audience === "ALL";
  return module.audience === "OPERATOR" || module.audience === "ALL";
}

function audienceTone(audience: Audience) {
  if (audience === "ADMIN") return "teal" as const;
  if (audience === "OPERATOR") return "blue" as const;
  return "neutral" as const;
}

function ModuleCard({ module }: { module: TrainingModule }) {
  const Icon = module.icon;
  return (
    <Link
      href={`/portal/training/${module.slug}`}
      className="group flex flex-col rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-secondary/30"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
          <Icon className="h-5 w-5" />
        </span>
        <StatusPill tone={audienceTone(module.audience)}>{audienceLabel(module.audience)}</StatusPill>
      </div>
      <h3 className="mt-4 font-display text-base font-semibold leading-snug">{module.title}</h3>
      <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{module.summary}</p>
      <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {module.minutes} min read
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-primary">
          Start
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

export default function TrainingPage() {
  const [filter, setFilter] = useState<Filter>("ALL_ROLES");
  const visible = trainingModules.filter((m) => matchesFilter(m, filter));

  return (
    <PortalLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Training center</h1>
            <p className="text-sm text-muted-foreground">
              Learn how to run the Drivewise ELD system, from daily operations to hours-of-service compliance.
            </p>
          </div>
        </div>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          <TabsTrigger value="ALL_ROLES">All</TabsTrigger>
          <TabsTrigger value="ADMIN">For admins</TabsTrigger>
          <TabsTrigger value="OPERATOR">For operators</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-6 space-y-8">
        {TRAINING_CATEGORIES.map((category) => {
          const modules = visible.filter((m) => m.category === category);
          if (modules.length === 0) return null;
          return (
            <section key={category}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {category}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {modules.map((m) => (
                  <ModuleCard key={m.slug} module={m} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </PortalLayout>
  );
}
