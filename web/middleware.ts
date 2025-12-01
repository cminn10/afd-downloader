import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Only apply to API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const origin = request.headers.get('origin');
  const response = NextResponse.next();

  // Check if origin is allowed
  if (origin && isOriginAllowed(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': origin && isOriginAllowed(origin) ? origin : '',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  }

  return response;
}

function isOriginAllowed(origin: string): boolean {
  // Parse the allowed patterns from environment variable
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '*';

  // If wildcard, allow all
  if (allowedOriginsEnv === '*') {
    return true;
  }

  // Support comma-separated list of allowed domains
  const allowedDomains = allowedOriginsEnv.split(',').map((d) => d.trim());

  // Parse origin to check domain
  try {
    const url = new URL(origin);
    const hostname = url.hostname;

    // Check if it's a direct IP access (IPv4 or IPv6)
    // IPv4: 1.2.3.4
    // IPv6: [2001:db8::1] or 2001:db8::1
    const isIP =
      /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) ||
      hostname.startsWith('[') ||
      /^[0-9a-fA-F:]+$/.test(hostname);

    if (isIP) {
      return true; // Allow all IP access
    }

    // Check against allowed domains
    for (const domain of allowedDomains) {
      // Exact match
      if (hostname === domain) return true;

      // Subdomain match (e.g. api.example.com for example.com)
      if (hostname.endsWith(`.${domain}`)) return true;
    }

    return false;
  } catch {
    return false;
  }
}

export const config = {
  matcher: '/api/:path*',
};
