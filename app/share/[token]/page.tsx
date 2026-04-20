'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

const GOLD = '#d4a84e';

type ViewState =
  | { status: 'loading' }
  | { status: 'password-required' }
  | { status: 'error'; code: 'expired' | 'revoked' | 'not-found' | 'wrong-password' | 'unknown' }
  | {
      status: 'loaded';
      title: string;
      content: string;
      mode: string;
      createdAt: string;
      expiresAt: string | null;
    };

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-NZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatMode(mode: string): string {
  return mode
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function ShareViewerPage() {
  const params = useParams();
  const token = typeof params?.token === 'string' ? params.token : '';

  const [state, setState] = useState<ViewState>({ status: 'loading' });
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial fetch (no password)
  useEffect(() => {
    if (!token) {
      setState({ status: 'error', code: 'not-found' });
      return;
    }
    fetchShare(token, undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function fetchShare(tok: string, pw: string | undefined) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/share/view/${encodeURIComponent(tok)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pw !== undefined ? { password: pw } : {}),
      });

      if (res.ok) {
        const data = await res.json() as {
          title: string;
          content: string;
          mode: string;
          createdAt: string;
          expiresAt: string | null;
        };
        setState({
          status: 'loaded',
          title: data.title,
          content: data.content,
          mode: data.mode,
          createdAt: data.createdAt,
          expiresAt: data.expiresAt,
        });
        setPasswordError('');
        return;
      }

      let errorCode: string = 'unknown';
      try {
        const body = await res.json() as { error?: string };
        errorCode = body?.error ?? 'unknown';
      } catch {
        // ignore
      }

      if (errorCode === 'password-required') {
        setState({ status: 'password-required' });
      } else if (errorCode === 'wrong-password') {
        setState({ status: 'password-required' });
        setPasswordError('Incorrect password. Please try again.');
      } else if (errorCode === 'expired') {
        setState({ status: 'error', code: 'expired' });
      } else if (errorCode === 'revoked') {
        setState({ status: 'error', code: 'revoked' });
      } else {
        setState({ status: 'error', code: 'not-found' });
      }
    } catch {
      setState({ status: 'error', code: 'unknown' });
    } finally {
      setSubmitting(false);
    }
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) {
      setPasswordError('Please enter the password.');
      return;
    }
    setPasswordError('');
    fetchShare(token, password);
  }

  async function copyContent(text: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      // silently fail
    }
  }

  function handlePrint() {
    window.print();
  }

  // ----- Render helpers -----

  const headerBar = (
    <header
      className="no-print flex items-center justify-between px-6 py-4 border-b border-ink-800"
      style={{ backgroundColor: '#0d1117' }}
    >
      <a href="https://alecrae.app" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <span
          className="font-display text-lg tracking-wide"
          style={{ color: GOLD, fontFamily: 'Georgia, serif' }}
        >
          AlecRae Voice
        </span>
        <span className="hidden sm:inline text-xs text-ink-500 border border-ink-800 rounded px-1.5 py-0.5 ml-1">
          Shared Draft
        </span>
      </a>
      <a
        href="https://alecrae.app"
        className="text-xs px-3 py-1.5 rounded border border-ink-700 text-ink-400 hover:text-ink-100 hover:border-ink-600 transition-colors"
      >
        Open AlecRae Voice
      </a>
    </header>
  );

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-ink-950 text-ink-100">
        {headerBar}
        <main className="flex items-center justify-center min-h-[70vh]">
          <div className="flex flex-col items-center gap-3 text-ink-500">
            <span
              className="inline-block h-6 w-6 rounded-full border-2 animate-spin"
              style={{ borderColor: `${GOLD}44`, borderTopColor: GOLD }}
            />
            <span className="text-sm">Loading shared document…</span>
          </div>
        </main>
      </div>
    );
  }

  if (state.status === 'password-required') {
    return (
      <div className="min-h-screen bg-ink-950 text-ink-100">
        {headerBar}
        <main className="flex items-center justify-center min-h-[70vh] px-4">
          <div
            className="w-full max-w-sm rounded-xl border border-ink-800 bg-ink-900/60 p-6 backdrop-blur-sm"
            style={{ boxShadow: `0 0 0 1px ${GOLD}18, 0 8px 32px rgba(0,0,0,0.5)` }}
          >
            <div className="flex items-center gap-3 mb-5">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-lg border"
                style={{ borderColor: `${GOLD}44`, color: GOLD }}
              >
                {/* Lock icon */}
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </span>
              <div>
                <p className="font-display text-sm" style={{ color: GOLD, fontFamily: 'Georgia, serif' }}>
                  Password Protected
                </p>
                <p className="text-xs text-ink-500 mt-0.5">Enter the password to view this document.</p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoFocus
                className="w-full rounded-lg border border-ink-700 bg-ink-950 px-4 py-2.5 text-sm text-ink-100 placeholder-ink-600 focus:border-ink-500 transition-colors"
              />
              {passwordError && (
                <p className="text-xs text-red-400/90" role="alert">{passwordError}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50"
                style={{
                  backgroundColor: GOLD,
                  color: '#0a0a0a',
                }}
              >
                {submitting ? 'Verifying…' : 'View Document'}
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  if (state.status === 'error') {
    const messages: Record<string, { heading: string; body: string }> = {
      'expired': {
        heading: 'Link Expired',
        body: 'This share link has expired. Please contact the person who shared it with you.',
      },
      'revoked': {
        heading: 'Link Revoked',
        body: 'This share link has been revoked by its owner.',
      },
      'not-found': {
        heading: 'Document Not Found',
        body: 'This share link is invalid or has been removed.',
      },
      'unknown': {
        heading: 'Something Went Wrong',
        body: 'Unable to load the shared document. Please try again or contact support.',
      },
    };
    const msg = messages[state.code] ?? messages['unknown'];

    return (
      <div className="min-h-screen bg-ink-950 text-ink-100">
        {headerBar}
        <main className="flex items-center justify-center min-h-[70vh] px-4">
          <div className="w-full max-w-sm text-center">
            <div
              className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-ink-800 mb-5"
              style={{ color: GOLD }}
            >
              {/* Info icon */}
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h1 className="font-display text-xl mb-2" style={{ fontFamily: 'Georgia, serif', color: GOLD }}>
              {msg.heading}
            </h1>
            <p className="text-sm text-ink-400">{msg.body}</p>
          </div>
        </main>
      </div>
    );
  }

  // Loaded state
  const { title, content, mode, createdAt, expiresAt } = state;
  const wc = wordCount(content);

  return (
    <>
      {/* Print-specific styles injected inline */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-area { max-width: 100% !important; padding: 0 !important; }
          .content-box {
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
          .content-text { color: black !important; white-space: pre-wrap; font-family: 'Cambria', Georgia, serif; font-size: 11pt; line-height: 1.6; }
          .print-header { display: block !important; }
        }
        @media screen {
          .print-header { display: none; }
        }
      `}</style>

      <div className="min-h-screen bg-ink-950 text-ink-100">
        {headerBar}

        {/* Print-only header */}
        <div className="print-header" style={{ padding: '0 0 16px 0', borderBottom: '1px solid #ccc' }}>
          <p style={{ fontSize: '10pt', color: '#666', margin: 0 }}>
            AlecRae Voice — Shared Draft · {formatMode(mode)} · {formatDate(createdAt)}
          </p>
        </div>

        <main className="mx-auto max-w-3xl px-4 py-10 print-area">
          {/* Document header */}
          <div className="mb-6">
            <div className="flex flex-wrap items-start gap-3 mb-3">
              <span
                className="inline-block text-xs px-2 py-1 rounded border"
                style={{ borderColor: `${GOLD}40`, color: GOLD, backgroundColor: `${GOLD}0f` }}
              >
                {formatMode(mode)}
              </span>
              <span className="text-xs text-ink-500 mt-0.5">
                Shared by anonymous · {wc.toLocaleString()} words
              </span>
            </div>

            <h1
              className="font-display text-2xl sm:text-3xl leading-snug"
              style={{ fontFamily: 'Georgia, serif', color: '#e8d5a3' }}
            >
              {title}
            </h1>

            <div className="flex flex-wrap gap-4 mt-3 text-xs text-ink-500">
              <span>Created {formatDate(createdAt)}</span>
              {expiresAt && (
                <span>
                  Expires {formatDate(expiresAt)}
                  {new Date(expiresAt) < new Date() ? (
                    <span className="ml-1 text-red-400"> (expired)</span>
                  ) : null}
                </span>
              )}
              {!expiresAt && <span>No expiry</span>}
            </div>
          </div>

          {/* Content */}
          <div
            className="content-box rounded-xl border border-ink-800 bg-ink-900/40 p-6 sm:p-8 mb-6"
            style={{ boxShadow: `0 0 0 1px ${GOLD}10` }}
          >
            <pre
              className="content-text text-ink-100 text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-body"
              style={{ fontFamily: 'Georgia, Cambria, serif' }}
            >
              {content}
            </pre>
          </div>

          {/* Action bar — hidden on print */}
          <div className="no-print flex flex-wrap gap-3 justify-between items-center">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => copyContent(content)}
                className="flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900/60 px-4 py-2 text-sm text-ink-300 hover:text-ink-100 hover:border-ink-600 transition-colors"
              >
                {/* Copy icon */}
                <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="5" width="10" height="12" rx="1.5" />
                  <path d="M8 5V3.5A1.5 1.5 0 019.5 2h5A1.5 1.5 0 0116 3.5v10A1.5 1.5 0 0114.5 15H13" />
                </svg>
                {copied ? 'Copied!' : 'Copy text'}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900/60 px-4 py-2 text-sm text-ink-300 hover:text-ink-100 hover:border-ink-600 transition-colors"
              >
                {/* Printer icon */}
                <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 7V3h10v4" />
                  <rect x="2" y="7" width="16" height="8" rx="1.5" />
                  <path d="M5 15v2h10v-2" />
                </svg>
                Print
              </button>

              <a
                href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`I've shared a document with you via AlecRae Voice:\n\n${window.location.href}\n\nTitle: ${title}`)}`}
                className="flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900/60 px-4 py-2 text-sm text-ink-300 hover:text-ink-100 hover:border-ink-600 transition-colors"
              >
                {/* Mail icon */}
                <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="16" height="12" rx="2" />
                  <path d="M2 7l8 5 8-5" />
                </svg>
                Email link
              </a>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-ink-600">
              {/* Shield icon */}
              <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 2L3 5.5v5.5c0 3.5 3 6 7 7 4-1 7-3.5 7-7V5.5L10 2z" />
              </svg>
              Read-only · Powered by AlecRae Voice
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
