import { Skeleton } from "@/components/ui/skeleton";

// Skeleton voor de financiën-pagina: header + maand-stats + transactielijst.
export default function FinancienLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-44" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
      <div className="space-y-2 rounded-2xl border bg-card p-4">
        <Skeleton className="h-6 w-40" />
        {[1, 2, 3, 4, 5].map((key) => (
          <Skeleton key={key} className="h-12 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
