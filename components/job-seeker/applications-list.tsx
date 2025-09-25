"use client";

import React, { useEffect, useRef } from 'react';
import { ApplicationCard, ApplicationCardSkeleton } from '@/components/ui/application-card';
import { useApplications } from '@/hooks/useApplications';
import type { Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';

interface ApplicationsListProps {
  profileId: Id<'profiles'> | undefined;
  onOpenChat: (application: { _id: any }) => void;
  // Expose status counts & filter outward if needed later
  onStatusCounts?: (counts: ReturnType<typeof useApplications>['statusCounts']) => void;
  externalFilter?: ReturnType<typeof useApplications>['filter'];
  onFilterChange?: (f: ReturnType<typeof useApplications>['filter']) => void;
}

export function ApplicationsList({ profileId, onOpenChat, onStatusCounts, externalFilter, onFilterChange }: ApplicationsListProps) {
  const { applications, isLoading, error, loadMore, exhausted, statusCounts, filter, setFilter } = useApplications({ profileId, pageSize: 20 });
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Allow a parent-provided filter to drive internal state (single source of truth)
  useEffect(() => {
    if (externalFilter && externalFilter !== filter) {
      setFilter(externalFilter as any);
    }
  }, [externalFilter, filter, setFilter]);

  useEffect(() => {
    onStatusCounts?.(statusCounts);
  }, [statusCounts, onStatusCounts]);

  // Infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || exhausted) return;
    const el = loadMoreRef.current;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) loadMore(); });
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore, exhausted]);

  if (!profileId) {
    return <div className="p-6 text-sm text-gray-500">Loading your profile…</div>;
  }

  if (isLoading && applications.length === 0) {
    return (
      <div className="space-y-4 mt-4">
        {Array.from({ length: 4 }).map((_, i) => <ApplicationCardSkeleton key={i} />)}
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 mt-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded">
        Failed to load applications.
        <div className="mt-2"><Button size="sm" onClick={() => location.reload()}>Retry</Button></div>
      </div>
    );
  }
  if (applications.length === 0) {
    return <div className="p-8 text-center text-sm text-gray-500">No applications found.</div>;
  }
  return (
    <div className="space-y-4 mt-4">
      {applications.map(app => (
        <ApplicationCard
          key={app._id}
          application={app as any}
          onChat={() => onOpenChat(app as any)}
        />
      ))}
      {!exhausted && <div ref={loadMoreRef} className="text-center text-xs text-gray-400 py-4">Loading more…</div>}
      <div className="pb-10" />
    </div>
  );
}
