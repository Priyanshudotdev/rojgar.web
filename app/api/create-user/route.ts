import { NextResponse } from 'next/server';
import { fetchMutation } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  try {
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { phone, role } = body as {
      phone?: string;
      role?: 'job-seeker' | 'company';
    };
    if (!phone) {
      return NextResponse.json({ error: 'Missing phone' }, { status: 400 });
    }
    const normalized = phone.startsWith('+') ? phone : `+91${phone}`;
    const normalizedRole = role ?? 'job-seeker';
    if (normalizedRole !== 'job-seeker' && normalizedRole !== 'company') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    const userId = await fetchMutation(api.users.createUser, {
      phone: normalized,
      role: normalizedRole,
    });
    return NextResponse.json({ userId });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: 500 },
    );
  }
}
