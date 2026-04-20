'use client';

import { useEffect, useRef, useState } from 'react';

/* -------------------------------------------------------------------------- */
/*  Types — mirrored locally so the component is self-contained on the client */
/* -------------------------------------------------------------------------- */

type NameMatchType = 'person' | 'organisation';
type NameMatchConfidence = 'low' | 'medium' | 'high';

interface NameMatch {
  raw: string;
  type: NameMatchType;
  startChar: number;
  endChar: number;
  confidence: NameMatchConfidence;
}

type ClientRelationship = 'current' | 'former' | 'adverse' | 'prospect';

interface Client {
  id: string;
  name: string;
  aliases?: string[];
  matterNumbers?: string[];
  type: ClientRelationship;
  notes?: string;
  addedAt: string;
  updatedAt: string;
}

type ConflictSeverity = 'critical' | 'warning' | 'info';

interface ConflictFlag {
  name: NameMatch;
  clients: Client[];
  severity: ConflictSeverity;
}

interface ConflictsResponse {
  matches: ConflictFlag[];
  count: number;
  criticalCount: number;
}

interface ConflictPanelProps {
  /** The dictated or enhanced text to analyse for conflicts. */
  text: string;
}

/* -------------------------------------------------------------------------- */
/*  Design tokens (consistent with rest of app)                              */
/* -------------------------------------------------------------------------- */

const GOLD = '#d4a84e';

/* -------------------------------------------------------------------------- */
/*  Small helpers                                                             */
/* -------------------------------------------------------------------------- */

function relationshipLabel(type: ClientRelationship): string {
  switch (type) {
    case 'current':
      return 'Current client';
    case 'former':
      return 'Former client';
    case 'adverse':
      return 'Adverse party';
    case 'prospect':
      return 'Prospective client';
  }
}

function severityLabel(severity: ConflictSeverity): string {
  switch (severity) {
    case 'critical':
      return 'Critical conflict';
    case 'warning':
      return 'Potential conflict';
    case 'info':
      return 'Note';
  }
}

function severitySuggestion(severity: ConflictSeverity, rel: ClientRelationship): string {
  if (rel === 'adverse') {
    return 'You may be representing an opposing party. Review before proceeding.';
  }
  if (rel === 'former') {
    return 'Confidentiality obligations to former clients may apply. Review before sending.';
  }
  if (rel === 'current' && severity === 'info') {
    return 'This party is a current client. Confirm no conflict of interest exists.';
  }
  return 'Review this reference before sending or filing.';
}

/* Tailwind border-colour classes for each severity tier */
function borderClass(severity: ConflictSeverity): string {
  switch (severity) {
    case 'critical':
      return 'border-l-rose-500';
    case 'warning':
      return 'border-l-amber-400';
    case 'info':
      return 'border-l-emerald-500';
  }
}

function badgeBg(severity: ConflictSeverity): string {
  switch (severity) {
    case 'critical':
      return 'bg-rose-950/60 text-rose-300 border-rose-800/60';
    case 'warning':
      return 'bg-amber-950/60 text-amber-300 border-amber-800/60';
    case 'info':
      return 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60';
  }
}

function headerBg(severity: ConflictSeverity): string {
  switch (severity) {
    case 'critical':
      return 'text-rose-400';
    case 'warning':
      return 'text-amber-400';
    case 'info':
      return 'text-emerald-400';
  }
}

/* -------------------------------------------------------------------------- */
/*  ConflictFlag card                                                         */
/* -------------------------------------------------------------------------- */

function FlagCard({ flag }: { flag: ConflictFlag }) {
  return (
    <div
      className={[
        'rounded-lg border border-ink-800 border-l-4',
        borderClass(flag.severity),
        'bg-ink-950/60 px-4 py-3',
      ].join(' ')}
    >
      {/* Severity badge + detected name */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span
            className={[
              'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border',
              badgeBg(flag.severity),
            ].join(' ')}
          >
            {severityLabel(flag.severity)}
          </span>
          <span className="font-mono text-sm text-ink-100 truncate">
            &ldquo;{flag.name.raw}&rdquo;
          </span>
          <span className="text-[10px] text-ink-600 capitalize">
            ({flag.name.type})
          </span>
        </div>
      </div>

      {/* Matched client records */}
      <ul className="space-y-2">
        {flag.clients.map((client) => (
          <li key={client.id} className="text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-ink-200 font-medium">{client.name}</span>
              <span
                className={[
                  'px-1.5 py-0.5 rounded text-[10px] border',
                  badgeBg(flag.severity),
                ].join(' ')}
              >
                {relationshipLabel(client.type)}
              </span>
              {client.matterNumbers && client.matterNumbers.length > 0 && (
                <span className="text-ink-500">
                  Matter: {client.matterNumbers.join(', ')}
                </span>
              )}
            </div>
            {client.aliases && client.aliases.length > 0 && (
              <p className="text-ink-500 mt-0.5">
                Also known as: {client.aliases.join(', ')}
              </p>
            )}
            {/* Per-client suggestion */}
            <p
              className={[
                'mt-1 flex items-start gap-1',
                headerBg(flag.severity),
              ].join(' ')}
            >
              <svg
                viewBox="0 0 16 16"
                width="12"
                height="12"
                fill="currentColor"
                className="mt-0.5 flex-shrink-0"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M8 1a7 7 0 100 14A7 7 0 008 1zM7 6a1 1 0 112 0v4a1 1 0 11-2 0V6zm1-2.5a1 1 0 110 2 1 1 0 010-2z"
                />
              </svg>
              {severitySuggestion(flag.severity, client.type)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Empty-state card (no clients in the roster yet)                          */
/* -------------------------------------------------------------------------- */

function EmptyRosterState() {
  return (
    <div className="rounded-lg border border-dashed border-ink-700 bg-ink-950/40 px-4 py-5 text-center">
      <div
        className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border"
        style={{ borderColor: `${GOLD}44`, color: GOLD }}
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87" />
          <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      </div>
      <p className="text-sm font-medium text-ink-200 mb-1">
        No client roster yet
      </p>
      <p className="text-xs text-ink-500 mb-3 max-w-xs mx-auto">
        Add your current, former, and adverse clients to automatically flag
        conflicts in every dictation before you send or file anything.
      </p>
      <a
        href="/admin/clients"
        className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-ink-800/60"
        style={{ borderColor: `${GOLD}55`, color: GOLD }}
      >
        <svg
          viewBox="0 0 16 16"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M8 1v14M1 8h14" />
        </svg>
        Populate client roster
      </a>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                            */
/* -------------------------------------------------------------------------- */

export function ConflictPanel({ text }: ConflictPanelProps) {
  const [result, setResult] = useState<ConflictsResponse | null>(null);
  const [rosterEmpty, setRosterEmpty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Check once on mount whether the roster has any entries
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/clients', { method: 'GET' });
        if (res.ok) {
          const data = (await res.json()) as { count: number };
          if (!cancelled) setRosterEmpty((data.count ?? 0) === 0);
        }
      } catch {
        // Silently ignore — the roster check is best-effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced conflict analysis on text change (900 ms)
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

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/conflicts', {
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

        const data = (await res.json()) as ConflictsResponse;
        setResult(data);
        // Update roster-empty state from the analysis context
        if (data.count === 0 && data.matches.length === 0) {
          // Might just be clean text — keep rosterEmpty as-is
        }
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Failed to analyse conflicts');
        setResult(null);
      } finally {
        setLoading(false);
      }
    }, 900);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const totalFlags = result?.count ?? 0;
  const criticalCount = result?.criticalCount ?? 0;
  const hasCritical = criticalCount > 0;

  // Group flags by severity for section rendering
  const criticalFlags = result?.matches.filter((f) => f.severity === 'critical') ?? [];
  const warningFlags = result?.matches.filter((f) => f.severity === 'warning') ?? [];
  const infoFlags = result?.matches.filter((f) => f.severity === 'info') ?? [];

  // Show the panel whenever we have something meaningful to show
  const showPanel = rosterEmpty || loading || !!result || !!error;
  if (!showPanel) return null;

  return (
    <section
      aria-label="Conflict of interest guardian"
      className="rounded-xl border border-ink-800 bg-ink-900/50 text-ink-100 backdrop-blur-sm overflow-hidden"
    >
      {/* Header / collapse toggle */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-ink-800/40 transition-colors"
        aria-expanded={!collapsed}
      >
        <span className="flex items-center gap-3 min-w-0">
          {/* Shield icon */}
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md border flex-shrink-0"
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
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </span>

          {/* Title + count */}
          <span className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="font-display text-sm tracking-wide" style={{ color: GOLD }}>
              Conflict Guardian
            </span>
            {!rosterEmpty && (
              <span className="text-ink-400 text-xs">
                {loading && !result ? 'scanning…' : totalFlags > 0 ? `${totalFlags} flag${totalFlags !== 1 ? 's' : ''}` : 'clear'}
              </span>
            )}
            {/* Critical badge */}
            {hasCritical && !collapsed && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-900/60 text-rose-300 border border-rose-700/60">
                {criticalCount} critical
              </span>
            )}
          </span>
        </span>

        <span className="flex items-center gap-2 text-ink-500">
          {loading && (
            <span
              className="inline-block h-3.5 w-3.5 rounded-full border-2 animate-spin"
              aria-label="Scanning"
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

      {/* Body */}
      {!collapsed && (
        <div className="border-t border-ink-800/70 px-4 py-3 space-y-4">
          {/* Error state */}
          {error && (
            <p className="text-xs text-rose-400/90" role="alert">
              {error}
            </p>
          )}

          {/* Empty roster state */}
          {rosterEmpty && <EmptyRosterState />}

          {/* Clean — no conflicts found */}
          {!rosterEmpty && !loading && !error && result && totalFlags === 0 && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <svg
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="currentColor"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.354 5.146a.5.5 0 00-.708-.708L7 9.086 5.354 7.44a.5.5 0 10-.708.708l2 2a.5.5 0 00.708 0l4-4z"
                />
              </svg>
              No conflicts detected against the current roster.
            </div>
          )}

          {/* Critical section */}
          {criticalFlags.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-400">
                Critical — immediate review required
              </p>
              {criticalFlags.map((flag, i) => (
                <FlagCard key={`critical-${i}`} flag={flag} />
              ))}
            </div>
          )}

          {/* Warning section */}
          {warningFlags.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                Warnings — review before sending
              </p>
              {warningFlags.map((flag, i) => (
                <FlagCard key={`warning-${i}`} flag={flag} />
              ))}
            </div>
          )}

          {/* Info section */}
          {infoFlags.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                Notes
              </p>
              {infoFlags.map((flag, i) => (
                <FlagCard key={`info-${i}`} flag={flag} />
              ))}
            </div>
          )}

          {/* Manage roster link — always visible when roster has entries */}
          {!rosterEmpty && (
            <div className="pt-1 border-t border-ink-800/50">
              <a
                href="/admin/clients"
                className="inline-flex items-center gap-1.5 text-xs transition-colors hover:opacity-80"
                style={{ color: GOLD }}
              >
                <svg
                  viewBox="0 0 16 16"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M12 14v-1a3 3 0 00-3-3H4a3 3 0 00-3 3v1" />
                  <circle cx="6.5" cy="6" r="3" />
                  <path d="M14 6v4M12 8h4" />
                </svg>
                Manage client roster
              </a>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default ConflictPanel;
