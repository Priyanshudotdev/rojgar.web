"use client";

import { useMemo, useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Share2, MapPin, DollarSign, Bookmark, BookmarkCheck, Users, Sparkles, GraduationCap, ShieldCheck, Timer } from 'lucide-react';
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
import FloatingActionButton from '@/components/ui/floating-action-button';
import JobStatusBadge from '@/components/ui/job-status-badge';
import EnhancedJobCard from '@/components/ui/enhanced-job-card';
import CompanyProfileCard from '@/components/ui/company-profile-card';

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
  const [bookmarked, setBookmarked] = useState(false);
  const [showFab, setShowFab] = useState(false);
  const createApplication = useMutation(api.jobs.createApplication);

  // Scroll listener (proper effect with cleanup)
  useEffect(() => {
    const handler = () => setShowFab(window.scrollY > 280);
    window.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => window.removeEventListener('scroll', handler);
  }, []);

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

  const canApplyCore = job.status === 'Active' && !applied && !appliedLocal && !submitting;



  // Requirement icon mapping (extensible for future categories)
  const renderRequirement = (req: string) => {
    return (
      <span
        key={req}
        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-white text-gray-700 border border-green-100 shadow-sm"
      >
        <GraduationCap className="w-3.5 h-3.5 text-green-600" /> {req}
      </span>
    );
  };
  return (
    <div className="min-h-screen bg-white relative">
      {/* Gradient Hero Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-green-500 to-emerald-500" />
        <div className="relative pt-4 px-4 pb-8 text-white">
          <div className="flex items-center justify-between">
            <button onClick={() => router.back()} aria-label="Back" className="p-2 rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 ring-white/70">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="text-sm font-medium tracking-wide flex items-center gap-1">
              <Sparkles className="w-4 h-4" /> {headerTitle}
            </div>
            <button
              aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark job'}
              onClick={() => setBookmarked(b => !b)}
              className="p-2 rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 ring-white/70"
            >
              {bookmarked ? <BookmarkCheck className="w-6 h-6" /> : <Bookmark className="w-6 h-6" />}
            </button>
          </div>
          <div className="mt-6 flex gap-4 items-start">
            <div className="w-16 h-16 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center overflow-hidden ring-1 ring-white/20">
              {company?.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <Image src={company.photoUrl} alt={company?.name || 'Company'} width={64} height={64} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/20" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-snug break-words pr-2">{job.title}</h1>
              <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-white/90">
                <span className="font-medium text-sm">{company?.name ?? 'Employer'}</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 border border-white/20 text-[10px] tracking-wide">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
                {(company?.industry || company?.sizeLabel) && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-white/80">
                    {company?.industry}{company?.sizeLabel ? ` • ${company.sizeLabel}` : ''}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[11px] text-white/70">
                  <Timer className="w-3 h-3" /> {company?.responseTime || 'Responds within a week'}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-white/90">
                <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location.city}{job.location.locality ? `, ${job.location.locality}` : ''}</span>
                <span className="inline-flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{formatSalary(job.salary.min, job.salary.max)}</span>
                <JobStatusBadge status={job.status === 'Active' ? 'Active' : job.status as any} postedAt={job.createdAt} />
                <span className="text-white/70">Posted {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="h-10 -mt-6 bg-gradient-to-b from-black/10 to-transparent rounded-t-[1.5rem]" />
      </div>

      <div className="relative z-10 px-4 pt-4 pb-32 space-y-6">
        <EnhancedJobCard
          experience={job.experienceRequired}
            jobType={job.jobType}
            positions={job.staffNeeded}
            staffNeeded={job.staffNeeded}
        />

        <CompanyProfileCard
          name={company?.name}
          photoUrl={company?.photoUrl}
          industry={company?.industry}
          sizeLabel={company?.sizeLabel}
          responseTime={company?.responseTime || 'Typically responds within a week'}
          verified={true}
        />

        {/* Requirements */}
        <Card className="p-4 border-green-100 bg-green-50/50">
          <h3 className="font-semibold mb-3 text-gray-900 flex items-center gap-2"><Users className="w-4 h-4 text-green-600" /> Requirements</h3>
          <div className="flex flex-wrap gap-2">
            {job.educationRequirements?.length
              ? job.educationRequirements.map((req: string) => renderRequirement(req))
              : <p className="text-sm text-gray-600">No specific requirements listed.</p>}
          </div>
        </Card>

        {/* Description */}
        <Card className="p-4 space-y-3 leading-relaxed border-green-100 bg-white/80">
          <h3 className="font-semibold text-gray-900">Job Description</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap tracking-wide">{job.description}</p>
        </Card>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t p-4 flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onShare} aria-label="Share">
          <Share2 className="w-5 h-5" />
        </Button>
        <Button
          onClick={onApply}
          disabled={!canApplyCore}
          className={
            `flex-1 text-white rounded-full h-12 text-sm font-semibold shadow ${!canApplyCore ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`
          }
          title={
            job.status === 'Closed'
              ? 'This job is closed'
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
                : !jobSeekerId
                  ? 'Login to apply'
                  : 'Apply Now'}
        </Button>
      </div>

      {showFab && canApplyCore && (
        <FloatingActionButton
          icon={<Sparkles className="w-7 h-7" />}
          label="Apply"
          onClick={onApply}
          variant="primary"
          position="br"
          loading={submitting}
          ariaLabel="Apply to this job"
        />
      )}
    </div>
  );
}