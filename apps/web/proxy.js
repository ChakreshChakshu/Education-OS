import { NextResponse } from 'next/server';

function getSubdomain(host) {
  if (!host) return null;
  const cleanHost = host.split(':')[0].toLowerCase();

  // Root local hosts
  if (cleanHost === 'localhost' || cleanHost === '127.0.0.1') {
    return null;
  }

  // Handle *.localhost (e.g. mit.localhost)
  if (cleanHost.endsWith('.localhost')) {
    const parts = cleanHost.split('.');
    return parts.length > 1 && parts[0] !== 'www' ? parts[0] : null;
  }

  // Handle *.lvh.me (e.g. mit.lvh.me)
  if (cleanHost.endsWith('.lvh.me')) {
    const parts = cleanHost.split('.');
    return parts.length > 2 && parts[0] !== 'www' ? parts[0] : null;
  }

  // Handle configured root domain or fallback to educationos.com
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'educationos.com';
  if (cleanHost.endsWith(`.${rootDomain}`)) {
    const sub = cleanHost.slice(0, -(rootDomain.length + 1));
    return sub && sub !== 'www' ? sub : null;
  }

  // If host has 3+ parts and not an IP, treat first segment as subdomain
  const parts = cleanHost.split('.');
  if (parts.length >= 3 && parts[0] !== 'www' && !/^\d+$/.test(parts[0])) {
    return parts[0];
  }

  return null;
}

export function proxy(req) {
  const url = req.nextUrl;
  const pathname = url.pathname;

  // Skip static assets, internal Next routes, and API calls
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
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

  const host = req.headers.get('host') || '';
  const subdomain = getSubdomain(host);

  // If no subdomain, serve root site as-is
  if (!subdomain) {
    return NextResponse.next();
  }

  // Prevent rewrite loops if already prefixed
  if (pathname.startsWith(`/org/${subdomain}`)) {
    return NextResponse.next();
  }

  // Rewrite to /org/[subdomain]/[...path]
  const targetPath = `/org/${subdomain}${pathname === '/' ? '' : pathname}`;
  const rewriteUrl = new URL(targetPath, req.url);

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
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
