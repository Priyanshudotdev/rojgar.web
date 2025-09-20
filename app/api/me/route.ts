import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { fetchQuery } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('sessionToken')?.value;
  if (!token)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await fetchQuery(api.auth.getUserBySession, { token });
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profileData = await fetchQuery(api.profiles.getProfileByUserId, {
    userId: user._id,
  });
  // Sanitize user: return only non-sensitive fields
  const createdAtRaw: any =
    (user as any).createdAt ?? (user as any)._creationTime ?? null;
  const safeUser = {
    _id: user._id,
    phone: (user as any).phone ?? null,
    email: (user as any).email ?? null,
    role: (user as any).role ?? null,
    phoneVerified: (user as any).phoneVerified ?? false,
    createdAt:
      typeof createdAtRaw === 'number'
        ? new Date(createdAtRaw).toISOString()
        : createdAtRaw,
  };

  // Ensure top-level shape is always an object with user and profile keys
  return NextResponse.json({
    user: safeUser,
    profile: profileData ? (profileData as any).profile : null,
  });
}
