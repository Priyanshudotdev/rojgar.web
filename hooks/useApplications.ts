import { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '@/convex/_generated/api';
import { useCachedConvexQuery } from '@/hooks/useCachedConvexQuery';
import type { Id } from '@/convex/_generated/dataModel';

// Application status union
export type ApplicationStatus = 'New' | 'In Review' | 'Interviewing' | 'Hired' | 'Rejected';

export interface EnrichedApplication {
  _id: Id<'applications'>;
  jobId: Id<'jobs'>;
  jobSeekerId: Id<'profiles'>;
  status: ApplicationStatus;
  appliedAt: number;
  job: {
    _id: Id<'jobs'>;
    title: string;
    location?: { city: string; locality?: string };
    salary?: { min: number; max: number };
    jobType?: string;
    company: { name: string; photoUrl: string } | null;
  } | null;
}

interface UseApplicationsOptions {
  pageSize?: number;
  profileId: Id<'profiles'> | undefined;
}

interface FilterState {
  status: ApplicationStatus | 'all';
  search: string;
  dateRange: '7d' | '30d' | '90d' | 'all';
  sort: 'newest' | 'oldest' | 'status';
}

export function useApplications({ pageSize = 20, profileId }: UseApplicationsOptions) {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [pendingCursor, setPendingCursor] = useState<string | undefined>();
  const [items, setItems] = useState<EnrichedApplication[]>([]);
  const [exhausted, setExhausted] = useState(false);
  const [filter, setFilter] = useState<FilterState>({ status: 'all', search: '', dateRange: 'all', sort: 'newest' });

  const args = profileId ? { jobSeekerId: profileId, limit: pageSize, cursor } : 'skip';
  const { data, isLoading, error } = useCachedConvexQuery(api.jobs.getApplicationsByJobSeeker, args as any, {
    key: `applications:${profileId}:${cursor ?? 'start'}`,
    ttlMs: 30_000,
    persist: false,
  });

  useEffect(() => {
    if (!data) return;
    const page = (data as any).applications as EnrichedApplication[];
    if (!cursor) {
      setItems(page);
    } else if (pendingCursor === cursor) {
      setItems(prev => [...prev, ...page]);
    }
    const next = (data as any).nextCursor as string | undefined;
    setExhausted(!next);
    setPendingCursor(undefined);
  }, [data, cursor, pendingCursor]);

  const loadMore = useCallback(() => {
    if (exhausted || pendingCursor) return;
    const next = (data as any)?.nextCursor as string | undefined;
    if (!next) return;
    setPendingCursor(next);
    setCursor(next);
  }, [data, exhausted, pendingCursor]);

  const reset = useCallback(() => {
    setCursor(undefined);
    setPendingCursor(undefined);
    setItems([]);
    setExhausted(false);
  }, []);

  // Filtering & search ------------------------------------------------------
  const filtered = useMemo(() => {
    let list = items;
    const now = Date.now();
    if (filter.status !== 'all') {
      list = list.filter(a => a.status === filter.status);
    }
    if (filter.search.trim()) {
      const s = filter.search.toLowerCase();
      list = list.filter(a =>
        (a.job?.title || '').toLowerCase().includes(s) ||
        (a.job?.company?.name || '').toLowerCase().includes(s)
      );
    }
    if (filter.dateRange !== 'all') {
      const windowMs = filter.dateRange === '7d' ? 7 : filter.dateRange === '30d' ? 30 : 90;
      const cutoff = now - windowMs * 24 * 60 * 60 * 1000;
      list = list.filter(a => a.appliedAt >= cutoff);
    }
    switch (filter.sort) {
      case 'oldest':
        list = [...list].sort((a, b) => a.appliedAt - b.appliedAt);
        break;
      case 'status':
        const order: ApplicationStatus[] = ['New', 'In Review', 'Interviewing', 'Hired', 'Rejected'];
        list = [...list].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
        break;
      case 'newest':
      default:
        list = [...list].sort((a, b) => b.appliedAt - a.appliedAt);
    }
    return list;
  }, [items, filter]);

  // Aggregated counts -------------------------------------------------------
  const statusCounts = useMemo(() => {
    const map: Record<ApplicationStatus, number> = {
      New: 0,
      'In Review': 0,
      Interviewing: 0,
      Hired: 0,
      Rejected: 0,
    };
    for (const a of items) map[a.status] = (map[a.status] ?? 0) + 1;
    return map;
  }, [items]);

  return {
    applications: filtered,
    raw: items,
    isLoading,
    error,
    loadMore,
    exhausted,
    filter,
    setFilter,
    reset,
    statusCounts,
  } as const;
}
