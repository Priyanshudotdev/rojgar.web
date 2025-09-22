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

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get('sessionToken')?.value;
  if (!token) {
    logError('me.get', new AuthError('MISSING_TOKEN'), {});
    const err = new AuthError('MISSING_TOKEN', 'Missing session token', {
      category: 'session',
      status: 401,
    });
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: 401 },
    );
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
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: 401 },
    );
  }

  try {
    const user = await fetchQuery(api.auth.getUserBySession, { token });
    if (!user) {
      logError('me.get', new AuthError('SESSION_NOT_FOUND'), {});
      const err = new AuthError('SESSION_NOT_FOUND', 'No active session', {
        category: 'session',
        status: 401,
      });
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 401 },
      );
    }

    let profileData: any = null;
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

    const payload: MeResponse = {
      user: safeUser,
      profile: profileData ? (profileData as any).profile : null,
    };
    console.info('[me.get] Success', {
      userId: user._id,
      hasProfile: !!payload.profile,
    });
    return NextResponse.json(payload);
  } catch (e: any) {
    logError('me.get', e);
    const err = new AuthError('SERVER_ERROR', 'Internal Server Error', {
      category: 'server',
      status: 500,
    });
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: 500 },
    );
  }
}
