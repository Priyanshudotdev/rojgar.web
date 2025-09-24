"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { JobCardSkeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Search, MoreVertical, PlusCircle, ArrowLeft, Briefcase } from 'lucide-react';
import { CompanyNotificationsBell } from '@/components/company/notifications-bell';
import { CompanyTopBar } from '@/components/company/topbar';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useMe } from '@/components/providers/me-provider';
import { useCachedConvexQuery } from '@/hooks/useCachedConvexQuery';
import { invalidateKeys } from '@/hooks/useInvalidateCachedQuery';

export default function CompanyJobsIndexPage() {
  const router = useRouter();
  const [companyId, setCompanyId] = useState<Id<'profiles'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const { me } = useMe();
  useEffect(() => {
    if (me?.profile?._id) setCompanyId(me.profile._id as Id<'profiles'>);
    const t = setTimeout(() => setLoading(false), 50);
    return () => clearTimeout(t);
  }, [me]);

  const { data: jobs } = useCachedConvexQuery(
    api.jobs.getJobsWithStatsByCompany,
  companyId ? ({ companyId } as any) : 'skip',
    { key: 'company-jobs', ttlMs: 2 * 60 * 1000 }
  );

  const deleteJob = useMutation(api.jobs.deleteJob);
  const closeJob = useMutation(api.jobs.closeJob);

  const onEdit = (id: string) => router.push(`/dashboard/company/jobs/${id}/edit`);
  const onDelete = async (id: string) => {
    if (!companyId) return;
    const ok = window.confirm('Delete this job? This cannot be undone.');
    if (!ok) return;
    const res = await deleteJob({ jobId: id as any, companyId });
    if ((res as any)?.ok) {
      invalidateKeys(['company-jobs', 'jobsByCompany']);
    } else {
      alert('Failed to delete job');
    }
  };

  const onClose = async (id: string) => {
    if (!companyId) return;
    const ok = window.confirm('Close this job? Applicants will be removed and the job will no longer accept applications.');
    if (!ok) return;
    const res = await closeJob({ jobId: id as any, companyId });
    if ((res as any)?.ok) {
      invalidateKeys(['company-jobs', 'jobsByCompany']);
    } else {
      alert('Failed to close job');
    }
  };

  const filtered = useMemo(() => {
    const list = (jobs ?? []) as any[];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((j) => j.title.toLowerCase().includes(q) || j.location.city.toLowerCase().includes(q));
  }, [jobs, search]);

  return (
    <div className="bg-white min-h-screen">
  <CompanyTopBar
        showBack
        title="Your Jobs"
        right={
          <>
            <CompanyNotificationsBell companyId={companyId} />
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => router.push('/dashboard/company/jobs/new')}>
              <PlusCircle className="w-4 h-4 mr-2" /> New Job
            </Button>
          </>
        }
      />

      <div className="px-4 py-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs" className="pl-10 bg-white text-black" />
        </div>
      </div>

      <main className="px-4 pb-24 pt-2">
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <JobCardSkeleton key={i} />)
          ) : !companyId ? (
            <Card className="p-6 bg-white rounded-xl border border-dashed border-gray-300 text-center">
              <div className="flex flex-col items-center gap-3">
                <Briefcase className="w-8 h-8 text-gray-400" />
                <h3 className="font-semibold text-black">Complete your Employeer profile first!</h3>
                <p className="text-sm text-gray-600">Fill in your company details to post jobs.</p>
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => router.push('/onboarding/company')}>
                  <PlusCircle className="w-4 h-4 mr-2" /> Complete Profile
                </Button>
              </div>
            </Card>
          ) : (
            filtered.map((job: any) => (
                <Card onClick={() => router.push(`/dashboard/company/jobs/${job._id}`)} key={job._id} className="p-4 bg-white cursor-pointer rounded-xl border border-gray-100">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-black text-base">{job.title}</h3>
                      <p className="text-xs text-gray-600">{job.location.city}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/company/jobs/${job._id}`); }}>View Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(job._id); }}>Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); onDelete(job._id); }}>Delete</DropdownMenuItem>
                        {job.status === 'Active' && (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClose(job._id); }}>
                            Close Job
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">{job.applicantCount ?? 0} Applicants</p>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${job.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{job.status}</span>
                  </div>
                </Card>
              ))
          )}
          {!loading && jobs && filtered.length === 0 && <p className="text-sm text-gray-600">No jobs found.</p>}
        </div>
      </main>
    </div>
  );
}