import Link from 'next/link';

export const metadata = {
  title: 'Page not found · AlecRae Voice',
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-ink-950 text-ink-200 flex items-center justify-center px-4">
      <div className="max-w-lg text-center">
        <Link href="/" className="inline-block mb-8">
          <h1 className="font-display text-2xl text-ink-50 tracking-tight">
            AlecRae <span className="text-gold-400">Voice</span>
          </h1>
        </Link>
        <div className="bg-ink-900/50 border border-ink-800/60 rounded-2xl p-8">
          <div className="font-display text-gold-400 text-6xl mb-3">404</div>
          <h2 className="font-display text-2xl text-ink-50 mb-3">Page not found.</h2>
          <p className="text-ink-400 text-sm leading-relaxed mb-6">
            The page you were looking for has moved, been renamed, or never existed.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="bg-gold-500 text-ink-950 rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-gold-400 transition-colors"
            >
              Return home
            </Link>
            <Link
              href="/pricing"
              className="bg-ink-800 text-ink-100 rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-ink-700 transition-colors"
            >
              See pricing
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
