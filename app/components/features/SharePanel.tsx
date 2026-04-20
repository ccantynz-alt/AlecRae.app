'use client';

import { useEffect, useRef, useState } from 'react';

const GOLD = '#d4a84e';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface ShareRecord {
  id: string;
  token: string;
  title: string;
  mode: string;
  createdAt: string;
  expiresAt: string | null;
  passwordProtected: boolean;
  revoked: boolean;
  viewCount: number;
}

interface CreatedShare extends ShareRecord {
  url: string;
}

export interface SharePanelProps {
  title: string;
  content: string;
  mode: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const EXPIRY_OPTIONS = [
  { label: '1 hour', seconds: 3_600 },
  { label: '1 day', seconds: 86_400 },
  { label: '1 week', seconds: 604_800 },
  { label: 'Never', seconds: 0 },
] as const;

function shareUrl(token: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/share/${token}`;
  }
  return `/share/${token}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-NZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatMode(mode: string): string {
  return mode.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                             */
/* -------------------------------------------------------------------------- */

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleCopy() {
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
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // silently fail
    }
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-md border border-ink-700 bg-ink-950 px-2.5 py-1 text-xs text-ink-300 hover:text-ink-100 hover:border-ink-600 transition-colors whitespace-nowrap"
    >
      {copied ? (
        <>
          {/* Check icon */}
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke={GOLD} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 8 6.5 11.5 13 5" />
          </svg>
          <span style={{ color: GOLD }}>Copied!</span>
        </>
      ) : (
        <>
          {/* Copy icon */}
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="4" width="8" height="9" rx="1.2" />
            <path d="M6 4V3A1.2 1.2 0 017.2 1.8h4A1.2 1.2 0 0112.4 3v8A1.2 1.2 0 0111.2 12.2H10" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

export function SharePanel({ title, content, mode }: SharePanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [draftTitle, setDraftTitle] = useState('');
  const [expiryIndex, setExpiryIndex] = useState(1); // default: 1 day
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Submission state
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [created, setCreated] = useState<CreatedShare | null>(null);

  // List state
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [revoking, setRevoking] = useState<string | null>(null);

  // Sync draft title when prop changes
  useEffect(() => {
    setDraftTitle(title || '');
  }, [title]);

  // Load list when panel opens
  useEffect(() => {
    if (!collapsed) {
      loadShares();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed]);

  async function loadShares() {
    setListLoading(true);
    setListError('');
    try {
      const res = await fetch('/api/share');
      if (!res.ok) throw new Error('Failed to load shares');
      const data = await res.json() as { shares: ShareRecord[] };
      setShares(data.shares ?? []);
    } catch {
      setListError('Could not load share links.');
    } finally {
      setListLoading(false);
    }
  }

  function openModal() {
    setDraftTitle(title || '');
    setPassword('');
    setExpiryIndex(1);
    setCreateError('');
    setCreated(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setCreated(null);
    setCreateError('');
    // Refresh list after creating
    loadShares();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!content?.trim()) {
      setCreateError('No content to share. Add dictation text first.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const expiry = EXPIRY_OPTIONS[expiryIndex];
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draftTitle || title || 'Untitled Dictation',
          content,
          mode,
          expiresInSeconds: expiry.seconds > 0 ? expiry.seconds : undefined,
          password: password.length > 0 ? password : undefined,
        }),
      });
      if (!res.ok) {
        let msg = `Error ${res.status}`;
        try { const b = await res.json() as { error?: string }; if (b?.error) msg = b.error; } catch { /* ignore */ }
        throw new Error(msg);
      }
      const data = await res.json() as ShareRecord;
      setCreated({ ...data, url: shareUrl(data.token) });
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create share link');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    setRevoking(id);
    try {
      const res = await fetch(`/api/share/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Revoke failed');
      setShares((prev) => prev.filter((s) => s.id !== id));
      if (created?.id === id) setCreated(null);
    } catch {
      // silently — user can retry
    } finally {
      setRevoking(null);
    }
  }

  const activeShares = shares.filter((s) => !s.revoked && !isExpired(s.expiresAt));
  const hasContent = !!(content?.trim());

  return (
    <>
      <section
        aria-label="Share dictation"
        className="rounded-xl border border-ink-800 bg-ink-900/50 text-ink-100 backdrop-blur-sm overflow-hidden"
      >
        {/* Collapsible header */}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-ink-800/40 transition-colors"
          aria-expanded={!collapsed}
        >
          <span className="flex items-center gap-3 min-w-0">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-md border"
              style={{ borderColor: `${GOLD}44`, color: GOLD }}
              aria-hidden
            >
              {/* Share icon */}
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </span>
            <span className="flex items-baseline gap-2 min-w-0">
              <span className="font-display text-sm tracking-wide" style={{ color: GOLD, fontFamily: 'Georgia, serif' }}>
                Share
              </span>
              {activeShares.length > 0 && (
                <span className="text-ink-400 text-xs">{activeShares.length} active</span>
              )}
            </span>
          </span>
          <span className="flex items-center gap-2 text-ink-500">
            <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" aria-hidden className={`transition-transform ${collapsed ? '' : 'rotate-180'}`}>
              <path d="M5.5 7.5l4.5 4.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        {/* Body */}
        {!collapsed && (
          <div className="border-t border-ink-800/70 px-4 py-3 space-y-3">
            {/* Generate link button */}
            <button
              type="button"
              onClick={openModal}
              disabled={!hasContent}
              title={hasContent ? 'Generate a secure share link for this dictation' : 'Add dictation content first'}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: `${GOLD}18`,
                border: `1px solid ${GOLD}44`,
                color: GOLD,
              }}
            >
              {/* Plus icon */}
              <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                <line x1="10" y1="4" x2="10" y2="16" />
                <line x1="4" y1="10" x2="16" y2="10" />
              </svg>
              Generate share link
            </button>

            {/* Active share list */}
            {listLoading && (
              <p className="text-xs text-ink-500 flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${GOLD}44`, borderTopColor: 'transparent' }} />
                Loading…
              </p>
            )}
            {listError && <p className="text-xs text-red-400/90" role="alert">{listError}</p>}

            {!listLoading && activeShares.length === 0 && (
              <p className="text-xs text-ink-500">No active share links.</p>
            )}

            {activeShares.length > 0 && (
              <ul className="space-y-2">
                {activeShares.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-col gap-1.5 rounded-lg border border-ink-800 bg-ink-950/60 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm text-ink-100 truncate font-medium">{s.title}</p>
                        <p className="text-xs text-ink-500 mt-0.5">
                          {formatMode(s.mode)} · {s.viewCount} view{s.viewCount !== 1 ? 's' : ''}
                          {s.passwordProtected && (
                            <span className="ml-1.5" title="Password protected">
                              🔒
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-ink-600 mt-0.5">
                          Created {formatDate(s.createdAt)}
                          {s.expiresAt && (
                            <span> · Expires {formatDate(s.expiresAt)}</span>
                          )}
                          {!s.expiresAt && <span> · No expiry</span>}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRevoke(s.id)}
                        disabled={revoking === s.id}
                        title="Revoke this share link"
                        className="shrink-0 text-xs text-red-400/70 hover:text-red-400 disabled:opacity-50 transition-colors px-2 py-1 rounded border border-transparent hover:border-red-800/40"
                      >
                        {revoking === s.id ? 'Revoking…' : 'Revoke'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink-600 truncate flex-1 font-mono">
                        {shareUrl(s.token)}
                      </span>
                      <CopyButton text={shareUrl(s.token)} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Modal                                                               */}
      {/* ------------------------------------------------------------------ */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-ink-800 bg-ink-900 text-ink-100 overflow-hidden"
            style={{ boxShadow: `0 0 0 1px ${GOLD}20, 0 24px 64px rgba(0,0,0,0.7)` }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-ink-800">
              <div className="flex items-center gap-2.5">
                <span style={{ color: GOLD }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                </span>
                <h2 className="font-display text-base tracking-wide" style={{ color: GOLD, fontFamily: 'Georgia, serif' }}>
                  Share Draft
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-ink-500 hover:text-ink-300 transition-colors"
                aria-label="Close"
              >
                <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                  <line x1="5" y1="5" x2="15" y2="15" />
                  <line x1="15" y1="5" x2="5" y2="15" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="px-5 py-4">
              {!created ? (
                /* ---- Create form ---- */
                <form onSubmit={handleCreate} className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-xs text-ink-400 mb-1.5" htmlFor="share-title">
                      Document title
                    </label>
                    <input
                      id="share-title"
                      type="text"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      placeholder="e.g. Memo — Smith v Jones"
                      className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3.5 py-2 text-sm text-ink-100 placeholder-ink-600 focus:border-ink-500 transition-colors"
                    />
                  </div>

                  {/* Expiry */}
                  <div>
                    <label className="block text-xs text-ink-400 mb-1.5" htmlFor="share-expiry">
                      Link expiry
                    </label>
                    <select
                      id="share-expiry"
                      value={expiryIndex}
                      onChange={(e) => setExpiryIndex(Number(e.target.value))}
                      className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3.5 py-2 text-sm text-ink-100 focus:border-ink-500 transition-colors"
                    >
                      {EXPIRY_OPTIONS.map((opt, i) => (
                        <option key={opt.label} value={i}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Optional password */}
                  <div>
                    <label className="block text-xs text-ink-400 mb-1.5" htmlFor="share-password">
                      Password{' '}
                      <span className="text-ink-600">(optional — leave blank for open link)</span>
                    </label>
                    <div className="relative">
                      <input
                        id="share-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Set a password…"
                        autoComplete="new-password"
                        className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3.5 py-2 pr-10 text-sm text-ink-100 placeholder-ink-600 focus:border-ink-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300 transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
                            <path d="M3 3l14 14M9.9 9.9A3 3 0 0010 13a3 3 0 003-3 3 3 0 00-.1-.1M10.6 6.1A8 8 0 0117.3 10a8 8 0 01-1.8 2.3M6.5 6.5A8 8 0 002.7 10a8 8 0 005.8 3.9" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
                            <path d="M10 4C5.5 4 2 10 2 10s3.5 6 8 6 8-6 8-6-3.5-6-8-6z" />
                            <circle cx="10" cy="10" r="2.5" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {createError && (
                    <p className="text-xs text-red-400/90" role="alert">{createError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={creating}
                    className="w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50"
                    style={{ backgroundColor: GOLD, color: '#0a0a0a' }}
                  >
                    {creating ? 'Generating…' : 'Generate link'}
                  </button>
                </form>
              ) : (
                /* ---- Post-creation view ---- */
                <div className="space-y-4">
                  <div
                    className="flex items-start gap-2 rounded-lg border border-emerald-800/50 bg-emerald-950/30 px-3 py-2.5"
                  >
                    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="#34d399" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                      <polyline points="4 10 8 14 16 6" />
                    </svg>
                    <p className="text-xs text-emerald-300">Share link created successfully.</p>
                  </div>

                  {/* URL display */}
                  <div>
                    <p className="text-xs text-ink-400 mb-1.5">Share URL</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0 rounded-lg border border-ink-700 bg-ink-950 px-3 py-2">
                        <p className="text-xs text-ink-300 font-mono truncate">{created.url}</p>
                      </div>
                      <CopyButton text={created.url} label="Copy URL" />
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-3 text-xs text-ink-500">
                    <span>
                      Expires:{' '}
                      <span className="text-ink-300">
                        {created.expiresAt ? formatDate(created.expiresAt) : 'Never'}
                      </span>
                    </span>
                    {created.passwordProtected && (
                      <span className="flex items-center gap-1 text-ink-400">
                        <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="7" width="12" height="8" rx="1.5" />
                          <path d="M5 7V5a3 3 0 016 0v2" />
                        </svg>
                        Password protected
                      </span>
                    )}
                  </div>

                  {/* Email mailto */}
                  <a
                    href={`mailto:?subject=${encodeURIComponent(`Shared: ${created.title}`)}&body=${encodeURIComponent(`I've shared a document with you via AlecRae Voice.\n\nView it here: ${created.url}\n\nTitle: ${created.title}${created.expiresAt ? `\nExpires: ${formatDate(created.expiresAt)}` : ''}`)}`}
                    className="flex items-center justify-center gap-2 w-full rounded-lg border border-ink-700 bg-ink-950/60 px-4 py-2 text-sm text-ink-300 hover:text-ink-100 hover:border-ink-600 transition-colors"
                  >
                    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="16" height="12" rx="2" />
                      <path d="M2 7l8 5 8-5" />
                    </svg>
                    Email this link
                  </a>

                  {/* Revoke */}
                  <div className="flex items-center justify-between pt-1 border-t border-ink-800">
                    <button
                      type="button"
                      onClick={() => handleRevoke(created.id)}
                      disabled={revoking === created.id}
                      className="text-xs text-red-400/70 hover:text-red-400 disabled:opacity-50 transition-colors"
                    >
                      {revoking === created.id ? 'Revoking…' : 'Revoke link'}
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="text-xs text-ink-400 hover:text-ink-200 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
