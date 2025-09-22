'use client';
// Job Seeker Dashboard main entry point
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Grid3X3, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DashboardHeaderSkeleton, JobCardSkeleton } from '@/components/ui/skeleton';
import { api } from '@/convex/_generated/api';
import { useCachedConvexQuery } from '@/hooks/useCachedConvexQuery';
import { useMe } from '@/components/providers/me-provider';
import { JobSeekerHeader } from '@/components/job-seeker/header';
import type { Id } from '@/convex/_generated/dataModel';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { JobCard } from '@/components/ui/job-card';
import { useToast } from '@/hooks/use-toast';
import type { EnrichedJob } from '@/types/jobs';

const filterOptions = [
  { id: 'for-you', icon: Grid3X3, label: 'For you' },
  { id: 'high-salary', icon: '💰', label: 'High Salary' },
  { id: 'nearby', icon: '📍', label: 'Nearby' },
  { id: 'new-jobs', icon: FileText, label: 'New Jobs' }
] as const;


export default function JobSeekerDashboard() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<(typeof filterOptions)[number]['id']>('for-you');
  const router = useRouter();
  const { me, loading } = useMe();

  // Derive simple location parts from user profile for 'nearby'
  const userLocation = me?.profile?.jobSeekerData?.location || '';
  const parsed = useMemo(() => {
    const parts = (userLocation || '')
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => Boolean(s));
    return { city: parts[0], locality: parts[1] } as { city?: string; locality?: string };
  }, [userLocation]);

  const debouncedQuery = useDebounce(searchQuery, 250);

  const args = useMemo(() => {
    const base: any = {
      search: debouncedQuery || undefined,
      filter: activeFilter,
      profileId: activeFilter === 'for-you' ? (me?.profile?._id as Id<'profiles'>) : undefined,
      city: activeFilter === 'nearby' ? parsed.city : undefined,
      locality: activeFilter === 'nearby' ? parsed.locality : undefined,
    };
    return base;
  }, [activeFilter, parsed.city, parsed.locality, me?.profile?._id, debouncedQuery]);

  const dynamicKey = useMemo(() => {
    return `filtered-jobs:${activeFilter}:${args.city ?? ''}:${args.locality ?? ''}:${args.profileId ?? ''}:${debouncedQuery}`;
  }, [activeFilter, args.city, args.locality, args.profileId, debouncedQuery]);

  const hasLocation = Boolean(parsed.city);
  const ready = !(
    (activeFilter === 'for-you' && !me?.profile?._id) ||
    (activeFilter === 'nearby' && !hasLocation)
  );
  const { data: jobs } = useCachedConvexQuery(
    ready ? api.jobs.getFilteredJobs : (null as any),
    ready ? (args as any) : ('skip' as any),
    { key: dynamicKey, ttlMs: 15 * 1000 }
  );

  // Unauthenticated minimal fallback (middleware should handle this; guard just in case)
  useEffect(() => {
    if (!loading && !me) {
      try { router.replace('/auth/login'); } catch {}
    }
  }, [loading, me, router]);

  const filtered = (jobs ?? []) as EnrichedJob[];

  const handleShare = async (job: EnrichedJob) => {
    try {
      const url = `${window.location.origin}/job/${job._id}`;
      if (navigator.share) {
        await navigator.share({ title: job.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: 'Link copied to clipboard' });
      }
    } catch (e) {
      try {
        alert('Unable to share. Please copy the link manually.');
      } catch {}
      toast({ title: 'Share failed', description: 'Unable to share the job link right now.' });
    }
  };

  // Avoid rendering content during redirect when unauthenticated
  if (!loading && !me) return null;

  return (
      <main className='h-screen'>
        {/* Header */}
      {loading ? (
        <DashboardHeaderSkeleton />
      ) : (
        <JobSeekerHeader
          loading={loading}
          name={me?.profile?.name ?? null}
          jobRole={me?.profile?.jobSeekerData?.jobRole ?? null}
          photoUrl={me?.profile?.jobSeekerData?.profilePhotoUrl ?? null}
          profileId={(me?.profile?._id as Id<'profiles'>) ?? null}
        />
      )}

      {/* Search Bar */}
      <div className="px-4 pt-4 pb-2 bg-white">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search Job"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white text-black placeholder-gray-500 border border-gray-200 focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Filter Options */}
      <div className="px-4 pb-2 bg-white">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide">
          {filterOptions.map((filter) => {
            const isActive = activeFilter === filter.id;
            const isNearby = filter.id === 'nearby';
            const disabled = isNearby && !hasLocation;
            return (
              <button
                key={filter.id}
                type="button"
                aria-pressed={isActive}
                aria-disabled={disabled}
                onClick={() => {
                  if (disabled) return;
                  setActiveFilter(filter.id);
                }}
                title={disabled ? 'Set your location in profile to use Nearby' : undefined}
                className={`flex flex-col items-center gap-1 min-w-max px-3 py-2 rounded-lg transition-colors duration-150 font-medium text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 ${
                  disabled
                    ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400'
                    : isActive
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-700 bg-gray-50 hover:bg-green-50'
                }`}
             >
                {typeof filter.icon === 'string' ? (
                  <span className="text-xl">{filter.icon}</span>
                ) : (
                  <filter.icon className="w-5 h-5" />
                )}
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Job Cards Section */}
      <section className="flex-1 px-4 pb-24 pt-2 overflow-y-auto bg-white">
        <div className="space-y-4">
          {loading || jobs === undefined
            ? Array.from({ length: 3 }).map((_, i) => <JobCardSkeleton key={i} />)
            : filtered.map((job) => (
                <JobCard
                  key={job._id}
                  job={job}
                  onDetailsClick={() => router.push(`/job/${job._id}`)}
                  onShare={() => handleShare(job)}
                />
              ))}
          {!loading && jobs && filtered.length === 0 && (
            <p className="text-sm text-gray-600">No jobs found.</p>
          )}
        </div>
      </section>
      </main>
  );
}
