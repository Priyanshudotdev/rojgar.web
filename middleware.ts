import { NextResponse, NextRequest } from 'next/server';

// Paths that should be hidden from logged-in users
// Note:
// - '/onboarding' is intentionally NOT guarded so new users can complete onboarding.
// - '/auth' is excluded to prevent /auth/login <-> /profile redirect loops when a stale
//   or invalid 'sessionToken' cookie exists. Auth pages are protected by their server
//   layouts (e.g., app/auth/layout.tsx) which perform role-aware redirects.
const AUTH_GUARD_PATHS = ['/splash', '/role-selection'];

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
      // Edge middleware cannot call server utilities/Convex to derive role.
      // Redirecting to a role-agnostic server route `/profile` centralizes the
      // role-aware redirect on the server (using cookies + server utilities)
      // and avoids redirect loops for invalid/expired tokens that might still
      // be present as cookies.
      const url = req.nextUrl.clone();
      url.pathname = '/profile';
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
