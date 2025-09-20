import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import CompanyBottomNav from '@/components/ui/company-bottom-nav';
import { getOnboardingAwareRedirect } from '@/lib/auth/server-redirect';

export default async function CompanyDashboardLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get('sessionToken')?.value;
  if (!token) redirect('/auth/login');

  const path = await getOnboardingAwareRedirect(token);
  if (!path) redirect('/auth/login');
  if (path === '/onboarding/company') redirect(path);
  if (path !== '/dashboard/company') redirect('/auth/login');

  return (
    <div className="h-screen bg-gray-100 flex justify-center items-center">
      <div className="w-full max-w-md h-full bg-white relative overflow-hidden">
        <main className="h-full overflow-y-auto pb-20">{children}</main>
        <CompanyBottomNav />
      </div>
    </div>
  );
}