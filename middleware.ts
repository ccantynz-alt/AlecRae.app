import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — no auth needed
  if (pathname === '/' || pathname === '/privacy' || pathname.startsWith('/api/auth') || pathname.startsWith('/_next') || pathname.startsWith('/manifest') || pathname.endsWith('.png') || pathname.endsWith('.ico')) {
    return NextResponse.next();
  }

  // DB init route uses its own password check, not JWT
  if (pathname.startsWith('/api/db/')) {
    return NextResponse.next();
  }

  // Protected routes — check session
  // Stripe webhooks have their own signature verification
  if (pathname === '/api/billing/webhook') {
    return NextResponse.next();
  }

  if (pathname.startsWith('/app') || pathname.startsWith('/api/transcribe') || pathname.startsWith('/api/enhance') || pathname.startsWith('/api/dictations') || pathname.startsWith('/api/vocabulary') || pathname.startsWith('/api/settings') || pathname.startsWith('/api/analytics') || pathname.startsWith('/api/firms') || pathname.startsWith('/api/audio') || pathname.startsWith('/api/billing') || pathname.startsWith('/api/admin') || pathname.startsWith('/api/users') || pathname.startsWith('/api/whitelabel')) {
    const session = request.cookies.get('alecrae_session')?.value;
    if (!session) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/', request.url));
    }

    const valid = await verifySession(session);
    if (!valid) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Session expired' }, { status: 401 });
      }
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('alecrae_session');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/api/transcribe/:path*', '/api/transcribe-stream/:path*', '/api/transcribe-batch/:path*', '/api/enhance/:path*', '/api/dictations/:path*', '/api/vocabulary/:path*', '/api/settings/:path*', '/api/analytics/:path*', '/api/db/:path*', '/api/firms/:path*', '/api/audio/:path*', '/api/billing/:path*', '/api/admin/:path*', '/api/users/:path*', '/api/whitelabel/:path*'],
};
