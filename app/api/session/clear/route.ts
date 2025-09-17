import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { fetchMutation } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';

export async function POST() {
  // Try to revoke the Convex session if present
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sessionToken')?.value;
    if (token) {
      await fetchMutation(api.auth.signOut, { token });
    }
  } catch (e) {
    // Swallow errors to ensure logout always clears cookie client-side
  }

  const res = NextResponse.json({ ok: true });
  // Expire the cookie
  res.cookies.set('sessionToken', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });
  return res;
}
