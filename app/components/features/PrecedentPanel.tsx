'use client';

import { useEffect, useRef, useState } from 'react';

/* -------------------------------------------------------------------------- */
/*  Types (mirrored from lib/precedent.ts — kept local to avoid pulling the   */
/*  server-side module into the client bundle.)                                */
/* -------------------------------------------------------------------------- */

type HistoryDoc = {
  id: string;
  mode: string;
  raw: string;
  enhanced: string;
  date: string;
};

type PrecedentMatch = {
  id: string;
  mode: string;
  snippet: string;
  score: number;
  date: string;
  matchedTerms: string[];
};

type PrecedentResponse = {
  matches: PrecedentMatch[];
  indexedDocs: number;
};

interface PrecedentPanelProps {
  /** Current dictation text (raw or enhanced) to match against history. */
  text: string;
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const GOLD = '#d4a84e';
const HISTORY_KEY = 'av_history';
const DEBOUNCE_MS = 1200;
const MAX_DOCS = 100;

/* -------------------------------------------------------------------------- */
/*  Small helpers                                                               */
/* -------------------------------------------------------------------------- */

/** Format mode identifier into a readable label. */
function modeLabel(mode: string): string {
  return mode
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Format an ISO date string into a short human-readable form. */
function formatDate(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

/**
 * Score bar fills from 0–100%.
 * Colour transitions: amber (low) → gold (mid) → emerald (high).
 */
function scoreColour(score: number): string {
  if (score >= 0.7) return '#34d399'; // emerald
  if (score >= 0.4) return GOLD;
  return '#f59e0b'; // amber
}

/**
 * Highlight matched terms within a snippet by wrapping them in a <mark>-like
 * span. Matching is case-insensitive and matches whole words.
 *
 * Returns an array of React-renderable segments.
 */
function highlightTerms(
  snippet: string,
  terms: string[]
): Array<{ text: string; highlight: boolean }> {
  if (!terms.length) return [{ text: snippet, highlight: false }];

  // Escape special regex chars in each term and build a combined pattern
  const escaped = terms
    .filter(Boolean)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  if (!escaped.length) return [{ text: snippet, highlight: false }];

  let pattern: RegExp;
  try {
    pattern = new RegExp(`(${escaped.join('|')})`, 'gi');
  } catch {
    return [{ text: snippet, highlight: false }];
  }

  const parts = snippet.split(pattern);
  const termSet = new Set(terms.map((t) => t.toLowerCase()));

  return parts.map((part) => ({
    text: part,
    highlight: termSet.has(part.toLowerCase()),
  }));
}

/* -------------------------------------------------------------------------- */
/*  Read localStorage history                                                  */
/* -------------------------------------------------------------------------- */

function readHistory(): HistoryDoc[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((d): d is Record<string, unknown> => d !== null && typeof d === 'object')
      .slice(0, MAX_DOCS)
      .map((d, i) => ({
        id:       typeof d['id']       === 'string' ? d['id']       : String(i),
        mode:     typeof d['mode']     === 'string' ? d['mode']     : 'general',
        raw:      typeof d['raw']      === 'string' ? d['raw']      : '',
        enhanced: typeof d['enhanced'] === 'string' ? d['enhanced'] : '',
        date:     typeof d['date']     === 'string' ? d['date']     : '',
      }));
  } catch {
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/*  Copy-to-clipboard helper                                                   */
/* -------------------------------------------------------------------------- */

async function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback
  if (typeof document !== 'undefined') {
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
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function PrecedentPanel({ text }: PrecedentPanelProps) {
  const [result, setResult] = useState<PrecedentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef    = useRef<AbortController | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search on text change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    const trimmed = text?.trim() ?? '';

    if (!trimmed) {
      setResult(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Check for history before starting the debounce timer
    const history = readHistory();
    if (history.length === 0) {
      setResult(null);
      setError(null);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/precedents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: trimmed, docs: history, limit: 5 }),
          signal: controller.signal,
        });

        if (!res.ok) {
          let msg = `Request failed (${res.status})`;
          try {
            const errBody = (await res.json()) as { error?: string };
            if (errBody?.error) msg = errBody.error;
          } catch { /* ignore */ }
          throw new Error(msg);
        }

        const data = (await res.json()) as PrecedentResponse;
        setResult(data);
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Precedent search failed');
        setResult(null);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  async function handleCopy(match: PrecedentMatch) {
    try {
      await copyToClipboard(match.snippet);
      setCopiedId(match.id);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError('Could not copy to clipboard');
    }
  }

  const hasMatches = !!result && result.matches.length > 0;
  const matchCount = result?.matches.length ?? 0;
  const indexedDocs = result?.indexedDocs ?? 0;

  // Empty state: hide entirely when there is no text, no history, and nothing happening
  const showPanel = loading || hasMatches || !!error;
  if (!showPanel) return null;

  return (
    <section
      aria-label="Precedent match"
      className="rounded-xl border border-ink-800 bg-ink-900/50 text-ink-100 backdrop-blur-sm overflow-hidden"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Header / collapse toggle                                            */}
      {/* ------------------------------------------------------------------ */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-ink-800/40 transition-colors"
        aria-expanded={!collapsed}
      >
        <span className="flex items-center gap-3 min-w-0">
          {/* Icon */}
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md border shrink-0"
            style={{ borderColor: `${GOLD}44`, color: GOLD }}
            aria-hidden
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Books / precedent icon */}
              <path d="M4 19V6a2 2 0 012-2h2" />
              <path d="M8 4h10a2 2 0 012 2v13a2 2 0 01-2 2H8a2 2 0 01-2-2V4z" />
              <path d="M11 9h4" />
              <path d="M11 12h4" />
              <path d="M11 15h2" />
            </svg>
          </span>

          {/* Title + count */}
          <span className="flex items-baseline gap-2 min-w-0">
            <span className="font-display text-sm tracking-wide" style={{ color: GOLD }}>
              Precedent Match
            </span>
            {loading && !result && (
              <span className="text-ink-400 text-xs">Indexing…</span>
            )}
            {!loading && hasMatches && (
              <span className="text-ink-400 text-xs">
                {matchCount} similar
              </span>
            )}
          </span>

          {/* Searched-docs badge */}
          {!loading && hasMatches && !collapsed && (
            <span className="hidden sm:inline text-[11px] text-ink-500 ml-1">
              Searched {indexedDocs} past {indexedDocs === 1 ? 'document' : 'documents'}
            </span>
          )}
        </span>

        {/* Right side: spinner + chevron */}
        <span className="flex items-center gap-2 text-ink-500 shrink-0">
          {loading && (
            <span
              className="inline-block h-3.5 w-3.5 rounded-full border-2 animate-spin"
              aria-label="Searching"
              style={{
                borderColor: `${GOLD}66`,
                borderTopColor: 'transparent',
              }}
            />
          )}
          <svg
            viewBox="0 0 20 20"
            width="14"
            height="14"
            fill="currentColor"
            aria-hidden
            className={`transition-transform ${collapsed ? '' : 'rotate-180'}`}
          >
            <path
              d="M5.5 7.5l4.5 4.5 4.5-4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {/* ------------------------------------------------------------------ */}
      {/* Body                                                                */}
      {/* ------------------------------------------------------------------ */}
      {!collapsed && (
        <div className="border-t border-ink-800/70 px-4 py-3 space-y-3">
          {/* Error */}
          {error && (
            <p className="text-xs text-red-400/90" role="alert">
              {error}
            </p>
          )}

          {/* Loading skeleton */}
          {loading && !result && (
            <div className="space-y-2" aria-busy="true" aria-label="Loading precedents">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="rounded-lg border border-ink-800/60 bg-ink-950/40 p-3 animate-pulse"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-4 w-24 rounded bg-ink-800/60" />
                    <div className="h-3 w-16 rounded bg-ink-800/40" />
                  </div>
                  <div className="h-3 w-full rounded bg-ink-800/40 mb-1" />
                  <div className="h-3 w-4/5 rounded bg-ink-800/30" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state (search ran, no results) */}
          {!loading && !error && result && !hasMatches && (
            <p className="text-xs text-ink-500">
              No sufficiently similar past documents found.
            </p>
          )}

          {/* Results */}
          {hasMatches && (
            <ul className="space-y-2">
              {result!.matches.map((match) => {
                const isCopied = copiedId === match.id;
                const pct = Math.round(match.score * 100);
                const colour = scoreColour(match.score);
                const segments = highlightTerms(match.snippet, match.matchedTerms);

                return (
                  <li
                    key={match.id}
                    className="group rounded-lg border border-ink-800/60 bg-ink-950/40 hover:border-ink-700 transition-colors p-3"
                  >
                    {/* Card header: mode chip + date + score */}
                    <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Mode chip */}
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase shrink-0"
                          style={{
                            color: GOLD,
                            backgroundColor: `${GOLD}14`,
                            border: `1px solid ${GOLD}33`,
                          }}
                        >
                          {modeLabel(match.mode)}
                        </span>

                        {/* Date */}
                        {match.date && (
                          <span className="text-[11px] text-ink-500 truncate">
                            {formatDate(match.date)}
                          </span>
                        )}
                      </div>

                      {/* Score badge */}
                      <span
                        className="text-[11px] font-medium tabular-nums shrink-0"
                        style={{ color: colour }}
                        aria-label={`Similarity: ${pct}%`}
                      >
                        {pct}% match
                      </span>
                    </div>

                    {/* Score bar */}
                    <div
                      className="h-0.5 w-full rounded-full bg-ink-800/60 mb-2 overflow-hidden"
                      aria-hidden
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: colour }}
                      />
                    </div>

                    {/* Snippet with highlighted terms */}
                    <p className="text-xs text-ink-300 leading-relaxed line-clamp-3">
                      {segments.map((seg, i) =>
                        seg.highlight ? (
                          <mark
                            key={i}
                            className="rounded px-0.5"
                            style={{
                              backgroundColor: `${GOLD}22`,
                              color: GOLD,
                              fontWeight: 500,
                            }}
                          >
                            {seg.text}
                          </mark>
                        ) : (
                          <span key={i}>{seg.text}</span>
                        )
                      )}
                    </p>

                    {/* Matched terms chips */}
                    {match.matchedTerms.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {match.matchedTerms.slice(0, 6).map((term) => (
                          <span
                            key={term}
                            className="inline-block px-1.5 py-0.5 text-[10px] rounded border border-ink-800 bg-ink-950/60 text-ink-500"
                          >
                            {term}
                          </span>
                        ))}
                        {match.matchedTerms.length > 6 && (
                          <span className="inline-block px-1.5 py-0.5 text-[10px] text-ink-600">
                            +{match.matchedTerms.length - 6} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Footer: Copy snippet button */}
                    <div className="flex justify-end mt-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(match)}
                        className={[
                          'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs',
                          'border transition-all duration-150',
                          isCopied
                            ? 'border-emerald-700/60 bg-emerald-950/30 text-emerald-400'
                            : 'border-ink-700 bg-ink-900/60 text-ink-400 hover:border-[color:var(--gold)] hover:text-[color:var(--gold)]',
                        ].join(' ')}
                        style={{ '--gold': GOLD } as React.CSSProperties}
                        aria-label={
                          isCopied
                            ? 'Snippet copied to clipboard'
                            : 'Copy this snippet to clipboard'
                        }
                      >
                        {isCopied ? (
                          <>
                            <svg
                              viewBox="0 0 16 16"
                              width="11"
                              height="11"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                            >
                              <path d="M3 8l3.5 3.5 6.5-6.5" />
                            </svg>
                            Copied
                          </>
                        ) : (
                          <>
                            <svg
                              viewBox="0 0 16 16"
                              width="11"
                              height="11"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                            >
                              <rect x="5" y="5" width="8" height="10" rx="1.5" />
                              <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v8A1.5 1.5 0 003.5 13H5" />
                            </svg>
                            Copy snippet
                          </>
                        )}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
