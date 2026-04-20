'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/* -------------------------------------------------------------------------- */
/*  Types (mirrored from lib/diarization.ts — kept client-local so the       */
/*  server-side module does not enter the client bundle.)                     */
/* -------------------------------------------------------------------------- */

type DiarizationContext = 'deposition' | 'meeting' | 'interview' | 'client-call';

interface Turn {
  speaker: string;
  text: string;
  startChar: number;
  endChar: number;
}

interface DiarizationResult {
  turns: Turn[];
  speakerLabels: string[];
  confidence: 'low' | 'medium' | 'high';
}

interface DiarizationPanelProps {
  /** Transcribed or enhanced text to analyse. */
  text: string;
  /**
   * Called when the user applies speaker labels.
   * Receives text reformatted as "SPEAKER_LABEL: turn text\n\n".
   */
  onRelabel?: (labeledText: string) => void;
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const GOLD = '#d4a84e';

const CONTEXT_OPTIONS: { value: DiarizationContext; label: string }[] = [
  { value: 'deposition', label: 'Deposition' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'interview', label: 'Interview' },
  { value: 'client-call', label: 'Client Call' },
];

/* -------------------------------------------------------------------------- */
/*  Confidence badge                                                          */
/* -------------------------------------------------------------------------- */

function ConfidenceBadge({ confidence }: { confidence: DiarizationResult['confidence'] }) {
  const styles: Record<DiarizationResult['confidence'], { bg: string; text: string; label: string }> = {
    high: { bg: 'rgba(16,185,129,0.12)', text: '#34d399', label: 'High confidence' },
    medium: { bg: `${GOLD}18`, text: GOLD, label: 'Medium confidence' },
    low: { bg: 'rgba(148,163,184,0.10)', text: '#94a3b8', label: 'Low confidence' },
  };
  const s = styles[confidence];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase"
      style={{ backgroundColor: s.bg, color: s.text }}
      title={s.label}
    >
      {confidence}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function DiarizationPanel({ text, onRelabel }: DiarizationPanelProps) {
  const [result, setResult] = useState<DiarizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [context, setContext] = useState<DiarizationContext>('deposition');

  // Speaker label overrides: map from original label → display name
  const [labelOverrides, setLabelOverrides] = useState<Record<string, string>>({});
  // Track which speaker label is currently being edited
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* ---------------------------------------------------------------------- */
  /*  Fetch diarization on text / context change                            */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    const trimmed = text?.trim() ?? '';
    if (!trimmed) {
      setResult(null);
      setError(null);
      setLoading(false);
      setLabelOverrides({});
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/diarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed, hints: { context } }),
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
        const data = (await res.json()) as DiarizationResult;
        setResult(data);
        // Reset overrides when a fresh result arrives
        setLabelOverrides({});
        setEditingLabel(null);
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Failed to analyse speakers');
        setResult(null);
      } finally {
        setLoading(false);
      }
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text, context]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  /* ---------------------------------------------------------------------- */
  /*  Inline label editing                                                   */
  /* ---------------------------------------------------------------------- */

  function resolvedLabel(original: string): string {
    return labelOverrides[original] ?? original;
  }

  function beginEdit(original: string) {
    setEditingLabel(original);
    setEditValue(resolvedLabel(original));
    // Focus the input after render
    setTimeout(() => editInputRef.current?.focus(), 0);
  }

  function commitEdit() {
    if (editingLabel === null) return;
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== editingLabel) {
      setLabelOverrides((prev) => ({ ...prev, [editingLabel]: trimmed }));
    }
    setEditingLabel(null);
    setEditValue('');
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') {
      setEditingLabel(null);
      setEditValue('');
    }
  }

  /* ---------------------------------------------------------------------- */
  /*  Apply labels handler                                                   */
  /* ---------------------------------------------------------------------- */

  const handleApplyLabels = useCallback(() => {
    if (!result || !onRelabel) return;
    const labelled = result.turns
      .map((t) => `${resolvedLabel(t.speaker)}: ${t.text}`)
      .join('\n\n');
    onRelabel(labelled);
  }, [result, labelOverrides, onRelabel]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------------------------------------------------------------------- */
  /*  Render guards                                                          */
  /* ---------------------------------------------------------------------- */

  const hasResults = !!result && result.turns.length > 0;
  const showPanel = loading || hasResults || !!error;
  if (!showPanel) return null;

  /* ---------------------------------------------------------------------- */
  /*  Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <section
      aria-label="Speaker diarization"
      className="rounded-xl border border-ink-800 bg-ink-900/50 text-ink-100 backdrop-blur-sm overflow-hidden"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
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
            {/* Microphone-with-waveform icon */}
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
              <rect x="9" y="2" width="6" height="11" rx="3" />
              <path d="M5 10a7 7 0 0014 0" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="8" y1="22" x2="16" y2="22" />
            </svg>
          </span>
          <span className="flex items-baseline gap-2 min-w-0">
            <span className="font-display text-sm tracking-wide" style={{ color: GOLD }}>
              Speaker Diarization
            </span>
            <span className="text-ink-400 text-xs">
              {loading && !result
                ? 'analysing…'
                : result
                  ? `${result.turns.length} turn${result.turns.length === 1 ? '' : 's'}`
                  : ''}
            </span>
          </span>
          {hasResults && !collapsed && (
            <ConfidenceBadge confidence={result.confidence} />
          )}
        </span>
        <span className="flex items-center gap-2 text-ink-500">
          {loading && (
            <span
              className="inline-block h-3.5 w-3.5 rounded-full border-2 animate-spin"
              aria-label="Analysing"
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
        <div className="border-t border-ink-800/70 px-4 py-3 space-y-4">
          {/* Error */}
          {error && (
            <p className="text-xs text-red-400/90" role="alert">
              {error}
            </p>
          )}

          {/* Context selector */}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Conversation context">
            {CONTEXT_OPTIONS.map((opt) => {
              const active = context === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setContext(opt.value)}
                  className="px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150"
                  style={
                    active
                      ? {
                          borderColor: GOLD,
                          color: GOLD,
                          backgroundColor: `${GOLD}14`,
                        }
                      : {
                          borderColor: '#334155',
                          color: '#64748b',
                          backgroundColor: 'transparent',
                        }
                  }
                  aria-pressed={active}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Empty state */}
          {!hasResults && !loading && !error && (
            <p className="text-xs text-ink-500">No speaker turns detected.</p>
          )}

          {/* Turn list */}
          {hasResults && (
            <ol className="space-y-3">
              {result.turns.map((turn, idx) => {
                const original = turn.speaker;
                const displayLabel = resolvedLabel(original);
                const isEditing = editingLabel === original;

                return (
                  <li
                    key={`${turn.startChar}-${turn.endChar}-${idx}`}
                    className="flex gap-3 items-start"
                  >
                    {/* Speaker label (editable) */}
                    <div className="flex-shrink-0 w-28 pt-0.5">
                      {isEditing ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={handleEditKeyDown}
                          className="w-full rounded px-2 py-0.5 text-xs font-semibold border focus:outline-none"
                          style={{
                            backgroundColor: `${GOLD}10`,
                            borderColor: GOLD,
                            color: GOLD,
                          }}
                          aria-label={`Rename speaker: ${original}`}
                          maxLength={60}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => beginEdit(original)}
                          title="Click to rename this speaker across all turns"
                          className="group flex items-center gap-1 text-xs font-semibold text-left transition-opacity hover:opacity-80"
                          style={{ color: GOLD }}
                          aria-label={`Speaker: ${displayLabel}. Click to rename.`}
                        >
                          <span className="truncate max-w-[6rem]">{displayLabel}</span>
                          {/* Pencil icon — visible on hover */}
                          <svg
                            viewBox="0 0 16 16"
                            width="11"
                            height="11"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="opacity-0 group-hover:opacity-60 flex-shrink-0 transition-opacity"
                            aria-hidden
                          >
                            <path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Turn text */}
                    <p className="flex-1 text-sm text-ink-200 leading-relaxed">
                      {turn.text}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}

          {/* Apply labels button */}
          {hasResults && onRelabel && (
            <div className="pt-1 flex items-center justify-between gap-4">
              <p className="text-[11px] text-ink-500">
                Click a speaker label to rename it across all turns, then apply.
              </p>
              <button
                type="button"
                onClick={handleApplyLabels}
                className="flex-shrink-0 px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 hover:opacity-90 active:scale-95"
                style={{
                  borderColor: GOLD,
                  color: '#0f0f0f',
                  backgroundColor: GOLD,
                }}
              >
                Apply labels
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
