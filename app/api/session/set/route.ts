import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { token, expiresAt } = await request.json();
  const res = NextResponse.json({ ok: true });
  res.cookies.set('sessionToken', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAt),
  });
  return res;
}
