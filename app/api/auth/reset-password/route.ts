import { NextRequest, NextResponse } from 'next/server';
import { isDatabaseConfigured, query } from '@/lib/db';
import { hashPassword } from '@/lib/auth-multi';
import { rateLimiters } from '@/lib/rate-limit';
import { consumeResetToken, updateUserPassword } from '@/lib/user-store';

export async function POST(request: NextRequest) {
  const limited = rateLimiters.auth(request);
  if (limited) return limited;

  try {
    const body = await request.json();
    const { token, password } = body as { token?: string; password?: string };

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and new password are required.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    // Validate and consume the token (one-time use)
    const resetEntry = consumeResetToken(token);
    if (!resetEntry) {
      return NextResponse.json(
        { error: 'This reset link has expired or is invalid. Please request a new one.' },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(password);

    if (isDatabaseConfigured()) {
      const result = await query(
        `UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id`,
        [newHash, resetEntry.email]
      );
      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Account not found. Please register a new account.' },
          { status: 404 }
        );
      }
    } else {
      const updated = updateUserPassword(resetEntry.email, newHash);
      if (!updated) {
        return NextResponse.json(
          { error: 'Account not found. Please register a new account.' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in with your new password.',
    });
  } catch (error: unknown) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Password reset failed. Please try again.', code: 'RESET_PASSWORD_ERROR' },
      { status: 500 }
    );
  }
}
