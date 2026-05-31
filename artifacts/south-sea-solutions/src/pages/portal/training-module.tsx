import { Link, useParams } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTrainingModule,
  getGetTrainingModuleQueryKey,
  useGetTrainingModules,
  getGetTrainingModulesQueryKey,
  useCompleteTrainingModule,
  useUncompleteTrainingModule,
  type TrainingModuleSection,
} from "@workspace/api-client-react";
import { TrainingLayout } from "@/portal/TrainingLayout";
import { Button } from "@/components/ui/button";
import { trainingIcon } from "./trainingIcons";

function Section({ section, index }: { section: TrainingModuleSection; index: number }) {
  return (
    <section className="border-t pt-6 first:border-t-0 first:pt-0">
      <h2 className="font-display text-lg font-semibold">
        <span className="mr-2 text-muted-foreground">{index + 1}.</span>
        {section.heading}
      </h2>
      {section.body ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{section.body}</p> : null}

      {section.steps ? (
        <ol className="mt-4 space-y-3">
          {section.steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                {i + 1}
              </span>
              <span className="pt-0.5 text-foreground">{step}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {section.bullets ? (
        <ul className="mt-4 space-y-2">
          {section.bullets.map((bullet, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-foreground">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {section.tip ? (
        <div className="mt-4 flex gap-2.5 rounded-xl border border-[#c6ddd3] bg-[#e3efe9] px-4 py-3 text-sm text-[#0f6e60]">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{section.tip}</span>
        </div>
      ) : null}

      {section.warning ? (
        <div className="mt-4 flex gap-2.5 rounded-xl border border-[#ecd9a8] bg-[#f8eed6] px-4 py-3 text-sm text-[#9a6712]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{section.warning}</span>
        </div>
      ) : null}
    </section>
  );
}

export default function TrainingModulePage() {
  const params = useParams();
  const slug = params.slug ?? "";
  const queryClient = useQueryClient();

  const { data: module, isLoading } = useGetTrainingModule(slug, {
    query: { queryKey: getGetTrainingModuleQueryKey(slug), enabled: slug.length > 0 },
  });
  const { data: list } = useGetTrainingModules({
    query: { queryKey: getGetTrainingModulesQueryKey() },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetTrainingModuleQueryKey(slug) });
    queryClient.invalidateQueries({ queryKey: getGetTrainingModulesQueryKey() });
  }

  const complete = useCompleteTrainingModule({ mutation: { onSuccess: invalidate } });
  const uncomplete = useUncompleteTrainingModule({ mutation: { onSuccess: invalidate } });
  const pending = complete.isPending || uncomplete.isPending;

  if (isLoading) {
    return (
      <TrainingLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </TrainingLayout>
    );
  }

  if (!module) {
    return (
      <TrainingLayout>
        <Link
          href="/training"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to training
        </Link>
        <div className="rounded-2xl border bg-card px-5 py-16 text-center text-sm text-muted-foreground">
          This training module could not be found.
        </div>
      </TrainingLayout>
    );
  }

  const Icon = trainingIcon(module.icon);
  const ordered = list?.modules ?? [];
  const index = ordered.findIndex((m) => m.slug === module.slug);
  const prev = index > 0 ? ordered[index - 1] : null;
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;

  function toggleComplete() {
    if (!module) return;
    if (module.completed) {
      uncomplete.mutate({ id: module.id });
    } else {
      complete.mutate({ id: module.id });
    }
  }

  return (
    <TrainingLayout>
      <Link
        href="/training"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to training
      </Link>

      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border bg-card p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Icon className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {module.category}
                </span>
                {module.completed ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#e3efe9] px-2.5 py-0.5 text-xs font-medium text-[#0f6e60]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Completed
                  </span>
                ) : null}
              </div>
              <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight">{module.title}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{module.summary}</p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {module.minutes} min read
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            {module.sections.map((section, i) => (
              <Section key={i} section={section} index={i} />
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between gap-3 border-t pt-6">
            <span className="text-sm text-muted-foreground">
              {module.completed
                ? "You have completed this module."
                : "Mark this module complete when you have finished reading."}
            </span>
            <Button
              variant={module.completed ? "outline" : "default"}
              onClick={toggleComplete}
              disabled={pending}
              className="shrink-0 gap-1.5"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : module.completed ? (
                <Circle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {module.completed ? "Mark as not complete" : "Mark as complete"}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {prev ? (
            <Link
              href={`/training/${prev.slug}`}
              className="flex items-center gap-2 rounded-2xl border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-secondary/30"
            >
              <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block text-xs text-muted-foreground">Previous</span>
                <span className="block truncate text-sm font-medium">{prev.title}</span>
              </span>
            </Link>
          ) : (
            <span className="hidden sm:block" />
          )}
          {next ? (
            <Link
              href={`/training/${next.slug}`}
              className="flex items-center justify-end gap-2 rounded-2xl border bg-card px-4 py-3 text-right transition-colors hover:border-primary/40 hover:bg-secondary/30"
            >
              <span className="min-w-0">
                <span className="block text-xs text-muted-foreground">Next</span>
                <span className="block truncate text-sm font-medium">{next.title}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ) : null}
        </div>
      </div>
    </TrainingLayout>
  );
}
