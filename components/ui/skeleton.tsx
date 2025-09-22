import { cn } from '@/lib/utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

export { Skeleton };

export function DashboardHeaderSkeleton() {
  return (
  <div className="bg-white px-4 py-3 border-b sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div>
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="w-6 h-6 rounded" />
      </div>
    </div>
  );
}

export function JobCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100">
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div>
              <Skeleton className="h-4 w-40 mb-1" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <Skeleton className="w-5 h-5 rounded" aria-label="Loading action" />
        </div>
      </div>
      <div className="px-4 pt-2 pb-0 space-y-2">
        <Skeleton className="h-3 w-52" />
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-3 w-44" />
      </div>
      <div className="px-4 pt-3 pb-4">
        <Skeleton className="h-9 w-full" aria-label="Loading button" />
      </div>
    </div>
  );
}
