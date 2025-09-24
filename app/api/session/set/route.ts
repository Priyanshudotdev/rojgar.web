import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      token?: string;
      expiresAt?: number;
    } | null;
    if (!body || typeof body.token !== 'string' || !body.token) {
      console.warn('[POST /api/session/set] Missing or invalid token in body');
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }
    if (
      typeof body.expiresAt !== 'number' ||
      !Number.isFinite(body.expiresAt)
    ) {
      console.warn(
        '[POST /api/session/set] Missing or invalid expiresAt in body',
      );
      return NextResponse.json({ error: 'Invalid expiresAt' }, { status: 400 });
    }
    // Strict token format: 64-hex
    const tokenOk = /^[0-9a-f]{64}$/i.test(body.token);
    if (!tokenOk) {
      console.warn('[POST /api/session/set] Invalid token format');
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 400 },
      );
    }
    const now = Date.now();
    if (body.expiresAt <= now) {
      console.warn('[POST /api/session/set] expiresAt is not in the future');
      return NextResponse.json(
        { error: 'Session already expired' },
        { status: 400 },
      );
    }

    const headers: Record<string, string> = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    };
    const res = NextResponse.json({ ok: true }, { headers });
    try {
      // Standardize secure flag to production only (align with clear endpoint)
      const xfp =
        (request.headers as any).get?.('x-forwarded-proto') || undefined;
      const viaHttps = String(xfp || '').toLowerCase() === 'https';
      const secure = process.env.NODE_ENV === 'production';
      if (process.env.NODE_ENV !== 'production' && viaHttps) {
        console.info(
          '[POST /api/session/set] x-forwarded-proto=https detected (dev)',
        );
      }
      const sameSite: 'lax' = 'lax';
      const cookiePayload = {
        httpOnly: true,
        secure,
        sameSite,
        path: '/',
        expires: new Date(body.expiresAt),
      } as const;
      res.cookies.set('sessionToken', body.token, {
        ...cookiePayload,
      });
      if (process.env.NODE_ENV !== 'production') {
        res.headers.set('x-debug-cookie-secure', String(cookiePayload.secure));
        res.headers.set(
          'x-debug-cookie-samesite',
          String(cookiePayload.sameSite),
        );
        res.headers.set('x-debug-cookie-path', cookiePayload.path);
      }
    } catch (e: any) {
      console.error(
        '[POST /api/session/set] Failed to set cookie:',
        e?.message || e,
      );
      return NextResponse.json(
        { error: 'Failed to set session' },
        { status: 500 },
      );
    }
    // Log only sanitized info (no token value)
    console.info('[POST /api/session/set] Session cookie set', {
      tokenLen: body.token.length,
      exp: body.expiresAt,
      nodeEnv: process.env.NODE_ENV,
    });
    return res;
  } catch (e: any) {
    console.error('[POST /api/session/set] Unexpected error:', e?.message || e);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
