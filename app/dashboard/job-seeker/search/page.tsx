'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { JobCard } from '@/components/ui/job-card';
import { SearchResultsSkeleton } from '@/components/ui/skeleton';
import { useCachedConvexQuery } from '@/hooks/useCachedConvexQuery';
import { api } from '@/convex/_generated/api';
import { addRecentSearch, clearRecentSearches, formatRelative, getRecentSearches, removeRecentSearch } from '@/lib/utils/search-history';
import { useMe } from '@/components/providers/me-provider';
import { useToast } from '@/hooks/use-toast';

function useDebounce<T>(value: T, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function toTitle(s: string) {
  return (s || '')
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 250);
  const router = useRouter();
  const { me } = useMe();
  const profileId = me?.profile?._id ?? null;
  const { toast } = useToast();
  const [filter, setFilter] = useState<undefined | 'for-you' | 'high-salary' | 'nearby' | 'new-jobs'>(undefined);
  const [city, setCity] = useState<string | undefined>(undefined);
  const [locality, setLocality] = useState<string | undefined>(undefined);
  // Used to force a refetch with identical args when retrying after an error
  const [retryTick, setRetryTick] = useState(0);

  // Live results via Convex query
  const { data: results, isLoading, error } = useCachedConvexQuery(
    api.jobs.getFilteredJobs,
    debounced && debounced.trim().length
      ? ({ search: debounced, filter, profileId: filter === 'for-you' ? profileId : undefined, city, locality } as any)
      : (undefined as any),
    { key: `search:${debounced}:${filter ?? 'none'}:${city ?? 'any'}:${locality ?? 'any'}:${retryTick}`, ttlMs: 60 * 1000 },
  );

  // Popular suggestions from backend
  const { data: popular } = useCachedConvexQuery(
    api.jobs.getPopularSearchTerms as any,
    profileId ? ({ profileId } as any) : (undefined as any),
    { key: `popular-searches:${profileId ?? 'anon'}`, ttlMs: 10 * 60 * 1000 },
  );

  const [history, setHistory] = useState(getRecentSearches());
  useEffect(() => {
    // Rehydrate on focus in case other tabs modified history
    const onFocus = () => setHistory(getRecentSearches());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const onRunSearch = (q: string) => {
    const s = (q || '').trim();
    if (!s) return;
    addRecentSearch(s);
    setHistory(getRecentSearches());
    setQuery(s);
  };

  const onRemoveRecent = (q: string) => {
    removeRecentSearch(q);
    setHistory(getRecentSearches());
  };

  const onClearAll = () => {
    clearRecentSearches();
    setHistory([]);
  };

  const searching = !!debounced && debounced.trim().length > 0;
  const hasError = Boolean(error);
  const popularTerms = ((popular?.terms as string[] | undefined) ?? []);
  const popularCategories = ((popular?.categories as string[] | undefined) ?? []);
  const popularLocations = ((popular?.locations as string[] | undefined) ?? []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center p-4 border-b gap-3">
        <button onClick={() => router.push('/dashboard/job-seeker')} aria-label="Back">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search Jobs"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRunSearch(query);
            }}
            className="pl-10"
            autoFocus
            aria-label="Search input"
          />
        </div>
      </div>

      {/* Loading state */}
      {isLoading && <SearchResultsSkeleton searching={searching} />}

      {!isLoading && (
        <div className="p-4 space-y-6">
          {/* Recent Searches */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Recent Searches</h2>
              {history.length > 0 && (
                <button className="text-green-600 text-sm" onClick={onClearAll} aria-label="Clear recent searches">
                  Clear
                </button>
              )}
            </div>
            <div className="space-y-2">
              {history.length === 0 ? (
                <p className="text-sm text-gray-500">No recent searches.</p>
              ) : (
                history.map((item) => (
                  <div
                    key={item.query}
                    role="button"
                    tabIndex={0}
                    onClick={() => onRunSearch(item.query)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') onRunSearch(item.query);
                    }}
                    className="w-full flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-green-600 rounded"
                    aria-label={`Search ${item.query}`}
                  >
                    <Search className="w-4 h-4 text-gray-400" />
                    <div className="flex-1 py-1">
                      <p className="font-medium">{item.query}</p>
                      <p className="text-sm text-gray-500">{formatRelative(item.ts)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveRecent(item.query);
                      }}
                      className="text-gray-400 hover:text-gray-600 px-2"
                      aria-label={`Remove ${item.query} from recent`}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Suggestions */}
          <div>
            <h2 className="font-semibold mb-3">Suggestions</h2>
            <div className="space-y-2">
              {popularTerms.map((term: string) => (
                <button key={term} className="flex items-center gap-3" onClick={() => onRunSearch(term)}>
                  <Search className="w-4 h-4 text-gray-400" />
                  <span>{toTitle(term)}</span>
                </button>
              ))}
              {(popularTerms.length === 0) && (
                <p className="text-sm text-gray-500">Try searching for: Delivery, Carpenter, Plumber</p>
              )}
            </div>
            {(popular?.categories || []).length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold mb-2 text-gray-700">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {popularCategories.map((cat: string) => (
                    <button key={cat} className="px-3 py-1 bg-gray-100 rounded-md text-sm" onClick={() => onRunSearch(cat)}>
                      {toTitle(cat)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {(popular?.locations || []).length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold mb-2 text-gray-700">Locations</h3>
                <div className="flex flex-wrap gap-2">
                  {popularLocations.map((loc: string) => (
                    <button key={loc} className="px-3 py-1 bg-gray-100 rounded-md text-sm" onClick={() => { setCity(loc); setFilter('nearby'); onRunSearch(query || loc); }}>
                      {toTitle(loc)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto py-1">
            {[
              { id: undefined, label: 'All' },
              { id: 'for-you', label: 'For You' },
              { id: 'high-salary', label: 'High Salary' },
              { id: 'nearby', label: 'Nearby' },
              { id: 'new-jobs', label: 'New' },
            ].map((f) => (
              <button
                key={String(f.id)}
                onClick={() => setFilter(f.id as any)}
                className={`px-3 py-1 rounded-full text-sm border ${filter === f.id ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200'}`}
                aria-pressed={filter === f.id}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Error state */}
          {hasError && (
            <div className="p-3 bg-red-50 text-red-700 rounded border border-red-100 text-sm">
              <div className="flex items-center justify-between">
                <span>Something went wrong while searching.</span>
                <button className="underline" onClick={() => setRetryTick((t) => t + 1)}>Retry</button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {searching && Array.isArray(results) && results.length > 0 && (
              results.map((job: any) => (
                <JobCard
                  key={job._id}
                  job={job}
                  onClose={() => router.push(`/job/${job._id}`)}
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              ))
            )}
            {searching && Array.isArray(results) && results.length === 0 && (
              <p className="text-sm text-gray-600">No results found.</p>
            )}
            {!searching && (
              <p className="text-sm text-gray-600">Start typing to search for jobs.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}