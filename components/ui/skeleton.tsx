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

export function JobDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 border-b">
        <Skeleton className="w-6 h-6 rounded" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="w-6 h-6 rounded" />
      </div>

      <div className="p-4 space-y-6">
        {/* Company header */}
        <div className="flex items-start space-x-4">
          <Skeleton className="w-12 h-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-5 w-64" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>

        {/* Job info */}
        <div className="flex justify-between items-center text-center py-4">
          <div>
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="border-l h-10" />
          <div>
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="border-l h-10" />
          <div>
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>

        {/* Manager */}
        <div className="bg-orange-50 p-4 rounded-lg">
          <Skeleton className="h-3 w-40 mb-3" />
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div>
              <Skeleton className="h-4 w-40 mb-1" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div>
          <Skeleton className="h-4 w-48 mb-3" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-24 rounded-md" />
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <Skeleton className="h-4 w-40 mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex items-center justify-between">
        <Skeleton className="w-6 h-6 rounded" />
        <Skeleton className="h-10 w-40 rounded-full" />
      </div>
    </div>
  );
}

export function SearchResultsSkeleton({ searching }: { searching?: boolean }) {
  return (
    <div className="h-screen bg-white">
      {/* Header */}
      <div className="flex items-center p-4 border-b">
        <Skeleton className="w-6 h-6 mr-3" aria-label="Back" />
        <div className="flex-1">
          <Skeleton className="h-10 w-full" aria-label="Search input" />
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Recent searches */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-4 h-4" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-40 mb-1" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Suggestions */}
        <div>
          <Skeleton className="h-4 w-40 mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-4 h-4" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>

        {/* Results */}
        {searching && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <JobCardSkeleton key={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function JobListingSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center p-4 border-b gap-3">
        <Skeleton className="w-6 h-6" />
        <div className="flex-1">
          <Skeleton className="h-5 w-24 mb-1" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>

      {/* Search & filters */}
      <div className="p-4 border-b space-y-3">
        <Skeleton className="h-10 w-full" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-20 rounded-full" />
          ))}
        </div>
      </div>

      {/* Filter controls */}
      <div className="p-4 border-b space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24" />
            ))}
          </div>
          <Skeleton className="h-8 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-20" />
          {([10, 20, 50] as const).map((n) => (
            <Skeleton key={n} className="h-6 w-10" />
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 border-b grid grid-cols-3 gap-3 text-center">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-3 w-20 mx-auto mb-1" />
            <Skeleton className="h-4 w-10 mx-auto" />
          </div>
        ))}
      </div>

      {/* Listings */}
      <div className="p-4 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <JobCardSkeleton key={i} />
        ))}
      </div>

      {/* Pagination */}
      <div className="p-4">
        <div className="flex items-center justify-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header controls */}
      <div className="bg-white px-4 py-3 border-b sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <Skeleton className="w-6 h-6 rounded" aria-label="Back" />
          <Skeleton className="h-5 w-24" aria-label="Title" />
          <Skeleton className="w-6 h-6 rounded" aria-label="Settings" />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Profile header */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-start gap-4">
            <Skeleton className="w-20 h-20 rounded-full" aria-label="Avatar" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" aria-label="Name" />
              <Skeleton className="h-4 w-28" aria-label="Role" />
              <Skeleton className="h-4 w-24" aria-label="Location" />
              <div className="mt-2">
                <Skeleton className="h-9 w-28" aria-label="Edit button" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3" aria-label="Profile stats">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border p-4 text-center">
              <Skeleton className="h-3 w-20 mx-auto mb-2" />
              <Skeleton className="h-6 w-10 mx-auto" />
            </div>
          ))}
        </div>

        {/* Skills chips */}
        <div className="bg-white rounded-xl border p-4">
          <Skeleton className="h-4 w-28 mb-3" aria-label="Skills heading" />
          <div className="flex flex-wrap gap-2" aria-label="Skills chips">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-20 rounded-full" />
            ))}
          </div>
        </div>

        {/* Education and Experience */}
        <div className="grid md:grid-cols-2 gap-3" aria-label="Education and experience">
          <div className="bg-white rounded-xl border p-4">
            <Skeleton className="h-4 w-32 mb-3" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <Skeleton className="h-4 w-32 mb-3" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-44" />
                  <Skeleton className="h-3 w-28" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl border p-4">
          <Skeleton className="h-4 w-36 mb-3" aria-label="Recent activity heading" />
          <div className="grid md:grid-cols-2 gap-3" aria-label="Recent activity cards">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-3">
                <Skeleton className="h-4 w-40 mb-2" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
