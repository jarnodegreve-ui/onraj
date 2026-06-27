import { Skeleton } from "@/components/ui/skeleton";

// Skeleton voor de statistieken-pagina: kerncijfers + module-secties.
export default function StatistiekenLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((key) => (
          <Skeleton key={key} className="h-[88px] rounded-2xl" />
        ))}
      </div>
      {[1, 2, 3].map((section) => (
        <div key={section} className="space-y-4 rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-6 w-36" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((key) => (
              <Skeleton key={key} className="h-20 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
