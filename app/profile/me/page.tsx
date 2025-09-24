"use client";
import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileSkeleton } from "@/components/ui/profile-skeleton";
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog";

export default function MyProfilePage() {
  const me = useQuery(api.auth.getUserBySession, { token: (typeof window !== 'undefined' ? document.cookie.split('; ').find((c)=>c.startsWith('sessionToken='))?.split('=')[1] : '') || '' });
  const profileBundle = useQuery(api.profiles.getProfileByUserId, me?._id ? { userId: me._id } : (undefined as any));
  const profile = profileBundle?.profile ?? null;
  const profileId = profile?._id as any;

  const stats = useQuery(api.jobs.getJobSeekerStats, profileId ? { jobSeekerId: profileId } : (undefined as any));
  const recent = useQuery(api.jobs.getJobSeekerRecentActivity, profileId ? { jobSeekerId: profileId, limit: 8 } : (undefined as any));
  const recs = useQuery(api.jobs.getJobRecommendationsForProfile, profileId ? { profileId, limit: 6 } : (undefined as any));

  const [openEdit, setOpenEdit] = React.useState(false);

  if (!profileBundle) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <section className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile?.jobSeekerData?.profilePhotoUrl ?? ""} />
            <AvatarFallback>{profile?.name?.[0] ?? "U"}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold">{profile?.name ?? "Your Name"}</h1>
            <p className="text-muted-foreground">{profile?.jobSeekerData?.jobRole ?? "Add your role"}</p>
            {profile?.jobSeekerData?.location ? (
              <p className="text-sm text-muted-foreground mt-1">{profile.jobSeekerData.location}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {(profile?.jobSeekerData?.skills ?? []).slice(0, 6).map((s: string) => (
                <Badge key={s} variant="secondary">{s}</Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="shrink-0">
          {profile ? (
            <Button onClick={() => setOpenEdit(true)}>Edit profile</Button>
          ) : null}
        </div>
      </section>

      {profile?.companyData?.aboutCompany || profile?.jobSeekerData ? (
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            {profile?.companyData?.aboutCompany ? (
              <p className="whitespace-pre-wrap leading-7 text-[15px]">{profile.companyData.aboutCompany}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Education</div>
                  <div>{profile?.jobSeekerData?.education ?? '-'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Experience</div>
                  <div>{profile?.jobSeekerData?.experience ?? '-'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Gender</div>
                  <div>{profile?.jobSeekerData?.gender ?? '-'}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Applications</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {stats ? stats.totalApplications : "-"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Success rate</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {stats ? `${stats.successRate}%` : "-"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Statuses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(stats?.byStatus ?? []).map((s) => (
                <Badge key={s.status}>{s.status}: {s.count}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {!recent ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              <ul className="space-y-3">
                {recent.map((a) => (
                  <li key={a._id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">
                        Applied to <span className="font-medium">{a.job?.title ?? 'Job'}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">Status: {a.status}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{a.appliedAt ? new Date(a.appliedAt).toLocaleDateString() : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Recommended jobs</CardTitle>
          </CardHeader>
        <CardContent>
            {!recs ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : recs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recommendations yet.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {recs.map((j) => (
                  <div key={j._id} className="p-3 border rounded-md">
                    <p className="font-medium">{j.title}</p>
                    <p className="text-sm text-muted-foreground">{j.company?.name ?? 'Company'}{j.location ? ` · ${j.location}` : ''}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <EditProfileDialog open={openEdit} onOpenChange={setOpenEdit} profileId={profileId ?? ''} initial={profile ?? undefined} />
    </div>
  );
}
