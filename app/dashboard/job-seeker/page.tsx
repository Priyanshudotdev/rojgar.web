'use client';
// Job Seeker Dashboard main entry point
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, Home, Grid3X3, FileText, User, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Logo from '@/components/ui/logo';
import DashboardLayout from '@/components/DashboardLayout';
import { DashboardHeaderSkeleton, JobCardSkeleton } from '@/components/ui/skeleton';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useCachedConvexQuery } from '@/hooks/useCachedConvexQuery';
import { useMe } from '@/components/providers/me-provider';

const filterOptions = [
  { id: 'for-you', icon: Grid3X3, label: 'For you', active: true },
  { id: 'high-salary', icon: '💰', label: 'High Salary' },
  { id: 'nearby', icon: '📍', label: 'Nearby' },
  { id: 'new-jobs', icon: FileText, label: 'New Jobs' }
];

type ActiveJob = {
  _id: string;
  title: string;
  location: { city: string; locality?: string };
  salary: { min: number; max: number };
  jobType: string;
  staffNeeded: number;
  company?: { name?: string; photoUrl?: string } | null;
};

export default function JobSeekerDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const { data: jobs } = useCachedConvexQuery(api.jobs.getActiveJobs, {}, { key: 'active-jobs', ttlMs: 2 * 60 * 1000 });
  const { me, loading } = useMe();

  // Unauthenticated minimal fallback (middleware should handle this; guard just in case)
  useEffect(() => {
    if (!loading && !me) {
      try { router.replace('/auth/login'); } catch {}
    }
  }, [loading, me, router]);

  const filtered = useMemo(() => {
    const list = (jobs ?? []) as ActiveJob[];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.location.city.toLowerCase().includes(q) ||
        (j.company?.name?.toLowerCase().includes(q) ?? false),
    );
  }, [jobs, searchQuery]);

  // Avoid rendering content during redirect when unauthenticated
  if (!loading && !me) return null;

  return (
      <main className='h-screen'>
        {/* Header */}
      {loading ? (
        <DashboardHeaderSkeleton />
      ) : (
  <header className="bg-white px-4 py-3 border-b sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src="https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg" />
                <AvatarFallback>SB</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-semibold text-black">{me?.profile?.name || 'Job Seeker'}</h1>
                <p className="text-sm text-gray-600">Mechanic ▼</p>
              </div>
            </div>
            <Bell className="w-6 h-6 text-gray-600" />
          </div>
        </header>
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
        <div className="flex space-x-3 overflow-x-auto scrollbar-hide">
          {filterOptions.map((filter) => (
            <button
              key={filter.id}
              className={`flex flex-col items-center space-y-1 min-w-max px-3 py-2 rounded-lg transition-colors duration-150 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-green-500 ${
                filter.active ? 'bg-green-100 text-green-600' : 'text-gray-600 bg-gray-50 hover:bg-green-50'
              }`}
            >
              {typeof filter.icon === 'string' ? (
                <span className="text-xl">{filter.icon}</span>
              ) : (
                <filter.icon className="w-5 h-5" />
              )}
              <span>{filter.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Job Cards Section */}
      <main className="flex-1 px-4 pb-24 pt-2 overflow-y-auto bg-white">
        <div className="space-y-4">
          {loading || jobs === undefined
            ? Array.from({ length: 3 }).map((_, i) => <JobCardSkeleton key={i} />)
            : filtered.map((job) => (
                <Card key={job._id} className="p-4 bg-white rounded-xl border border-gray-100">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                          {job.company?.photoUrl ? (
                            <AvatarImage src={job.company.photoUrl as string} />
                        ) : (
                            <Logo size={40} alt="Employeer Logo" className="rounded-full" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-black text-base">{job.title}</h3>
                        <p className="text-xs text-gray-600">🏢 {job.company?.name ?? 'Employeer'}</p>
                      </div>
                    </div>
                    <button aria-label="Share job">
                      <Share2 className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                  <div className="space-y-1 mb-4 text-gray-600 text-xs">
                    <p>📍 {job.location.city}{job.location.locality ? `, ${job.location.locality}` : ''}</p>
                    <p>{job.staffNeeded} Openings • {job.jobType}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm" onClick={() => router.push(`/job/${job._id}`)}>
                      📞 Call HR
                    </Button>
                    <button className="p-2 border border-gray-200 rounded bg-white" aria-label="Share job">
                      <Share2 className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </Card>
              ))}
          {!loading && jobs && filtered.length === 0 && (
            <p className="text-sm text-gray-600">No jobs found.</p>
          )}
        </div>
      </main>
      </main>
  );
}
