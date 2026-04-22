'use client';

/**
 * MultiDocPanel — Multi-Document Chain UI
 *
 * Dictate once, generate up to 4 document variants in parallel. Each card
 * streams independently; failures are isolated per-card. The panel is a
 * self-contained feature — the parent just hands it `rawText` (and optional
 * `customInstructions`) and the panel owns the rest of the flow.
 *
 * This is the "killer feature" for AlecRae Voice: competitors cannot do
 * this. A partner can dictate a matter summary once and walk away with a
 * client letter, a file memo, and a court filing draft simultaneously.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DOC_MODES, DocMode, DocModeConfig } from '@/lib/templates';

// The backend enforces 4 as the hard ceiling — keep the client in lock-step.
const MAX_SELECTED = 4;

interface MultiDocPanelProps {
  rawText: string;
  customInstructions?: string;
}

type CardStatus = 'idle' | 'streaming' | 'complete' | 'error';

interface CardState {
  mode: DocMode;
  status: CardStatus;
  content: string;
  error?: string;
}

/** Human-friendly category label for the mode-picker groupings. */
const CATEGORY_LABEL: Record<DocModeConfig['category'], string> = {
  legal: 'Legal',
  accounting: 'Accounting',
  general: 'General',
};

/**
 * Group the flat DOC_MODES list by category so the picker renders in the
 * same order professionals expect (Legal, Accounting, General).
 */
function groupModes(): Array<{ category: DocModeConfig['category']; modes: DocModeConfig[] }> {
  const order: DocModeConfig['category'][] = ['legal', 'accounting', 'general'];
  return order.map((category) => ({
    category,
    modes: DOC_MODES.filter((m) => m.category === category),
  }));
}

export default function MultiDocPanel({ rawText, customInstructions }: MultiDocPanelProps) {
  const [selected, setSelected] = useState<DocMode[]>([]);
  const [cards, setCards] = useState<CardState[]>([]);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const copiedTimersRef = useRef<Map<DocMode, ReturnType<typeof setTimeout>>>(new Map());
  const [copiedMode, setCopiedMode] = useState<DocMode | null>(null);

  const grouped = useMemo(() => groupModes(), []);
  const canRun = selected.length > 0 && rawText.trim().length > 0 && !running;
  const selectionFull = selected.length >= MAX_SELECTED;

  const toggleMode = useCallback((mode: DocMode) => {
    setSelected((prev) => {
      if (prev.includes(mode)) {
        return prev.filter((m) => m !== mode);
      }
      if (prev.length >= MAX_SELECTED) {
        return prev;
      }
      return [...prev, mode];
    });
  }, []);

  /**
   * Abort any in-flight generation. Safe to call when nothing is running —
   * the abort controller will simply be null.
   */
  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setRunning(false);
    setCards((prev) =>
      prev.map((c) =>
        c.status === 'streaming'
          ? { ...c, status: 'error', error: 'Cancelled' }
          : c
      )
    );
  }, []);

  // Clean up any pending copy-feedback timers and in-flight streams on unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      copiedTimersRef.current.forEach((t) => clearTimeout(t));
      copiedTimersRef.current.clear();
    };
  }, []);

  /**
   * Kick off a multi-doc generation. Uses `fetch` with a streaming body
   * reader (EventSource cannot do POST, and we need to send the dictation
   * payload + auth cookie together).
   */
  const generate = useCallback(async () => {
    if (!canRun) return;

    const modes = [...selected];

    // Reset card state — one card per selected mode, in picker order.
    setCards(
      modes.map((mode) => ({
        mode,
        status: 'idle' as CardStatus,
        content: '',
      }))
    );
    setRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/multi-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, modes, customInstructions }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        let message = `Request failed (${response.status})`;
        try {
          const err = await response.json();
          if (err?.error) message = err.error;
        } catch {
          // non-JSON error body — keep the fallback message
        }
        setCards((prev) =>
          prev.map((c) => ({ ...c, status: 'error', error: message }))
        );
        setRunning(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // SSE framing: events end on a blank line (\n\n). We parse a line at a
      // time, accumulating `data:` fields until the frame terminates.
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);

          const dataLines = frame
            .split('\n')
            .filter((l) => l.startsWith('data:'))
            .map((l) => l.slice(5).trim());
          if (dataLines.length === 0) continue;

          const payload = dataLines.join('\n');
          try {
            const event = JSON.parse(payload);
            handleEvent(event);
          } catch {
            // Ignore malformed frames — never crash the UI over a bad chunk.
          }
        }
      }
    } catch (err: unknown) {
      const aborted =
        err instanceof DOMException && err.name === 'AbortError';
      if (!aborted) {
        const message =
          err instanceof Error ? err.message : 'Network error';
        setCards((prev) =>
          prev.map((c) =>
            c.status === 'complete' ? c : { ...c, status: 'error', error: message }
          )
        );
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
    // handleEvent is declared below — stable identity via useCallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRun, selected, rawText, customInstructions]);

  /**
   * Apply a parsed SSE event to the appropriate card. `done` is a global
   * signal that no more events will arrive; we let the fetch loop exit
   * naturally so the final state flush happens once.
   */
  const handleEvent = useCallback((event: unknown) => {
    if (!event || typeof event !== 'object') return;
    const e = event as {
      type: string;
      mode?: DocMode;
      text?: string;
      message?: string;
    };

    if (e.type === 'done') return;

    if (e.type === 'start' && e.mode) {
      setCards((prev) =>
        prev.map((c) =>
          c.mode === e.mode ? { ...c, status: 'streaming', content: '' } : c
        )
      );
      return;
    }

    if (e.type === 'delta' && e.mode && typeof e.text === 'string') {
      setCards((prev) =>
        prev.map((c) =>
          c.mode === e.mode ? { ...c, content: c.content + e.text } : c
        )
      );
      return;
    }

    if (e.type === 'complete' && e.mode) {
      setCards((prev) =>
        prev.map((c) =>
          c.mode === e.mode ? { ...c, status: 'complete' } : c
        )
      );
      return;
    }

    if (e.type === 'error' && e.mode) {
      setCards((prev) =>
        prev.map((c) =>
          c.mode === e.mode
            ? { ...c, status: 'error', error: e.message || 'Generation failed' }
            : c
        )
      );
      return;
    }
  }, []);

  /**
   * Copy a card's content to the clipboard. Shows a 1.5s "Copied" badge
   * on the originating card so the user gets immediate feedback without
   * an intrusive toast.
   */
  const copyCard = useCallback(async (mode: DocMode, content: string) => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // Clipboard API can be blocked (e.g. insecure context); fall back to
      // a textarea trick.
      const ta = document.createElement('textarea');
      ta.value = content;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        // truly nothing more we can do
      }
      document.body.removeChild(ta);
    }
    setCopiedMode(mode);
    const existing = copiedTimersRef.current.get(mode);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      setCopiedMode((cur) => (cur === mode ? null : cur));
      copiedTimersRef.current.delete(mode);
    }, 1500);
    copiedTimersRef.current.set(mode, t);
  }, []);

  /**
   * "Open in editor" — dispatches a CustomEvent the host page can listen
   * for to swap the main editor into the selected mode's output. We fire
   * an event rather than coupling to a parent prop so the panel stays
   * plug-and-play across pages.
   */
  const openInEditor = useCallback((mode: DocMode, content: string) => {
    if (!content) return;
    const evt = new CustomEvent('alecrae:open-in-editor', {
      detail: { mode, content },
    });
    window.dispatchEvent(evt);
  }, []);

  const rawTextEmpty = rawText.trim().length === 0;

  return (
    <section
      className="rounded-2xl border border-white/10 bg-ink-900/60 backdrop-blur-sm p-5 sm:p-6"
      aria-label="Multi-Document Chain"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl text-gold-400 tracking-tight">
            Multi-Document Chain
          </h2>
          <p className="text-sm text-white/60 mt-1">
            Dictate once. Generate up to {MAX_SELECTED} document variants in parallel.
          </p>
        </div>
        <div className="text-xs uppercase tracking-wider text-white/40">
          {selected.length}/{MAX_SELECTED} selected
        </div>
      </div>

      {/* Mode picker */}
      <div className="space-y-3 mb-5">
        {grouped.map(({ category, modes }) => (
          <div key={category}>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/40 mb-2">
              {CATEGORY_LABEL[category]}
            </div>
            <div className="flex flex-wrap gap-2">
              {modes.map((m) => {
                const active = selected.includes(m.value);
                const disabled = !active && selectionFull;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => toggleMode(m.value)}
                    disabled={disabled || running}
                    title={
                      disabled
                        ? `Maximum ${MAX_SELECTED} modes. Deselect one to pick another.`
                        : m.description
                    }
                    aria-pressed={active}
                    className={[
                      'px-3 py-1.5 rounded-full text-sm border transition-all duration-150',
                      'focus:outline-none focus:ring-2 focus:ring-gold-400/60',
                      active
                        ? 'bg-gold-500/15 border-gold-400/60 text-gold-300 shadow-[0_0_0_1px_rgba(212,175,55,0.35)]'
                        : 'bg-white/[0.03] border-white/10 text-white/80 hover:bg-white/[0.06] hover:border-white/20',
                      (disabled || running) && 'opacity-40 cursor-not-allowed hover:bg-white/[0.03]',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <button
          type="button"
          onClick={generate}
          disabled={!canRun}
          className={[
            'px-5 py-2.5 rounded-xl font-medium text-sm tracking-wide transition-all',
            'bg-gold-500 text-ink-950 hover:bg-gold-400 active:bg-gold-600',
            'disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed',
            'focus:outline-none focus:ring-2 focus:ring-gold-400/60',
          ].join(' ')}
        >
          {running ? 'Generating…' : `Generate All${selected.length ? ` (${selected.length})` : ''}`}
        </button>

        {running && (
          <button
            type="button"
            onClick={cancel}
            className="px-4 py-2.5 rounded-xl text-sm border border-white/15 text-white/80 hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            Cancel
          </button>
        )}

        {rawTextEmpty && !running && (
          <span className="text-xs text-white/50">
            Dictate something first — then pick your variants.
          </span>
        )}
        {!rawTextEmpty && selected.length === 0 && !running && (
          <span className="text-xs text-white/50">
            Pick at least one document mode.
          </span>
        )}
      </div>

      {/* Cards grid */}
      {cards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((card) => (
            <DocCard
              key={card.mode}
              card={card}
              copied={copiedMode === card.mode}
              onCopy={() => copyCard(card.mode, card.content)}
              onOpen={() => openInEditor(card.mode, card.content)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Card                                                                       */
/* -------------------------------------------------------------------------- */

interface DocCardProps {
  card: CardState;
  copied: boolean;
  onCopy: () => void;
  onOpen: () => void;
}

function DocCard({ card, copied, onCopy, onOpen }: DocCardProps) {
  const config = DOC_MODES.find((m) => m.value === card.mode);
  const label = config?.label ?? card.mode;
  const bodyRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the card body as new text arrives (classic "tail -f" feel).
  useEffect(() => {
    if (card.status === 'streaming' && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [card.content, card.status]);

  const hasContent = card.content.length > 0;
  const canCopy = hasContent && card.status !== 'error';

  return (
    <article
      className={[
        'rounded-xl border bg-ink-950/60 flex flex-col overflow-hidden transition-colors',
        card.status === 'streaming'
          ? 'border-emerald-400/40 shadow-[0_0_0_1px_rgba(52,211,153,0.25)]'
          : card.status === 'complete'
          ? 'border-gold-400/40 shadow-[0_0_0_1px_rgba(212,175,55,0.25)]'
          : card.status === 'error'
          ? 'border-rose-400/40'
          : 'border-white/10',
      ].join(' ')}
    >
      {/* Card header */}
      <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-display text-base text-white/95 truncate">{label}</h3>
          <StatusBadge status={card.status} />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onCopy}
            disabled={!canCopy}
            className="px-2.5 py-1 text-xs rounded-md border border-white/10 text-white/80 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gold-400/60 transition-colors"
            aria-label={`Copy ${label}`}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={onOpen}
            disabled={!canCopy}
            className="px-2.5 py-1 text-xs rounded-md border border-gold-400/30 text-gold-300 hover:bg-gold-500/10 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gold-400/60 transition-colors"
            aria-label={`Open ${label} in editor`}
          >
            Open in editor
          </button>
        </div>
      </header>

      {/* Card body — fixed height, scrollable, monospace-ish for draft feel */}
      <div
        ref={bodyRef}
        className="h-64 overflow-y-auto px-4 py-3 text-[13px] leading-relaxed text-white/90 whitespace-pre-wrap font-serif"
      >
        {card.status === 'idle' && (
          <span className="text-white/40">Waiting to start…</span>
        )}
        {card.status === 'error' && (
          <div className="text-rose-300">
            <div className="font-medium mb-1">Generation failed</div>
            <div className="text-xs text-rose-200/80">
              {card.error || 'An unexpected error occurred.'}
            </div>
          </div>
        )}
        {(card.status === 'streaming' || card.status === 'complete') &&
          (card.content ? (
            <>
              {card.content}
              {card.status === 'streaming' && (
                <span className="inline-block w-1.5 h-4 ml-0.5 align-text-bottom bg-emerald-400/80 animate-pulse" />
              )}
            </>
          ) : (
            <span className="text-white/40">Thinking…</span>
          ))}
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* Status badge                                                               */
/* -------------------------------------------------------------------------- */

function StatusBadge({ status }: { status: CardStatus }) {
  if (status === 'idle') {
    return (
      <span className="text-[10px] uppercase tracking-[0.18em] px-1.5 py-0.5 rounded border border-white/10 text-white/50">
        Queued
      </span>
    );
  }
  if (status === 'streaming') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] px-1.5 py-0.5 rounded border border-emerald-400/40 text-emerald-300 bg-emerald-400/10">
        <span className="relative inline-flex h-1.5 w-1.5">
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
          <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-400" />
        </span>
        Streaming
      </span>
    );
  }
  if (status === 'complete') {
    return (
      <span className="text-[10px] uppercase tracking-[0.18em] px-1.5 py-0.5 rounded border border-gold-400/40 text-gold-300 bg-gold-500/10">
        Complete
      </span>
    );
  }
  return (
    <span className="text-[10px] uppercase tracking-[0.18em] px-1.5 py-0.5 rounded border border-rose-400/40 text-rose-300 bg-rose-500/10">
      Error
    </span>
  );
}
