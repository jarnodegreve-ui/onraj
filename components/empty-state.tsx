import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 px-6 py-16 text-center">
      {Icon && (
        <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon className="size-6" />
        </div>
      )}
      <h3 className="flex items-center gap-1.5 font-mono text-[15px] font-medium">
        <span className="text-primary" aria-hidden>
          ❯
        </span>
        {title}
        <span
          aria-hidden
          className="cursor-blink inline-block h-[1.05em] w-[0.5ch] bg-primary"
        />
      </h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
