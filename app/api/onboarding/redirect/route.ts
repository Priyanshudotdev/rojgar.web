import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { getOnboardingAwareRedirect } from '@/lib/auth/server-redirect';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const t0 = Date.now();
  try {
    const token = (await cookies()).get('sessionToken')?.value;
    if (!token) {
      return new Response(JSON.stringify({ route: null, reason: 'NO_TOKEN' }), {
        status: 204,
        headers: {
          'content-type': 'application/json',
          'x-debug-onboarding-latency': String(Date.now() - t0),
        },
      });
    }
    const route = await getOnboardingAwareRedirect(token);
    if (!route) {
      return new Response(JSON.stringify({ route: null, reason: 'NO_ROUTE' }), {
        status: 204,
        headers: {
          'content-type': 'application/json',
          'x-debug-onboarding-latency': String(Date.now() - t0),
        },
      });
    }
    return new Response(JSON.stringify({ route }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'x-debug-onboarding-latency': String(Date.now() - t0),
      },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ route: null, error: 'INTERNAL_ERROR' }),
      {
        status: 500,
        headers: {
          'content-type': 'application/json',
          'x-debug-onboarding-error': e?.message || 'unknown',
        },
      },
    );
  }
}
