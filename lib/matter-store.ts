/**
 * In-memory store for matters and time entries.
 * When the database (Neon PostgreSQL) is connected in Phase 2,
 * this will be replaced with proper database queries.
 *
 * Uses globalThis pattern (matching lib/firm-store.ts) to survive
 * hot-module reloads in development and share state across route files
 * within the same serverless instance.
 */

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type Matter = {
  id: string;
  clientName: string;
  matterNumber: string;
  description?: string;
  hourlyRate?: number;
  billingCode?: string;
  status: 'active' | 'closed';
  createdAt: string;
};

export type TimeEntry = {
  id: string;
  matterId: string;
  dictationId?: string;
  durationSeconds: number;
  description: string;
  date: string;
  billable: boolean;
};

/* -------------------------------------------------------------------------- */
/*  Stores (globalThis singletons)                                            */
/* -------------------------------------------------------------------------- */

const matterMap: Map<string, Matter> = (() => {
  if (!(globalThis as any).__matterStore) {
    (globalThis as any).__matterStore = new Map<string, Matter>();
  }
  return (globalThis as any).__matterStore;
})();

const timeEntryMap: Map<string, TimeEntry> = (() => {
  if (!(globalThis as any).__timeEntryStore) {
    (globalThis as any).__timeEntryStore = new Map<string, TimeEntry>();
  }
  return (globalThis as any).__timeEntryStore;
})();

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/* -------------------------------------------------------------------------- */
/*  Matter CRUD                                                               */
/* -------------------------------------------------------------------------- */

export function addMatter(
  input: Omit<Matter, 'id' | 'createdAt' | 'status'> & { status?: Matter['status'] }
): Matter {
  const matter: Matter = {
    id: generateId(),
    clientName: input.clientName.trim(),
    matterNumber: input.matterNumber.trim(),
    description: input.description?.trim(),
    hourlyRate: input.hourlyRate,
    billingCode: input.billingCode?.trim(),
    status: input.status ?? 'active',
    createdAt: new Date().toISOString(),
  };
  matterMap.set(matter.id, matter);
  return matter;
}

export function updateMatter(
  id: string,
  updates: Partial<Omit<Matter, 'id' | 'createdAt'>>
): Matter | null {
  const existing = matterMap.get(id);
  if (!existing) return null;
  const updated: Matter = { ...existing, ...updates, id, createdAt: existing.createdAt };
  matterMap.set(id, updated);
  return updated;
}

export function listMatters(filter?: { status?: Matter['status'] }): Matter[] {
  const all = Array.from(matterMap.values());
  const filtered = filter?.status ? all.filter((m) => m.status === filter.status) : all;
  return filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function findMatterById(id: string): Matter | null {
  return matterMap.get(id) ?? null;
}

export function closeMatter(id: string): Matter | null {
  return updateMatter(id, { status: 'closed' });
}

export function deleteMatter(id: string): boolean {
  return matterMap.delete(id);
}

/* -------------------------------------------------------------------------- */
/*  Time entry operations                                                     */
/* -------------------------------------------------------------------------- */

export function logTime(entry: Omit<TimeEntry, 'id'>): TimeEntry {
  const record: TimeEntry = {
    id: generateId(),
    matterId: entry.matterId,
    dictationId: entry.dictationId,
    durationSeconds: Math.max(0, Math.round(entry.durationSeconds)),
    description: entry.description.trim(),
    date: entry.date,
    billable: entry.billable,
  };
  timeEntryMap.set(record.id, record);
  return record;
}

export function listTimeEntries(filter?: {
  matterId?: string;
  from?: string;
  to?: string;
  billable?: boolean;
}): TimeEntry[] {
  let entries = Array.from(timeEntryMap.values());

  if (filter?.matterId) {
    entries = entries.filter((e) => e.matterId === filter.matterId);
  }
  if (filter?.from) {
    const from = new Date(filter.from).getTime();
    entries = entries.filter((e) => new Date(e.date).getTime() >= from);
  }
  if (filter?.to) {
    // Include the full "to" day
    const to = new Date(filter.to).getTime() + 86_400_000;
    entries = entries.filter((e) => new Date(e.date).getTime() < to);
  }
  if (filter?.billable !== undefined) {
    entries = entries.filter((e) => e.billable === filter!.billable);
  }

  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function deleteTimeEntry(id: string): boolean {
  return timeEntryMap.delete(id);
}

/* -------------------------------------------------------------------------- */
/*  Export formats                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Format duration as h:mm:ss for display and some exports.
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Format duration as decimal hours (e.g. 1.5) for billing software.
 */
function decimalHours(seconds: number): string {
  return (seconds / 3600).toFixed(2);
}

function csvRow(fields: (string | number | boolean | undefined | null)[]): string {
  return fields
    .map((f) => {
      const v = f === null || f === undefined ? '' : String(f);
      // Quote if contains comma, quote, or newline
      return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    })
    .join(',');
}

/**
 * Export time entries in the requested format.
 * Entries are retrieved from the store; caller may pre-filter via listTimeEntries.
 *
 * @param format - Target system format.
 * @param entries - Optional pre-filtered list; if omitted, all entries are used.
 */
export function exportTimeEntries(
  format: 'csv' | 'actionstep' | 'clio' | 'mycase' | 'practicepanther',
  entries?: TimeEntry[]
): string {
  const rows = entries ?? listTimeEntries();
  const matters = new Map(Array.from(matterMap.entries()));

  switch (format) {
    /* ---------------------------------------------------------------------- */
    /*  Generic CSV                                                            */
    /* ---------------------------------------------------------------------- */
    case 'csv': {
      const header = csvRow([
        'Entry ID',
        'Matter Number',
        'Client Name',
        'Description',
        'Date',
        'Duration (h:mm:ss)',
        'Hours (decimal)',
        'Billable',
        'Billing Code',
        'Hourly Rate',
        'Dictation ID',
      ]);
      const lines = rows.map((e) => {
        const m = matters.get(e.matterId);
        return csvRow([
          e.id,
          m?.matterNumber ?? '',
          m?.clientName ?? '',
          e.description,
          e.date,
          formatDuration(e.durationSeconds),
          decimalHours(e.durationSeconds),
          e.billable ? 'Yes' : 'No',
          m?.billingCode ?? '',
          m?.hourlyRate != null ? m.hourlyRate.toFixed(2) : '',
          e.dictationId ?? '',
        ]);
      });
      return [header, ...lines].join('\r\n');
    }

    /* ---------------------------------------------------------------------- */
    /*  Actionstep                                                             */
    /*  Documented import format: https://actionstep.com                      */
    /*  Columns: Matter ID, Action Name, Date, Time (decimal), Description,   */
    /*           Billable (1/0), Rate                                          */
    /* ---------------------------------------------------------------------- */
    case 'actionstep': {
      const header = csvRow([
        'Matter Reference',
        'Action Name',
        'Date (YYYY-MM-DD)',
        'Time (Hours)',
        'Description',
        'Billable',
        'Rate',
      ]);
      const lines = rows.map((e) => {
        const m = matters.get(e.matterId);
        return csvRow([
          m?.matterNumber ?? e.matterId,
          m?.clientName ?? '',
          e.date,
          decimalHours(e.durationSeconds),
          e.description,
          e.billable ? '1' : '0',
          m?.hourlyRate != null ? m.hourlyRate.toFixed(2) : '',
        ]);
      });
      return [header, ...lines].join('\r\n');
    }

    /* ---------------------------------------------------------------------- */
    /*  Clio                                                                   */
    /*  Clio CSV import columns (Time Entries import template):               */
    /*  Activity Date, Hours Spent, Flat Rate, User, Contact, Matter,        */
    /*  Description, Billed, Billable, Activity Type, Non-Billable            */
    /* ---------------------------------------------------------------------- */
    case 'clio': {
      const header = csvRow([
        'Activity Date',
        'Hours Spent',
        'Flat Rate',
        'User',
        'Contact',
        'Matter',
        'Description',
        'Billed',
        'Billable',
        'Activity Type',
        'Non-Billable',
      ]);
      const lines = rows.map((e) => {
        const m = matters.get(e.matterId);
        return csvRow([
          e.date,
          decimalHours(e.durationSeconds),
          '', // flat rate — leave blank; hourly rate is set per-matter in Clio
          '', // user — not tracked in this store
          m?.clientName ?? '',
          m?.matterNumber ?? '',
          e.description,
          'No',   // Billed
          e.billable ? 'Yes' : 'No',
          m?.billingCode ?? 'General',
          e.billable ? 'No' : 'Yes',
        ]);
      });
      return [header, ...lines].join('\r\n');
    }

    /* ---------------------------------------------------------------------- */
    /*  MyCase                                                                 */
    /*  MyCase time entry import (documented column order):                   */
    /*  Date, Client, Case/Matter, Description, Time (Hours), Rate, Billable  */
    /* ---------------------------------------------------------------------- */
    case 'mycase': {
      const header = csvRow([
        'Date',
        'Client',
        'Case',
        'Description',
        'Time (Hours)',
        'Rate',
        'Billable',
      ]);
      const lines = rows.map((e) => {
        const m = matters.get(e.matterId);
        return csvRow([
          e.date,
          m?.clientName ?? '',
          m?.matterNumber ?? '',
          e.description,
          decimalHours(e.durationSeconds),
          m?.hourlyRate != null ? m.hourlyRate.toFixed(2) : '',
          e.billable ? 'Yes' : 'No',
        ]);
      });
      return [header, ...lines].join('\r\n');
    }

    /* ---------------------------------------------------------------------- */
    /*  PracticePanther                                                        */
    /*  PracticePanther time entries import (documented template):            */
    /*  Matter Number, Contact, Date, Description, Hours, Rate, Billable,    */
    /*  Billing Code                                                           */
    /* ---------------------------------------------------------------------- */
    case 'practicepanther': {
      const header = csvRow([
        'Matter Number',
        'Contact',
        'Date',
        'Description',
        'Hours',
        'Rate',
        'Billable',
        'Billing Code',
      ]);
      const lines = rows.map((e) => {
        const m = matters.get(e.matterId);
        return csvRow([
          m?.matterNumber ?? '',
          m?.clientName ?? '',
          e.date,
          e.description,
          decimalHours(e.durationSeconds),
          m?.hourlyRate != null ? m.hourlyRate.toFixed(2) : '',
          e.billable ? 'Yes' : 'No',
          m?.billingCode ?? '',
        ]);
      });
      return [header, ...lines].join('\r\n');
    }

    default:
      return '';
  }
}
