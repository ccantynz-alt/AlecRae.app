'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type AuthView = 'login' | 'register' | 'forgot' | 'admin';

export default function LoginPage() {
  const [view, setView] = useState<AuthView>('login');

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regTerms, setRegTerms] = useState(false);
  const [strength, setStrength] = useState(0);

  // Forgot state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Admin state
  const [adminPassword, setAdminPassword] = useState('');

  // Reset error when switching views
  useEffect(() => {
    setError('');
    setForgotSent(false);
  }, [view]);

  // Password strength calculation
  useEffect(() => {
    let score = 0;
    if (regPassword.length >= 8) score++;
    if (regPassword.length >= 12) score++;
    if (/[A-Z]/.test(regPassword) && /[a-z]/.test(regPassword)) score++;
    if (/[0-9]/.test(regPassword)) score++;
    if (/[^A-Za-z0-9]/.test(regPassword)) score++;
    setStrength(regPassword.length === 0 ? 0 : score);
  }, [regPassword]);

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'][strength];
  const strengthColor = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-400'][strength];

  // ─── Handlers ────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid credentials.');
        setLoading(false);
        return;
      }

      router.push('/app');
    } catch {
      setError('Connection failed. Please check your internet and try again.');
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setError('All fields are required.');
      return;
    }

    if (regPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (regPassword !== regConfirm) {
      setError('Passwords do not match.');
      return;
    }

    if (!regTerms) {
      setError('You must accept the terms to continue.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim(),
          password: regPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed.');
        setLoading(false);
        return;
      }

      router.push('/app');
    } catch {
      setError('Connection failed. Please check your internet and try again.');
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Something went wrong.');
        setLoading(false);
        return;
      }

      setForgotSent(true);
      setLoading(false);
    } catch {
      setError('Connection failed. Please try again.');
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      });

      if (!res.ok) {
        setError('Invalid admin password.');
        setLoading(false);
        return;
      }

      router.push('/app');
    } catch {
      setError('Connection failed.');
      setLoading(false);
    }
  };

  // ─── Shared UI elements ──────────────────────────────────

  const inputClass =
    'w-full bg-ink-950/60 border border-ink-700/50 rounded-xl px-4 py-3 text-ink-100 placeholder:text-ink-600 focus:border-gold-500/60 focus:ring-1 focus:ring-gold-500/20 transition-all text-sm';

  const primaryButtonClass =
    'w-full bg-gold-500 hover:bg-gold-400 disabled:bg-ink-700 disabled:text-ink-500 text-ink-950 font-semibold py-3 rounded-xl transition-all text-sm tracking-wide';

  const linkClass = 'text-gold-400/80 hover:text-gold-300 transition-colors cursor-pointer';

  // Error display component
  const ErrorDisplay = () =>
    error ? (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 animate-fade-in">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    ) : null;

  // ─── Render ──────────────────────────────────────────────

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-500/20 to-gold-600/5 border border-gold-500/20 mb-5">
            <svg className="w-8 h-8 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h1 className="font-display text-3xl text-ink-50 tracking-tight">
            AlecRae <span className="text-gold-400">Voice</span>
          </h1>
          <p className="text-ink-400 text-sm mt-2">
            Professional dictation for legal &amp; accounting
          </p>
        </div>

        {/* Card */}
        <div className="bg-ink-900/60 border border-ink-700/40 rounded-2xl p-8 shadow-2xl shadow-black/20 backdrop-blur-sm">

          {/* ─── LOGIN VIEW ────────────────────────────── */}
          {view === 'login' && (
            <div className="animate-fade-in">
              <h2 className="text-ink-100 font-medium text-lg mb-6 text-center">
                Sign in to your account
              </h2>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-ink-300 text-xs font-medium mb-1.5 uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@yourfirm.com"
                    autoFocus
                    autoComplete="email"
                    className={inputClass}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="login-password" className="block text-ink-300 text-xs font-medium uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setView('forgot')}
                      className="text-xs text-ink-500 hover:text-gold-400/80 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className={inputClass}
                  />
                </div>

                <ErrorDisplay />

                <button
                  type="submit"
                  disabled={loading || !email.trim() || !password.trim()}
                  className={primaryButtonClass}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-ink-800/60">
                <p className="text-ink-500 text-sm text-center">
                  Don&apos;t have an account?{' '}
                  <button onClick={() => setView('register')} className={linkClass}>
                    Create one
                  </button>
                </p>
              </div>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setView('admin')}
                  className="text-ink-600 hover:text-ink-400 text-xs transition-colors"
                >
                  Admin access
                </button>
              </div>
            </div>
          )}

          {/* ─── REGISTER VIEW ─────────────────────────── */}
          {view === 'register' && (
            <div className="animate-fade-in">
              <h2 className="text-ink-100 font-medium text-lg mb-6 text-center">
                Create your account
              </h2>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label htmlFor="reg-name" className="block text-ink-300 text-xs font-medium mb-1.5 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Jane Smith"
                    autoFocus
                    autoComplete="name"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="reg-email" className="block text-ink-300 text-xs font-medium mb-1.5 uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="you@yourfirm.com"
                    autoComplete="email"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="reg-password" className="block text-ink-300 text-xs font-medium mb-1.5 uppercase tracking-wider">
                    Password
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    className={inputClass}
                  />
                  {regPassword.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
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
                  <label htmlFor="reg-confirm" className="block text-ink-300 text-xs font-medium mb-1.5 uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <input
                    id="reg-confirm"
                    type="password"
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    className={inputClass}
                  />
                  {regConfirm.length > 0 && regConfirm !== regPassword && (
                    <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
                  )}
                </div>

                <div className="flex items-start gap-3 pt-1">
                  <input
                    id="reg-terms"
                    type="checkbox"
                    checked={regTerms}
                    onChange={(e) => setRegTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-ink-600 bg-ink-950/60 text-gold-500 focus:ring-gold-500/20 focus:ring-offset-0 cursor-pointer accent-[#c4a23a]"
                  />
                  <label htmlFor="reg-terms" className="text-ink-400 text-xs leading-relaxed cursor-pointer">
                    I agree to the{' '}
                    <a href="/privacy" className="text-gold-400/80 hover:text-gold-300 underline underline-offset-2">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="/privacy" className="text-gold-400/80 hover:text-gold-300 underline underline-offset-2">
                      Privacy Policy
                    </a>
                  </label>
                </div>

                <ErrorDisplay />

                <button
                  type="submit"
                  disabled={loading || !regName.trim() || !regEmail.trim() || regPassword.length < 8 || regPassword !== regConfirm || !regTerms}
                  className={primaryButtonClass}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating account...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-ink-800/60">
                <p className="text-ink-500 text-sm text-center">
                  Already have an account?{' '}
                  <button onClick={() => setView('login')} className={linkClass}>
                    Sign in
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* ─── FORGOT PASSWORD VIEW ──────────────────── */}
          {view === 'forgot' && (
            <div className="animate-fade-in">
              {!forgotSent ? (
                <>
                  <div className="text-center mb-6">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                    <h2 className="text-ink-100 font-medium text-lg">Reset your password</h2>
                    <p className="text-ink-500 text-sm mt-2">
                      Enter your email address and we&apos;ll send you a link to reset your password.
                    </p>
                  </div>

                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label htmlFor="forgot-email" className="block text-ink-300 text-xs font-medium mb-1.5 uppercase tracking-wider">
                        Email Address
                      </label>
                      <input
                        id="forgot-email"
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="you@yourfirm.com"
                        autoFocus
                        autoComplete="email"
                        className={inputClass}
                      />
                    </div>

                    <ErrorDisplay />

                    <button
                      type="submit"
                      disabled={loading || !forgotEmail.trim()}
                      className={primaryButtonClass}
                    >
                      {loading ? (
                        <span className="inline-flex items-center gap-2">
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Sending...
                        </span>
                      ) : (
                        'Send Reset Link'
                      )}
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <h2 className="text-ink-100 font-medium text-lg mb-2">Check your email</h2>
                  <p className="text-ink-400 text-sm mb-1">
                    If an account exists for <span className="text-ink-200">{forgotEmail}</span>,
                  </p>
                  <p className="text-ink-400 text-sm">
                    you&apos;ll receive a password reset link shortly.
                  </p>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-ink-800/60">
                <p className="text-ink-500 text-sm text-center">
                  <button onClick={() => setView('login')} className={linkClass}>
                    Back to sign in
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* ─── ADMIN VIEW ────────────────────────────── */}
          {view === 'admin' && (
            <div className="animate-fade-in">
              <div className="text-center mb-6">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-ink-800/60 border border-ink-700/40 flex items-center justify-center">
                  <svg className="w-6 h-6 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <h2 className="text-ink-100 font-medium text-lg">Admin Access</h2>
                <p className="text-ink-500 text-sm mt-2">
                  Enter the system admin password
                </p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Admin password"
                    autoFocus
                    autoComplete="current-password"
                    className={`${inputClass} text-center tracking-wider`}
                  />
                </div>

                <ErrorDisplay />

                <button
                  type="submit"
                  disabled={loading || !adminPassword.trim()}
                  className={primaryButtonClass}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Authenticating...
                    </span>
                  ) : (
                    'Sign In as Admin'
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-ink-800/60">
                <p className="text-ink-500 text-sm text-center">
                  <button onClick={() => setView('login')} className={linkClass}>
                    Back to sign in
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-ink-600 text-xs">
            Secured access &middot; All data encrypted in transit
          </p>
          <a
            href="/privacy"
            className="text-ink-500 hover:text-ink-300 text-xs transition-colors underline underline-offset-2 inline-block"
          >
            Privacy &amp; Data Handling
          </a>
        </div>
      </div>
    </main>
  );
}
