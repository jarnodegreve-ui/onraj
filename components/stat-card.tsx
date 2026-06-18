import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-5">
      {Icon && (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={cn("text-xl font-semibold tabular-nums", valueClassName)}>
          {value}
        </p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
