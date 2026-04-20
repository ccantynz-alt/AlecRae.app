'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.error('[AlecRae Voice] unhandled error:', error);
    }
  }, [error]);

  return (
    <main className="min-h-screen bg-ink-950 text-ink-200 flex items-center justify-center px-4">
      <div className="max-w-lg text-center">
        <a href="/" className="inline-block mb-8">
          <h1 className="font-display text-2xl text-ink-50 tracking-tight">
            AlecRae <span className="text-gold-400">Voice</span>
          </h1>
        </a>
        <div className="bg-ink-900/50 border border-ink-800/60 rounded-2xl p-8">
          <div className="text-gold-400 text-5xl font-display mb-3">&#9888;</div>
          <h2 className="font-display text-2xl text-ink-50 mb-3">
            Something went wrong.
          </h2>
          <p className="text-ink-400 text-sm leading-relaxed mb-6">
            An unexpected error occurred. Your work has not been lost. Please try again,
            and if the problem persists, contact{' '}
            <a href="mailto:support@alecrae.app" className="text-gold-400 hover:text-gold-300">
              support@alecrae.app
            </a>
            .
          </p>
          {error.digest && (
            <p className="text-ink-600 text-xs font-mono mb-6">
              Reference: {error.digest}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="bg-gold-500 text-ink-950 rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-gold-400 transition-colors"
            >
              Try again
            </button>
            <a
              href="/"
              className="bg-ink-800 text-ink-100 rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-ink-700 transition-colors"
            >
              Return home
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
