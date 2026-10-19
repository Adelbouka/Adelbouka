import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6" aria-busy="true">
      <Skeleton className="h-8 w-72" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Skeleton className="hidden h-[600px] lg:block" />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-border bg-surface">
              <Skeleton className="aspect-[16/10] rounded-none" />
              <div className="space-y-2 p-4"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-6 w-1/3" /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
