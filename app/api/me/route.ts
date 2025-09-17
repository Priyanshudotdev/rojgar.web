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
  return NextResponse.json(profileData);
}
