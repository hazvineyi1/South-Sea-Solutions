import { useState } from "react";
import { Loader2, Plus, ArrowUp, ArrowDown, Pencil, Trash2, GraduationCap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPlatformTrainingModules,
  getGetPlatformTrainingModulesQueryKey,
  useDeletePlatformTrainingModule,
  useReorderPlatformTrainingModules,
  type TrainingModuleDetail,
} from "@workspace/api-client-react";
import { ConsoleLayout } from "@/portal/ConsoleLayout";
import { Button } from "@/components/ui/button";
import { trainingIcon } from "@/pages/portal/trainingIcons";
import { ModuleEditor } from "./training-editor";

function ModuleRow({
  module,
  index,
  total,
  onEdit,
  onMove,
}: {
  module: TrainingModuleDetail;
  index: number;
  total: number;
  onEdit: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const queryClient = useQueryClient();
  const del = useDeletePlatformTrainingModule({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: getGetPlatformTrainingModulesQueryKey() }),
    },
  });

  function handleDelete() {
    if (!window.confirm(`Delete "${module.title}"? This also clears everyone's completion of it.`)) {
      return;
    }
    del.mutate({ id: module.id });
  }

  const Icon = trainingIcon(module.icon);

  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{module.title}</div>
        <div className="text-xs text-muted-foreground">
          {module.category} · {module.minutes} min · {module.sections.length} sections
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => onMove(-1)} disabled={index === 0} className="h-8 w-8 p-0">
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          className="h-8 w-8 p-0"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      </div>
      <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
        <Pencil className="h-3.5 w-3.5" />
        Edit
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
  );
}

export default function ConsoleTrainingPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<TrainingModuleDetail | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useGetPlatformTrainingModules({
    query: { queryKey: getGetPlatformTrainingModulesQueryKey() },
  });

  const reorder = useReorderPlatformTrainingModules({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: getGetPlatformTrainingModulesQueryKey() }),
    },
  });

  const modules = data ?? [];

  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= modules.length) return;
    const ids = modules.map((m) => m.id);
    [ids[index], ids[next]] = [ids[next], ids[index]];
    reorder.mutate({ data: { ids } });
  }

  if (editing || creating) {
    return (
      <ConsoleLayout>
        <ModuleEditor
          module={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      </ConsoleLayout>
    );
  }

  return (
    <ConsoleLayout>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Training content</h1>
          <p className="text-sm text-muted-foreground">
            Author the platform-wide training modules every user sees, and set their order.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          New module
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : modules.length > 0 ? (
        <div className="rounded-2xl border bg-card">
          <div className="divide-y">
            {modules.map((m, i) => (
              <ModuleRow
                key={m.id}
                module={m}
                index={i}
                total={modules.length}
                onEdit={() => setEditing(m)}
                onMove={(dir) => move(i, dir)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card px-5 py-16 text-center text-sm text-muted-foreground">
          <GraduationCap className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
          No training modules yet.
        </div>
      )}
    </ConsoleLayout>
  );
}
