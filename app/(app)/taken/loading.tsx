import { Skeleton } from "@/components/ui/skeleton";

// Skeleton voor de taken-pagina: header + categorie-kolommen met taakrijen.
export default function TakenLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((col) => (
          <div key={col} className="space-y-3">
            <Skeleton className="h-6 w-28" />
            {[1, 2, 3].map((row) => (
              <Skeleton key={`${col}-${row}`} className="h-20 rounded-2xl" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
