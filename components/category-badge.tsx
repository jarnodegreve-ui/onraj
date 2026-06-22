import { cn } from "@/lib/utils";

/**
 * Categorie-label met optionele eigen kleur (beheerd via /instellingen).
 * Zonder kleur valt het terug op de primaire huisstijlkleur.
 */
export function CategoryBadge({
  name,
  color,
  className,
}: {
  name: string;
  color?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium",
        !color && "bg-primary/15 text-primary",
        className,
      )}
      style={color ? { backgroundColor: `${color}26`, color } : undefined}
    >
      {name}
    </span>
  );
}
