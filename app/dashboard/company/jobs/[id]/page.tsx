"use client";

import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Users, Briefcase, MapPin } from 'lucide-react';
import { CompanyNotificationsBell } from '@/components/company/notifications-bell';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useMe } from '@/components/providers/me-provider';
import { invalidateKeys } from '@/hooks/useInvalidateCachedQuery';

export default function JobDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = (params?.id as string) as Id<'jobs'>;
  const { me } = useMe();
  const companyId = me?.profile?._id as Id<'profiles'> | undefined;
  const data = useQuery(api.jobs.getJobWithApplicants, jobId ? { jobId } : 'skip') as
    | { job: any; applicants: any[] }
    | null
    | undefined;
  const loading = data === undefined;
  const del = useMutation(api.jobs.deleteJob);
  const closeJob = useMutation(api.jobs.closeJob);

  const onEdit = () => router.push(`/dashboard/company/jobs/${jobId}/edit`);
  const onDelete = async () => {
    if (!companyId) return;
    const ok = window.confirm('Delete this job? This cannot be undone.');
    if (!ok) return;
    const res = await del({ jobId, companyId });
    if ((res as any)?.ok) {
      invalidateKeys(['company-jobs', 'jobsByCompany']);
      router.replace('/dashboard/company/jobs');
    } else {
      alert('Failed to delete job');
    }
  };

  const onClose = async () => {
    if (!companyId) return;
    const ok = window.confirm('Close this job? Applicants will be removed and the job will no longer accept applications.');
    if (!ok) return;
    const res = await closeJob({ jobId, companyId });
    if ((res as any)?.ok) {
      invalidateKeys(['company-jobs', 'jobsByCompany']);
    } else {
      alert('Failed to close job');
    }
  };

  return (
    <div className="bg-white min-h-screen">
  <div className="px-4 py-3 bg-white border-b sticky top-0 z-10 flex items-center justify-between">
  <div className="flex items-center gap-2">
  <button onClick={() => router.push('/dashboard/company')} className="text-black cursor-pointer group">
          <ArrowLeft className="w-6 h-6 group-hover:text-black" />
        </button>
        <h1 className="font-semibold text-black">Job Details</h1>
  </div>
  <CompanyNotificationsBell companyId={companyId as any ?? null} />
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <p className="text-sm text-gray-600">Loading…</p>
        ) : !data ? (
          <p className="text-sm text-gray-600">Job not found.</p>
        ) : (
          <>
            <Card className="bg-white cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">{data.job.title}</CardTitle>
                <div className="flex gap-2">
                  {data.job.status === 'Active' && (
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                  )}
                  <Button variant="outline" onClick={onEdit}>Edit</Button>
                  <Button variant="destructive" onClick={onDelete}>Delete</Button>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-gray-700 space-y-2">
                <p>
                  <span className="font-medium text-black">Location: </span>
                  {data.job.location.city}
                  {data.job.location.locality ? `, ${data.job.location.locality}` : ''}
                </p>
                <p>
                  <span className="font-medium text-black">Status: </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${data.job.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {data.job.status}
                  </span>
                </p>
                <p>
                  <span className="font-medium text-black">Salary: </span>₹{data.job.salary.min} - ₹{data.job.salary.max}
                </p>
                <p>
                  <span className="font-medium text-black">Job Type: </span>
                  {data.job.jobType}
                </p>
                <p>
                  <span className="font-medium text-black">Staff Needed: </span>
                  {data.job.staffNeeded}
                </p>
                <p>
                  <span className="font-medium text-black">Gender Requirement: </span>
                  {data.job.genderRequirement}
                </p>
                <p>
                  <span className="font-medium text-black">Education: </span>
                  {data.job.educationRequirements?.join(', ') || '—'}
                </p>
                <p>
                  <span className="font-medium text-black">Experience: </span>
                  {data.job.experienceRequired}
                </p>
                <div>
                  <span className="font-medium text-black">Description:</span>
                  <p className="mt-1 whitespace-pre-wrap">{data.job.description}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" /> Applicants ({data.applicants.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.applicants.length === 0 ? (
                  <p className="text-sm text-gray-600">No applicants yet.</p>
                ) : (
                  <div className="space-y-3">
                    {data.applicants.map((app) => (
                      <div key={app._id} className="flex items-center justify-between border rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>{app.profile?.name?.slice(0, 1).toUpperCase() || 'U'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-black">{app.profile?.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-600">{app.profile?.jobSeekerData?.jobRole || '—'} • {app.profile?.jobSeekerData?.experience || '—'}</p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">Applied on {new Date(app.appliedAt).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
