import { NextResponse } from 'next/server.js';
import { getTenantSubdomain } from './lib/tenant-hostname.js';

export function proxy(req) {
  const url = req.nextUrl;
  const pathname = url.pathname;

  // Skip static assets, internal Next routes, and API calls
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/uploads/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Server-side guard: Protect /dashboard and all subroutes from unregistered visitors
  if (pathname.startsWith('/dashboard')) {
    const accessToken = req.cookies.get('access_token')?.value;
    const refreshToken = req.cookies.get('refresh_token')?.value;
    const csrfToken = req.cookies.get('csrf_token')?.value;

    if (!accessToken && !refreshToken && !csrfToken) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const subdomain = getTenantSubdomain(req.headers.get('host'));
  const isStorefrontIndex = pathname === '/' || pathname === '/courses' || pathname === '/courses/';
  const isStorefrontCourse = /^\/courses\/[^/]+\/?$/.test(pathname);

  // Tenant hosts also serve the shared sign-in, account recovery, and dashboard routes.
  if (!subdomain || (!isStorefrontIndex && !isStorefrontCourse)) {
    return NextResponse.next();
  }

  const rewriteUrl = new URL(req.url);
  rewriteUrl.pathname = `/org/${subdomain}${isStorefrontIndex ? '' : pathname}`;

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-tenant-slug', subdomain);

  return NextResponse.rewrite(rewriteUrl, {
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/v1(?:/|$)|uploads(?:/|$)).*)',
  ],
};
