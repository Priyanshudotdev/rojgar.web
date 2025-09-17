import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { fetchQuery } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import JobSeekerBottomNav from '@/components/ui/job-seeker-bottom-nav';

export default async function JobSeekerDashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('sessionToken')?.value;
  if (!token) redirect('/auth/phone');

  const user = await fetchQuery(api.auth.getUserBySession, { token });
  if (!user) redirect('/auth/phone');
  const profRes = await fetchQuery(api.profiles.getProfileByUserId, { userId: user._id });
  const derivedRole = profRes?.profile?.companyData ? 'company' : profRes?.profile?.jobSeekerData ? 'job-seeker' : user.role;
  if (derivedRole !== 'job-seeker') redirect('/profile');

  return (
    <div className="relative min-h-screen pb-16">
      {children}
      <JobSeekerBottomNav />
    </div>
  );
}
