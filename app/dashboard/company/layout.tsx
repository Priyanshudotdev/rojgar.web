import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { fetchQuery } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import CompanyBottomNav from '@/components/ui/company-bottom-nav';
import { MeProvider } from '@/components/providers/me-provider';

export default async function CompanyDashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('sessionToken')?.value;
  if (!token) redirect('/auth/phone');

  const user = await fetchQuery(api.auth.getUserBySession, { token });
  if (!user) redirect('/auth/phone');
  // Derive role from profile to avoid stale users.role
  const profRes = await fetchQuery(api.profiles.getProfileByUserId, { userId: user._id });
  const derivedRole = profRes?.profile?.companyData ? 'company' : profRes?.profile?.jobSeekerData ? 'job-seeker' : user.role;
  if (derivedRole !== 'company') redirect('/profile');

  // Provide server-fetched user/profile to client to skip extra round trip
  return (
    <div className="h-screen bg-gray-100 flex justify-center items-center">
      <div className="w-full max-w-md h-full bg-white relative overflow-hidden">
        <MeProvider initial={profRes} skipInitialFetch>
          <main className="h-full overflow-y-auto pb-20">{children}</main>
          <CompanyBottomNav />
        </MeProvider>
      </div>
    </div>
  );
}