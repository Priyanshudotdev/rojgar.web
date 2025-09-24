"use client";
import * as React from "react";
import { ArrowLeft, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProfilePageSkeleton } from "@/components/ui/skeleton";
import { useMe } from "@/components/providers/me-provider";
import ProfileEditModal from "@/components/job-seeker/profile-edit-modal";

export default function ProfilePage() {
  const router = useRouter();
  const { me, loading, error, refresh } = useMe();
  const profile = me?.profile ?? null;
  const profileId = profile?._id as any;
  const [open, setOpen] = React.useState(false);

  const stats = useQuery(api.jobs.getJobSeekerStats, profileId ? { jobSeekerId: profileId } : (undefined as any));
  const recent = useQuery(api.jobs.getJobSeekerRecentActivity, profileId ? { jobSeekerId: profileId, limit: 6 } : (undefined as any));

  if (loading) return <ProfilePageSkeleton />;
  if (me === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">You need to sign in to view your profile.</p>
          <Button onClick={() => router.push('/auth/login')}>Go to Login</Button>
        </Card>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-6 text-center space-y-3">
          <p className="text-sm text-red-600">{error}</p>
          <Button onClick={refresh}>Retry</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/dashboard/job-seeker')} aria-label="Back">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-semibold">Profile</h1>
          <Settings className="w-6 h-6 text-gray-600" aria-label="Settings" />
        </div>
      </div>

      {/* Profile Section */}
      <div className="p-4 space-y-4">
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="w-20 h-20">
              {profile?.jobSeekerData?.profilePhotoUrl && (
                <AvatarImage src={profile.jobSeekerData.profilePhotoUrl} />
              )}
              <AvatarFallback>
                {profile?.name ? profile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{profile?.name ?? 'Your Name'}</h2>
              <p className="text-muted-foreground">{profile?.jobSeekerData?.jobRole ?? 'Add your role'}</p>
              {profile?.jobSeekerData?.location ? (
                <p className="text-sm text-muted-foreground mt-1">{profile.jobSeekerData.location}</p>
              ) : null}
            </div>
            {profile ? (
              <Button variant="outline" onClick={() => setOpen(true)} aria-label="Edit profile">Edit Profile</Button>
            ) : null}
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <div className="text-sm text-muted-foreground">Applied</div>
            <div className="text-2xl font-semibold">{stats?.totalApplications ?? '-'}</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-sm text-muted-foreground">Success rate</div>
            <div className="text-2xl font-semibold">{stats ? `${stats.successRate}%` : '-'}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground mb-2">By Status</div>
            <div className="flex flex-wrap gap-2">
              {(stats?.byStatus ?? []).map((s) => (
                <Badge key={s.status} variant="secondary">{s.status}: {s.count}</Badge>
              ))}
            </div>
          </Card>
        </div>

        {/* Skills */}
        <Card className="p-4">
          <div className="font-semibold mb-3">Skills</div>
          {profile?.jobSeekerData?.skills?.length ? (
            <div className="flex flex-wrap gap-2">
              {profile.jobSeekerData.skills.map((s: string) => (
                <Badge key={s} variant="secondary">{s}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Add skills to get better matches.</p>
          )}
        </Card>

        <div className="grid md:grid-cols-2 gap-3">
          {/* Education */}
          <Card className="p-4">
            <div className="font-semibold mb-3">Education</div>
            <p className="text-sm text-muted-foreground">{profile?.jobSeekerData?.education || 'Not added yet'}</p>
          </Card>
          {/* Experience */}
          <Card className="p-4">
            <div className="font-semibold mb-3">Experience</div>
            <p className="text-sm text-muted-foreground">{profile?.jobSeekerData?.experience || 'Not added yet'}</p>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="p-4">
          <div className="font-semibold mb-3">Recent activity</div>
          {!recent ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {recent.map((a) => (
                <div key={a._id} className="border rounded-lg p-3">
                  <div className="font-medium">{a.job?.title ?? 'Applied job'}</div>
                  <div className="text-xs text-muted-foreground">Status: {a.status} · {a.appliedAt ? new Date(a.appliedAt).toLocaleDateString() : ''}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <ProfileEditModal open={open} onOpenChange={(v)=>{ setOpen(v); if (!v) { try { refresh(); } catch {} } }} initialProfile={profile as any} />
    </div>
  );
}