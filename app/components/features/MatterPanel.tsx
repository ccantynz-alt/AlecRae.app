'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/* -------------------------------------------------------------------------- */
/*  Types (mirrored from lib/matter-store.ts — client-safe)                  */
/* -------------------------------------------------------------------------- */

type MatterStatus = 'active' | 'closed';

interface Matter {
  id: string;
  clientName: string;
  matterNumber: string;
  description?: string;
  hourlyRate?: number;
  billingCode?: string;
  status: MatterStatus;
  createdAt: string;
}

interface TimeEntry {
  id: string;
  matterId: string;
  dictationId?: string;
  durationSeconds: number;
  description: string;
  date: string;
  billable: boolean;
  matterNumber?: string | null;
  clientName?: string | null;
}

export type ExportFormat = 'csv' | 'actionstep' | 'clio' | 'mycase' | 'practicepanther';

/* -------------------------------------------------------------------------- */
/*  Props                                                                     */
/* -------------------------------------------------------------------------- */

interface MatterPanelProps {
  dictationId?: string;
  durationSeconds?: number;
  rawText: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const GOLD = '#d4a84e';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function firstNChars(text: string, n: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= n) return trimmed;
  return trimmed.slice(0, n).trimEnd() + '…';
}

const FORMAT_LABELS: Record<ExportFormat, string> = {
  csv: 'Generic CSV',
  actionstep: 'Actionstep',
  clio: 'Clio',
  mycase: 'MyCase',
  practicepanther: 'PracticePanther',
};

/* -------------------------------------------------------------------------- */
/*  Inline add-matter form                                                    */
/* -------------------------------------------------------------------------- */

interface AddMatterFormProps {
  onCreated: (matter: Matter) => void;
  onCancel: () => void;
}

function AddMatterForm({ onCreated, onCancel }: AddMatterFormProps) {
  const [clientName, setClientName] = useState('');
  const [matterNumber, setMatterNumber] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim() || !matterNumber.trim()) {
      setError('Client name and matter number are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/matters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName.trim(),
          matterNumber: matterNumber.trim(),
          hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      const data = await res.json();
      onCreated(data.matter as Matter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create matter.');
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-1.5 text-xs text-ink-100 placeholder-ink-600 focus:outline-none focus:border-[color:var(--gold)] transition-colors';

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 rounded-lg border border-ink-700 bg-ink-950/70 p-3 space-y-2"
      style={{ '--gold': GOLD } as React.CSSProperties}
    >
      <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider">
        New matter
      </p>
      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
      <input
        className={inputClass}
        placeholder="Client name *"
        value={clientName}
        onChange={(e) => setClientName(e.target.value)}
        required
        disabled={saving}
      />
      <input
        className={inputClass}
        placeholder="Matter / file number *"
        value={matterNumber}
        onChange={(e) => setMatterNumber(e.target.value)}
        required
        disabled={saving}
      />
      <input
        className={inputClass}
        placeholder="Hourly rate (optional)"
        type="number"
        min="0"
        step="0.01"
        value={hourlyRate}
        onChange={(e) => setHourlyRate(e.target.value)}
        disabled={saving}
      />
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
          style={{ backgroundColor: `${GOLD}22`, color: GOLD, border: `1px solid ${GOLD}44` }}
        >
          {saving ? 'Saving…' : 'Create matter'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-md px-3 py-1.5 text-xs text-ink-400 border border-ink-700 hover:border-ink-600 hover:text-ink-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                            */
/* -------------------------------------------------------------------------- */

export function MatterPanel({ dictationId, durationSeconds, rawText }: MatterPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [selectedMatterId, setSelectedMatterId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [billable, setBillable] = useState(true);
  const [logDate, setLogDate] = useState(todayIso());
  const [showAddForm, setShowAddForm] = useState(false);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [logging, setLogging] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [loadingMatters, setLoadingMatters] = useState(false);

  // Export section
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [exporting, setExporting] = useState(false);

  const logSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-fill description from rawText when matter selected
  useEffect(() => {
    if (rawText?.trim()) {
      setDescription(firstNChars(rawText, 80));
    }
  }, [rawText]);

  // Fetch matters on mount
  const fetchMatters = useCallback(async () => {
    setLoadingMatters(true);
    try {
      const res = await fetch('/api/matters?status=active');
      if (res.ok) {
        const data = await res.json();
        setMatters(data.matters ?? []);
      }
    } catch {
      /* silently ignore — user can retry */
    } finally {
      setLoadingMatters(false);
    }
  }, []);

  useEffect(() => {
    fetchMatters();
  }, [fetchMatters]);

  // Fetch recent entries
  const fetchRecentEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/time-entries');
      if (res.ok) {
        const data = await res.json();
        setRecentEntries((data.entries ?? []).slice(0, 5));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchRecentEntries();
  }, [fetchRecentEntries]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (logSuccessTimer.current) clearTimeout(logSuccessTimer.current);
    };
  }, []);

  // If no dictationId, hide the panel entirely
  if (!dictationId) return null;

  const selectedMatter = matters.find((m) => m.id === selectedMatterId) ?? null;

  async function handleLogTime() {
    if (!selectedMatterId) {
      setLogError('Select a matter first.');
      return;
    }
    if (!description.trim()) {
      setLogError('Description is required.');
      return;
    }
    if (durationSeconds === undefined || durationSeconds <= 0) {
      setLogError('Duration is zero — record audio before logging time.');
      return;
    }

    setLogging(true);
    setLogError(null);

    try {
      const res = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matterId: selectedMatterId,
          durationSeconds,
          description: description.trim(),
          date: logDate,
          billable,
          dictationId,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      setLogSuccess(true);
      if (logSuccessTimer.current) clearTimeout(logSuccessTimer.current);
      logSuccessTimer.current = setTimeout(() => setLogSuccess(false), 3000);
      await fetchRecentEntries();
    } catch (err) {
      setLogError(err instanceof Error ? err.message : 'Failed to log time.');
    } finally {
      setLogging(false);
    }
  }

  function handleMatterCreated(matter: Matter) {
    setMatters((prev) => [matter, ...prev]);
    setSelectedMatterId(matter.id);
    setShowAddForm(false);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams({ format: exportFormat });
      if (exportFrom) params.set('from', exportFrom);
      if (exportTo) params.set('to', exportTo);

      const res = await fetch(`/api/time-entries/export?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Export failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] ?? `time-entries.csv`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* user can retry */
    } finally {
      setExporting(false);
    }
  }

  const inputClass =
    'w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-1.5 text-xs text-ink-100 placeholder-ink-600 focus:outline-none focus:border-[color:var(--gold)] transition-colors';

  return (
    <section
      aria-label="Matter and billing"
      className="rounded-xl border border-ink-800 bg-ink-900/50 text-ink-100 backdrop-blur-sm overflow-hidden"
      style={{ '--gold': GOLD } as React.CSSProperties}
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
            {/* Clock / billing icon */}
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
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
          </span>
          <span className="flex items-baseline gap-2 min-w-0">
            <span className="font-display text-sm tracking-wide" style={{ color: GOLD }}>
              Matter &amp; Billing
            </span>
            {selectedMatter && (
              <span className="text-ink-400 text-xs truncate max-w-[20ch]">
                {selectedMatter.matterNumber} · {selectedMatter.clientName}
              </span>
            )}
          </span>
        </span>
        <svg
          viewBox="0 0 20 20"
          width="14"
          height="14"
          fill="currentColor"
          aria-hidden
          className={`text-ink-500 transition-transform flex-shrink-0 ${collapsed ? '' : 'rotate-180'}`}
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
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="border-t border-ink-800/70 px-4 py-3 space-y-3">

          {/* Matter selector */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-400 uppercase tracking-wider mb-1.5">
              Matter
            </label>
            <select
              value={selectedMatterId}
              onChange={(e) => {
                if (e.target.value === '__add__') {
                  setShowAddForm(true);
                  return;
                }
                setSelectedMatterId(e.target.value);
                setShowAddForm(false);
              }}
              className="w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-1.5 text-xs text-ink-100 focus:outline-none focus:border-[color:var(--gold)] transition-colors"
              disabled={loadingMatters}
            >
              <option value="">
                {loadingMatters ? 'Loading matters…' : '— Select matter —'}
              </option>
              {matters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.matterNumber} · {m.clientName}
                </option>
              ))}
              <option value="__add__">+ Add matter</option>
            </select>

            {showAddForm && (
              <AddMatterForm
                onCreated={handleMatterCreated}
                onCancel={() => setShowAddForm(false)}
              />
            )}
          </div>

          {/* Time logging form — only when matter selected + duration available */}
          {selectedMatter && durationSeconds !== undefined && (
            <div className="space-y-2 rounded-lg border border-ink-800 bg-ink-950/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider">
                  Log time
                </span>
                <span
                  className="font-mono text-xs font-semibold tabular-nums"
                  style={{ color: GOLD }}
                >
                  {formatDuration(durationSeconds)}
                </span>
              </div>

              {/* Description */}
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Description of work performed…"
                className={`${inputClass} resize-none`}
              />

              {/* Date + billable row */}
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className={`${inputClass} flex-1`}
                />
                <label className="flex items-center gap-1.5 cursor-pointer select-none flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={billable}
                    onChange={(e) => setBillable(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-xs text-ink-300">Billable</span>
                </label>
              </div>

              {/* Error */}
              {logError && (
                <p className="text-xs text-red-400" role="alert">
                  {logError}
                </p>
              )}

              {/* Log button */}
              <button
                type="button"
                onClick={handleLogTime}
                disabled={logging || logSuccess}
                className="w-full rounded-md py-1.5 text-xs font-semibold transition-all disabled:opacity-60"
                style={{
                  backgroundColor: logSuccess ? '#15803d22' : `${GOLD}22`,
                  color: logSuccess ? '#4ade80' : GOLD,
                  border: `1px solid ${logSuccess ? '#4ade8044' : `${GOLD}44`}`,
                }}
              >
                {logging ? 'Logging…' : logSuccess ? 'Time logged ✓' : 'Log time'}
              </button>
            </div>
          )}

          {/* Export section */}
          <div>
            <button
              type="button"
              onClick={() => setExportOpen((v) => !v)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-400 uppercase tracking-wider hover:text-ink-300 transition-colors"
              aria-expanded={exportOpen}
            >
              <svg
                viewBox="0 0 20 20"
                width="12"
                height="12"
                fill="currentColor"
                aria-hidden
                className={`transition-transform ${exportOpen ? 'rotate-180' : ''}`}
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
              Export time
            </button>

            {exportOpen && (
              <div className="mt-2 rounded-lg border border-ink-800 bg-ink-950/50 p-3 space-y-2">
                {/* Format selector */}
                <div>
                  <label className="block text-[10px] text-ink-500 mb-1">Format</label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                    className="w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-1.5 text-xs text-ink-100 focus:outline-none focus:border-[color:var(--gold)] transition-colors"
                  >
                    {(Object.keys(FORMAT_LABELS) as ExportFormat[]).map((f) => (
                      <option key={f} value={f}>
                        {FORMAT_LABELS[f]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date range */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-ink-500 mb-1">From</label>
                    <input
                      type="date"
                      value={exportFrom}
                      onChange={(e) => setExportFrom(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-ink-500 mb-1">To</label>
                    <input
                      type="date"
                      value={exportTo}
                      onChange={(e) => setExportTo(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporting}
                  className="w-full flex items-center justify-center gap-2 rounded-md py-1.5 text-xs font-semibold transition-all disabled:opacity-60"
                  style={{
                    backgroundColor: `${GOLD}22`,
                    color: GOLD,
                    border: `1px solid ${GOLD}44`,
                  }}
                >
                  {exporting ? (
                    'Exporting…'
                  ) : (
                    <>
                      <svg
                        viewBox="0 0 20 20"
                        width="12"
                        height="12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        aria-hidden
                      >
                        <path d="M10 3v10M6 9l4 4 4-4M4 17h12" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Download {FORMAT_LABELS[exportFormat]}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Recent time entries */}
          {recentEntries.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider mb-2">
                Recent entries
              </p>
              <ul className="space-y-1.5">
                {recentEntries.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start justify-between gap-2 rounded-md border border-ink-800 bg-ink-950/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-ink-200 truncate">{e.description}</p>
                      <p className="text-[10px] text-ink-500 mt-0.5">
                        {e.clientName && <span>{e.clientName} · </span>}
                        {e.matterNumber && <span>{e.matterNumber} · </span>}
                        {e.date}
                        {!e.billable && (
                          <span className="ml-1 text-ink-600">(non-billable)</span>
                        )}
                      </p>
                    </div>
                    <span
                      className="flex-shrink-0 font-mono text-[10px] tabular-nums mt-0.5"
                      style={{ color: GOLD }}
                    >
                      {formatDuration(e.durationSeconds)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Empty state when no matter is selected */}
          {!selectedMatter && !showAddForm && matters.length === 0 && !loadingMatters && (
            <p className="text-xs text-ink-500">
              No active matters. Select &ldquo;+ Add matter&rdquo; above to create one.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
