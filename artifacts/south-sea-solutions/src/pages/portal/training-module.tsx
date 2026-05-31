import { Link, useParams } from "wouter";
import { ArrowLeft, ArrowRight, Clock, Lightbulb, AlertTriangle } from "lucide-react";
import { PortalLayout } from "@/portal/PortalLayout";
import { StatusPill } from "@/portal/ui";
import {
  trainingModules,
  getTrainingModule,
  audienceLabel,
  type Audience,
  type TrainingSection,
} from "./trainingContent";

function audienceTone(audience: Audience) {
  if (audience === "ADMIN") return "teal" as const;
  if (audience === "OPERATOR") return "blue" as const;
  return "neutral" as const;
}

function Section({ section, index }: { section: TrainingSection; index: number }) {
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
  const module = getTrainingModule(slug);

  if (!module) {
    return (
      <PortalLayout>
        <Link
          href="/portal/training"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to training
        </Link>
        <div className="rounded-2xl border bg-card px-5 py-16 text-center text-sm text-muted-foreground">
          This training module could not be found.
        </div>
      </PortalLayout>
    );
  }

  const Icon = module.icon;
  const index = trainingModules.findIndex((m) => m.slug === module.slug);
  const prev = index > 0 ? trainingModules[index - 1] : null;
  const next = index < trainingModules.length - 1 ? trainingModules[index + 1] : null;

  return (
    <PortalLayout>
      <Link
        href="/portal/training"
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
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {module.category}
                </span>
                <StatusPill tone={audienceTone(module.audience)}>{audienceLabel(module.audience)}</StatusPill>
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
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {prev ? (
            <Link
              href={`/portal/training/${prev.slug}`}
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
              href={`/portal/training/${next.slug}`}
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
    </PortalLayout>
  );
}
