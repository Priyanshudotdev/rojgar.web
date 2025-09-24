'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { JobCard } from '@/components/ui/job-card';
import { useCachedConvexQuery } from '@/hooks/useCachedConvexQuery';
import { api } from '@/convex/_generated/api';
import { useToast } from '@/hooks/use-toast';
import { useMe } from '@/components/providers/me-provider';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { JobListingSkeleton } from '@/components/ui/skeleton';

// Placeholder advanced filter components (to be enhanced)
import { JobFilters, SortingOptions, FilterChips, SavedFilters } from '../../../../components/job-seeker/job-filters';
import type { JobFiltersValue } from '../../../../components/job-seeker/job-filters';

export default function JobsPage() {
  const router = useRouter();
  const { me } = useMe();
  const profileId = me?.profile?._id ?? undefined;
  const { toast } = useToast();

  // Search and filters
  const [query, setQuery] = useState('');
  const [jobTypes, setJobTypes] = useState<string[]>([]);
  const [salaryMin, setSalaryMin] = useState<number | undefined>(undefined);
  const [salaryMax, setSalaryMax] = useState<number | undefined>(undefined);
  const [experienceLevels, setExperienceLevels] = useState<string[]>([]);
  const [city, setCity] = useState<string | undefined>(undefined);
  const [locality, setLocality] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<'newest' | 'oldest' | 'salary_desc' | 'salary_asc' | 'title_asc' | 'title_desc' | 'relevance'>('newest');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  type SortKey = 'newest' | 'oldest' | 'salary_desc' | 'salary_asc' | 'title_asc' | 'title_desc' | 'relevance';
  type GetPaginatedJobsArgs = {
    page?: number;
    limit: number;
    cursor?: string;
    search?: string;
    jobTypes?: string[];
    salaryMin?: number;
    salaryMax?: number;
    experienceLevels?: string[];
    city?: string;
    locality?: string;
    sort?: SortKey;
    profileId?: string;
  };

  const cacheKey = useMemo(() => {
    return [
      'jobs-list',
      query || 'none',
      jobTypes.join(',') || 'all',
      salaryMin ?? 'any',
      salaryMax ?? 'any',
      experienceLevels.join(',') || 'any',
      city ?? 'any',
      locality ?? 'any',
      sort,
      page,
      pageSize,
    ].join(':');
  }, [query, jobTypes, salaryMin, salaryMax, experienceLevels, city, locality, sort, page, pageSize]);

  const args: GetPaginatedJobsArgs = {
    page,
    limit: pageSize,
    search: query || undefined,
    jobTypes: jobTypes.length ? jobTypes : undefined,
    salaryMin,
    salaryMax,
    experienceLevels: experienceLevels.length ? experienceLevels : undefined,
    city,
    locality,
    sort,
    profileId,
  };
  const { data, isLoading, error } = useCachedConvexQuery(api.jobs.getPaginatedJobs, args, { key: cacheKey, ttlMs: 60 * 1000 });

  const jobs = data?.jobs ?? [];
  const total = data?.totalCount ?? 0;
  const hasMore = data?.hasMore ?? false;

  // Stats and categories
  const { data: stats } = useCachedConvexQuery(api.jobs.getJobStats, {}, { key: 'job-stats', ttlMs: 5 * 60 * 1000 });
  const { data: categoriesData } = useCachedConvexQuery(api.jobs.getJobCategories, {}, { key: 'job-categories', ttlMs: 10 * 60 * 1000 });

  // Bookmarks (local only)
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('bookmarked-jobs');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try { localStorage.setItem('bookmarked-jobs', JSON.stringify(bookmarks)); } catch {}
  }, [bookmarks]);
  const toggleBookmark = (id: string) => {
    setBookmarks((prev) => {
      const has = prev.includes(id);
      const next = has ? prev.filter((x) => x !== id) : [...prev, id];
      toast({ title: has ? 'Removed bookmark' : 'Saved', description: has ? 'Job removed from bookmarks.' : 'Job saved to bookmarks.' });
      return next;
    });
  };

  useEffect(() => {
    // reset to first page when filters or size change
    setPage(1);
  }, [query, jobTypes, salaryMin, salaryMax, experienceLevels, city, locality, sort, pageSize]);

  // Dynamic quick chips from popular terms
  const { data: popular } = useCachedConvexQuery(
    api.jobs.getPopularSearchTerms,
    profileId ? { profileId } : undefined,
    { key: `popular-searches:${profileId ?? 'anon'}`, ttlMs: 10 * 60 * 1000 },
  );
  const quickChips = (popular?.terms as string[] | undefined) ?? [];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center p-4 border-b gap-3">
        <button onClick={() => router.push('/dashboard/job-seeker')} aria-label="Back">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Jobs</h1>
          <p className="text-xs text-gray-500">{(data?.totalCount ?? jobs.length) || 0} jobs available</p>
        </div>
      </div>

      {/* Search & quick filters */}
      <div className="p-4 border-b space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by title or description"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
            aria-label="Search jobs"
          />
        </div>
  <FilterChips onSelect={(chip: string) => setQuery(chip)} chips={quickChips} />
      </div>

      {/* Filters & sorting */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <JobFilters
            value={{ jobTypes, salaryMin, salaryMax, experienceLevels, city, locality }}
            onChange={(v: JobFiltersValue) => {
              setJobTypes(v.jobTypes ?? []);
              setSalaryMin(v.salaryMin);
              setSalaryMax(v.salaryMax);
              setExperienceLevels(v.experienceLevels ?? []);
              setCity(v.city);
              setLocality(v.locality);
            }}
          />
          <SavedFilters value={{ jobTypes, salaryMin, salaryMax, experienceLevels, city, locality }} onSelect={(v) => {
            setJobTypes(v.jobTypes ?? []);
            setSalaryMin(v.salaryMin);
            setSalaryMax(v.salaryMax);
            setExperienceLevels(v.experienceLevels ?? []);
            setCity(v.city);
            setLocality(v.locality);
          }} />
          <div className="ml-4">
            <SortingOptions value={sort} onChange={setSort} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
          <span>Page size:</span>
          {[10, 20, 50].map((sz) => (
            <button
              key={sz}
              onClick={() => setPageSize(sz)}
              className={`px-2 py-1 rounded border ${pageSize === sz ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200'}`}
              aria-pressed={pageSize === sz}
            >
              {sz}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 border-b grid grid-cols-3 gap-3 text-center text-sm">
        <div>
          <div className="text-gray-500">Total Active</div>
          <div className="font-semibold">{stats?.totalActive ?? 0}</div>
        </div>
        <div>
          <div className="text-gray-500">New Today</div>
          <div className="font-semibold">{stats?.newToday ?? 0}</div>
        </div>
        <div>
          <div className="text-gray-500">This Week</div>
          <div className="font-semibold">{stats?.newThisWeek ?? 0}</div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <JobListingSkeleton />
      ) : error ? (
        <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-100">Failed to load jobs.</div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Categories */}
          {Array.isArray(categoriesData) && categoriesData.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-2">Categories</h2>
              <div className="flex flex-wrap gap-2">
                {categoriesData.map((c: any) => {
                  const active = jobTypes.includes(c.category);
                  return (
                    <button
                      key={c.category}
                      onClick={() => {
                        setJobTypes((prev) => (
                          prev.includes(c.category)
                            ? prev.filter((x) => x !== c.category)
                            : [...prev, c.category]
                        ));
                      }}
                      className={`px-3 py-1 rounded-full text-sm border ${active ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200'}`}
                      aria-pressed={active}
                    >
                      {c.category} ({c.count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {/* Categorization could be applied client-side if desired */}
          <div className="grid grid-cols-1 gap-4">
            {jobs.map((job: any) => (
              <div key={job._id} className="space-y-2">
                <JobCard
                  job={job}
                  onDetailsClick={() => router.push(`/job/${job._id}`)}
                  onShare={async () => {
                    const url = `${location.origin}/job/${job._id}`;
                    if (navigator.share) await navigator.share({ title: job.title, url });
                    else {
                      await navigator.clipboard.writeText(url);
                      toast({ title: 'Link copied', description: 'Job link copied to clipboard.' });
                    }
                  }}
                />
                <div className="flex justify-end">
                  <button
                    className={`text-sm underline ${bookmarks.includes(job._id) ? 'text-green-700' : 'text-gray-600'}`}
                    onClick={() => toggleBookmark(job._id)}
                    aria-label={bookmarks.includes(job._id) ? 'Remove bookmark' : 'Bookmark job'}
                  >
                    {bookmarks.includes(job._id) ? 'Bookmarked' : 'Bookmark'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <Pagination className="mt-2">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page > 1) setPage(page - 1);
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink isActive size="default">
                  Page {page}
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (hasMore) setPage(page + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <div className="pb-28" />
    </div>
  );
}
