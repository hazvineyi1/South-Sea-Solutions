import { Link } from "wouter";
import { GraduationCap, Clock, ChevronRight, CheckCircle2, Loader2 } from "lucide-react";
import {
  useGetTrainingModules,
  getGetTrainingModulesQueryKey,
  type TrainingModuleSummary,
} from "@workspace/api-client-react";
import { TrainingLayout } from "@/portal/TrainingLayout";
import { trainingIcon } from "./trainingIcons";

function ModuleCard({ module }: { module: TrainingModuleSummary }) {
  const Icon = trainingIcon(module.icon);
  return (
    <Link
      href={`/training/${module.slug}`}
      className="group flex flex-col rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-secondary/30"
    >
      <div className="flex items-start justify-between">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
          <Icon className="h-5 w-5" />
        </span>
        {module.completed ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e3efe9] px-2.5 py-1 text-xs font-medium text-[#0f6e60]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Done
          </span>
        ) : null}
      </div>
      <h3 className="mt-4 font-display text-base font-semibold leading-snug">{module.title}</h3>
      <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{module.summary}</p>
      <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {module.minutes} min read
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-primary">
          {module.completed ? "Review" : "Start"}
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

export default function TrainingPage() {
  const { data, isLoading } = useGetTrainingModules({
    query: { queryKey: getGetTrainingModulesQueryKey() },
  });

  const modules = data?.modules ?? [];
  const categories = Array.from(new Set(modules.map((m) => m.category)));

  return (
    <TrainingLayout>
      <div className="mb-8 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <GraduationCap className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold tracking-tight">Training center</h1>
          <p className="text-sm text-muted-foreground">
            Learn how to run the Drivewise ELD system, from daily operations to hours-of-service compliance.
          </p>
        </div>
        {data ? (
          <div className="hidden shrink-0 flex-col items-end sm:flex">
            <span className="font-display text-2xl font-bold tracking-tight">
              {data.completed}/{data.total}
            </span>
            <span className="text-xs text-muted-foreground">modules complete</span>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : modules.length === 0 ? (
        <div className="rounded-2xl border bg-card px-5 py-16 text-center text-sm text-muted-foreground">
          No training modules are available yet.
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map((category) => {
            const inCategory = modules.filter((m) => m.category === category);
            if (inCategory.length === 0) return null;
            return (
              <section key={category}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {category}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {inCategory.map((m) => (
                    <ModuleCard key={m.id} module={m} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </TrainingLayout>
  );
}
