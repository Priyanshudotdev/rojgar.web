"use client";

import { useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Share2, MapPin, DollarSign, Bookmark, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { JobDetailsSkeleton } from '@/components/ui/skeleton';
import { useCachedConvexQuery } from '@/hooks/useCachedConvexQuery';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useMe } from '@/components/providers/me-provider';
import { useMutation } from 'convex/react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';

function formatSalary(min: number, max: number) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
  if (min && max) return `₹${fmt(min)} - ₹${fmt(max)}`;
  if (max) return `Up to ₹${fmt(max)}`;
  if (min) return `From ₹${fmt(min)}`;
  return 'Not disclosed';
}

export default function JobDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = (params?.id as string | undefined) as Id<'jobs'> | undefined;

  const { me } = useMe();
  const jobSeekerId = (me?.profile?._id ?? null) as Id<'profiles'> | null;
  const { toast } = useToast();

  const { data, isLoading } = useCachedConvexQuery(
    api.jobs.getJobPublicById,
  jobId ? ({ jobId } as any) : 'skip',
    { key: `job-public-${jobId ?? 'none'}`, ttlMs: 5 * 60 * 1000 },
  );

  const { data: applied } = useCachedConvexQuery(
    api.jobs.hasUserApplied,
    jobId && jobSeekerId
      ? ({ jobId, jobSeekerId } as any)
  : 'skip',
    {
      key:
        jobId && jobSeekerId
          ? `job-applied-${jobId}-${jobSeekerId}`
          : `job-applied-skip`,
      ttlMs: 60 * 1000,
    },
  );

  const [submitting, setSubmitting] = useState(false);
  const [appliedLocal, setAppliedLocal] = useState(false);
  const createApplication = useMutation(api.jobs.createApplication);

  const onShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({ title: data?.job?.title ?? 'Job', url });
      } else {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard');
      }
    } catch {}
  };

  const onApply = async () => {
    if (!jobId || !data?.job) return;
    if (!jobSeekerId) {
      router.push('/auth/login');
      return;
    }
    if (data.job.status === 'Closed') return;
    if (applied || appliedLocal) return;
    try {
      setSubmitting(true);
      await createApplication({ jobId, jobSeekerId });
      setAppliedLocal(true);
      toast({ title: 'Application submitted', description: 'Your application has been sent.' });
    } catch (e: any) {
      toast({ title: 'Could not apply', description: e?.message ?? 'Please try again later.' });
    } finally {
      setSubmitting(false);
    }
  };

  const headerTitle = useMemo(() => {
    if (!data?.job) return 'Details';
    return data.job.title.length > 28
      ? data.job.title.slice(0, 28) + '…'
      : data.job.title;
  }, [data?.job]);

  if (isLoading) return <JobDetailsSkeleton />;

  if (!data) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-between p-4 border-b">
          <button onClick={() => router.back()}>
            <ArrowLeft className="w-6 h-6 text-black" />
          </button>
          <h1 className="font-semibold text-black">Details</h1>
          <div className="w-6 h-6" />
        </div>
        <main className="p-4">
          <p className="text-sm text-gray-600">Job not found.</p>
        </main>
      </div>
    );
  }

  const job = data.job;
  const company = data.company;

  const canApply =
    job.status === 'Active' && !applied && !appliedLocal && !!jobSeekerId && !submitting;
  return (
    <div className="min-h-screen bg-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 border-b">
        <button onClick={() => router.back()}>
          <ArrowLeft className="w-6 h-6 text-black" />
        </button>
        <h1 className="font-semibold text-black">{headerTitle}</h1>
        <Button variant="ghost" size="icon" aria-label="Bookmark">
          <Bookmark className="w-6 h-6 text-black" />
        </Button>
      </div>

      <div className="p-4 space-y-6 pb-28">
        {/* Company Header */}
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
            {company?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <Image
                src={company.photoUrl}
                alt={company?.name || 'Employeer'}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-300" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-gray-600 text-sm">{company?.name ?? 'Employeer'}</p>
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                {job.location.city}
                {job.location.locality ? `, ${job.location.locality}` : ''}
              </div>
            </div>
            <div className="flex items-center mt-1 space-x-4 text-sm text-gray-600">
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 mr-1" />
                {formatSalary(job.salary.min, job.salary.max)}
              </div>
              <span
                className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${job.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {job.status}
              </span>
              <span className="text-xs text-gray-500">
                Posted {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        {/* Key Details */}
        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-3 text-center">
              <div>
                <p className="text-sm text-gray-500">Experience</p>
                <p className="font-semibold text-black">{job.experienceRequired}</p>
              </div>
              <div className="border-l" />
              <div>
                <p className="text-sm text-gray-500">Job Type</p>
                <p className="font-semibold text-black">{job.jobType}</p>
              </div>
              <div className="border-l" />
              <div>
                <p className="text-sm text-gray-500">Positions</p>
                <p className="font-semibold text-black">{job.staffNeeded}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Managed By */}
        <div className="bg-orange-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">This job post is managed by</p>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden">
              {company?.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <Image
                  src={company.photoUrl}
                  alt={company?.name || 'Manager'}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-300"></div>
              )}
            </div>
            <div>
              <p className="font-semibold text-black">{company?.name || 'Hiring Manager'}</p>
              <p className="text-xs text-gray-500">Typically responds within a week</p>
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div>
          <h3 className="font-semibold mb-3 text-black">Requirements</h3>
          <div className="flex flex-wrap gap-2">
            {job.educationRequirements?.length ? (
              job.educationRequirements.map((req: string) => (
                <div key={req} className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md">
                  {req}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-600">No specific requirements listed.</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <h3 className="font-semibold mb-3">Job Description</h3>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{job.description}</p>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={onShare} aria-label="Share">
          <Share2 className="w-6 h-6 text-black" />
        </Button>
        <Button
          onClick={onApply}
          disabled={!canApply}
          className={`w-full max-w-xs text-white rounded-full py-3 ${!canApply ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
          title={
            job.status === 'Closed'
              ? 'This job is closed'
              : !jobSeekerId
                ? 'Please login to apply'
                : applied || appliedLocal
                  ? 'You have already applied'
                  : undefined
          }
        >
          {job.status === 'Closed'
            ? 'Job Closed'
            : applied || appliedLocal
              ? 'Applied'
              : submitting
                ? 'Applying…'
                : 'Apply Now'}
        </Button>
      </div>
    </div>
  );
}