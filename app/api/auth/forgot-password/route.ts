import { NextRequest, NextResponse } from 'next/server';
import { isDatabaseConfigured, query } from '@/lib/db';
import { rateLimiters } from '@/lib/rate-limit';
import { findUserByEmail, generateResetToken, storeResetToken } from '@/lib/user-store';

export async function POST(request: NextRequest) {
  const limited = rateLimiters.auth(request);
  if (limited) return limited;

  try {
    const body = await request.json();
    const { email } = body as { email?: string };

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    // Always return success to avoid revealing whether an email exists.
    // Behind the scenes, only generate a token if the user actually exists.
    const successMessage =
      'If an account with that email exists, a password reset link has been sent. Please check your inbox.';

    let userExists = false;

    if (isDatabaseConfigured()) {
      const rows = await query(`SELECT id FROM users WHERE email = $1`, [email]);
      userExists = rows.length > 0;
    } else {
      userExists = !!findUserByEmail(email);
    }

    if (userExists) {
      const token = generateResetToken();
      storeResetToken(email, token, 3600000); // 1 hour TTL

      // Build the reset URL
      const origin = request.headers.get('origin') || request.nextUrl.origin;
      const resetUrl = `${origin}/reset-password?token=${token}`;

      // Log to console for now — email integration will be added later
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('PASSWORD RESET LINK');
      console.log(`Email: ${email}`);
      console.log(`URL:   ${resetUrl}`);
      console.log(`Expires: ${new Date(Date.now() + 3600000).toISOString()}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    return NextResponse.json({ success: true, message: successMessage });
  } catch (error: unknown) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.', code: 'FORGOT_PASSWORD_ERROR' },
      { status: 500 }
    );
  }
}
