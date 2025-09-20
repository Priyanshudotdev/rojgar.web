import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getRoleBasedDashboardRedirect } from '@/lib/auth/server-redirect';

export default async function ProfileRedirect() {
  const token = cookies().get('sessionToken')?.value;
  if (!token) redirect('/auth/login');
  const path = await getRoleBasedDashboardRedirect(token);
  redirect(path || '/auth/login');
}
