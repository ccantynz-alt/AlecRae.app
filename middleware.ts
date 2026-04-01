import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — no auth needed
  if (pathname === '/' || pathname.startsWith('/api/auth') || pathname.startsWith('/_next') || pathname.startsWith('/manifest') || pathname.endsWith('.png') || pathname.endsWith('.ico')) {
    return NextResponse.next();
  }

  // Protected routes — check session
  if (pathname.startsWith('/app') || pathname.startsWith('/api/transcribe') || pathname.startsWith('/api/enhance')) {
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
  matcher: ['/app/:path*', '/api/transcribe/:path*', '/api/enhance/:path*'],
};
