import { Skeleton } from "@/components/ui/skeleton";

// Wordt direct getoond bij navigatie tussen modules, zodat het schakelen
// meteen reageert (vooral op mobiel) terwijl de data nog laadt.
export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["a", "b", "c", "d"].map((key) => (
          <Skeleton key={key} className="h-[88px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {["x", "y", "z"].map((key) => (
          <Skeleton key={key} className="h-48 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
