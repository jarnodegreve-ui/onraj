import { Skeleton } from "@/components/ui/skeleton";

// Skeleton voor de notities-pagina: header + zoekbalk + kaarten-rooster.
export default function NotitiesLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-10 w-64 max-w-full" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-20" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((key) => (
          <Skeleton key={key} className="h-48 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
