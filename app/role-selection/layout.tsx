
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function RoleLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('sessionToken')?.value;
  if (token) {
    redirect('/profile');
  }
  return <>{children}</>;
}
