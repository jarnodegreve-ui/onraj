import { Skeleton } from "@/components/ui/skeleton";

// Skeleton voor het dashboard: begroeting, HIERNA-hero, veegbare taken en bento.
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-9 w-64 max-w-full" />
        </div>
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      <Skeleton className="h-32 rounded-3xl" />
      <Skeleton className="h-56 rounded-3xl" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-56 rounded-2xl lg:col-span-2" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="col-span-2 h-32 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    </div>
  );
}
