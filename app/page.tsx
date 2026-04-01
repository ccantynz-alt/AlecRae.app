'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError('Invalid credentials');
        setLoading(false);
        return;
      }

      router.push('/app');
    } catch {
      setError('Connection failed');
      setLoading(false);
    }
  };

  return (
    <main className="h-full flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl text-ink-50 tracking-tight mb-1">
            AlecRae <span className="text-gold-400">Voice</span>
          </h1>
          <p className="text-ink-400 text-sm">Professional dictation for legal &amp; accounting</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              autoFocus
              autoComplete="current-password"
              className="w-full bg-ink-900 border border-ink-700/50 rounded-xl px-4 py-3 text-ink-100 placeholder:text-ink-500 focus:border-gold-500/60 transition-colors text-center text-lg tracking-wider"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center animate-fade-in">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full bg-gold-500 hover:bg-gold-400 disabled:bg-ink-700 disabled:text-ink-400 text-ink-950 font-medium py-3 rounded-xl transition-all text-sm"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-ink-600 text-xs text-center mt-8">
          Secured access · All data encrypted in transit
        </p>
      </div>
    </main>
  );
}
