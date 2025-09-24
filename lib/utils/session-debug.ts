/*
  Session Debug Utilities
  Safe for browser usage; avoids leaking sensitive values by masking.
*/

export const isProd = () =>
  (process.env.NODE_ENV || '').toLowerCase() === 'production';
export const now = () => Date.now();

export function is64Hex(token: string | undefined | null): boolean {
  if (!token || typeof token !== 'string') return false;
  return /^[0-9a-f]{64}$/i.test(token);
}

export function maskToken(token: string | undefined | null): string {
  if (!token) return '(none)';
  const s = String(token);
  if (s.length <= 12) return s.replace(/./g, '*');
  return `${s.slice(0, 6)}…${s.slice(-6)}`;
}

export function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name + '=([^;]*)'),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function inspectSessionCookie() {
  try {
    const token = readCookie('sessionToken');
    const len = token?.length || 0;
    return {
      present: !!token,
      length: len,
      is64Hex: is64Hex(token || ''),
      masked: maskToken(token),
    };
  } catch {
    return { present: false, length: 0, is64Hex: false, masked: '(error)' };
  }
}

export type TraceResult<T = Response> = {
  ok: boolean;
  status: number;
  ms: number;
  res: T | null;
  error?: string;
};

export async function traceFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<TraceResult> {
  const t0 = now();
  try {
    const res = await fetch(input, init);
    const ms = now() - t0;
    return { ok: res.ok, status: res.status, ms, res };
  } catch (e: any) {
    const ms = now() - t0;
    return {
      ok: false,
      status: 0,
      ms,
      res: null,
      error: e?.message || String(e),
    };
  }
}

export async function testCookieSetting(token: string, expiresAt: number) {
  const payload = { token, expiresAt };
  const t0 = now();
  const res = await traceFetch('/api/session/set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const setMs = now() - t0;
  const after = inspectSessionCookie();
  if (!isProd()) {
    console.info('[session-debug] Cookie set result', {
      status: res.status,
      ms: res.ms,
      setMs,
      cookie: after,
    });
  }
  return { ...res, after };
}

export async function testSessionRetrieval() {
  const res = await traceFetch('/api/me', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });
  if (!isProd()) {
    console.info('[session-debug] /api/me result', {
      status: res.status,
      ms: res.ms,
    });
  }
  return res;
}

export async function attemptSessionRecovery() {
  if (!isProd()) console.warn('[session-debug] Attempting session recovery');
  await traceFetch('/api/session/clear', {
    method: 'POST',
    credentials: 'include',
  });
}

export function debugCookieAttributes() {
  // In browser we cannot read httpOnly/sameSite of cookies; expose expected policy for logging purposes.
  return {
    expected: {
      name: 'sessionToken',
      path: '/',
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: isProd(),
    },
  };
}
