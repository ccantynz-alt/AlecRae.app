'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/* -------------------------------------------------------------------------- */
/*  Types (mirrored from lib/citations.ts — kept local so this component      */
/*  can be rendered on the client without pulling the server-side module      */
/*  surface into the bundle.)                                                 */
/* -------------------------------------------------------------------------- */

type CitationType =
  | 'case-neutral'
  | 'case-reported'
  | 'case-name'
  | 'statute'
  | 'regulation';

type Jurisdiction = 'NZ' | 'UK' | 'US' | 'AU' | 'Unknown';

interface Citation {
  raw: string;
  type: CitationType;
  jurisdiction: Jurisdiction;
  court?: string;
  parties?: { plaintiff: string; defendant: string };
  year?: number;
  neutralCitation?: string;
  valid: boolean;
  startIndex: number;
  endIndex: number;
}

interface CitationAnalysis {
  citations: Citation[];
  count: number;
  byJurisdiction: Record<string, number>;
}

interface CitationPanelProps {
  /** Raw dictated or enhanced text to analyse. */
  text: string;
}

/* -------------------------------------------------------------------------- */
/*  Small presentational helpers                                              */
/* -------------------------------------------------------------------------- */

const GOLD = '#d4a84e';

function labelFor(c: Citation): string {
  if (c.type === 'case-name' && c.parties) {
    return `${c.parties.plaintiff} v ${c.parties.defendant}`;
  }
  if (c.neutralCitation) return c.neutralCitation;
  return c.raw;
}

function subLabelFor(c: Citation): string | null {
  switch (c.type) {
    case 'case-neutral':
      return c.court ? `${c.court}${c.year ? ` · ${c.year}` : ''}` : null;
    case 'case-reported':
      return c.court ? `${c.court}${c.year ? ` · ${c.year}` : ''}` : null;
    case 'case-name':
      return 'Case name';
    case 'statute':
      return c.court ? `Statute · ${c.court}${c.year ? ` ${c.year}` : ''}` : 'Statute';
    case 'regulation':
      return c.court ? `Rules · ${c.court}${c.year ? ` ${c.year}` : ''}` : 'Regulation';
    default:
      return null;
  }
}

function jurisdictionBadge(j: Jurisdiction): string {
  switch (j) {
    case 'NZ':
      return 'NZ';
    case 'UK':
      return 'UK';
    case 'US':
      return 'US';
    case 'AU':
      return 'AU';
    default:
      return '—';
  }
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function CitationPanel({ text }: CitationPanelProps) {
  const [analysis, setAnalysis] = useState<CitationAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced analysis on text change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    const trimmed = text?.trim() ?? '';
    if (!trimmed) {
      setAnalysis(null);
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
        const res = await fetch('/api/citations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed }),
          signal: controller.signal,
        });
        if (!res.ok) {
          let msg = `Request failed (${res.status})`;
          try {
            const body = (await res.json()) as { error?: string };
            if (body?.error) msg = body.error;
          } catch {
            /* ignore */
          }
          throw new Error(msg);
        }
        const data = (await res.json()) as CitationAnalysis;
        setAnalysis(data);
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Failed to analyse citations');
        setAnalysis(null);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text]);

  // Cleanup copy-toast timer on unmount
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const hasResults = !!analysis && analysis.count > 0;
  const jurisdictionSummary = useMemo(() => {
    if (!analysis) return [];
    return Object.entries(analysis.byJurisdiction)
      .sort(([, a], [, b]) => b - a)
      .map(([j, n]) => ({ jurisdiction: j, count: n }));
  }, [analysis]);

  async function copyCitation(c: Citation, index: number) {
    const payload = labelFor(c);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
      } else if (typeof document !== 'undefined') {
        // Fallback for environments without the Clipboard API
        const ta = document.createElement('textarea');
        ta.value = payload;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedIndex(index);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      setError('Could not copy to clipboard');
    }
  }

  // Empty state: hide entirely when no meaningful input and nothing is happening
  const showPanel = loading || hasResults || error;
  if (!showPanel) return null;

  return (
    <section
      aria-label="Citation intelligence"
      className="rounded-xl border border-ink-800 bg-ink-900/50 text-ink-100 backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
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
              <path d="M12 3v18" />
              <path d="M5 7h14" />
              <path d="M7 7l-2 6a3 3 0 006 0L9 7" />
              <path d="M17 7l-2 6a3 3 0 006 0l-2-6" />
              <path d="M8 21h8" />
            </svg>
          </span>
          <span className="flex items-baseline gap-2 min-w-0">
            <span className="font-display text-sm tracking-wide" style={{ color: GOLD }}>
              Citations
            </span>
            <span className="text-ink-400 text-xs">
              {loading && !analysis
                ? 'scanning…'
                : analysis
                  ? `${analysis.count}`
                  : ''}
            </span>
          </span>
          {hasResults && !collapsed && (
            <span className="hidden sm:flex items-center gap-1.5 ml-2 text-xs text-ink-500">
              {jurisdictionSummary.map((j) => (
                <span
                  key={j.jurisdiction}
                  className="px-1.5 py-0.5 rounded border border-ink-800 bg-ink-950/60"
                >
                  {j.jurisdiction} · {j.count}
                </span>
              ))}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2 text-ink-500">
          {loading && (
            <span
              className="inline-block h-3.5 w-3.5 rounded-full border-2 border-ink-700 border-t-transparent animate-spin"
              aria-label="Analysing"
              style={{ borderTopColor: 'transparent', borderColor: `${GOLD}66 ${GOLD}22 ${GOLD}22 ${GOLD}22` }}
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
            <path d="M5.5 7.5l4.5 4.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="border-t border-ink-800/70 px-4 py-3">
          {error && (
            <p className="text-xs text-red-400/90 mb-2" role="alert">
              {error}
            </p>
          )}

          {!hasResults && !loading && !error && (
            <p className="text-xs text-ink-500">No citations detected.</p>
          )}

          {hasResults && (
            <ul className="flex flex-wrap gap-2">
              {analysis!.citations.map((c, i) => {
                const label = labelFor(c);
                const sub = subLabelFor(c);
                const isCopied = copiedIndex === i;
                return (
                  <li key={`${c.startIndex}-${c.endIndex}-${i}`}>
                    <button
                      type="button"
                      onClick={() => copyCitation(c, i)}
                      title={`Click to copy: ${label}`}
                      className={[
                        'group relative flex items-center gap-2 max-w-full',
                        'rounded-full border px-3 py-1.5',
                        'text-xs text-ink-100',
                        'transition-all duration-150',
                        c.valid
                          ? 'border-ink-700 bg-ink-950/60 hover:border-[color:var(--gold)] hover:bg-ink-900'
                          : 'border-amber-800/60 bg-amber-950/20 hover:border-amber-700',
                      ].join(' ')}
                      style={{ '--gold': GOLD } as React.CSSProperties}
                    >
                      <span
                        className="inline-flex items-center justify-center text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded"
                        style={{
                          color: GOLD,
                          backgroundColor: `${GOLD}14`,
                          border: `1px solid ${GOLD}33`,
                        }}
                      >
                        {jurisdictionBadge(c.jurisdiction)}
                      </span>
                      <span className="flex flex-col items-start leading-tight min-w-0">
                        <span className="truncate max-w-[22ch] sm:max-w-[36ch]">
                          {label}
                        </span>
                        {sub && (
                          <span className="text-[10px] text-ink-500 truncate max-w-[22ch] sm:max-w-[36ch]">
                            {sub}
                          </span>
                        )}
                      </span>
                      {!c.valid && (
                        <span
                          className="text-[10px] text-amber-400"
                          title="Format could not be fully validated"
                          aria-label="Unvalidated"
                        >
                          !
                        </span>
                      )}
                      <span
                        className={[
                          'ml-1 inline-flex items-center text-[10px] transition-opacity',
                          isCopied ? 'opacity-100' : 'opacity-0 group-hover:opacity-60',
                        ].join(' ')}
                        style={{ color: GOLD }}
                        aria-hidden={!isCopied}
                      >
                        {isCopied ? 'Copied' : 'Copy'}
                      </span>
                    </button>
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
