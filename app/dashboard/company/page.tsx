
"use client";

import Logo from '@/components/ui/logo';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, PlusCircle, Briefcase, Users, MoreVertical, BarChart3, Pencil, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CompanyNotificationsBell } from '@/components/company/notifications-bell';
import { UploadButton } from '@uploadthing/react';
import type { OurFileRouter } from '@/app/api/uploadthing/core';
import { CompanyTopBar } from '@/components/company/topbar';
import { DashboardHeaderSkeleton, JobCardSkeleton } from '@/components/ui/skeleton';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useMe } from '@/components/providers/me-provider';
import { useCachedConvexQuery } from '@/hooks/useCachedConvexQuery';
import { invalidateKeys } from '@/hooks/useInvalidateCachedQuery';
import { LogoutButton } from '@/components/auth/logout-button';

type JobWithStats = {
  _id: Id<'jobs'>;
  title: string;
  location: { city: string; locality?: string };
  status: 'Active' | 'Closed';
  applicantCount: number;
};

export default function CompanyDashboardPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  // Get current user/profile via shared provider (cached)
  const { me, loading: meLoading, refresh } = useMe();
  const companyId = (me?.profile?._id ?? null) as Id<'profiles'> | null;
  // Enhanced profile completion validation
  const isProfileComplete = (profile: any) => {
    if (!profile) return false;
    const data = profile.companyData || {};
    return !!(data.companyName && data.contactPerson && data.companyAddress);
  };

  const { data: jobs } = useCachedConvexQuery(
    api.jobs.getJobsWithStatsByCompany,
  companyId ? ({ companyId } as any) : 'skip',
    { key: 'jobsByCompany', ttlMs: 2 * 60 * 1000 }
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
      invalidateKeys(['jobsByCompany', 'company-jobs']);
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
      invalidateKeys(['jobsByCompany', 'company-jobs']);
    } else {
      alert('Failed to close job');
    }
  };

  // No local dummy data; rely on real profile from /api/me via MeProvider

  const filteredJobs = useMemo(() => {
    const list = (jobs ?? []) as JobWithStats[];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((j: JobWithStats) => j.title.toLowerCase().includes(q) || j.location.city.toLowerCase().includes(q));
  }, [jobs, searchQuery]);

  const totals = useMemo(() => {
    const list = (jobs ?? []) as JobWithStats[];
    const activeJobs = list.filter((j: JobWithStats) => j.status === 'Active').length;
    const closedJobs = list.filter((j: JobWithStats) => j.status === 'Closed').length;
    const totalApplicants = list.reduce((acc: number, j: JobWithStats) => acc + ((j as any).applicantCount ?? 0), 0);
    const totalJobs = list.length;
    const avgApplicants = totalJobs > 0 ? Math.round((totalApplicants / totalJobs) * 10) / 10 : 0;
    return { activeJobs, closedJobs, totalApplicants, totalJobs, avgApplicants };
  }, [jobs]);

  // Profile edit feature hooks & handlers
  const upsertCompanyProfile = useMutation(api.users.upsertCompanyProfile);
  const setCompanyPhoto = useMutation(api.profiles.setCompanyPhoto);
  const [editing, setEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editValues, setEditValues] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    companyAddress: '',
    aboutCompany: '',
    companyPhotoUrl: '',
  });

  useEffect(() => {
    if (editing && me?.profile) {
      setEditValues({
        companyName: me.profile.companyData?.companyName || '',
        contactPerson: me.profile.companyData?.contactPerson || '',
        email: me.profile.companyData?.email || '',
        companyAddress: me.profile.companyData?.companyAddress || '',
        aboutCompany: me.profile.companyData?.aboutCompany || '',
        companyPhotoUrl: me.profile.companyData?.companyPhotoUrl || '',
      });
    }
  }, [editing, me?.profile]);

  // Unauthenticated minimal fallback (middleware should handle this; guard just in case)
  useEffect(() => {
    if (!meLoading && !me) {
      try { router.replace('/auth/login'); } catch {}
    }
  }, [meLoading, me, router]);

  const handleSaveProfile = async () => {
    if (!me?.user?._id) return;
    setSavingProfile(true);
    try {
      await upsertCompanyProfile({
        userId: me.user._id as any,
  name: editValues.contactPerson || editValues.companyName || me.profile.name || 'Employeer',
        contactNumber: me.profile.contactNumber || '',
        companyData: {
          companyName: editValues.companyName,
          contactPerson: editValues.contactPerson,
          email: editValues.email || 'unknown@example.com',
          companyAddress: editValues.companyAddress,
          aboutCompany: editValues.aboutCompany,
          companyPhotoUrl: editValues.companyPhotoUrl || '',
        },
      });
      // Refresh MeProvider state to reflect latest profile
      try { router.refresh(); } catch {}
      try { await refresh(); } catch {}
      setEditing(false);
    } catch (e: any) {
      alert(e.message || 'Failed to save');
    } finally {
      setSavingProfile(false);
    }
  };

  const editOverlay = editing ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-lg overflow-hidden relative">
        <button
          aria-label="Close"
          onClick={() => !savingProfile && setEditing(false)}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
          <h2 className="text-xl font-semibold text-black">Edit Employeer Profile</h2>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border">
              {editValues.companyPhotoUrl ? (
                <img src={editValues.companyPhotoUrl} alt="Employeer" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm text-gray-500">No Image</span>
              )}
            </div>
            <UploadButton<OurFileRouter, "companyImage">
              endpoint="companyImage"
              appearance={{ button: 'bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-2 rounded-md' }}
              onClientUploadComplete={async (res) => {
                const url = (res as any)?.[0]?.url as string | undefined;
                if (url) {
                  setEditValues((p) => ({ ...p, companyPhotoUrl: url }));
                  if (me?.profile?._id) {
                    const token = (typeof document !== 'undefined' ? document.cookie.split('; ').find(c => c.startsWith('sessionToken='))?.split('=')[1] : '') || '';
                    try { await setCompanyPhoto({ profileId: me.profile._id as any, url, token }); try { await refresh(); } catch {} } catch {}
                  }
                }
              }}
              onUploadError={() => alert('Upload failed')}
            />
          </div>
          <div className="grid gap-4">
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Employeer Name</span>
              <Input value={editValues.companyName} onChange={(e) => setEditValues(v => ({ ...v, companyName: e.target.value }))} className="bg-white text-black" />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Contact Person</span>
              <Input value={editValues.contactPerson} onChange={(e) => setEditValues(v => ({ ...v, contactPerson: e.target.value }))} className="bg-white text-black" />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Email</span>
              <Input type="email" value={editValues.email} onChange={(e) => setEditValues(v => ({ ...v, email: e.target.value }))} className="bg-white text-black" />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Employeer Address</span>
              <textarea value={editValues.companyAddress} onChange={(e) => setEditValues(v => ({ ...v, companyAddress: e.target.value }))} className="bg-white text-black rounded-md border border-gray-300 p-2 h-20 resize-none" />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">About Employeer</span>
              <textarea value={editValues.aboutCompany} onChange={(e) => setEditValues(v => ({ ...v, aboutCompany: e.target.value }))} className="bg-white text-black rounded-md border border-gray-300 p-2 h-28 resize-none" />
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" disabled={savingProfile} onClick={() => setEditing(false)} className="border-gray-300 text-gray-700 hover:bg-gray-100">Cancel</Button>
            <Button onClick={handleSaveProfile} disabled={savingProfile} className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
              {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="bg-white">

      {/* Unauthenticated minimal fallback (middleware should handle this; guard just in case) */}
      {!meLoading && !me && (
        <div className="p-4 text-center text-gray-500">You are not logged in.</div>
      )}

      {/* Header */}
      {meLoading ? (
        <DashboardHeaderSkeleton />
      ) : (
        <CompanyTopBar
          left={
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                {me?.profile?.companyData?.companyPhotoUrl ? (
                  <AvatarImage src={me?.profile?.companyData?.companyPhotoUrl as string} />
                ) : (
                  <Logo size={40} alt="Employeer Logo" className="rounded-full" />
                )}
                <AvatarFallback>
                  {(() => {
                    const name = (me?.profile?.companyData?.companyName || me?.profile?.name || '') as string;
                    const initials = name
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((s) => s[0]?.toUpperCase())
                      .join('');
                    return initials || 'CO';
                  })()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-semibold text-black text-lg flex items-center gap-2">
                  {(me?.profile?.companyData?.companyName || me?.profile?.name) as string}
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="ml-1 text-gray-500 hover:text-black"
                    aria-label="Edit profile"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </h1>
                {/* Remove dummy city; show contact person if available */}
                {me?.profile?.companyData?.contactPerson && (
                  <p className="text-sm text-gray-600">Contact: {me?.profile?.companyData?.contactPerson}</p>
                )}
              </div>
            </div>
          }
          right={
            <div className="flex text-black items-center gap-2">
              <CompanyNotificationsBell companyId={companyId} />
              <LogoutButton />
            </div>  
          }
        />
      )}

{/* Search and Post Job */}
      <div className="px-4 mt-4 pb-4 bg-white flex items-center space-x-2">
        <div className="relative flex-grow">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search Jobs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white text-black placeholder-gray-500 border border-gray-200 focus:ring-2 focus:ring-green-500"
          />
        </div>
        <Button size="icon" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => router.push('/dashboard/company/jobs/new')}>
          <PlusCircle className="w-5 h-5" />
        </Button>
      </div>
      {/* Stats Cards */}
      <div className="p-4 grid grid-cols-2 gap-4">
        <Card className="bg-green-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs ? totals.activeJobs : '—'}</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applicants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs ? totals.totalApplicants : '—'}</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs ? totals.closedJobs : '—'}</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Applicants / Job</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs ? totals.avgApplicants : '—'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Job Postings Section */}
      <main className="flex-1 px-4 pb-24 pt-2 overflow-y-auto bg-white">
        <h2 className="text-lg font-semibold text-black mb-4">Your Job Postings</h2>
        <div className="space-y-4">
          {meLoading ? (
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
          ) : jobs && jobs.length === 0 && searchQuery.trim() === '' ? (
            !isProfileComplete(me?.profile) ? (
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
              <Card className="p-6 bg-white rounded-xl border border-dashed border-gray-300 text-center">
                <div className="flex flex-col items-center gap-3">
                  <Briefcase className="w-8 h-8 text-gray-400" />
                  <h3 className="font-semibold text-black">You have no jobs posted!!!</h3>
                  <p className="text-sm text-gray-600">Post your first job to start receiving applicants.</p>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={() => router.push('/dashboard/company/jobs/new')}>
                    <PlusCircle className="w-4 h-4 mr-2" /> Post a Job
                  </Button>
                </div>
              </Card>
            )
          ) : (
            filteredJobs.map((job: JobWithStats) => (
                <Card key={job._id} onClick={() => router.push(`/dashboard/company/jobs/${job._id}`)} className="p-4 cursor-pointer bg-white rounded-xl border border-gray-100">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div>
                        <h3 className="font-semibold text-black text-base">{job.title}</h3>
                        <p className="text-xs text-gray-600">{job.location.city}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/company/jobs/${job._id}`)}>View Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(job._id as any); }}>Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); onDelete(job._id as any); }}>Delete</DropdownMenuItem>
                        {job.status === 'Active' && (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClose(job._id as any); }}>Close Job</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">{job.applicantCount ?? 0} Applicants</p>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${job.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{job.status}</span>
                  </div>
                </Card>
              )))
          }
          {!meLoading && jobs && jobs.length > 0 && filteredJobs.length === 0 && (
            <p className="text-sm text-gray-600">No jobs found.</p>
          )}
        </div>
      </main>
      {editOverlay}
    </div>
  );
}