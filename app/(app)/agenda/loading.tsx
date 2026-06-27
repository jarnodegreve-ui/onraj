import { Skeleton } from "@/components/ui/skeleton";

// Skeleton voor de agenda-pagina: header + maandkalender + komende-afspraken.
export default function AgendaLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Skeleton className="h-80 rounded-2xl" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          {[1, 2, 3, 4, 5].map((key) => (
            <Skeleton key={key} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
