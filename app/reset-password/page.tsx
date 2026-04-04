'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [strength, setStrength] = useState(0);

  useEffect(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    setStrength(password.length === 0 ? 0 : score);
  }, [password]);

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'][strength];
  const strengthColor = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-400'][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Password reset failed.');
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError('Connection failed. Please try again.');
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <main className="h-full flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <h1 className="font-display text-3xl text-ink-50 tracking-tight mb-1">
              AlecRae <span className="text-gold-400">Voice</span>
            </h1>
          </div>
          <div className="bg-ink-900/60 border border-ink-700/40 rounded-2xl p-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-ink-300 text-sm mb-6">Invalid or missing reset token. Please request a new password reset link.</p>
            <a
              href="/"
              className="inline-block bg-gold-500 hover:bg-gold-400 text-ink-950 font-medium py-2.5 px-6 rounded-xl transition-colors text-sm"
            >
              Back to Sign In
            </a>
          </div>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="h-full flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <h1 className="font-display text-3xl text-ink-50 tracking-tight mb-1">
              AlecRae <span className="text-gold-400">Voice</span>
            </h1>
          </div>
          <div className="bg-ink-900/60 border border-ink-700/40 rounded-2xl p-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-ink-100 font-medium text-lg mb-2">Password Reset</h2>
            <p className="text-ink-400 text-sm mb-6">Your password has been updated successfully. You can now sign in with your new password.</p>
            <a
              href="/"
              className="inline-block bg-gold-500 hover:bg-gold-400 text-ink-950 font-medium py-2.5 px-6 rounded-xl transition-colors text-sm"
            >
              Sign In
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="h-full flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl text-ink-50 tracking-tight mb-1">
            AlecRae <span className="text-gold-400">Voice</span>
          </h1>
          <p className="text-ink-400 text-sm mt-3">Set your new password</p>
        </div>

        <div className="bg-ink-900/60 border border-ink-700/40 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="block text-ink-300 text-xs font-medium mb-1.5 uppercase tracking-wider">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                className="w-full bg-ink-950/60 border border-ink-700/50 rounded-xl px-4 py-3 text-ink-100 placeholder:text-ink-600 focus:border-gold-500/60 transition-colors text-sm"
              />
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          level <= strength ? strengthColor : 'bg-ink-800'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${strength <= 1 ? 'text-red-400' : strength <= 2 ? 'text-orange-400' : strength <= 3 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {strengthLabel}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-ink-300 text-xs font-medium mb-1.5 uppercase tracking-wider">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                className="w-full bg-ink-950/60 border border-ink-700/50 rounded-xl px-4 py-3 text-ink-100 placeholder:text-ink-600 focus:border-gold-500/60 transition-colors text-sm"
              />
              {confirmPassword.length > 0 && confirmPassword !== password && (
                <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || password.length < 8 || password !== confirmPassword}
              className="w-full bg-gold-500 hover:bg-gold-400 disabled:bg-ink-700 disabled:text-ink-500 text-ink-950 font-semibold py-3 rounded-xl transition-all text-sm"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>

        <p className="text-ink-600 text-xs text-center mt-6">
          <a href="/" className="text-ink-400 hover:text-ink-200 transition-colors">
            Back to sign in
          </a>
        </p>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <main className="h-full flex items-center justify-center px-4">
        <div className="text-ink-500 text-sm">Loading...</div>
      </main>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
