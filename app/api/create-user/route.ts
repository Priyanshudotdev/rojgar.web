// DEPRECATED: Registration should use OTP via Convex actions (requestOtp -> verifyOtp).
// This route is kept for backward compatibility but returns 410 Gone to prevent accidental use.
// If you need to create users programmatically, prefer Convex mutations directly.
import { NextResponse } from 'next/server';
import { fetchMutation } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';

export async function POST(request: Request) {
  return NextResponse.json(
    { error: 'Deprecated endpoint. Use OTP flow (requestOtp -> verifyOtp).' },
    { status: 410 },
  );
}
