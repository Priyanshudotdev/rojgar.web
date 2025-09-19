import { NextResponse, NextRequest } from 'next/server';

// Paths that should be hidden from logged-in users
const AUTH_GUARD_PATHS = ['/splash', '/auth', '/role-selection', '/onboarding'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/static') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|map)$/)
  ) {
    return NextResponse.next();
  }

  const sessionToken = req.cookies.get('sessionToken')?.value;

  // If user is logged in, block access to splash/auth/onboarding/role-selection
  if (sessionToken) {
    const isGuarded = AUTH_GUARD_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + '/'),
    );
    if (isGuarded) {
      const url = req.nextUrl.clone();
      url.pathname = '/profile'; // server page will redirect to the right dashboard
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Intercept all pages except images/fonts/_next/static by default; filters applied in code
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
