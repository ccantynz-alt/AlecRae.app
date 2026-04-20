/**
 * In-memory client roster store for Conflict-of-Interest Guardian.
 *
 * Follows the globalThis singleton pattern used throughout this codebase
 * (see lib/firm-store.ts) so that the store survives Next.js hot-reloads
 * in development without resetting between requests.
 *
 * When Neon PostgreSQL (Phase 2) is wired up the CRUD functions below will
 * delegate to database queries instead of the in-memory map — the function
 * signatures and return types will remain identical.
 */

import { randomUUID } from 'crypto';

/* -------------------------------------------------------------------------- */
/*  Public types                                                              */
/* -------------------------------------------------------------------------- */

/** The relationship this client has with the firm. */
export type ClientRelationship = 'current' | 'former' | 'adverse' | 'prospect';

export interface Client {
  /** UUID primary key. */
  id: string;
  /** Primary display name (e.g. "Acme Holdings Ltd", "John Smith"). */
  name: string;
  /** Alternative names, former names, or shortened forms used in documents. */
  aliases?: string[];
  /** Internal matter or file numbers associated with this client. */
  matterNumbers?: string[];
  /** Relationship type — drives conflict-severity classification. */
  type: ClientRelationship;
  /** Optional free-text notes visible only to admins. */
  notes?: string;
  /** ISO-8601 timestamp when this record was created. */
  addedAt: string;
  /** ISO-8601 timestamp of the last update. */
  updatedAt: string;
}

export interface ClientInput {
  name: string;
  aliases?: string[];
  matterNumbers?: string[];
  type: ClientRelationship;
  notes?: string;
}

export interface FuzzyMatch {
  client: Client;
  /** Match quality in [0, 1]. 1 = exact, lower = partial. */
  score: number;
  /** The token on the client record that matched (name or an alias). */
  matchedOn: string;
}

/* -------------------------------------------------------------------------- */
/*  In-memory store (globalThis singleton)                                   */
/* -------------------------------------------------------------------------- */

const store: Map<string, Client> = (() => {
  if (!(globalThis as any).__clientRosterStore) {
    (globalThis as any).__clientRosterStore = new Map<string, Client>();
  }
  return (globalThis as any).__clientRosterStore;
})();

/* -------------------------------------------------------------------------- */
/*  Normalisation helpers                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Organisation-type suffix words that should be stripped when comparing
 * entity names, so "Acme Ltd" matches "Acme Limited" and "Acme".
 */
const STRIP_SUFFIXES = /\b(?:limited|ltd|pty|pty ltd|inc|llc|llp|plc|corp|corporation|co|company|group|holdings|holding|partners|partnership|trust|foundation|authority|services|solutions|consulting|consultants|associates|association|international|industries|enterprises|ventures|properties|property|management|advisory|advisors|capital|investments|investment|bank)\b\.?/gi;

/**
 * Normalise a name for comparison:
 *  - lowercase
 *  - strip corporate/organisation suffixes
 *  - collapse whitespace
 *  - remove punctuation except hyphens and apostrophes
 */
function normalise(name: string): string {
  return name
    .toLowerCase()
    .replace(STRIP_SUFFIXES, ' ')
    .replace(/[^\w\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compute a fuzzy match score between a search needle and a roster token.
 *
 * Scoring tiers:
 *  1.0  — normalised strings are identical
 *  0.9  — one normalised form starts with the other (prefix match)
 *  0.7  — one normalised form is a substring of the other
 *  0.0  — no match
 */
function scoreMatch(needle: string, token: string): number {
  const n = normalise(needle);
  const t = normalise(token);
  if (!n || !t) return 0;
  if (n === t) return 1.0;
  if (t.startsWith(n) || n.startsWith(t)) return 0.9;
  if (t.includes(n) || n.includes(t)) return 0.7;
  return 0;
}

/* -------------------------------------------------------------------------- */
/*  CRUD functions                                                            */
/* -------------------------------------------------------------------------- */

/** Return all clients, sorted by name. */
export function listClients(): Client[] {
  return Array.from(store.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

/** Retrieve a single client by ID, or undefined if not found. */
export function getClient(id: string): Client | undefined {
  return store.get(id);
}

/** Create a new client record and persist it to the store. */
export function addClient(input: ClientInput): Client {
  if (!input.name?.trim()) {
    throw new Error('Client name is required');
  }

  const now = new Date().toISOString();
  const client: Client = {
    id: randomUUID(),
    name: input.name.trim(),
    aliases: input.aliases?.map((a) => a.trim()).filter(Boolean),
    matterNumbers: input.matterNumbers?.map((m) => m.trim()).filter(Boolean),
    type: input.type,
    notes: input.notes?.trim() || undefined,
    addedAt: now,
    updatedAt: now,
  };

  store.set(client.id, client);
  return client;
}

/** Partially update an existing client record. Returns the updated record. */
export function updateClient(
  id: string,
  updates: Partial<ClientInput>
): Client {
  const existing = store.get(id);
  if (!existing) throw new Error(`Client not found: ${id}`);

  const updated: Client = {
    ...existing,
    ...{
      name: updates.name !== undefined ? updates.name.trim() : existing.name,
      aliases:
        updates.aliases !== undefined
          ? updates.aliases.map((a) => a.trim()).filter(Boolean)
          : existing.aliases,
      matterNumbers:
        updates.matterNumbers !== undefined
          ? updates.matterNumbers.map((m) => m.trim()).filter(Boolean)
          : existing.matterNumbers,
      type: updates.type !== undefined ? updates.type : existing.type,
      notes:
        updates.notes !== undefined
          ? updates.notes.trim() || undefined
          : existing.notes,
    },
    updatedAt: new Date().toISOString(),
  };

  store.set(id, updated);
  return updated;
}

/** Remove a client record. Returns true if deleted, false if not found. */
export function removeClient(id: string): boolean {
  return store.delete(id);
}

/**
 * Search the roster for clients whose name or any alias fuzzy-matches the
 * given needle string.
 *
 * Returns all matches with score ≥ 0.7, sorted descending by score.
 * An empty array means no conflicts found for this name.
 */
export function findByName(needle: string): FuzzyMatch[] {
  if (!needle?.trim()) return [];

  const results: FuzzyMatch[] = [];

  for (const client of store.values()) {
    let bestScore = 0;
    let bestToken = client.name;

    // Score against primary name
    const nameScore = scoreMatch(needle, client.name);
    if (nameScore > bestScore) {
      bestScore = nameScore;
      bestToken = client.name;
    }

    // Score against each alias
    for (const alias of client.aliases ?? []) {
      const aliasScore = scoreMatch(needle, alias);
      if (aliasScore > bestScore) {
        bestScore = aliasScore;
        bestToken = alias;
      }
    }

    if (bestScore >= 0.7) {
      results.push({ client, score: bestScore, matchedOn: bestToken });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
