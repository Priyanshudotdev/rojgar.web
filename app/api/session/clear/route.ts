import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { fetchMutation } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';

export async function POST() {
  let revoked = false;
  let hadToken = false;
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('sessionToken')?.value;
    if (token) {
      hadToken = true;
      const formatOk =
        typeof token === 'string' && /^[0-9a-f]{64}$/i.test(token);
      if (!formatOk) {
        console.warn('[POST /api/session/clear] Invalid token format');
      } else {
        try {
          await fetchMutation(api.auth.signOut, { token });
          revoked = true;
        } catch (err: any) {
          console.warn(
            '[POST /api/session/clear] Failed to revoke session:',
            err?.message || err,
          );
        }
      }
    }
  } catch (e: any) {
    console.error(
      '[POST /api/session/clear] Unexpected error while reading cookies:',
      e?.message || e,
    );
  }

  const res = NextResponse.json({ ok: true, hadToken, revoked });
  try {
    res.cookies.set('sessionToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    });
  } catch (e: any) {
    console.error(
      '[POST /api/session/clear] Failed to clear cookie:',
      e?.message || e,
    );
  }
  if (hadToken) {
    console.info('[POST /api/session/clear] Session cleared', { revoked });
  }
  return res;
}
