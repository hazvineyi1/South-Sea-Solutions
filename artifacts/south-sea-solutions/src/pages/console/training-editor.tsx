import { useState } from "react";
import { ArrowLeft, Loader2, Plus, Trash2, Save } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetPlatformTrainingModulesQueryKey,
  useCreatePlatformTrainingModule,
  useUpdatePlatformTrainingModule,
  type TrainingModuleDetail,
  type TrainingModuleSection,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TRAINING_ICON_NAMES } from "@/pages/portal/trainingIcons";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function linesToArray(value: string): string[] | undefined {
  const items = value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function arrayToLines(value?: string[]): string {
  return value && value.length > 0 ? value.join("\n") : "";
}

interface DraftSection {
  heading: string;
  body: string;
  steps: string;
  bullets: string;
  tip: string;
  warning: string;
}

function toDraft(section: TrainingModuleSection): DraftSection {
  return {
    heading: section.heading,
    body: section.body ?? "",
    steps: arrayToLines(section.steps),
    bullets: arrayToLines(section.bullets),
    tip: section.tip ?? "",
    warning: section.warning ?? "",
  };
}

function fromDraft(draft: DraftSection): TrainingModuleSection {
  return {
    heading: draft.heading.trim(),
    body: draft.body.trim() ? draft.body.trim() : null,
    steps: linesToArray(draft.steps),
    bullets: linesToArray(draft.bullets),
    tip: draft.tip.trim() ? draft.tip.trim() : null,
    warning: draft.warning.trim() ? draft.warning.trim() : null,
  };
}

const EMPTY_SECTION: DraftSection = { heading: "", body: "", steps: "", bullets: "", tip: "", warning: "" };

export function ModuleEditor({
  module,
  onClose,
}: {
  module: TrainingModuleDetail | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = module !== null;

  const [title, setTitle] = useState(module?.title ?? "");
  const [slug, setSlug] = useState(module?.slug ?? "");
  const [summary, setSummary] = useState(module?.summary ?? "");
  const [category, setCategory] = useState(module?.category ?? "");
  const [icon, setIcon] = useState(module?.icon ?? TRAINING_ICON_NAMES[0]);
  const [minutes, setMinutes] = useState(module?.minutes ?? 5);
  const [sections, setSections] = useState<DraftSection[]>(
    module ? module.sections.map(toDraft) : [{ ...EMPTY_SECTION }],
  );
  const [error, setError] = useState<string | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetPlatformTrainingModulesQueryKey() });
    onClose();
  }

  const create = useCreatePlatformTrainingModule({ mutation: { onSuccess: invalidate } });
  const update = useUpdatePlatformTrainingModule({ mutation: { onSuccess: invalidate } });
  const pending = create.isPending || update.isPending;

  function updateSection(index: number, patch: Partial<DraftSection>) {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addSection() {
    setSections((prev) => [...prev, { ...EMPTY_SECTION }]);
  }

  function removeSection(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const finalSlug = (slug.trim() || slugify(title)).trim();
    if (!title.trim() || !finalSlug || !category.trim() || !icon.trim()) {
      setError("Title, slug, category and icon are required.");
      return;
    }
    const cleanSections = sections
      .filter((s) => s.heading.trim())
      .map(fromDraft);
    if (cleanSections.length === 0) {
      setError("Add at least one section with a heading.");
      return;
    }

    const data = {
      slug: finalSlug,
      title: title.trim(),
      summary: summary.trim(),
      category: category.trim(),
      icon: icon.trim(),
      minutes: Number(minutes) || 1,
      sections: cleanSections,
    };

    if (isEdit && module) {
      update.mutate({ id: module.id, data: { ...data, ordinal: module.ordinal } });
    } else {
      create.mutate({ data });
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <button
        type="button"
        onClick={onClose}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to training content
      </button>

      <div className="mb-6 flex items-start justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {isEdit ? "Edit module" : "New module"}
        </h1>
        <Button type="submit" disabled={pending} className="gap-1.5">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEdit ? "Save changes" : "Create module"}
        </Button>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border bg-card p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="m-title">Title</Label>
              <Input
                id="m-title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!isEdit && !slug) setSlug(slugify(e.target.value));
                }}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-slug">Slug</Label>
              <Input id="m-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto from title" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="m-summary">Summary</Label>
              <Input id="m-summary" value={summary} onChange={(e) => setSummary(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-category">Category</Label>
              <Input id="m-category" value={category} onChange={(e) => setCategory(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-icon">Icon</Label>
              <select
                id="m-icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                {TRAINING_ICON_NAMES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-minutes">Minutes</Label>
              <Input
                id="m-minutes"
                type="number"
                min={1}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {sections.map((section, i) => (
          <div key={i} className="rounded-2xl border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold">Section {i + 1}</h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeSection(i)}
                disabled={sections.length === 1}
                className="gap-1.5 text-[#a8392e] hover:text-[#a8392e]"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Heading</Label>
                <Input value={section.heading} onChange={(e) => updateSection(i, { heading: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Body</Label>
                <Textarea
                  value={section.body}
                  onChange={(e) => updateSection(i, { body: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Steps (one per line)</Label>
                  <Textarea value={section.steps} onChange={(e) => updateSection(i, { steps: e.target.value })} rows={3} />
                </div>
                <div className="space-y-1.5">
                  <Label>Bullets (one per line)</Label>
                  <Textarea
                    value={section.bullets}
                    onChange={(e) => updateSection(i, { bullets: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Tip</Label>
                  <Input value={section.tip} onChange={(e) => updateSection(i, { tip: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Warning</Label>
                  <Input value={section.warning} onChange={(e) => updateSection(i, { warning: e.target.value })} />
                </div>
              </div>
            </div>
          </div>
        ))}

        <Button type="button" variant="outline" onClick={addSection} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add section
        </Button>

        {error ? (
          <p className="rounded-lg bg-[#f6e0dd] px-3 py-2 text-sm text-[#a8392e]">{error}</p>
        ) : null}
      </div>
    </form>
  );
}
