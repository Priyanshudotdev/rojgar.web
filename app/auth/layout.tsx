import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getRoleBasedDashboardRedirect } from '@/lib/auth/server-redirect';

export const dynamic = 'force-dynamic';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('sessionToken')?.value;

  console.log(token)

  if (token) {
    const path = await getRoleBasedDashboardRedirect(token);
    if (path) redirect(path);
  }
  return <>{children}</>;
}
