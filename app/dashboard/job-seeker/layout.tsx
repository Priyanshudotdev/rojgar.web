import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import JobSeekerBottomNav from '@/components/ui/job-seeker-bottom-nav';
import { getOnboardingAwareRedirect } from '@/lib/auth/server-redirect';

export default async function JobSeekerDashboardLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get('sessionToken')?.value;
  if (!token) redirect('/auth/login');

  const path = await getOnboardingAwareRedirect(token);
  if (!path) redirect('/auth/login');
  if (path === '/onboarding/job-seeker') redirect(path);
  if (path !== '/dashboard/job-seeker') redirect('/auth/login');

  return (
    <div className="relative min-h-screen pb-16">
      {children}
      <JobSeekerBottomNav />
    </div>
  );
}
