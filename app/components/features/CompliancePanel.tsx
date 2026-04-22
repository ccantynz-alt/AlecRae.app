'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* -------------------------------------------------------------------------- */
/*  Types (mirrored from lib/compliance.ts)                                   */
/* -------------------------------------------------------------------------- */

type ComplianceSeverity = 'info' | 'warning' | 'critical';

interface ComplianceIssue {
  id: string;
  severity: ComplianceSeverity;
  rule: string;
  message: string;
  suggestion: string;
  startIndex?: number;
  endIndex?: number;
  docsLink?: string;
}

interface ComplianceResponse {
  issues: ComplianceIssue[];
  count: number;
  bySeverity: { critical: number; warning: number; info: number };
}

interface CompliancePanelProps {
  text: string;
  mode: string;
}

/* -------------------------------------------------------------------------- */
/*  Tokens                                                                    */
/* -------------------------------------------------------------------------- */

const GOLD = '#d4a84e';
const EMERALD = '#10b981';
const CRITICAL = '#ef4444';

const SEVERITY_ORDER: ComplianceSeverity[] = ['critical', 'warning', 'info'];

const SEVERITY_META: Record<
  ComplianceSeverity,
  { label: string; color: string; bg: string; border: string }
> = {
  critical: {
    label: 'Critical',
    color: CRITICAL,
    bg: 'rgba(239, 68, 68, 0.08)',
    border: 'rgba(239, 68, 68, 0.55)',
  },
  warning: {
    label: 'Warnings',
    color: GOLD,
    bg: 'rgba(212, 168, 78, 0.07)',
    border: 'rgba(212, 168, 78, 0.45)',
  },
  info: {
    label: 'Info',
    color: EMERALD,
    bg: 'rgba(16, 185, 129, 0.06)',
    border: 'rgba(16, 185, 129, 0.40)',
  },
};

const SEVERITY_HEADING: Record<ComplianceSeverity, string> = {
  critical: 'Critical',
  warning: 'Warnings',
  info: 'Info',
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function CompliancePanel({ text, mode }: CompliancePanelProps) {
  const [issues, setIssues] = useState<ComplianceIssue[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pulseIds, setPulseIds] = useState<Set<string>>(new Set());

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCriticalIdsRef = useRef<Set<string>>(new Set());

  /* ---------------------------- Debounced fetch --------------------------- */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    const trimmed = (text || '').trim();
    if (!trimmed || !mode) {
      setIssues([]);
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
        const res = await fetch('/api/compliance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed, mode }),
          signal: controller.signal,
        });
        if (!res.ok) {
          let msg = `Request failed (${res.status})`;
          try {
            const data = (await res.json()) as { error?: string };
            if (data?.error) msg = data.error;
          } catch {
            /* ignore */
          }
          throw new Error(msg);
        }
        const data = (await res.json()) as ComplianceResponse;
        setIssues(data.issues || []);
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Compliance check failed');
        setIssues([]);
      } finally {
        setLoading(false);
      }
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text, mode]);

  /* ---------------------- Clean up dismissed set on mode change ---------- */
  useEffect(() => {
    setDismissed(new Set());
    prevCriticalIdsRef.current = new Set();
  }, [mode]);

  /* ----------------------- Pulse-on-appearance for critical --------------- */
  useEffect(() => {
    const currentCriticalIds = new Set(
      issues.filter((i) => i.severity === 'critical').map((i) => i.id)
    );
    const newCritical: string[] = [];
    for (const id of Array.from(currentCriticalIds)) {
      if (!prevCriticalIdsRef.current.has(id)) newCritical.push(id);
    }
    prevCriticalIdsRef.current = currentCriticalIds;

    if (newCritical.length === 0) return;

    setPulseIds((prev) => {
      const next = new Set(prev);
      for (const id of newCritical) next.add(id);
      return next;
    });

    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => {
      setPulseIds((prev) => {
        const next = new Set(prev);
        for (const id of newCritical) next.delete(id);
        return next;
      });
    }, 1600);
  }, [issues]);

  /* ------------------------------ Cleanup -------------------------------- */
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
  }, []);

  /* ------------------------------ Grouping ------------------------------- */
  const visibleIssues = useMemo(
    () => issues.filter((i) => !dismissed.has(i.id)),
    [issues, dismissed]
  );

  const grouped = useMemo(() => {
    const map: Record<ComplianceSeverity, ComplianceIssue[]> = {
      critical: [],
      warning: [],
      info: [],
    };
    for (const issue of visibleIssues) {
      map[issue.severity].push(issue);
    }
    return map;
  }, [visibleIssues]);

  const totalVisible = visibleIssues.length;

  /* -------------------------------- Actions ------------------------------ */
  const copyIssue = useCallback(async (issue: ComplianceIssue) => {
    const payload = `${issue.rule}: ${issue.message}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
      } else if (typeof document !== 'undefined') {
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
      setCopiedId(issue.id);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError('Could not copy to clipboard');
    }
  }, []);

  const dismissIssue = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  /* --------------------------- Empty state: render nothing --------------- */
  if (totalVisible === 0 && !loading && !error) return null;

  return (
    <section
      aria-label="Compliance Copilot"
      className="rounded-xl border border-ink-800 bg-ink-900/50 text-ink-100 backdrop-blur-sm overflow-hidden"
    >
      <style>{`
        @keyframes compliance-critical-pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.55); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .compliance-pulse-once {
          animation: compliance-critical-pulse 1.6s ease-out 1;
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-ink-800/70">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="font-display text-sm tracking-wide" style={{ color: GOLD }}>
            &#128207; Compliance Copilot
          </span>
          <span className="text-ink-400 text-xs">({totalVisible})</span>
        </div>
        <div className="flex items-center gap-2 text-ink-500 text-xs">
          {loading && (
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rounded-full border-2 animate-spin"
                style={{
                  borderColor: `${GOLD}44`,
                  borderTopColor: GOLD,
                }}
                aria-label="Checking"
              />
              checking
            </span>
          )}
          {!loading && totalVisible > 0 && (
            <span className="flex items-center gap-1.5">
              {grouped.critical.length > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                  style={{
                    color: CRITICAL,
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.45)',
                  }}
                >
                  {grouped.critical.length} critical
                </span>
              )}
              {grouped.warning.length > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                  style={{
                    color: GOLD,
                    backgroundColor: 'rgba(212, 168, 78, 0.12)',
                    border: '1px solid rgba(212, 168, 78, 0.40)',
                  }}
                >
                  {grouped.warning.length} warning
                </span>
              )}
              {grouped.info.length > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                  style={{
                    color: EMERALD,
                    backgroundColor: 'rgba(16, 185, 129, 0.10)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                  }}
                >
                  {grouped.info.length} info
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-4">
        {error && (
          <p className="text-xs text-red-400/90" role="alert">
            {error}
          </p>
        )}

        {SEVERITY_ORDER.map((severity) => {
          const list = grouped[severity];
          if (list.length === 0) return null;
          const meta = SEVERITY_META[severity];

          return (
            <div key={severity} className="space-y-2">
              <h4
                className="text-[11px] font-semibold tracking-[0.14em] uppercase"
                style={{ color: meta.color }}
              >
                {SEVERITY_HEADING[severity]} &middot; {list.length}
              </h4>
              <ul className="space-y-2">
                {list.map((issue) => {
                  const isCopied = copiedId === issue.id;
                  const shouldPulse =
                    severity === 'critical' && pulseIds.has(issue.id);
                  return (
                    <li key={issue.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => copyIssue(issue)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            copyIssue(issue);
                          }
                        }}
                        title="Click to copy rule + message"
                        className={[
                          'group relative cursor-pointer rounded-lg px-3 py-2.5',
                          'border transition-colors',
                          'hover:bg-ink-800/40 focus:outline-none focus:ring-1',
                          shouldPulse ? 'compliance-pulse-once' : '',
                        ].join(' ')}
                        style={{
                          borderColor: meta.border,
                          backgroundColor: meta.bg,
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div
                              className="font-semibold text-[13px] leading-snug"
                              style={{ color: meta.color }}
                            >
                              {issue.rule}
                            </div>
                            <p className="mt-1 text-[12.5px] text-ink-200 leading-snug">
                              {issue.message}
                            </p>
                            <p className="mt-1 text-[12px] italic text-ink-400 leading-snug">
                              {issue.suggestion}
                            </p>
                            {issue.docsLink && (
                              <a
                                href={issue.docsLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="mt-1 inline-block text-[11px] underline underline-offset-2"
                                style={{ color: meta.color }}
                              >
                                Reference
                              </a>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span
                              className={[
                                'text-[10px] transition-opacity',
                                isCopied ? 'opacity-100' : 'opacity-0 group-hover:opacity-70',
                              ].join(' ')}
                              style={{ color: meta.color }}
                              aria-hidden={!isCopied}
                            >
                              {isCopied ? 'Copied' : 'Copy'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                dismissIssue(issue.id);
                              }}
                              className="text-ink-500 hover:text-ink-200 text-xs leading-none px-1 py-0.5 rounded transition-colors"
                              aria-label={`Dismiss ${issue.rule}`}
                              title="Dismiss for this session"
                            >
                              &times;
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default CompliancePanel;
