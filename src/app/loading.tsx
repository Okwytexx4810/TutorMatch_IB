import { Skeleton } from "@/components/ui/skeleton";

/**
 * Instant feedback while a route segment loads. Individual routes add their own
 * `loading.tsx` once they fetch data.
 */
export default function Loading() {
  return (
    <div className="container-page space-y-6 py-10" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-5 w-full max-w-xl" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-56 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
