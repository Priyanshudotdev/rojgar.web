/**
 * 204 (No Content) indicates no active session (missing/expired/revoked).
 * 401 is used for malformed/invalid token formats only.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { fetchQuery } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { AuthError, logError } from '@/lib/utils/errors';

export type MeResponse = {
  user: {
    _id: Id<'users'>;
    phone: string | null;
    email: string | null;
    role: string | null;
    phoneVerified: boolean;
    createdAt: string | null;
  };
  profile: any | null;
};

const noCache = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Surrogate-Control': 'no-store',
} as const;

function jsonError(code: string, message: string, status = 400) {
  return NextResponse.json(
    { error: message, code },
    { status, headers: noCache },
  );
}

export async function GET() {
  const t0 = Date.now();
  const cookieStore = cookies();
  const token = cookieStore.get('sessionToken')?.value;
  if (!token) {
    // No session is a valid state: return 204 to reduce noise
    logError('me.get', new AuthError('MISSING_TOKEN'), {});
    const res = new NextResponse(null, { status: 204, headers: noCache });
    if (process.env.NODE_ENV !== 'production') {
      res.headers.set('x-debug-me-took', String(Date.now() - t0));
      res.headers.set('x-debug-me-status', 'missing-token');
    }
    return res;
  }
  // Enforce 64-hex token format
  if (!/^[0-9a-f]{64}$/i.test(token)) {
    logError('me.get', new AuthError('INVALID_TOKEN_FORMAT'), {
      tokenLen: token.length,
    });
    const err = new AuthError('INVALID_TOKEN_FORMAT', 'Invalid token format', {
      category: 'session',
      status: 401,
    });
    const res = jsonError(err.code, err.message, 401);
    if (process.env.NODE_ENV !== 'production') {
      res.headers.set('x-debug-me-took', String(Date.now() - t0));
      res.headers.set('x-debug-me-status', 'invalid-format');
    }
    return res;
  }

  try {
    const t1 = Date.now();
    const user = await fetchQuery(api.auth.getUserBySession, { token });
    if (!user) {
      // Missing/expired/revoked session: treat as no-session (204) to avoid error spam on clients polling
      logError('me.get', new AuthError('SESSION_NOT_FOUND'), {});
      const res = new NextResponse(null, { status: 204, headers: noCache });
      if (process.env.NODE_ENV !== 'production') {
        res.headers.set('x-debug-me-took', String(Date.now() - t0));
        res.headers.set('x-debug-me-lookup', String(Date.now() - t1));
        res.headers.set('x-debug-me-status', 'session-not-found');
      }
      return res;
    }

    let profileData: any = null;
    const t2 = Date.now();
    try {
      profileData = await fetchQuery(api.profiles.getProfileByUserId, {
        userId: user._id,
      });
    } catch (err: any) {
      logError('me.get', new AuthError('PROFILE_FETCH_FAILED'), {
        userId: user._id,
      });
      // Continue without profile — not fatal to session validation
      profileData = null;
    }

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

    // profiles.getProfileByUserId may return { profile } or the profile object itself depending on prior evolution
    const profile = (profileData as any)?.profile ?? profileData ?? null;
    const payload: MeResponse = {
      user: safeUser,
      profile,
    };
    console.info('[me.get] Success', {
      userId: user._id,
      hasProfile: !!payload.profile,
    });
    const res = NextResponse.json(payload, { headers: noCache });
    if (process.env.NODE_ENV !== 'production') {
      res.headers.set('x-debug-me-took', String(Date.now() - t0));
      res.headers.set('x-debug-me-lookup', String(Date.now() - t1));
      res.headers.set('x-debug-me-profile', String(Date.now() - t2));
      res.headers.set('x-debug-me-status', 'ok');
    }
    return res;
  } catch (e: any) {
    logError('me.get', e);
    const err = new AuthError('SERVER_ERROR', 'Internal Server Error', {
      category: 'server',
      status: 500,
    });
    const res = jsonError(err.code, err.message, 500);
    if (process.env.NODE_ENV !== 'production') {
      res.headers.set('x-debug-me-took', String(Date.now() - t0));
      res.headers.set('x-debug-me-status', 'server-error');
    }
    return res;
  }
}
