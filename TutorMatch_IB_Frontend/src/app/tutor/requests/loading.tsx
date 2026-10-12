import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="p-4 sm:p-6" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div className="grid gap-4">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}