'use client';

import { useEffect, useRef, useState } from 'react';

/* -------------------------------------------------------------------------- */
/*  Types (mirrored from lib/redaction.ts — kept local so this component      */
/*  can be rendered on the client without pulling the server-side module      */
/*  surface into the bundle.)                                                 */
/* -------------------------------------------------------------------------- */

type RedactionType =
  | 'email'
  | 'phone'
  | 'id'
  | 'financial'
  | 'address'
  | 'dob'
  | 'amount'
  | 'name'
  | 'case-no';

interface Redaction {
  raw: string;
  type: RedactionType;
  startIndex: number;
  endIndex: number;
  replacement: string;
  confidence: number;
}

interface RedactionResponse {
  redactions: Redaction[];
  count: number;
  byType: Record<RedactionType, number>;
  redactedText?: string;
}

interface RedactionPanelProps {
  /** Raw dictated or enhanced text to scan. */
  text: string;
  /** Called with the fully redacted string after the user clicks "Apply". */
  onRedact?: (redactedText: string) => void;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const GOLD = '#d4a84e';

const TYPE_LABELS: Record<RedactionType, string> = {
  email: 'Email',
  phone: 'Phone',
  id: 'ID / Tax No.',
  financial: 'Financial',
  address: 'Address',
  dob: 'Date of Birth',
  amount: 'Amount',
  name: 'Name',
  'case-no': 'Case No.',
};

const ALL_TYPES: RedactionType[] = [
  'email',
  'phone',
  'id',
  'financial',
  'address',
  'dob',
  'amount',
  'name',
  'case-no',
];

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function RedactionPanel({ text, onRedact }: RedactionPanelProps) {
  const [result, setResult] = useState<RedactionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  /** Types the user has toggled OFF — everything is on by default */
  const [disabledTypes, setDisabledTypes] = useState<Set<RedactionType>>(new Set());
  /** Index of the chip whose raw value was just copied */
  const [copiedType, setCopiedType] = useState<RedactionType | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Debounced detect on text change */
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
        const res = await fetch('/api/redact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed, mode: 'detect' }),
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
        const data = (await res.json()) as RedactionResponse;
        setResult(data);
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Failed to scan for PII');
        setResult(null);
      } finally {
        setLoading(false);
      }
    }, 700);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text]);

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  /* Toggle a type chip on/off */
  function toggleType(type: RedactionType) {
    setDisabledTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  /* Copy first matched raw value of this type to clipboard */
  async function copyTypeExample(type: RedactionType) {
    if (!result) return;
    const example = result.redactions.find((r) => r.type === type)?.raw ?? type;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(example);
      } else if (typeof document !== 'undefined') {
        const ta = document.createElement('textarea');
        ta.value = example;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedType(type);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedType(null), 2000);
    } catch {
      setError('Could not copy to clipboard');
    }
  }

  /* Apply redactions — only for enabled types */
  async function handleApply() {
    const trimmed = text?.trim() ?? '';
    if (!trimmed || applying) return;
    const enabledTypes = ALL_TYPES.filter((t) => !disabledTypes.has(t));
    setApplying(true);
    setError(null);
    try {
      const res = await fetch('/api/redact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, mode: 'apply', types: enabledTypes }),
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
      const data = (await res.json()) as RedactionResponse;
      if (data.redactedText !== undefined && onRedact) {
        onRedact(data.redactedText);
      }
      // Re-run detect on the new text (parent will push new text prop)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to apply redactions');
    } finally {
      setApplying(false);
    }
  }

  const hasResults = !!result && result.count > 0;
  const showPanel = loading || hasResults || !!error;
  if (!showPanel) return null;

  // Only show type chips that actually have detections
  const detectedTypes = result
    ? (ALL_TYPES.filter((t) => (result.byType[t] ?? 0) > 0))
    : [];

  // Count that will be redacted given current toggles
  const enabledCount = result
    ? detectedTypes
        .filter((t) => !disabledTypes.has(t))
        .reduce((acc, t) => acc + (result.byType[t] ?? 0), 0)
    : 0;

  return (
    <section
      aria-label="Redaction Copilot"
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
            {/* Shield icon */}
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
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="12" y1="9" x2="12" y2="15" />
            </svg>
          </span>
          <span className="flex items-baseline gap-2 min-w-0">
            <span className="font-display text-sm tracking-wide" style={{ color: GOLD }}>
              Redaction Copilot
            </span>
            <span className="text-ink-400 text-xs">
              {loading && !result
                ? 'scanning…'
                : result
                  ? `${result.count} detected`
                  : ''}
            </span>
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
        <div className="border-t border-ink-800/70 px-4 py-3 space-y-3">
          {error && (
            <p className="text-xs text-red-400/90" role="alert">
              {error}
            </p>
          )}

          {!hasResults && !loading && !error && (
            <p className="text-xs text-ink-500">No PII detected.</p>
          )}

          {hasResults && (
            <>
              {/* Type chips */}
              <ul className="flex flex-wrap gap-2" aria-label="Detected PII types">
                {detectedTypes.map((type) => {
                  const count = result!.byType[type] ?? 0;
                  const active = !disabledTypes.has(type);
                  const isCopied = copiedType === type;
                  return (
                    <li key={type}>
                      <button
                        type="button"
                        onClick={() => {
                          // Left click toggles; the chip also supports copy via the icon
                          toggleType(type);
                        }}
                        onDoubleClick={() => copyTypeExample(type)}
                        title={`${active ? 'Exclude' : 'Include'} ${TYPE_LABELS[type]} (double-click to copy example)`}
                        className={[
                          'group relative flex items-center gap-1.5',
                          'rounded-full border px-3 py-1.5',
                          'text-xs transition-all duration-150 select-none',
                          active
                            ? 'border-ink-700 bg-ink-950/60 text-ink-100 hover:border-[color:var(--gold)] hover:bg-ink-900'
                            : 'border-ink-800/40 bg-ink-950/20 text-ink-500 line-through',
                        ].join(' ')}
                        style={{ '--gold': GOLD } as React.CSSProperties}
                      >
                        <span>{TYPE_LABELS[type]}</span>
                        <span
                          className="inline-flex items-center justify-center text-[10px] font-semibold tracking-wider px-1 py-0.5 rounded"
                          style={{
                            color: active ? GOLD : '#6b7280',
                            backgroundColor: active ? `${GOLD}14` : 'transparent',
                            border: active ? `1px solid ${GOLD}33` : '1px solid #374151',
                          }}
                        >
                          {count}
                        </span>
                        {/* Copy feedback */}
                        <span
                          className={[
                            'ml-0.5 inline-flex items-center text-[10px] transition-opacity',
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

              {/* Copy example note */}
              <p className="text-[11px] text-ink-600">
                Click chip to toggle · Double-click to copy example match
              </p>

              {/* Apply button */}
              <button
                type="button"
                onClick={handleApply}
                disabled={applying || enabledCount === 0}
                className={[
                  'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150',
                  applying || enabledCount === 0
                    ? 'opacity-50 cursor-not-allowed bg-ink-800/40 text-ink-500'
                    : 'bg-ink-800/70 text-ink-100 hover:bg-ink-700/70',
                ].join(' ')}
                style={
                  applying || enabledCount === 0
                    ? {}
                    : {
                        boxShadow: `0 0 0 1px ${GOLD}44`,
                      }
                }
              >
                {applying ? (
                  <>
                    <span
                      className="inline-block h-3.5 w-3.5 rounded-full border-2 animate-spin"
                      style={{
                        borderColor: `${GOLD}66`,
                        borderTopColor: 'transparent',
                      }}
                    />
                    Applying…
                  </>
                ) : (
                  <>
                    <svg
                      viewBox="0 0 24 24"
                      width="14"
                      height="14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ color: GOLD }}
                      aria-hidden
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <line x1="9" y1="12" x2="15" y2="12" />
                    </svg>
                    Apply {enabledCount} redaction{enabledCount !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
