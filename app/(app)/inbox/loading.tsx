import { Skeleton } from "@/components/ui/skeleton";

// Skeleton voor de inbox: header + lijst van te-triëren captures.
export default function InboxLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <ul className="space-y-3">
        {[1, 2, 3, 4, 5].map((key) => (
          <li key={key} className="rounded-2xl border bg-card p-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Skeleton className="h-4 w-4 rounded" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-5 w-12 rounded" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="ml-auto h-8 w-24" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
